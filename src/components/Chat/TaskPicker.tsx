import React from 'react';
import { ChevronRight, Hand, MessageSquareText } from 'lucide-react';
import { TASKS, Task, toneClasses } from '../../modes';

interface TaskPickerProps {
  onPick: (task: Task) => void;
}

const GROUPS: Array<{ id: Task['group']; label: string; hint: string; icon: typeof Hand }> = [
  { id: 'to-sign', label: 'Into sign language', hint: 'An avatar signs your words', icon: MessageSquareText },
  { id: 'from-sign', label: 'From sign language', hint: 'Your camera reads your signs', icon: Hand },
];

export const TaskPicker: React.FC<TaskPickerProps> = ({ onPick }) => (
  <div className="grid gap-3 md:grid-cols-2">
    {GROUPS.map((group) => {
      const GroupIcon = group.icon;
      return (
        <section key={group.id} className="card p-2 shadow-soft">
          <header className="flex items-center gap-2.5 px-3 pt-2.5 pb-3">
            <GroupIcon size={15} className={group.id === 'from-sign' ? 'text-sign' : 'text-brand'} />
            <div>
              <h3 className="text-[13px] font-bold text-ink leading-tight">{group.label}</h3>
              <p className="text-xs text-ink-3">{group.hint}</p>
            </div>
          </header>
          <div className="space-y-0.5">
            {TASKS.filter((t) => t.group === group.id).map((task) => {
              const Icon = task.icon;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onPick(task)}
                  data-task={task.id}
                  className="group w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toneClasses(task)}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink">{task.title}</div>
                    <div className="text-xs text-ink-3 leading-snug">{task.description}</div>
                  </div>
                  <ChevronRight size={16} className="text-ink-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      );
    })}
  </div>
);
