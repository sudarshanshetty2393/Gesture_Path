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
  /** Logo click: back to the dashboard. */
  onHome?: () => void;
}

interface SelectedSymbol extends SymbolEntry {
  stepId: StepId;
}

const Builder: React.FC<BuilderProps> = ({ initialWord = '', onClose, onHome }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Partial<Record<StepId, SelectedSymbol>>>({});
  const [word, setWord] = useState(initialWord);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
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
    if (!word.trim()) return setNotice('Please enter a word for this gesture.');
    if (Object.keys(selections).length === 0) return setNotice('Please select at least one symbol.');
    setNotice('');
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
      setNotice('Failed to save the gesture. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = STEPS.filter(s => selections[s.id]).length;

  return (
    <div className="fixed inset-0 z-50 bg-canvas overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 h-14 bg-surface/80 backdrop-blur-md border-b border-line">
        <div className="h-full max-w-6xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {onClose && (
              <button onClick={onClose} className="btn btn-ghost btn-sm -ml-1" aria-label="Back to chat">
                <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
              </button>
            )}
            <span className="w-px h-5 bg-line hidden sm:block" />
            <button
              onClick={onHome ?? onClose}
              className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-surface-2 transition-colors"
              aria-label="Gesture Path — go to dashboard"
              title="Dashboard"
            >
              <img src="/images/Logo.svg" alt="" className="w-6 h-6 rounded-md" />
              <span className="hidden sm:inline text-[15px] font-bold tracking-tight text-ink">Gesture Path</span>
            </button>
            <span className="text-ink-3" aria-hidden="true">/</span>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink-2 truncate">Sign builder</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="icon-btn" aria-label="Close builder">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-ink">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Create a new sign</h1>
          <p className="text-ink-2 mt-1">Pick a symbol for each part of the sign, then save it so the avatar can perform it.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left – steps + selector */}
          <div className="lg:col-span-8 space-y-5">

            {/* Progress */}
            <ol className="grid grid-cols-5 gap-2" aria-label="Steps">
              {STEPS.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(i)}
                    aria-current={i === currentStep ? 'step' : undefined}
                    className="w-full text-left group"
                  >
                    <div className={`h-1.5 rounded-full mb-2 transition-colors ${
                      i === currentStep ? 'bg-brand' : selections[s.id] ? 'bg-sign' : 'bg-line group-hover:bg-line-strong'
                    }`} />
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold ${i === currentStep ? 'text-brand' : 'text-ink-3'}`}>{i + 1}</span>
                      <span className={`text-xs font-semibold truncate hidden sm:block ${i === currentStep ? 'text-ink' : 'text-ink-3'}`}>{s.title}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ol>

            {/* Symbol grid */}
            <div className="card shadow-soft p-4 sm:p-6 min-h-[380px]">
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-ink">Select {step.title.toLowerCase()}</h3>
                <span className="text-xs text-ink-3">Step {currentStep + 1} of {STEPS.length}</span>
              </div>

              {step.id === 'location' ? (
                /* Location — text buttons */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {symbols.map(sym => (
                    <button
                      key={sym.id}
                      onClick={() => handleSelect(sym)}
                      className={`py-3 px-2 rounded-xl border text-sm font-medium transition-all ${
                        currentSelection?.id === sym.id
                          ? 'border-brand bg-brand-soft text-brand-ink shadow-ring'
                          : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
                      }`}
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>
              ) : (
                /* Image grid */
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 overflow-y-auto max-h-[480px] p-1 -m-1">
                  {symbols.map(sym => (
                    <button
                      key={sym.id}
                      onClick={() => handleSelect(sym)}
                      onMouseEnter={() => setHoveredId(sym.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`aspect-square rounded-xl border transition-all flex items-center justify-center overflow-hidden relative bg-white ${
                        currentSelection?.id === sym.id
                          ? 'border-brand ring-2 ring-brand/40'
                          : 'border-line hover:border-line-strong hover:shadow-soft'
                      }`}
                    >
                      <img
                        src={sym.img}
                        alt={sym.id}
                        className="w-full h-full object-contain p-1"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {hoveredId === sym.id && (
                        <div className="absolute inset-0 bg-brand/5 pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {notice && (
              <div role="alert" className="px-4 py-3 rounded-xl bg-danger-soft border border-danger/20 text-danger text-sm">
                {notice}
              </div>
            )}

            {/* Navigation */}
            <div className="flex flex-wrap justify-between items-center gap-3">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className={`btn btn-secondary btn-lg ${currentStep === 0 ? 'invisible' : ''}`}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              {currentStep < STEPS.length - 1 ? (
                <button onClick={handleNext} className="btn btn-primary btn-lg">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex flex-wrap gap-2.5 items-center">
                  <input
                    type="text"
                    placeholder="Enter gesture word"
                    value={word}
                    onChange={e => setWord(e.target.value)}
                    className="input h-12 w-56"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-lg bg-sign text-white hover:bg-sign/90 shadow-sm"
                  >
                    {saving ? 'Saving…' : 'Save Gesture'} <Save className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right – current sequence */}
          <div className="lg:col-span-4">
            <div className="card shadow-soft p-5 lg:sticky lg:top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-ink">Current sequence</h3>
                <span className="chip">{selectedCount} / {STEPS.length}</span>
              </div>
              <div className="space-y-2">
                {selectedCount === 0 ? (
                  <p className="text-ink-3 text-sm py-6 text-center">No symbols selected yet.</p>
                ) : (
                  STEPS.filter(s => selections[s.id]).map((s, idx) => {
                    const sym = selections[s.id]!;
                    return (
                      <div key={s.id} className="p-2.5 rounded-xl bg-surface-2 border border-line flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center text-[11px] font-bold text-ink-2 flex-shrink-0">
                          {idx + 1}
                        </div>
                        {sym.img ? (
                          <img src={sym.img} alt={sym.id} className="w-9 h-9 object-contain bg-white rounded-lg border border-line flex-shrink-0" />
                        ) : (
                          <span className="w-9 h-9 rounded-lg bg-brand-soft text-brand-ink flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                            {sym.label?.slice(0, 3)}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-ink text-xs font-semibold">{s.title}</div>
                          <div className="text-ink-3 text-[11px] font-mono truncate">{sym.tag || '(none)'}</div>
                        </div>
                        <button
                          onClick={() => removeStep(s.id)}
                          className="icon-btn w-8 h-8 hover:text-danger hover:bg-danger-soft"
                          aria-label={`Remove ${s.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Word input also visible at top of right panel for convenience */}
              <div className="mt-5 pt-4 border-t border-line">
                <label className="block text-[13px] font-semibold text-ink-2 mb-1.5" htmlFor="builder-word">Gesture word</label>
                <input
                  id="builder-word"
                  type="text"
                  placeholder="e.g. apple"
                  value={word}
                  onChange={e => setWord(e.target.value)}
                  className="input"
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
