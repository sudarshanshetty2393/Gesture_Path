import React, { useRef, useEffect, useState, useMemo } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TaskPicker } from './TaskPicker';
import Avatar from '../Avatar';
import { Message, ConversionSettings } from '../../types';
import { taskFor, toneClasses, TEXT_EXAMPLES } from '../../modes';
import { ChevronDown, ChevronUp, Repeat2, ShieldCheck, Hand, Sparkles, Camera, Mic, Keyboard } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string, type: 'text' | 'audio' | 'visual') => void;
  conversionSettings: ConversionSettings;
  isLoading: boolean;
  instantMode: boolean;
  showWelcome?: boolean;
  onNewChat?: () => void;
  onPickTask: (settings: ConversionSettings) => void;
  activeSigml?: string | null;
  playKey?: number;
  onPlay?: (sigml: string) => void;
}

// The avatar canvas is created once at this size (see Avatar.tsx), so pick it
// from the screen width at first render.
const AVATAR_SIZE = typeof window !== 'undefined' && window.innerWidth < 1024
  ? { width: 240, height: 270 }
  : { width: 320, height: 360 };

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  conversionSettings,
  isLoading,
  instantMode,
  showWelcome = false,
  onNewChat,
  onPickTask,
  activeSigml = null,
  playKey = 0,
  onPlay,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [stageCollapsed, setStageCollapsed] = useState(false);
  const task = taskFor(instantMode ? { inputMode: 'text', outputMode: 'visual', instantMode: true } : conversionSettings);
  const TaskIcon = task.icon;
  const showStage = !showWelcome && (instantMode || conversionSettings.outputMode === 'visual');
  // Desktop sign input: the camera gets its own big column (ChatInput portals it in).
  const isDesktop = useIsDesktop();
  const signsInput = !showWelcome && !instantMode && conversionSettings.inputMode === 'visual';
  const cameraColumn = signsInput && isDesktop;
  const [cameraHost, setCameraHost] = useState<HTMLElement | null>(null);

  const currentSignMessage = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant' && m.metadata?.sigml === activeSigml && activeSigml),
    [messages, activeSigml],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (activeSigml) setStageCollapsed(false);
  }, [activeSigml, playKey]);

  return (
    <div
      className={`flex-1 min-h-0 grid grid-cols-1 grid-rows-[minmax(0,1fr)_auto_auto] ${
        showStage
          ? 'lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)_auto]'
          : cameraColumn
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:grid-rows-[minmax(0,1fr)_auto]'
            : 'lg:grid-rows-[minmax(0,1fr)_auto]'
      }`}
    >
      {/* ── Conversation ─────────────────────────────────────────── */}
      <div className="row-start-1 col-start-1 min-h-0 flex flex-col">
        {!showWelcome && (
          <div className="flex items-center gap-3 px-4 sm:px-5 h-12 border-b border-line bg-surface/60 flex-shrink-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${toneClasses(task)}`}>
              <TaskIcon size={14} />
            </div>
            <div className="min-w-0 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-ink whitespace-nowrap">{task.title}</span>
              <span className="hidden md:inline text-xs text-ink-3 truncate">{task.description}</span>
            </div>
            {onNewChat && (
              <button onClick={onNewChat} className="btn btn-ghost btn-sm ml-auto">
                <Repeat2 size={13} /> Change mode
              </button>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {showWelcome ? (
            <Welcome onPick={onPickTask} />
          ) : messages.length === 0 ? (
            <EmptyState taskId={task.id} onExample={(text) => onSendMessage(text, 'text')} />
          ) : (
            <div className="px-3 sm:px-6 py-6 space-y-6 max-w-3xl mx-auto w-full">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onPlay={onPlay}
                  isCurrent={!!activeSigml && message === currentSignMessage}
                />
              ))}
              {isLoading && (
                <div className="flex gap-3 animate-rise-in" aria-live="polite" aria-label="Translating">
                  <div className="hidden sm:flex w-8 h-8 rounded-full bg-surface border border-line items-center justify-center flex-shrink-0">
                    <Sparkles size={14} className="text-brand" />
                  </div>
                  <div className="card rounded-tl-md px-4 py-3.5 shadow-soft">
                    <div className="flex items-center gap-1.5">
                      {[0, 0.15, 0.3].map((delay, i) => (
                        <div key={i} className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── Avatar stage (always mounted — see Avatar.tsx) ───────── */}
      <aside
        aria-label="Sign language avatar"
        className={
          showStage
            ? `row-start-2 col-start-1 lg:row-start-1 lg:row-span-2 lg:col-start-2 border-t lg:border-t-0 lg:border-l border-line bg-surface ${
                // Hidden with zero height, never display:none — the avatar's WebGL canvas must keep its layout.
                activeSigml ? '' : 'max-lg:h-0 max-lg:overflow-hidden max-lg:border-t-0'
              }`
            : 'absolute w-0 h-0 overflow-hidden'
        }
      >
        <div className="h-full flex flex-col lg:overflow-y-auto">
          <div className="flex items-center justify-between px-4 h-11 lg:h-12 lg:border-b border-line flex-shrink-0">
            <span className="eyebrow">Signing avatar</span>
            <button
              onClick={() => setStageCollapsed((v) => !v)}
              className="lg:hidden btn btn-ghost btn-sm -mr-2"
              aria-expanded={!stageCollapsed}
            >
              {stageCollapsed ? <><ChevronUp size={13} /> Show</> : <><ChevronDown size={13} /> Hide</>}
            </button>
          </div>
          <div className={`flex flex-col items-center gap-4 px-4 pb-4 lg:pt-6 ${stageCollapsed ? 'max-lg:h-0 max-lg:overflow-hidden max-lg:pb-0' : ''}`}>
            <Avatar sigmlData={activeSigml} width={AVATAR_SIZE.width} height={AVATAR_SIZE.height} playKey={playKey} />
            {currentSignMessage?.metadata?.signedWords?.length ? (
              <div className="w-full max-w-[340px] hidden lg:block">
                <div className="eyebrow mb-2">Now signing</div>
                <div className="flex flex-wrap gap-1.5">
                  {currentSignMessage.metadata.signedWords.map((w, i) => (
                    <span key={i} className="chip bg-sign-soft text-sign-ink border-transparent">{w}</span>
                  ))}
                </div>
              </div>
            ) : !activeSigml ? (
              <p className="hidden lg:block text-[13px] leading-relaxed text-ink-3 text-center max-w-[300px]">
                Your messages are signed here. Press <span className="font-semibold text-ink-2">Play</span> on an earlier reply to watch it again.
              </p>
            ) : null}
          </div>
        </div>
      </aside>

      {cameraColumn && (
        <section
          ref={setCameraHost}
          aria-label="Sign camera"
          className="lg:row-start-1 lg:row-span-2 lg:col-start-2 border-l border-line min-h-0 bg-black"
        />
      )}

      {/* ── Input ────────────────────────────────────────────────── */}
      {!showWelcome && (
        <div className="row-start-3 col-start-1 lg:row-start-2">
          <ChatInput
            onSendMessage={onSendMessage}
            inputMode={instantMode ? 'text' : conversionSettings.inputMode}
            isLoading={isLoading}
            instantMode={conversionSettings.instantMode || instantMode}
            cameraHost={cameraColumn ? cameraHost : null}
          />
        </div>
      )}
    </div>
  );
};

function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return matches;
}

const Welcome: React.FC<{ onPick: (settings: ConversionSettings) => void }> = ({ onPick }) => (
  <div className="relative min-h-full">
    {/* Soft brand wash behind the hero */}
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-80 pointer-events-none opacity-70 dark:opacity-40"
      style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgb(var(--brand) / 0.10), transparent 70%), radial-gradient(40% 80% at 85% 10%, rgb(var(--sign) / 0.10), transparent 70%)' }}
    />
    <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12">
      <div className="text-center max-w-2xl mx-auto mb-10 animate-rise-in">
        <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-surface border border-line text-xs font-semibold text-ink-2 shadow-soft mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-sign" />
          Indian Sign Language, both ways
        </span>
        <h1 className="text-[34px] leading-[1.1] sm:text-5xl sm:leading-[1.08] font-extrabold tracking-tight text-ink mb-4">
          Speak, type or sign —{' '}
          <span className="text-brand">we’ll translate</span>
        </h1>
        <p className="text-base sm:text-lg text-ink-2 leading-relaxed">
          An avatar signs your words in ISL, and your camera turns signs back into text and speech.
        </p>
      </div>

      <TaskPicker onPick={(t) => onPick(t.settings)} />

      <ul className="mt-8 grid gap-3 sm:grid-cols-3 text-sm">
        {[
          { icon: Sparkles, title: '860 avatar signs', text: 'Words and phrases the avatar can perform' },
          { icon: Hand, title: '263 words recognised', text: 'Common ISL signs read from your camera' },
          { icon: ShieldCheck, title: 'Private by design', text: 'Camera video is processed in your browser' },
        ].map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 p-3">
            <Icon size={16} className="text-ink-3 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-ink">{title}</div>
              <div className="text-ink-3 text-[13px] leading-snug">{text}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const EmptyState: React.FC<{ taskId: string; onExample: (text: string) => void }> = ({ taskId, onExample }) => {
  const fromSign = taskId === 'sign-text' || taskId === 'sign-speech';
  const Icon = fromSign ? Camera : taskId === 'speech-sign' ? Mic : Keyboard;
  const tone = fromSign ? 'bg-sign-soft text-sign-ink' : 'bg-brand-soft text-brand-ink';

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="max-w-md text-center animate-rise-in">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${tone}`}>
          <Icon size={24} />
        </div>
        {fromSign ? (
          <>
            <h3 className="text-xl font-bold tracking-tight text-ink mb-4">Sign to your camera</h3>
            <ol className="text-sm text-ink-2 space-y-3 text-left">
              {[
                <>Sit back so your <b className="font-semibold text-ink">head, shoulders and hands</b> are in view.</>,
                <>Make one sign, then <b className="font-semibold text-ink">pause for a moment</b> or lower your hands.</>,
                <>Each recognised word is added to the message. Edit it if needed, then send.</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface border border-line text-xs font-bold text-ink-2 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-ink-3 mt-5">Tip: use full screen on the camera for a bigger view.</p>
          </>
        ) : taskId === 'speech-sign' ? (
          <>
            <h3 className="text-xl font-bold tracking-tight text-ink mb-2">Speak to translate</h3>
            <p className="text-sm text-ink-2 leading-relaxed">Tap the microphone and say a sentence — the avatar will sign it. You can also type.</p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold tracking-tight text-ink mb-2">
              {taskId === 'instant' ? 'Start typing' : 'What would you like to sign?'}
            </h3>
            <p className="text-sm text-ink-2 leading-relaxed mb-6">
              {taskId === 'instant'
                ? 'Signs appear automatically after a short pause.'
                : 'Type a sentence and the avatar will sign it in Indian Sign Language. Or try one of these:'}
            </p>
            {taskId !== 'instant' && (
              <div className="flex flex-wrap justify-center gap-2">
                {TEXT_EXAMPLES.map((text) => (
                  <button key={text} onClick={() => onExample(text)} className="btn btn-secondary btn-sm rounded-full h-8 px-3.5 font-medium">
                    {text}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
