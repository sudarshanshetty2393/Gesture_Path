import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/Auth/AuthModal';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { ChatArea } from './components/Chat/ChatArea';
import { ModeSelectionModal } from './components/Chat/ModeSelectionModal';
import { useChat } from './hooks/useChat';
import { Chat, ConversionSettings } from './types';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Builder from './components/Builder';

const DEFAULT_SETTINGS: ConversionSettings = { inputMode: 'text', outputMode: 'visual', instantMode: false };
const isDesktop = () => window.innerWidth >= 1024;

function AppContent() {
  const { isAuthenticated } = useAuth();
  const {
    chats,
    activeChat,
    instantMessages,
    isLoading: chatLoading,
    createNewChat,
    sendMessage,
    selectChat,
    deleteChat,
    setActiveChat,
    clearInstantMessages,
    resetAll,
  } = useChat();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [conversionSettings, setConversionSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [instantModeActive, setInstantModeActive] = useState(false);
  // "Play" on an earlier message overrides the latest signs until a new one arrives.
  const [replay, setReplay] = useState<{ sigml: string; key: number } | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const builderWord = queryParams.get('word') || '';

  React.useEffect(() => {
    if (!isAuthenticated) {
      // Logout — clear all chat state so next login starts fresh
      resetAll();
      setInstantModeActive(false);
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [isAuthenticated]);

  const closeSidebarOnMobile = () => { if (!isDesktop()) setSidebarOpen(false); };

  const handleNewChat = () => {
    if (instantModeActive) {
      setInstantModeActive(false);
      clearInstantMessages();
    }
    setShowModeSelection(true);
    closeSidebarOnMobile();
  };

  // Logo → dashboard (welcome screen) from anywhere: chat, instant mode or the builder.
  const handleGoHome = () => {
    setActiveChat(null);
    setInstantModeActive(false);
    clearInstantMessages();
    setReplay(null);
    setShowModeSelection(false);
    closeSidebarOnMobile();
    if (location.pathname !== '/') navigate('/');
  };

  const handleModeConfirm = (settings: ConversionSettings) => {
    setConversionSettings(settings);
    setReplay(null);
    if (!settings.instantMode) {
      createNewChat(settings);
    } else {
      setActiveChat(null);
      clearInstantMessages();
    }
    setInstantModeActive(settings.instantMode);
  };

  const handleSelectChat = (chat: Chat) => {
    setInstantModeActive(false);
    setConversionSettings(chat.settings ?? DEFAULT_SETTINGS);
    setReplay(null);
    selectChat(chat);
    closeSidebarOnMobile();
  };

  const handleSendMessage = (content: string, type: 'text' | 'audio' | 'visual') => {
    if (instantModeActive || activeChat) {
      sendMessage(content, type, conversionSettings);
    }
  };

  const currentMessages = instantModeActive
    ? instantMessages
    : (activeChat?.messages || []);

  // Derive latest sigml from messages — used by the always-mounted Avatar
  const latestSigml = useMemo(() => {
    const last = [...currentMessages].reverse().find(
      (m) => m.role === 'assistant' && m.metadata?.sigml
    );
    return last?.metadata?.sigml ?? null;
  }, [currentMessages]);

  useEffect(() => { setReplay(null); }, [latestSigml]);

  const handlePlay = useCallback((sigml: string) => {
    setReplay((prev) => ({ sigml, key: (prev?.key ?? 0) + 1 }));
  }, []);

  const activeSigml = replay?.sigml ?? latestSigml;

  return (
    <div className="h-[100dvh] bg-canvas flex flex-col">
      <Routes>
        <Route path="/builder" element={<div className="flex-1 overflow-y-auto"><Builder initialWord={builderWord} onClose={() => navigate('/')} onHome={handleGoHome} /></div>} />
        <Route path="/" element={
          <>
            <Header onNewChat={handleNewChat} onToggleSidebar={() => setSidebarOpen((v) => !v)} onHome={handleGoHome} />

            <div className="flex flex-1 min-h-0">
              <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                chats={chats}
                activeChatId={instantModeActive ? null : activeChat?.id ?? null}
                onSelectChat={handleSelectChat}
                onDeleteChat={deleteChat}
                onNewChat={handleNewChat}
              />
              <main className="flex-1 min-w-0 flex flex-col">
                <ChatArea
                  messages={currentMessages}
                  onSendMessage={handleSendMessage}
                  conversionSettings={conversionSettings}
                  isLoading={chatLoading}
                  instantMode={instantModeActive}
                  showWelcome={!activeChat && !instantModeActive}
                  onNewChat={handleNewChat}
                  onPickTask={handleModeConfirm}
                  activeSigml={activeSigml}
                  playKey={replay?.key ?? 0}
                  onPlay={handlePlay}
                />
              </main>
            </div>

            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
            />

            <ModeSelectionModal
              isOpen={showModeSelection}
              onClose={() => setShowModeSelection(false)}
              onConfirm={handleModeConfirm}
            />
          </>
        } />
      </Routes>

    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
