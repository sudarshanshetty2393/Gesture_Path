import { useState, useCallback } from 'react';
import { Chat, Message, ConversionSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useChat = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

    // TODO: Save to backend
    // await saveChat(newChat);

    return newChat;
  }, [user]);

  const sendMessage = useCallback(async (
    content: string,
    type: 'text' | 'audio' | 'visual',
    conversionSettings: ConversionSettings
  ) => {
    if (!activeChat) return;

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

    // Add user message
    setActiveChat(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
      updatedAt: new Date().toISOString(),
    } : null);

    setChats(prev => prev.map(chat =>
      chat.id === activeChat.id
        ? { ...chat, messages: [...chat.messages, userMessage], updatedAt: new Date().toISOString() }
        : chat
    ));

    setIsLoading(true);

    try {
      console.log("Sending translation request for:", content);
      const startTime = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content }),
      });

      const data = await response.json();
      console.log("Received translation response in", Date.now() - startTime, "ms", data);

      let sigml = '';
      if (data.sequence && data.sequence.length > 0) {
        sigml = data.sequence.map((s: any) => s.sigml).join('\n');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Here is the translation:',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'visual', // Always visual for now as we are doing ISL
        metadata: {
          originalMode: conversionSettings.inputMode,
          targetMode: conversionSettings.outputMode,
          processingTime: 0, // Backend doesn't return this yet
          sigml: sigml,
          missingWords: data.missing_words
        },
      };

      // Add assistant message
      setActiveChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage],
        updatedAt: new Date().toISOString(),
      } : null);

      setChats(prev => prev.map(chat =>
        chat.id === activeChat.id
          ? { ...chat, messages: [...chat.messages, assistantMessage], updatedAt: new Date().toISOString() }
          : chat
      ));

      // Save to history
      const user = JSON.parse(localStorage.getItem('user_data') || '{}');
      if (user && user.id) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            type: 'conversion',
            content: content,
          }),
        });
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      // Handle error - maybe show a toast notification
    } finally {
      setIsLoading(false);
    }
  }, [activeChat]);

  const selectChat = useCallback((chat: Chat) => {
    setActiveChat(chat);
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }

    // TODO: Delete from backend
    // await deleteChat(chatId);
  }, [activeChat]);

  return {
    chats,
    activeChat,
    isLoading,
    createNewChat,
    sendMessage,
    selectChat,
    deleteChat,
    setActiveChat,
  };
};