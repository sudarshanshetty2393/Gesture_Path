
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

declare global {
    interface Window {
        CWASA: any;
    }
}

interface AvatarProps {
    sigmlData?: string | null;
    width?: number;
    height?: number;
    /** Changing this replays sigmlData even if it is the same as before. */
    playKey?: number;
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

const Avatar: React.FC<AvatarProps> = ({ sigmlData, width = 288, height = 320, playKey = 0 }) => {
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
    }, [sigmlData, isReady, playKey]);

    return (
        <div className="flex flex-col items-center gap-3 p-3 card shadow-soft">
            {/* Container where the persistent CWASAAvatar div is appended */}
            <div className="relative rounded-xl overflow-hidden bg-surface-2" style={{ minWidth: width, minHeight: height }}>
                <div ref={containerRef} />
                {loadError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-surface-2">
                        <AlertTriangle size={20} className="text-warn" />
                        <p className="text-xs text-ink-2">Avatar failed to load — check your network connection.</p>
                    </div>
                ) : !isReady ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2">
                        <span className="w-6 h-6 rounded-full border-2 border-line-strong border-t-brand animate-spin" />
                        <span className="text-xs text-ink-3">Loading avatar…</span>
                    </div>
                ) : null}
            </div>

            {/* Replay — shown once avatar is ready */}
            {isReady && (
                <div className="w-full flex items-center justify-between gap-3 px-1">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${isPlaying ? 'text-sign-ink' : 'text-ink-3'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-sign animate-pulse' : 'bg-line-strong'}`} />
                        {isPlaying ? 'Playing…' : sigmlData ? 'Ready' : 'Waiting for text'}
                    </span>
                    <button
                        onClick={() => sigmlData && play(sigmlData)}
                        disabled={!sigmlData}
                        className="btn btn-secondary btn-sm"
                    >
                        <RotateCcw size={12} />
                        Replay
                    </button>
                </div>
            )}
        </div>
    );
};

export default Avatar;