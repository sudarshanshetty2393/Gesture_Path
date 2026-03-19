
import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        CWASA: any;
    }
}

interface AvatarProps {
    sigmlData?: string | null;
    width?: number;
    height?: number;
}

// ─── Module-level singletons ────────────────────────────────────────────────
// These survive component unmount/remount, React StrictMode, and route changes.

type State = 'idle' | 'loading' | 'ready' | 'error';
let _state: State = 'idle';
const _pending: Array<{ onReady: () => void; onError: () => void }> = [];

// The ACTUAL CWASAAvatar div — created once, lives forever in module scope.
// When Avatar mounts: appended to the container. When unmounts: detached but not
// destroyed. CWASA's internal avPanels[0] always references this exact element.
let _cwasaDiv: HTMLDivElement | null = null;

function getCwasaDiv(w: number, h: number): HTMLDivElement {
    if (!_cwasaDiv) {
        _cwasaDiv = document.createElement('div');
        _cwasaDiv.className = 'CWASAAvatar av0 rounded-2xl';
        _cwasaDiv.style.width = `${w}px`;
        _cwasaDiv.style.height = `${h}px`;
    }
    return _cwasaDiv;
}

function ensureCWASA(onReady: () => void, onError: () => void): void {
    if (_state === 'ready') { onReady(); return; }
    if (_state === 'error') { onError(); return; }

    _pending.push({ onReady, onError });
    if (_state === 'loading') return;

    _state = 'loading';

    function flush(ok: boolean) {
        _state = ok ? 'ready' : 'error';
        _pending.splice(0).forEach(cb => ok ? cb.onReady() : cb.onError());
    }

    function tryInit(): void {
        if (!window.CWASA?.init) { setTimeout(tryInit, 300); return; }
        window.CWASA.addHook('avatarloaded', (evt: { msg: string | null }) => {
            if (evt.msg) flush(true);
            else { console.error('Avatar: character failed to load from JASigning server.'); flush(false); }
        });
        window.CWASA.init().catch((e: unknown) => {
            console.error('CWASA init error:', e);
            flush(false);
        });
    }

    tryInit();
}
// ────────────────────────────────────────────────────────────────────────────

const Avatar: React.FC<AvatarProps> = ({ sigmlData, width = 288, height = 320 }) => {
    const [isReady, setIsReady] = useState(_state === 'ready');
    const [loadError, setLoadError] = useState(_state === 'error');
    const [isPlaying, setIsPlaying] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Attach the persistent CWASA div into our container
        const div = getCwasaDiv(width, height);
        if (containerRef.current && !containerRef.current.contains(div)) {
            containerRef.current.appendChild(div);
        }

        // animactive / animidle hooks (duplicates are harmless)
        window.CWASA?.addHook?.('animactive', () => setIsPlaying(true));
        window.CWASA?.addHook?.('animidle',   () => setIsPlaying(false));

        ensureCWASA(
            () => { setIsReady(true);  setLoadError(false); },
            () => { setLoadError(true); }
        );

        return () => {
            // Detach the CWASA div from this container — but do NOT destroy it.
            // The module-level _cwasaDiv keeps it alive so CWASA never loses its canvas.
            if (div.parentElement) div.parentElement.removeChild(div);
        };
    }, []);

    const play = (sigml: string) => {
        if (_state !== 'ready' || !sigml) return;
        try {
            window.CWASA.stopSiGML(0);
            setTimeout(() => window.CWASA?.playSiGMLText?.(sigml, 0), 150);
        } catch (e) {
            console.error('playSiGML error:', e);
        }
    };

    useEffect(() => {
        if (isReady && sigmlData) play(sigmlData);
    }, [sigmlData, isReady]);

    return (
        <div className="flex flex-col items-center bg-slate-900/50 rounded-3xl p-4 border border-slate-700/50 shadow-2xl">
            {/* Status line */}
            {loadError ? (
                <p className="text-red-400 text-xs text-center mb-2">
                    ⚠️ Avatar failed to load — check network connection
                </p>
            ) : !isReady ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    Loading avatar…
                </div>
            ) : null}

            {/* Container where the persistent CWASAAvatar div is appended */}
            <div ref={containerRef} />

            {/* Replay button — shown once avatar is ready */}
            {isReady && (
                <button
                    onClick={() => sigmlData && play(sigmlData)}
                    disabled={!sigmlData}
                    className="mt-3 px-4 py-1 text-sm font-bold bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-full border border-green-500 transition-colors shadow"
                >
                    {isPlaying ? '⏹ Playing…' : '↺ Replay'}
                </button>
            )}
        </div>
    );
};

export default Avatar;