import React, { useRef, useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Message, ConversionSettings } from '../../types';
import { Bot, Sparkles } from 'lucide-react';
import Avatar from '../Avatar';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string, type: 'text' | 'audio' | 'visual') => void;
  conversionSettings: ConversionSettings;
  isLoading: boolean;
  instantMode: boolean;
  showWelcome?: boolean;
  onNewChat?: () => void;
  onInstantMode?: () => void;
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
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeSigml, setActiveSigml] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSigml]);

  // Update activeSigml whenever the latest assistant message has sigml
  useEffect(() => {
    const last = [...messages].reverse().find(
      (m) => m.role === 'assistant' && m.metadata?.sigml
    );
    if (last?.metadata?.sigml) {
      setActiveSigml(last.metadata.sigml);
    }
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* Welcome screen */}
        {showWelcome ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-2xl">
              <img src="/images/Logo.svg" alt="Gesture Path" className="w-20 h-20 rounded-3xl mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to Gesture Path
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Convert text to Indian Sign Language animations
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={onNewChat}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Start New Conversion
                </button>
                <button
                  onClick={onInstantMode}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Try Instant Mode
                </button>
              </div>
            </div>
          </div>

        ) : messages.length === 0 ? (
          /* Empty chat state */
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className={`w-16 h-16 bg-gradient-to-br ${instantMode ? 'from-purple-500 to-pink-600' : 'from-blue-500 to-purple-600'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                {instantMode ? <Sparkles size={32} className="text-white" /> : <Bot size={32} className="text-white" />}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {instantMode ? 'Instant Conversion Mode' : 'Ready to Convert'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {instantMode
                  ? 'Type and pause — converts automatically'
                  : <>
                      Converting from <span className="font-medium capitalize">{conversionSettings.inputMode}</span> to{' '}
                      <span className="font-medium capitalize">{conversionSettings.outputMode}</span>
                    </>
                }
              </p>
            </div>
          </div>

        ) : (
          /* Messages */
          <div className="space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
              />
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/*
         * ISL Avatar — always in DOM so CWASA's WebGL canvas stays persistent.
         * Hidden via overflow:hidden on welcome screen so it takes no visible space,
         * but CWASAAvatar keeps its explicit CSS dimensions → WebGL context is maintained.
         * position:fixed/-9999px caused browsers to drop the WebGL context.
         */}
        <div
          style={
            showWelcome
              ? { height: 0, overflow: 'hidden' }
              : { marginTop: '16px', display: 'flex', justifyContent: 'center' }
          }
        >
          <Avatar sigmlData={activeSigml} width={300} height={320} />
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input — hidden on welcome screen */}
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