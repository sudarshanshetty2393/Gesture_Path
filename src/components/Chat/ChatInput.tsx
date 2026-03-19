import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Image, StopCircle } from 'lucide-react';
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

  // Cleanup instant mode timer on unmount
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
      // Debounce instant mode — send after 1s of no typing
      if (instantTimerRef.current) clearTimeout(instantTimerRef.current);
      instantTimerRef.current = setTimeout(() => {
        if (value.trim()) {
          onSendMessage(value.trim(), 'text');
        }
      }, 1000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected

    const fileType = inputMode === 'visual' ? 'visual' : inputMode === 'audio' ? 'audio' : 'text';
    // For images/video, create a data URL and send as visual content
    const reader = new FileReader();
    reader.onload = () => {
      onSendMessage(`[File: ${file.name}]`, fileType);
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
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
    if (instantMode) return 'Type to convert in real-time...';
    switch (inputMode) {
      case 'visual': return 'Upload an image/video...';
      case 'audio': return 'Upload or record audio...';
      default: return 'Type your message here...';
    }
  };

  return (
    <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={getInputPlaceholder()}
            className="w-full resize-none rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-h-32"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {inputMode !== 'text' && !instantMode && (
            <div className="flex gap-1">
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
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Upload file"
              >
                {inputMode === 'visual' ? <Image size={20} /> : <Paperclip size={20} />}
              </button>

              {inputMode === 'audio' && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`p-2 rounded-lg transition-colors ${
                    isRecording
                      ? 'text-red-500 bg-red-100 dark:bg-red-900/20 animate-pulse'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            title="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </form>

      {instantMode && (
        <div className="mt-2 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          Instant mode — converts after 1s pause
        </div>
      )}
    </div>
  );
};