import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import Avatar from '../Avatar';
import { Message, ConversionSettings } from '../../types';
import { Bot, Sparkles, ArrowRight } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string, type: 'text' | 'audio' | 'visual') => void;
  conversionSettings: ConversionSettings;
  isLoading: boolean;
  instantMode: boolean;
  showWelcome?: boolean;
  onNewChat?: () => void;
  onInstantMode?: () => void;
  activeSigml?: string | null;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  conversionSettings,
  isLoading,
  instantMode,
  showWelcome = false,
  onNewChat,
  onInstantMode,
  activeSigml = null,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">

      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto">

        {/* Welcome screen */}
        {showWelcome ? (
          <div className="flex items-center justify-center min-h-full p-8 relative overflow-hidden">
            {/* Background orbs */}
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative text-center max-w-lg">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-xl" />
                <img src="/images/Logo.svg" alt="Gesture Path" className="relative w-20 h-20 rounded-3xl shadow-2xl" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-3">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Gesture Path
                </span>
              </h1>
              <p className="text-gray-400 mb-10 text-lg">
                Convert text to Indian Sign Language animations in real-time
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={onNewChat}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
                >
                  Start New Conversion
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={onInstantMode}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-2xl font-semibold transition-all hover:scale-105"
                >
                  <Sparkles size={16} />
                  Try Instant Mode
                </button>
              </div>
            </div>
          </div>

        ) : messages.length === 0 ? (
          /* Empty chat state */
          <div className="flex items-center justify-center min-h-full p-8">
            <div className="text-center max-w-sm">
              <div className={`w-16 h-16 bg-gradient-to-br ${instantMode ? 'from-purple-500 to-pink-600 shadow-purple-500/30' : 'from-blue-500 to-indigo-600 shadow-blue-500/30'} rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl`}>
                {instantMode ? <Sparkles size={28} className="text-white" /> : <Bot size={28} className="text-white" />}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {instantMode ? 'Instant Conversion Mode' : 'Ready to Convert'}
              </h3>
              <p className="text-gray-500 text-sm">
                {instantMode
                  ? 'Type and pause — converts automatically'
                  : <>
                      <span className="text-gray-400 font-medium capitalize">{conversionSettings.inputMode}</span>
                      {' '}→{' '}
                      <span className="text-gray-400 font-medium capitalize">{conversionSettings.outputMode}</span>
                    </>
                }
              </p>
            </div>
          </div>

        ) : (
          /* Messages */
          <div className="px-4 py-6 space-y-5">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={14} className="text-blue-300" />
                </div>
                <div className="bg-gray-800/80 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ISL Avatar — always in DOM */}
        <div style={{
          overflow: 'hidden',
          height: activeSigml ? 'auto' : '0',
          display: 'flex',
          justifyContent: 'flex-start',
          paddingLeft: activeSigml ? '48px' : '0',
          paddingTop: activeSigml ? '8px' : '0',
          paddingBottom: activeSigml ? '8px' : '0',
        }}>
          <Avatar sigmlData={activeSigml} width={320} height={360} />
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!showWelcome && (
        <ChatInput
          onSendMessage={onSendMessage}
          inputMode={instantMode ? 'text' : conversionSettings.inputMode}
          isLoading={isLoading}
          instantMode={conversionSettings.instantMode || instantMode}
        />
      )}
    </div>
  );
};
