
import React, { useEffect, useState, useRef } from 'react';

declare global {
    interface Window {
        CWASA: any;
        _cwasaInitDone: boolean;
    }
}

interface AvatarProps {
    sigmlData?: string | null;
    width?: number | string;
    height?: number | string;
}

// Called once globally to boot CWASA — the CWASAAvatar av0 div must be in DOM first
function initCWASA(onReady: () => void, onError: () => void): void {
    if (window._cwasaInitDone) {
        onReady();
        return;
    }
    if (!window.CWASA?.init) {
        setTimeout(() => initCWASA(onReady, onError), 300);
        return;
    }
    // evt.msg = avatar name on success, null on failure
    window.CWASA.addHook('avatarloaded', (evt: { msg: string | null }) => {
        window._cwasaInitDone = true;
        if (evt.msg) {
            onReady();
        } else {
            // avatarloaded fired with null — character failed to load
            onError();
        }
    });
    window.CWASA.init().catch((e: any) => {
        console.error('CWASA init error:', e);
        onError();
    });
}

const Avatar: React.FC<AvatarProps> = ({ sigmlData, width = 400, height = 400 }) => {
    const [isReady, setIsReady] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const initCalledRef = useRef(false);

    useEffect(() => {
        if (initCalledRef.current) return;
        initCalledRef.current = true;

        if (window.CWASA?.addHook) {
            window.CWASA.addHook('animactive', () => setIsPlaying(true));
            window.CWASA.addHook('animidle', () => setIsPlaying(false));
        }

        initCWASA(
            () => {
                setIsReady(true);
                setLoadError(false);
            },
            () => {
                setLoadError(true);
                console.error('Avatar: Character failed to load from JASigning server. Check network/CORS.');
            }
        );
    }, []);

    const play = (sigml: string) => {
        if (!window.CWASA || !window._cwasaInitDone || !sigml || loadError) return;
        try {
            window.CWASA.stopSiGML(0);
            setTimeout(() => {
                window.CWASA?.playSiGMLText?.(sigml, 0);
            }, 200);
        } catch (e) {
            console.error('playSiGML error:', e);
        }
    };

    // Auto-play whenever sigmlData or readiness changes
    useEffect(() => {
        if (isReady && sigmlData) {
            play(sigmlData);
        }
    }, [sigmlData, isReady]);

    const handleAvatarChange = (name: string) => {
        const menuDiv = document.querySelector('.CWASAAvMenu.av0');
        const select = menuDiv?.querySelector('select') as HTMLSelectElement | null;
        if (select) {
            select.value = name;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const toggleFullscreen = () => {
        const el = document.querySelector('.CWASAPanel.av0, .CWASAAvatar.av0') as HTMLElement | null;
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    };

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-3xl p-4 border border-red-700/50 shadow-2xl"
                style={{ width, minHeight: 80 }}>
                <p className="text-red-400 text-sm text-center">
                    ⚠️ Avatar failed to load.<br />
                    <span className="text-xs text-slate-400">Check network connection.</span>
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-3xl p-4 border border-slate-700/50 shadow-2xl">
            {!isReady && (
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    Loading avatar...
                </div>
            )}

            {/*
              * CWASAAvatar av0 — CWASA injects the canvas div here.
              * Must stay in DOM permanently after CWASA.init().
              * Inline style dimensions ensure CWASA canvas gets non-zero clientWidth/Height.
              */}
            <div
                className="CWASAAvatar av0 rounded-2xl overflow-hidden"
                style={{ width, height }}
            />

            <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                    onClick={() => sigmlData && play(sigmlData)}
                    disabled={!isReady || !sigmlData}
                    className="px-4 py-1 text-sm font-bold bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-full border border-green-500 transition-colors shadow-lg flex items-center gap-1"
                >
                    <span>{isPlaying ? '⏹' : '↺'}</span> {isPlaying ? 'Playing...' : 'Replay'}
                </button>
                <button
                    onClick={toggleFullscreen}
                    disabled={!isReady}
                    className="px-4 py-1 text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-full border border-blue-500 transition-colors shadow-lg flex items-center gap-1"
                >
                    ⛶ Full Screen
                </button>
                {['anna', 'marc', 'luna'].map((av) => (
                    <button
                        key={av}
                        onClick={() => handleAvatarChange(av)}
                        disabled={!isReady}
                        className="px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-full border border-slate-600 transition-colors uppercase"
                    >
                        {av}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Avatar;