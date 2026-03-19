import React, { useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/Auth/AuthModal';
import { Header } from './components/Layout/Header';
import { ChatArea } from './components/Chat/ChatArea';
import { ModeSelectionModal } from './components/Chat/ModeSelectionModal';
import { useChat } from './hooks/useChat';
import { ConversionSettings } from './types';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Builder from './components/Builder';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const {
    activeChat,
    instantMessages,
    isLoading: chatLoading,
    createNewChat,
    sendMessage,
    setActiveChat,
    clearInstantMessages,
    resetAll,
  } = useChat();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [conversionSettings, setConversionSettings] = useState<ConversionSettings>({
    inputMode: 'text',
    outputMode: 'visual',
    instantMode: false,
  });
  const [instantModeActive, setInstantModeActive] = useState(false);

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

  const handleNewChat = () => {
    if (instantModeActive) {
      setInstantModeActive(false);
      clearInstantMessages();
    }
    setShowModeSelection(true);
  };

  const handleModeConfirm = (settings: ConversionSettings) => {
    setConversionSettings(settings);
    if (!settings.instantMode) {
      createNewChat(settings);
    } else {
      setActiveChat(null);
      clearInstantMessages();
    }
    setInstantModeActive(settings.instantMode);
  };

  const handleSendMessage = (content: string, type: 'text' | 'audio' | 'visual') => {
    if (instantModeActive || activeChat) {
      sendMessage(content, type, conversionSettings);
    }
  };

  const handleInstantMode = () => {
    setInstantModeActive(true);
    setActiveChat(null);
    clearInstantMessages();
    setConversionSettings({
      inputMode: 'text',
      outputMode: 'visual',
      instantMode: true,
    });
  };

  const currentMessages = instantModeActive
    ? instantMessages
    : (activeChat?.messages || []);

  // Derive latest sigml from messages — used by the always-mounted Avatar below
  const activeSigml = useMemo(() => {
    const last = [...currentMessages].reverse().find(
      (m) => m.role === 'assistant' && m.metadata?.sigml
    );
    return last?.metadata?.sigml ?? null;
  }, [currentMessages]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Routes>
        <Route path="/builder" element={<Builder initialWord={builderWord} onClose={() => navigate('/')} />} />
        <Route path="/" element={
          <>
            <Header onNewChat={handleNewChat} />

            <div className="flex flex-1 overflow-hidden">
              <main className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
                <ChatArea
                  messages={currentMessages}
                  onSendMessage={handleSendMessage}
                  conversionSettings={conversionSettings}
                  isLoading={chatLoading}
                  instantMode={instantModeActive}
                  showWelcome={!activeChat && !instantModeActive}
                  onNewChat={handleNewChat}
                  onInstantMode={handleInstantMode}
                  activeSigml={activeSigml}
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
