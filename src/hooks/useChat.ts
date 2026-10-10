import { useState, useCallback, useRef, useEffect } from 'react';
import { Chat, Message, ConversionSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { taskFor } from '../modes';

const MAX_SAVED_CHATS = 50;
const storageKey = (userId: string) => `gesture_path_chats_${userId}`;

function loadChats(userId: string): Chat[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const titleFrom = (text: string) => (text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text);

function saveHistory(content: string, type: string) {
  const storedUser = JSON.parse(localStorage.getItem('user_data') || '{}');
  if (!storedUser?.id) return;
  fetch(`${import.meta.env.VITE_API_URL}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: storedUser.id, type, content }),
  }).catch(() => {});
}

export const useChat = () => {
  const { user } = useAuth();
  // Chats are saved per user in this browser. `owner` makes sure one user's
  // chats are never written under another user's key while switching accounts.
  const [store, setStore] = useState<{ owner: string | null; chats: Chat[] }>({ owner: null, chats: [] });
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [instantMessages, setInstantMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  const userId = user?.id ?? null;
  const chats = store.owner === userId ? store.chats : [];
  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  useEffect(() => {
    if (userId && store.owner !== userId) setStore({ owner: userId, chats: loadChats(userId) });
  }, [userId, store.owner]);

  useEffect(() => {
    if (!store.owner || store.owner !== userId) return;
    try {
      localStorage.setItem(storageKey(store.owner), JSON.stringify(store.chats.slice(0, MAX_SAVED_CHATS)));
    } catch {
      // Storage full or unavailable — chats still work for this session.
    }
  }, [store, userId]);

  const setChats = useCallback((update: (prev: Chat[]) => Chat[]) => {
    setStore((s) => ({ ...s, chats: update(s.chats) }));
  }, []);

  const appendMessage = useCallback((chatId: string, message: Message) => {
    setChats((prev) => prev.map((chat) => {
      if (chat.id !== chatId) return chat;
      const isFirstUserMessage = message.role === 'user' && !chat.messages.some((m) => m.role === 'user');
      return {
        ...chat,
        title: isFirstUserMessage ? titleFrom(message.content) : chat.title,
        messages: [...chat.messages, message],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [setChats]);

  const createNewChat = useCallback((conversionSettings: ConversionSettings) => {
    const now = new Date().toISOString();
    const newChat: Chat = {
      id: Date.now().toString(),
      title: taskFor(conversionSettings).title,
      createdAt: now,
      updatedAt: now,
      userId: user?.id || 'anonymous',
      messages: [],
      settings: conversionSettings,
    };
    setChats((prev) => [newChat, ...prev].slice(0, MAX_SAVED_CHATS));
    setActiveChatId(newChat.id);
    return newChat;
  }, [user, setChats]);

  const sendMessage = useCallback(async (
    content: string,
    type: 'text' | 'audio' | 'visual',
    conversionSettings: ConversionSettings
  ) => {
    const chatId = activeChatIdRef.current;
    const isInstant = !chatId;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      type,
      metadata: {
        originalMode: conversionSettings.inputMode,
        targetMode: conversionSettings.outputMode,
      },
    };

    const addAssistant = (message: Message, replacePrevious = false) => {
      if (isInstant) {
        // In instant mode, replace previous assistant message so only latest shows
        setInstantMessages((prev) => [...(replacePrevious ? prev.filter((m) => m.role !== 'assistant') : prev), message]);
      } else {
        appendMessage(chatId, message);
      }
    };

    if (isInstant) setInstantMessages((prev) => [...prev, userMessage]);
    else appendMessage(chatId, userMessage);

    // Sign → text/audio: the words were already recognised in the browser,
    // so there is nothing to send to the text → sign API.
    if (conversionSettings.inputMode === 'visual' && !isInstant) {
      const speak = conversionSettings.outputMode === 'audio';
      if (speak && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(content));
      }
      addAssistant({
        id: (Date.now() + 1).toString(),
        content,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        type: speak ? 'audio' : 'text',
        metadata: {
          originalMode: conversionSettings.inputMode,
          targetMode: conversionSettings.outputMode,
        },
      });
      saveHistory(content, 'sign_to_text');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Merge all hns_sign blocks into a single <sigml> root
      let sigml = '';
      const signed: Array<{ word: string; sigml: string }> = (data.sequence ?? [])
        .filter((s: { sigml?: string; type: string }) => s.sigml && s.type !== 'missing');
      if (signed.length > 0) {
        const signs = signed
          .map((s) => {
            const match = s.sigml.match(/<sigml>([\s\S]*?)<\/sigml>/);
            return match ? match[1].trim() : '';
          })
          .filter(Boolean)
          .join('\n');
        if (signs) sigml = `<sigml>\n${signs}\n</sigml>`;
      }

      addAssistant({
        id: (Date.now() + 1).toString(),
        content: sigml ? 'Here is the sign language translation:' : 'No signs found for this input.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'visual',
        metadata: {
          originalMode: conversionSettings.inputMode,
          targetMode: conversionSettings.outputMode,
          sigml: sigml || undefined,
          missingWords: data.missing_words,
          signedWords: signed.map((s) => s.word.replace(/_/g, ' ')),
        },
      }, true);

      saveHistory(content, 'conversion');
    } catch (error) {
      console.error('Failed to send message:', error);
      addAssistant({
        id: (Date.now() + 1).toString(),
        content: 'Failed to get translation. Please check your connection and try again.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'text',
      });
    } finally {
      setIsLoading(false);
    }
  }, [appendMessage]);

  const setActiveChat = useCallback((chat: Chat | null) => {
    setActiveChatId(chat?.id ?? null);
  }, []);

  const selectChat = useCallback((chat: Chat) => {
    setActiveChatId(chat.id);
    setInstantMessages([]);
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (activeChatIdRef.current === chatId) setActiveChatId(null);
  }, [setChats]);

  const clearInstantMessages = useCallback(() => {
    setInstantMessages([]);
  }, []);

  // On logout: forget in-memory state (saved chats stay in this browser for that user).
  const resetAll = useCallback(() => {
    setStore({ owner: null, chats: [] });
    setActiveChatId(null);
    setInstantMessages([]);
  }, []);

  return {
    chats,
    activeChat,
    instantMessages,
    isLoading,
    createNewChat,
    sendMessage,
    selectChat,
    deleteChat,
    setActiveChat,
    clearInstantMessages,
    resetAll,
  };
};
