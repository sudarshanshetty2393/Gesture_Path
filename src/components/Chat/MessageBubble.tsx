import React from 'react';
import { User, Bot, Clock, Eye, Volume2, Type, AlertTriangle, Hammer } from 'lucide-react';
import { Message } from '../../types';
import { Link } from 'react-router-dom';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const getTypeIcon = () => {
    switch (message.type) {
      case 'visual': return <Eye size={12} />;
      case 'audio': return <Volume2 size={12} />;
      case 'text': return <Type size={12} />;
      default: return null;
    }
  };

  const getTypeColor = () => {
    switch (message.type) {
      case 'visual': return 'text-emerald-400';
      case 'audio': return 'text-blue-400';
      case 'text': return 'text-purple-400';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <User size={14} className="text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border border-white/10 shadow-lg">
            <Bot size={14} className="text-blue-300" />
          </div>
        )}
      </div>

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-sm shadow-lg shadow-blue-500/20'
            : 'bg-gray-800/80 backdrop-blur-sm text-gray-100 rounded-tl-sm border border-white/5 shadow-lg'
        }`}>
          {!(message.role === 'assistant' && message.type === 'visual' && message.metadata?.sigml) && (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</div>
          )}

          {message.role === 'assistant' && message.type === 'visual' && message.metadata?.sigml && (
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <Eye size={13} className="text-emerald-400" />
              <span className="text-emerald-400">ISL animation playing</span>
            </div>
          )}

          {/* Missing words */}
          {message.metadata?.missingWords && message.metadata.missingWords.length > 0 && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <AlertTriangle size={13} />
                <span className="font-semibold text-xs tracking-wide uppercase">Missing Signs</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                These words aren't in the database yet:
              </p>
              <div className="flex flex-wrap gap-2">
                {message.metadata.missingWords.map((word, idx) => (
                  <Link
                    key={idx}
                    to={`/builder?word=${word}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-medium transition-all hover:scale-105"
                  >
                    <Hammer size={10} />
                    Create "{word}"
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mode metadata */}
          {message.metadata?.originalMode && message.metadata?.targetMode && (
            <div className={`mt-2 pt-2 border-t text-xs opacity-50 flex items-center gap-1 ${
              isUser ? 'border-blue-400/30' : 'border-white/10'
            }`}>
              <span className="capitalize">{message.metadata.originalMode}</span>
              <span>→</span>
              <span className="capitalize">{message.metadata.targetMode}</span>
              {message.metadata.processingTime !== undefined && message.metadata.processingTime > 0 && (
                <>
                  <span className="mx-1">·</span>
                  <Clock size={9} />
                  <span>{message.metadata.processingTime}ms</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Timestamp + type */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {message.type && (
            <span className={`flex items-center gap-1 text-xs ${getTypeColor()}`}>
              {getTypeIcon()}
              <span className="capitalize">{message.type}</span>
            </span>
          )}
          <span className="text-xs text-gray-600">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};