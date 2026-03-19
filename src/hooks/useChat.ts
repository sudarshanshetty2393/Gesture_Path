import { useState, useCallback, useRef } from 'react';
import { Chat, Message, ConversionSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useChat = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [instantMessages, setInstantMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const activeChatRef = useRef<Chat | null>(null);
  activeChatRef.current = activeChat;

  const createNewChat = useCallback((conversionSettings: ConversionSettings) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `${conversionSettings.inputMode} to ${conversionSettings.outputMode}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user?.id || 'anonymous',
      messages: [],
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat);
    return newChat;
  }, [user]);

  const sendMessage = useCallback(async (
    content: string,
    type: 'text' | 'audio' | 'visual',
    conversionSettings: ConversionSettings
  ) => {
    const isInstant = !activeChatRef.current;

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

    if (isInstant) {
      setInstantMessages(prev => [...prev, userMessage]);
    } else {
      setActiveChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, userMessage],
        updatedAt: new Date().toISOString(),
      } : null);
      setChats(prev => prev.map(chat =>
        chat.id === activeChatRef.current!.id
          ? { ...chat, messages: [...chat.messages, userMessage], updatedAt: new Date().toISOString() }
          : chat
      ));
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
      if (data.sequence && data.sequence.length > 0) {
        const signs = data.sequence
          .filter((s: any) => s.sigml && s.type !== 'missing')
          .map((s: any) => {
            const match = s.sigml.match(/<sigml>([\s\S]*?)<\/sigml>/);
            return match ? match[1].trim() : '';
          })
          .filter(Boolean)
          .join('\n');
        if (signs) sigml = `<sigml>\n${signs}\n</sigml>`;
      }

      const assistantMessage: Message = {
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
        },
      };

      if (isInstant) {
        // In instant mode, replace previous assistant message so only latest shows
        setInstantMessages(prev => {
          const withoutPrevAssistant = prev.filter(m => m.role !== 'assistant');
          return [...withoutPrevAssistant, assistantMessage];
        });
      } else {
        setActiveChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, assistantMessage],
          updatedAt: new Date().toISOString(),
        } : null);
        setChats(prev => prev.map(chat =>
          chat.id === activeChatRef.current?.id
            ? { ...chat, messages: [...chat.messages, assistantMessage], updatedAt: new Date().toISOString() }
            : chat
        ));
      }

      // Save to history
      const storedUser = JSON.parse(localStorage.getItem('user_data') || '{}');
      if (storedUser?.id) {
        fetch(`${import.meta.env.VITE_API_URL}/api/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: storedUser.id, type: 'conversion', content }),
        }).catch(() => {});
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Failed to get translation. Please check your connection and try again.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'text',
      };
      if (isInstant) {
        setInstantMessages(prev => [...prev, errorMsg]);
      } else {
        setActiveChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, errorMsg],
          updatedAt: new Date().toISOString(),
        } : null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectChat = useCallback((chat: Chat) => {
    setActiveChat(chat);
    setInstantMessages([]);
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChatRef.current?.id === chatId) {
      setActiveChat(null);
    }
  }, []);

  const clearInstantMessages = useCallback(() => {
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
  };
};