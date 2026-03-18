import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Save, X } from 'lucide-react';

const STEPS = [
    { id: 'handshape', title: 'Hand Shape', folder: 'Hand_Shape' },
    { id: 'orientation', title: 'Orientation', folder: 'Hand_Orientation' },
    { id: 'location', title: 'Location', folder: 'Hand_Location' },
    { id: 'movement', title: 'Movement', folder: 'Hand_Movement' },
    { id: 'secondhand', title: 'Second Hand', folder: 'Second_Hand' }
];

interface BuilderProps {
    initialWord?: string;
    onClose?: () => void;
}

const Builder: React.FC<BuilderProps> = ({ initialWord = '', onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [sequence, setSequence] = useState<string[]>([]);
    const [word, setWord] = useState(initialWord);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialWord) setWord(initialWord);
    }, [initialWord]);

    const handleSelect = (symbol: string) => {
        setSequence([...sequence, symbol]);
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSave = async () => {
        if (!word) return alert("Please enter a word for this gesture");
        setSaving(true);
        try {
            // Construct SiGML (simplified for demo)
            const sigml = `<sigml><hns_sign gloss="${word}"><hamnosys_manual>${sequence.join('')}</hamnosys_manual></hns_sign></sigml>`;

            await fetch(`${import.meta.env.VITE_API_URL}/api/gestures`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word, sigml }),
            });

            alert("Gesture saved!");
            setSequence([]);
            setWord('');
            setCurrentStep(0);
            if (onClose) onClose();
        } catch (error) {
            console.error("Failed to save", error);
            alert("Failed to save gesture");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0f172a] overflow-y-auto">
            <div className="p-6 text-white max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">Custom Gesture Builder</h2>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Panel: Builder UI */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Progress Bar */}
                        <div className="flex justify-between mb-8 relative">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                            {STEPS.map((step, index) => (
                                <div key={step.id} className={`flex flex-col items-center gap-2 ${index <= currentStep ? 'text-green-400' : 'text-slate-600'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${index <= currentStep ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-800 border border-slate-700'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <span className="text-xs font-medium hidden md:block">{step.title}</span>
                                </div>
                            ))}
                        </div>

                        {/* Selection Area */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 min-h-[400px]">
                            <h3 className="text-xl font-bold mb-4 text-slate-200">Select {STEPS[currentStep].title}</h3>

                            <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                                {/* Mock Grid of Symbols */}
                                {[...Array(12)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelect(`sym_${STEPS[currentStep].id}_${i}`)}
                                        className="aspect-square bg-slate-900/50 rounded-xl border border-slate-700 hover:border-green-500 hover:bg-slate-800 transition-all flex items-center justify-center group"
                                    >
                                        <span className="text-slate-500 group-hover:text-green-400 text-xs">Sym {i + 1}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between">
                            <button
                                onClick={handleBack}
                                disabled={currentStep === 0}
                                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        placeholder="Enter gesture name"
                                        value={word}
                                        onChange={(e) => setWord(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 rounded-xl px-4 text-white focus:border-green-500 outline-none"
                                    />
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-green-500/20"
                                    >
                                        {saving ? 'Saving...' : 'Save Gesture'} <Save className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Sequence Preview */}
                    <div className="lg:col-span-4">
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 h-full">
                            <h3 className="text-xl font-bold mb-4 text-slate-200">Current Sequence</h3>
                            <div className="space-y-2">
                                {sequence.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic">No symbols selected yet.</p>
                                ) : (
                                    sequence.map((sym, idx) => (
                                        <div key={idx} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3">
                                            <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs text-slate-400">
                                                {idx + 1}
                                            </div>
                                            <span className="text-slate-300 font-mono text-sm">{sym}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Builder;
