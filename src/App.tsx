import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/Auth/AuthModal';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { ChatArea } from './components/Chat/ChatArea';
import { ModeSelectionModal } from './components/Chat/ModeSelectionModal';
import { useChat } from './hooks/useChat';
import { ConversionSettings } from './types';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Builder from './components/Builder';

function AppContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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
  } = useChat();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    if (!authLoading && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [authLoading, isAuthenticated]);

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Routes>
        <Route path="/builder" element={<Builder initialWord={builderWord} onClose={() => navigate('/')} />} />
        <Route path="/" element={
          <>
            <Header
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onNewChat={handleNewChat}
              isSidebarOpen={isSidebarOpen}
            />

            <div className="flex flex-1 overflow-hidden">
              <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                chats={chats}
                activeChat={activeChat}
                onSelectChat={(chat) => {
                  setInstantModeActive(false);
                  selectChat(chat);
                }}
                onDeleteChat={deleteChat}
                onInstantMode={handleInstantMode}
                instantModeActive={instantModeActive}
              />

              <main className="flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
                {/*
                  * ChatArea is always mounted once authenticated.
                  * This keeps the Avatar (and CWASAPanel av0 div) permanently in the DOM
                  * so CWASA never loses its reference to the canvas on re-init.
                  * Welcome state is rendered inside ChatArea when messages are empty.
                  */}
                <ChatArea
                  messages={currentMessages}
                  onSendMessage={handleSendMessage}
                  conversionSettings={conversionSettings}
                  isLoading={chatLoading}
                  instantMode={instantModeActive}
                  showWelcome={!activeChat && !instantModeActive}
                  onNewChat={handleNewChat}
                  onInstantMode={handleInstantMode}
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
