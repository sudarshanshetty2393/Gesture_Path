import React, { useState } from 'react';
import { AlertTriangle, Hammer, Play, Volume2, Copy, Check, Keyboard, Mic, Hand, AlertCircle } from 'lucide-react';
import { Message } from '../../types';
import { Link } from 'react-router-dom';

interface MessageBubbleProps {
  message: Message;
  /** Replays this message's signs on the avatar. */
  onPlay?: (sigml: string) => void;
  isCurrent?: boolean;
}

const INPUT_LABEL = {
  text: { icon: Keyboard, label: 'Typed' },
  audio: { icon: Mic, label: 'Spoken' },
  visual: { icon: Hand, label: 'Signed' },
} as const;

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onPlay, isCurrent }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const meta = message.metadata;
  const sigml = meta?.sigml;
  const isSignResult = !isUser && message.type === 'visual';
  const isTextResult = !isUser && meta?.originalMode === 'visual';
  const isError = !isUser && !meta;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — nothing to do.
    }
  };

  if (isUser) {
    const input = INPUT_LABEL[message.type ?? 'text'];
    const InputIcon = input.icon;
    return (
      <div className="flex justify-end animate-rise-in">
        <div className="max-w-[85%] sm:max-w-[70%] flex flex-col items-end gap-1.5">
          <div className="rounded-2xl rounded-br-md px-4 py-2.5 bg-brand text-white shadow-soft">
            <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{message.content}</div>
          </div>
          <div className="flex items-center gap-1.5 px-1 text-[11px] text-ink-3">
            <InputIcon size={11} />
            <span>{input.label}</span>
            <span aria-hidden="true">·</span>
            <time>{time(message.timestamp)}</time>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-rise-in">
      <img src="/images/Logo.svg" alt="" className="hidden sm:block w-8 h-8 rounded-lg mt-0.5 flex-shrink-0" />
      <div className="max-w-[92%] sm:max-w-[80%] flex flex-col gap-1.5 min-w-0">
        <div
          data-current={isCurrent ? 'true' : undefined}
          className={`rounded-2xl rounded-tl-md px-4 py-3 border transition-shadow ${
            isError
              ? 'bg-danger-soft border-danger/20 text-danger'
              : `bg-surface border-line text-ink shadow-soft ${isCurrent ? 'ring-2 ring-sign/40 border-sign/40' : ''}`
          }`}
        >
          {isSignResult && sigml ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-sign animate-pulse' : 'bg-sign/60'}`} />
                  Signed in ISL
                </span>
                {onPlay && (
                  <button onClick={() => onPlay(sigml)} className="btn btn-sign btn-sm" title="Play these signs on the avatar">
                    <Play size={12} className="fill-current" />
                    Play
                  </button>
                )}
              </div>
              {meta?.signedWords && meta.signedWords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {meta.signedWords.map((w, i) => (
                    <span key={i} className="chip text-[13px] px-2.5 py-1 text-ink">{w}</span>
                  ))}
                </div>
              )}
            </div>
          ) : isTextResult ? (
            <div className="space-y-2.5">
              <div className="text-[17px] font-medium leading-relaxed whitespace-pre-wrap break-words">{message.content}</div>
              <div className="flex items-center gap-1 -ml-2">
                <button onClick={() => speak(message.content)} className="btn btn-ghost btn-sm" title="Read aloud">
                  <Volume2 size={13} /> Speak
                </button>
                <button onClick={copy} className="btn btn-ghost btn-sm" title="Copy text">
                  {copied ? <Check size={13} className="text-sign" /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm leading-relaxed">
              {isError && <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />}
              <span className="whitespace-pre-wrap break-words">{message.content}</span>
            </div>
          )}

          {meta?.missingWords && meta.missingWords.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-warn-soft border border-warn/20">
              <div className="flex items-center gap-2 text-warn-ink mb-1">
                <AlertTriangle size={13} />
                <span className="font-semibold text-xs">
                  No sign yet for {meta.missingWords.length === 1 ? 'this word' : 'these words'}
                </span>
              </div>
              <p className="text-xs text-ink-2 mb-2.5">
                {meta.missingWords.length === 1 ? 'It was' : 'They were'} skipped. You can create the sign:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {meta.missingWords.map((word, idx) => (
                  <Link
                    key={idx}
                    to={`/builder?word=${encodeURIComponent(word)}`}
                    className="btn btn-sm bg-surface border border-warn/30 text-warn-ink hover:bg-warn-soft"
                  >
                    <Hammer size={11} />
                    Create "{word}"
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <time className="px-1 text-[11px] text-ink-3">{time(message.timestamp)}</time>
      </div>
    </div>
  );
};
