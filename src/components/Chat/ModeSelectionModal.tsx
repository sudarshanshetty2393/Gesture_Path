import React, { useState } from 'react';
import { X, Eye, Volume2, Type, ArrowRight, Zap } from 'lucide-react';
import { ConversionMode, ConversionSettings } from '../../types';

interface ModeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: ConversionSettings) => void;
}

const modes = [
  {
    id: 'visual' as ConversionMode,
    name: 'Visual / ISL',
    description: 'Sign language animations',
    icon: Eye,
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/20',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 'audio' as ConversionMode,
    name: 'Audio',
    description: 'Voice & sound files',
    icon: Volume2,
    color: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/20',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'text' as ConversionMode,
    name: 'Text',
    description: 'Written content',
    icon: Type,
    color: 'from-purple-500 to-violet-600',
    glow: 'shadow-purple-500/20',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
  },
];

export const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [inputMode, setInputMode] = useState<ConversionMode>('text');
  const [outputMode, setOutputMode] = useState<ConversionMode>('visual');
  const [instantMode, setInstantMode] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({ inputMode, outputMode, instantMode });
    onClose();
  };

  const ModeSelector = ({
    title,
    selected,
    onSelect,
  }: {
    title: string;
    selected: ConversionMode;
    onSelect: (mode: ConversionMode) => void;
  }) => (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selected === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                isSelected
                  ? `${mode.bg} ${mode.border} shadow-lg ${mode.glow}`
                  : 'border-white/5 hover:border-white/10 hover:bg-white/5'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white">{mode.name}</div>
                <div className="text-xs text-gray-500">{mode.description}</div>
              </div>
              {isSelected && (
                <div className="ml-auto w-2 h-2 rounded-full bg-white/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">Conversion Mode</h2>
            <p className="text-gray-500 text-xs mt-0.5">Select input and output formats</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Instant mode toggle */}
          <div
            onClick={() => setInstantMode(!instantMode)}
            className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all mb-6 ${
              instantMode
                ? 'bg-purple-500/10 border-purple-500/30'
                : 'border-white/5 hover:border-white/10 hover:bg-white/3'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              instantMode ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gray-800'
            }`}>
              <Zap size={18} className={instantMode ? 'text-white fill-white' : 'text-gray-500'} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Instant Conversion Mode</div>
              <div className="text-xs text-gray-500">Real-time conversion as you type</div>
            </div>
            {/* Toggle pill */}
            <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
              instantMode ? 'bg-purple-500' : 'bg-gray-700'
            }`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                instantMode ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </div>
          </div>

          {/* Mode selectors */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <ModeSelector title="Input Mode" selected={inputMode} onSelect={setInputMode} />
            <div className="flex flex-col">
              <div className="flex items-center justify-center h-8 mb-3">
                <div className="flex items-center gap-1 text-gray-600">
                  <div className="w-8 h-px bg-gray-700" />
                  <ArrowRight size={16} />
                  <div className="w-8 h-px bg-gray-700" />
                </div>
              </div>
              <ModeSelector title="Output Mode" selected={outputMode} onSelect={setOutputMode} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={inputMode === outputMode}
              className="px-6 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:shadow-none"
            >
              Start Conversion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};