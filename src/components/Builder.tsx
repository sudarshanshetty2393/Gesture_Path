import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Save, X, Trash2 } from 'lucide-react';

// ─── HamNoSys XML mappings ────────────────────────────────────────────────────

// Step 1 & 5 – hand shapes (handshape/1-32.JPG)
const HS_TAGS: Record<number, string> = {
  1:  '<hamflathand/>',
  2:  '<hamflathand/><hamthumboutmod/>',
  3:  '<hamflathand/><hamthumbacrossmod/>',
  4:  '<hamflathand/><hamfingerbendmod/>',
  5:  '<hamflathand/><hamthumboutmod/><hamfingerbendmod/>',
  6:  '<hamfist/>',
  7:  '<hamfist/><hamthumboutmod/>',
  8:  '<hamfist/><hamthumbacrossmod/>',
  9:  '<hamfist/><hamfingerbendmod/>',
  10: '<hamfinger2/>',
  11: '<hamfinger2/><hamthumboutmod/>',
  12: '<hamfinger2/><hamthumbacrossmod/>',
  13: '<hamfinger2/><hamfingerbendmod/>',
  14: '<hamfinger2/><hamfinger3/>',
  15: '<hamfinger2/><hamfinger3/><hamfingerbendmod/>',
  16: '<hamfinger2/><hamfinger3/><hamthumboutmod/>',
  17: '<hamfinger2/><hamfinger3/><hamindexfinger/>',
  18: '<hamfinger2/><hamfinger3/><hamfinger4/>',
  19: '<hamflathand/><hamfingerbendmod/><hamthumbacrossmod/>',
  20: '<hammiddlefinger/>',
  21: '<hamringfinger/>',
  22: '<hampinky/>',
  23: '<hamthumb/>',
  24: '<hamthumb/><hamfingerbendmod/>',
  25: '<hamindexfinger/>',
  26: '<hamindexfinger/><hamthumboutmod/>',
  27: '<hamindexfinger/><hamthumbacrossmod/>',
  28: '<hamindexfinger/><hamfingerbendmod/>',
  29: '<hamindexfinger/><hampinky/>',
  30: '<hamfinger2/><hampinky/>',
  31: '<hamflathand/><hamfingerbendmod/><hamthumboutmod/>',
  32: '<hamfist/><hamthumboutmod/><hamfingerbendmod/>',
};

// Step 2 – orientation (ori/ folder)
const ORI_TAGS: Record<string, string> = {
  ho1: '<hamextfingeru/><hampalml/>',
  ho2: '<hamextfingeru/><hampalmr/>',
  ho3: '<hamextfingero/><hampalmd/>',
  ho4: '<hamextfingero/><hampalmu/>',
  ho5: '<hamextfingerol/><hampalmd/>',
  ho6: '<hamextfingeror/><hampalmd/>',
  ho7: '<hamextfingerul/><hampalml/>',
  ho8: '<hamextfingerul/><hampalmr/>',
  hors1: '<hamextfingero/><hampalml/>',
  hors2: '<hamextfingero/><hampalmr/>',
  hors3: '<hamextfingerol/><hampalml/>',
  hors4: '<hamextfingeror/><hampalmr/>',
  hort1: '<hamextfingeru/><hampalmd/>',
  hort2: '<hamextfingeru/><hampalmu/>',
  hort3: '<hamextfingerul/><hampalmd/>',
  hort4: '<hamextfingerul/><hampalmu/>',
  hort5: '<hamextfingeror/><hampalml/>',
  hort6: '<hamextfingerol/><hampalmr/>',
  sc1: '<hampalmd/>',
  sc2: '<hampalmu/>',
  sc3: '<hampalml/>',
  sc4: '<hampalmr/>',
  sc5: '<hampalmdl/>',
  sc6: '<hampalmd/>',
  sc7: '<hampalml/>',
  sc8: '<hampalmr/>',
  tc1: '<hampalmd/>',
  tc2: '<hampalmu/>',
  tc3: '<hampalml/>',
  tc4: '<hampalmr/>',
  tc5: '<hampalmdl/>',
  tc6: '<hampalmd/>',
  tc7: '<hampalml/>',
  tc8: '<hampalmr/>',
  top1: '<hamextfingeru/><hampalml/>',
  top2: '<hamextfingeru/><hampalmr/>',
  back1: '<hamextfingero/><hampalmu/>',
  back2: '<hamextfingero/><hampalmd/>',
  side1: '<hamextfingerl/><hampalmd/>',
  side2: '<hamextfingeril/><hampalmd/>',
  sidepalm: '<hampalml/>',
  sideview: '<hampalmr/>',
  handup: '<hamextfingeru/>',
  circlemm: '<hampalmd/>',
  circlem: '<hampalmu/>',
  circles: '<hampalml/>',
  slash: '<hampalmdl/>',
};

