import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Mic, Square, Zap, Hand } from 'lucide-react';
import { ConversionMode } from '../../types';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

// Loaded on demand — pulls in TensorFlow.js and MediaPipe only for sign input.
const SignCamera = lazy(() => import('./SignCamera').then((m) => ({ default: m.SignCamera })));

interface ChatInputProps {
  onSendMessage: (content: string, type: 'text' | 'audio' | 'visual') => void;
  inputMode: ConversionMode;
  isLoading: boolean;
  instantMode: boolean;
  /** Desktop: element the sign camera renders into (a big side column). Inline when null. */
  cameraHost?: HTMLElement | null;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  inputMode,
  isLoading,
  instantMode,
  cameraHost = null,
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const instantTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSignInput = inputMode === 'visual' && !instantMode;
  const isSpeechInput = inputMode === 'audio' && !instantMode;
  const [showCamera, setShowCamera] = useState(isSignInput);
  const lastSignedWordRef = useRef<string | null>(null);
  // Note: no backdrop-blur/transform on this bar — it would trap the camera's full-screen overlay.
  const [, setCameraExpanded] = useState(false);

  const speech = useSpeechRecognition((text) => {
    if (!isLoading) onSendMessage(text, 'audio');
  });

  useEffect(() => {
    setShowCamera(isSignInput);
  }, [isSignInput]);

  // Grow the text box with its content (up to its max height).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [message, speech.transcript]);

  const appendSignedWord = (word: string) => {
    lastSignedWordRef.current = word;
    setMessage((prev) => (prev.trim() ? `${prev.trimEnd()} ${word}` : word));
  };

  const replaceLastSignedWord = (word: string) => {
    const last = lastSignedWordRef.current;
    setMessage((prev) => {
      const trimmed = prev.trimEnd();
      return last && trimmed.endsWith(last) ? trimmed.slice(0, trimmed.length - last.length) + word : `${trimmed} ${word}`.trim();
    });
    lastSignedWordRef.current = word;
  };

  useEffect(() => {
    return () => {
      if (instantTimerRef.current) clearTimeout(instantTimerRef.current);
    };
  }, []);

  const sendCurrentMessage = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim(), isSignInput ? 'visual' : 'text');
      setMessage('');
      lastSignedWordRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendCurrentMessage();
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

  const getInputPlaceholder = () => {
    if (instantMode) return 'Type — signs appear after a short pause…';
    if (speech.listening) return 'Listening…';
    switch (inputMode) {
      case 'visual': return 'Recognised words appear here…';
      case 'audio': return speech.supported ? 'Tap the mic and speak, or type…' : 'Type a sentence to sign…';
      default: return 'Type a sentence to sign…';
    }
  };

  return (
    <div className="px-3 sm:px-5 pt-2 pb-3 sm:pb-4 bg-canvas">
      <div className="max-w-3xl mx-auto w-full">
        {isSignInput && (cameraHost || showCamera) && (() => {
          const camera = (
            <Suspense
              fallback={
                <div className="mb-3 rounded-2xl border border-line bg-surface h-48 flex items-center justify-center gap-2 text-sm text-ink-3">
                  <span className="w-4 h-4 rounded-full border-2 border-line-strong border-t-sign animate-spin" />
                  Loading camera…
                </div>
              }
            >
              <SignCamera
                onWord={appendSignedWord}
                onReplaceLastWord={replaceLastSignedWord}
                onClose={() => setShowCamera(false)}
                sentence={message}
                onSend={sendCurrentMessage}
                onClear={() => { setMessage(''); lastSignedWordRef.current = null; }}
                onExpandedChange={setCameraExpanded}
                layout={cameraHost ? 'panel' : 'inline'}
              />
            </Suspense>
          );
          return cameraHost ? createPortal(camera, cameraHost) : camera;
        })()}

        {isSpeechInput && (speech.error || !speech.supported) && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-warn-soft text-warn-ink text-xs">
            {speech.error || 'Speech input works in Chrome, Edge and Safari. You can still type here.'}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`flex items-end gap-1.5 p-1.5 rounded-2xl bg-surface border shadow-soft transition-[border-color,box-shadow] ${
            speech.listening ? 'border-danger/50 shadow-[0_0_0_4px_rgb(var(--danger)/0.12)]' : 'border-line focus-within:border-brand focus-within:shadow-ring'
          }`}
        >
          {isSpeechInput && speech.supported && (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              disabled={isLoading}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 ${
                speech.listening ? 'bg-danger text-white' : 'bg-brand-soft text-brand-ink hover:bg-brand/15'
              }`}
              aria-label={speech.listening ? 'Stop listening' : 'Speak'}
              title={speech.listening ? 'Stop listening' : 'Speak'}
            >
              {speech.listening && <span className="absolute inset-0 rounded-xl bg-danger animate-ping opacity-25" />}
              {speech.listening ? <Square size={15} className="relative fill-white" /> : <Mic size={18} />}
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={speech.listening ? speech.transcript : message}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={getInputPlaceholder()}
            readOnly={speech.listening}
            aria-label="Message"
            className="flex-1 min-w-0 block resize-none bg-transparent px-2.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 outline-none max-h-36 leading-relaxed"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          {isSignInput && !cameraHost && (
            <button
              type="button"
              onClick={() => setShowCamera((v) => !v)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                showCamera ? 'bg-sign-soft text-sign-ink' : 'text-ink-2 hover:bg-surface-2'
              }`}
              aria-label={showCamera ? 'Hide sign camera' : 'Sign with camera'}
              title={showCamera ? 'Hide sign camera' : 'Sign with camera'}
            >
              <Hand size={18} />
            </button>
          )}

          <button
            type="submit"
            disabled={!message.trim() || isLoading || speech.listening}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand text-white hover:bg-brand-hover transition-colors disabled:bg-surface-3 disabled:text-ink-3"
            aria-label="Send"
            title="Send"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </form>

        <div className="mt-2 px-1 flex items-center justify-between gap-3 text-[11px] text-ink-3">
          {instantMode ? (
            <span className="flex items-center gap-1.5 text-brand-ink font-medium">
              <Zap size={11} className="fill-current" /> Instant — signs after a 1 second pause
            </span>
          ) : speech.listening ? (
            <span className="flex items-center gap-1.5 text-danger font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" /> Listening — stop talking to send
            </span>
          ) : <span />}
          <span className="hidden sm:flex items-center gap-1">
            <span className="kbd">Enter</span> to send · <span className="kbd">Shift</span>+<span className="kbd">Enter</span> new line
          </span>
        </div>
      </div>
    </div>
  );
};
