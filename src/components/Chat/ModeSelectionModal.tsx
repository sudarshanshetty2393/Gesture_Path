import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ConversionSettings } from '../../types';
import { TaskPicker } from './TaskPicker';

interface ModeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: ConversionSettings) => void;
}

export const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({ isOpen, onClose, onConfirm }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-6 z-50" role="dialog" aria-modal="true" aria-labelledby="mode-title">
      <div className="absolute inset-0 bg-ink/40 dark:bg-black/70 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl max-h-[92dvh] overflow-y-auto bg-canvas rounded-t-3xl sm:rounded-3xl border border-line shadow-lift animate-sheet-in">
        <div className="sm:hidden w-10 h-1 rounded-full bg-line-strong mx-auto mt-2.5" />
        <div className="flex items-start justify-between px-5 sm:px-6 pt-4 sm:pt-6 pb-4">
          <div>
            <h2 id="mode-title" className="text-lg font-bold text-ink tracking-tight">Start a conversation</h2>
            <p className="text-sm text-ink-3 mt-0.5">Choose how you want to communicate.</p>
          </div>
          <button onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-3 sm:px-6 pb-5 sm:pb-6">
          <TaskPicker
            onPick={(task) => {
              onConfirm(task.settings);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