// Step 3 – body locations (text labels, no images needed)
interface Location { id: string; label: string; tag: string }
const LOCATIONS: Location[] = [
  { id: 'forehead',    label: 'Forehead',       tag: '<hamforehead/>'    },
  { id: 'eyes',        label: 'Eyes',            tag: '<hameyes/>'        },
  { id: 'nose',        label: 'Nose',            tag: '<hamnose/>'        },
  { id: 'lips',        label: 'Lips',            tag: '<hamlips/>'        },
  { id: 'chin',        label: 'Chin',            tag: '<hamchin/>'        },
  { id: 'cheek',       label: 'Cheek',           tag: '<hamcheek/>'       },
  { id: 'ear',         label: 'Ear',             tag: '<hamearlobe/>'     },
  { id: 'shoulder',    label: 'Shoulder',        tag: '<hamshouldertop/>' },
  { id: 'chest',       label: 'Chest',           tag: '<hamchest/>'       },
  { id: 'stomach',     label: 'Stomach',         tag: '<hamstomach/>'     },
  { id: 'palm',        label: 'Palm',            tag: '<hampalm/>'        },
  { id: 'handback',    label: 'Back of Hand',    tag: '<hamhandback/>'    },
  { id: 'between',     label: 'Between Hands',   tag: '<hambetween/>'     },
  { id: 'neutral',     label: 'Neutral Space',   tag: ''                  },
];

// Step 4 – movements (hand_movements/mov1-23.png)
const MOV_TAGS: Record<number, string> = {
  1:  '<hammovedo/>',
  2:  '<hammovedi/>',
  3:  '<hammoveu/>',
  4:  '<hammoved/>',
  5:  '<hammover/>',
  6:  '<hammovel/>',
  7:  '<hamswinging/>',
  8:  '<hamswinging/><hamrepeatfromstart/>',
  9:  '<hamlrat/>',
  10: '<hamlrat/><hamrepeatfromstart/>',
  11: '<hamclose/>',
  12: '<hamclose/><hamrepeatfromstart/>',
  13: '<hamtouch/>',
  14: '<hamtouch/><hamrepeatfromstart/>',
  15: '<hamnodding/>',
  16: '<hamnodding/><hamrepeatfromstart/>',
  17: '<hamarcr/>',
  18: '<hamarcl/>',
  19: '<hamrepeatfromstart/>',
  20: '<hamsmallmod/><hammovedo/>',
  21: '<hamsmallmod/><hamswinging/>',
  22: '<hamreplace/>',
  23: '<hamfingerbendmod/><hamrepeatfromstart/>',
};

// ─── Symbol types ──────────────────────────────────────────────────────────────

type StepId = 'handshape' | 'orientation' | 'location' | 'movement' | 'secondhand';

interface SymbolEntry {
  id: string;
  img?: string;
  label?: string;
  tag: string;
}

function buildStepSymbols(step: StepId): SymbolEntry[] {
  switch (step) {
    case 'handshape':
    case 'secondhand':
      return Array.from({ length: 32 }, (_, i) => ({
        id: `${step}_${i + 1}`,
        img: `/builder_assets/img/handshape/${i + 1}.JPG`,
        tag: HS_TAGS[i + 1] ?? '',
      }));
    case 'orientation':
      return Object.entries(ORI_TAGS).map(([name, tag]) => ({
        id: `ori_${name}`,
        img: `/builder_assets/img/ori/${name}.png`,
        tag,
      }));
    case 'location':
      return LOCATIONS.map(l => ({
        id: `loc_${l.id}`,
        label: l.label,
        tag: l.tag,
      }));
    case 'movement':
      return Array.from({ length: 23 }, (_, i) => ({
        id: `mov_${i + 1}`,
        img: `/builder_assets/img/hand_movements/mov${i + 1}.png`,
        tag: MOV_TAGS[i + 1] ?? '',
      }));
  }
}

