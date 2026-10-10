import { Keyboard, Mic, Hand, Volume2, Zap, LucideIcon } from 'lucide-react';
import { ConversionSettings } from './types';

export type TaskId = 'text-sign' | 'instant' | 'speech-sign' | 'sign-text' | 'sign-speech';

export interface Task {
  id: TaskId;
  title: string;
  description: string;
  icon: LucideIcon;
  group: 'to-sign' | 'from-sign';
  settings: ConversionSettings;
}

// The internal model stays ConversionSettings (input → output), so existing
// flows are unchanged; these are the combinations that actually work.
export const TASKS: Task[] = [
  {
    id: 'text-sign', group: 'to-sign', title: 'Text → Sign', icon: Keyboard,
    description: 'Type a sentence and the avatar signs it',
    settings: { inputMode: 'text', outputMode: 'visual', instantMode: false },
  },
  {
    id: 'instant', group: 'to-sign', title: 'Instant Text → Sign', icon: Zap,
    description: 'Signs automatically as you type',
    settings: { inputMode: 'text', outputMode: 'visual', instantMode: true },
  },
  {
    id: 'speech-sign', group: 'to-sign', title: 'Speech → Sign', icon: Mic,
    description: 'Speak and the avatar signs what you said',
    settings: { inputMode: 'audio', outputMode: 'visual', instantMode: false },
  },
  {
    id: 'sign-text', group: 'from-sign', title: 'Sign → Text', icon: Hand,
    description: 'Sign to your camera and get text',
    settings: { inputMode: 'visual', outputMode: 'text', instantMode: false },
  },
  {
    id: 'sign-speech', group: 'from-sign', title: 'Sign → Speech', icon: Volume2,
    description: 'Sign to your camera and hear it spoken',
    settings: { inputMode: 'visual', outputMode: 'audio', instantMode: false },
  },
];

/** Soft icon-tile colours: blue for "into sign", teal for "from sign". */
export const toneClasses = (task: Task) =>
  task.group === 'from-sign' ? 'bg-sign-soft text-sign-ink' : 'bg-brand-soft text-brand-ink';

export function taskFor(settings: ConversionSettings | undefined): Task {
  if (!settings) return TASKS[0];
  if (settings.instantMode) return TASKS[1];
  return (
    TASKS.find(
      (t) => !t.settings.instantMode
        && t.settings.inputMode === settings.inputMode
        && t.settings.outputMode === settings.outputMode,
    )
    // Combinations from older chats that no longer exist map by input type.
    ?? (settings.inputMode === 'visual' ? TASKS[3] : settings.inputMode === 'audio' ? TASKS[2] : TASKS[0])
  );
}

export const TEXT_EXAMPLES = ['hello how are you', 'thank you', 'please help me', 'i love you', 'good night'];
