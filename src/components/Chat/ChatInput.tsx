import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Image, StopCircle, Zap } from 'lucide-react';
import { ConversionMode } from '../../types';

interface ChatInputProps {
  onSendMessage: (content: string, type: 'text' | 'audio' | 'visual') => void;
  inputMode: ConversionMode;
  isLoading: boolean;
  instantMode: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  inputMode,
  isLoading,
  instantMode,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const instantTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (instantTimerRef.current) clearTimeout(instantTimerRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
    }
  };

  const handleTextChange = (value: string) => {
    setMessage(value);
    if (instantMode && value.trim().length > 2) {
      if (instantTimerRef.current) clearTimeout(instantTimerRef.current);
      instantTimerRef.current = setTimeout(() => {
        if (value.trim()) onSendMessage(value.trim(), 'text');
      }, 1000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const fileType = inputMode === 'visual' ? 'visual' : inputMode === 'audio' ? 'audio' : 'text';
    const reader = new FileReader();
    reader.onload = () => { onSendMessage(`[File: ${file.name}]`, fileType); };
    reader.readAsDataURL(file);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          onSendMessage('[Audio Recording]', 'audio');
        };
        mediaRecorder.start();
        setIsRecording(true);
      } catch {
        alert('Microphone permission denied. Please allow mic access.');
      }
    }
  };

  const getInputPlaceholder = () => {
    if (instantMode) return 'Type to convert in real-time…';
    switch (inputMode) {
      case 'visual': return 'Upload an image or video…';
      case 'audio': return 'Upload or record audio…';
      default: return 'Type a message to convert to ISL…';
    }
  };

  return (
    <div className="border-t border-white/5 bg-gray-900/80 backdrop-blur-xl px-4 py-3">
      {instantMode && (
        <div className="flex items-center gap-2 mb-2 text-xs text-purple-400">
          <Zap size={11} className="fill-purple-400" />
          <span>Instant mode — converts after 1s pause</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={getInputPlaceholder()}
            className="w-full resize-none bg-gray-800/60 border border-white/10 rounded-2xl px-4 py-3 pr-4 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 transition-all max-h-32 text-sm leading-relaxed"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>

        <div className="flex items-center gap-1.5 pb-0.5">
          {inputMode !== 'text' && !instantMode && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={inputMode === 'visual' ? 'image/*,video/*' : 'audio/*'}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-xl transition-colors"
                title="Upload file"
              >
                {inputMode === 'visual' ? <Image size={18} /> : <Paperclip size={18} />}
              </button>

              {inputMode === 'audio' && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`p-2.5 rounded-xl transition-all ${
                    isRecording
                      ? 'text-red-400 bg-red-500/15 border border-red-500/30 animate-pulse'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
                </button>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:shadow-none"
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