const STEPS: { id: StepId; title: string }[] = [
  { id: 'handshape',   title: 'Hand Shape'   },
  { id: 'orientation', title: 'Orientation'  },
  { id: 'location',    title: 'Location'     },
  { id: 'movement',    title: 'Movement'     },
  { id: 'secondhand',  title: 'Second Hand'  },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface BuilderProps {
  initialWord?: string;
  onClose?: () => void;
}

interface SelectedSymbol extends SymbolEntry {
  stepId: StepId;
}

const Builder: React.FC<BuilderProps> = ({ initialWord = '', onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Partial<Record<StepId, SelectedSymbol>>>({});
  const [word, setWord] = useState(initialWord);
  const [saving, setSaving] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => { if (initialWord) setWord(initialWord); }, [initialWord]);

  const step = STEPS[currentStep];
  const symbols = buildStepSymbols(step.id);
  const currentSelection = selections[step.id];

  const handleSelect = (sym: SymbolEntry) => {
    setSelections(prev => ({ ...prev, [step.id]: { ...sym, stepId: step.id } }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const removeStep = (stepId: StepId) => {
    setSelections(prev => { const n = { ...prev }; delete n[stepId]; return n; });
  };

  const buildSigml = (): string => {
    const tags = STEPS.map(s => selections[s.id]?.tag ?? '').filter(Boolean).join('\n    ');
    return `<sigml>\n  <hns_sign gloss="${word}">\n    <hamnosys_manual>\n    ${tags}\n    </hamnosys_manual>\n  </hns_sign>\n</sigml>`;
  };

  const handleSave = async () => {
    if (!word.trim()) return alert('Please enter a word for this gesture');
    if (Object.keys(selections).length === 0) return alert('Please select at least one symbol');
    setSaving(true);
    try {
      const sigml = buildSigml();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gestures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.trim(), sigml }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert('Gesture saved! You can now ask "' + word.trim() + '" in the chat.');
      setSelections({});
      setWord('');
      setCurrentStep(0);
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to save', err);
      alert('Failed to save gesture');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] overflow-y-auto">
      <div className="p-6 text-white max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
            Custom Gesture Builder
          </h2>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left – steps + selector */}
          <div className="lg:col-span-8 space-y-6">

            {/* Progress */}
            <div className="flex justify-between mb-8 relative">
              <div className="absolute top-4 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full" />
              {STEPS.map((s, i) => (
                <div key={s.id}
                  className={`flex flex-col items-center gap-2 cursor-pointer ${i <= currentStep ? 'text-green-400' : 'text-slate-600'}`}
                  onClick={() => setCurrentStep(i)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i === currentStep ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 ring-2 ring-green-400'
                    : i < currentStep ? 'bg-green-700 text-white'
                    : 'bg-slate-800 border border-slate-700'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-xs font-medium hidden md:block">{s.title}</span>
                  {selections[s.id] && (
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  )}
                </div>
              ))}
            </div>

            {/* Symbol grid */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 min-h-[380px]">
              <h3 className="text-xl font-bold mb-4 text-slate-200">Select {step.title}</h3>

              {step.id === 'location' ? (
                /* Location — text buttons */
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {symbols.map(sym => (
                    <button
                      key={sym.id}
                      onClick={() => handleSelect(sym)}
                      className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        currentSelection?.id === sym.id
                          ? 'border-green-400 bg-green-900/40 text-green-300 ring-2 ring-green-400/30 scale-105'
                          : 'border-slate-700 hover:border-green-500 bg-slate-900/50 text-slate-300'
                      }`}
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>
              ) : (
                /* Image grid */
                <div className="grid grid-cols-5 md:grid-cols-8 gap-3 overflow-y-auto max-h-[480px] pr-1">
                  {symbols.map(sym => (
                    <button
                      key={sym.id}
                      onClick={() => handleSelect(sym)}
                      onMouseEnter={() => setHoveredId(sym.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`aspect-square rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden relative ${
                        currentSelection?.id === sym.id
                          ? 'border-green-400 ring-2 ring-green-400/40 scale-105 bg-white'
                          : 'border-slate-700 hover:border-green-500 bg-white'
                      }`}
                    >
                      <img
                        src={sym.img}
                        alt={sym.id}
                        className="w-full h-full object-contain p-1"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {hoveredId === sym.id && (
                        <div className="absolute inset-0 bg-green-500/10 rounded-xl pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 ${
                  currentStep === 0 ? 'opacity-0 pointer-events-none' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <ArrowLeft className="w-5 h-5" /> Back
              </button>

              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  Next <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Enter gesture word"
                    value={word}
                    onChange={e => setWord(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-green-500/20"
                  >
                    {saving ? 'Saving…' : 'Save Gesture'} <Save className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right – current sequence */}
          <div className="lg:col-span-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 h-full">
              <h3 className="text-xl font-bold mb-4 text-slate-200">Current Sequence</h3>
              <div className="space-y-2">
                {STEPS.filter(s => selections[s.id]).length === 0 ? (
                  <p className="text-slate-500 text-sm italic">No symbols selected yet.</p>
                ) : (
                  STEPS.filter(s => selections[s.id]).map((s, idx) => {
                    const sym = selections[s.id]!;
                    return (
                      <div key={s.id} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3">
                        <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs text-slate-400 flex-shrink-0">
                          {idx + 1}
                        </div>
                        {sym.img ? (
                          <img src={sym.img} alt={sym.id} className="w-8 h-8 object-contain bg-white rounded flex-shrink-0" />
                        ) : (
                          <span className="w-8 h-8 flex items-center justify-center text-xs text-green-400 flex-shrink-0">
                            {sym.label?.slice(0, 3)}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-400 text-xs">{s.title}</div>
                          <div className="text-slate-300 text-xs font-mono truncate">{sym.tag || '(none)'}</div>
                        </div>
                        <button
                          onClick={() => removeStep(s.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Word input also visible at top of right panel for convenience */}
              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <label className="text-slate-400 text-xs mb-1 block">Gesture word</label>
                <input
                  type="text"
                  placeholder="e.g. apple"
                  value={word}
                  onChange={e => setWord(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-green-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Builder;