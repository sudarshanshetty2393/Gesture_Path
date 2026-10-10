import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Film, Hand, X, AlertTriangle, Maximize2, Minimize2, Send, Eraser } from 'lucide-react';
import { getSignEngine, SignEngine } from '../../sign/engine';
import { SignSegmenter } from '../../sign/segmenter';
import { Guess } from '../../sign/classifier';
import { RawFrame, restLineY } from '../../sign/features';
import { HolisticResults, toRawFrame } from '../../sign/holistic';

interface SignCameraProps {
  /** A word was recognised with good confidence. */
  onWord: (word: string) => void;
  /** User picked a different guess for the word that was just added. */
  onReplaceLastWord: (word: string) => void;
  onClose: () => void;
  /** Current message text — shown over the video in full-screen mode. */
  sentence: string;
  onSend: () => void;
  onClear: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  /** 'panel' fills a side column (desktop); 'inline' sits above the message box. */
  layout?: 'inline' | 'panel';
}

// Below this, the top guess is shown as a suggestion instead of being added.
const AUTO_ACCEPT_CONFIDENCE = 0.45;
const LIVE_GUESS_INTERVAL_MS = 300;
const VIDEO_FILE_FPS = 25;

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

type Status = 'loading' | 'ready' | 'error';

interface LastResult {
  guesses: Guess[];
  accepted: boolean;
}

/** Turns "college_school" / "i_me_mine_my" style labels into display text. */
export const displayWord = (label: string) => label.replace(/_/g, ' / ');

export const SignCamera: React.FC<SignCameraProps> = ({ onWord, onReplaceLastWord, onClose, sentence, onSend, onClear, onExpandedChange, layout = 'inline' }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<SignEngine | null>(null);
  const segmenterRef = useRef(new SignSegmenter());
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastLiveGuessRef = useRef(0);
  const processingFileRef = useRef(false);
  const unmountedRef = useRef(false);
  // Each camera start gets a ticket; stopping (or starting again) invalidates older
  // tickets, so a camera stream that arrives late is released instead of leaking.
  const cameraTicketRef = useRef(0);

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [handsVisible, setHandsVisible] = useState(false);
  const [signing, setSigning] = useState(false);
  const [liveGuess, setLiveGuess] = useState<Guess | null>(null);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [fileProgress, setFileProgress] = useState<number | null>(null);
  const [showVocabulary, setShowVocabulary] = useState(false);
  // Framing feedback: are the shoulders in view (needed to normalise the signs)?
  const [shouldersVisible, setShouldersVisible] = useState(true);
  const shouldersMissingSinceRef = useRef<number | null>(null);
  // Debug panel for testing on other devices: open the app with ?debug=1 (or ?debug=0 to hide).
  const [debug] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('debug');
      if (q !== null) localStorage.setItem('gp_debug', q === '1' ? '1' : '0');
      return localStorage.getItem('gp_debug') === '1';
    } catch { return false; }
  });
  const debugRef = useRef({ frames: 0, since: performance.now(), fps: 0 });
  const [debugInfo, setDebugInfo] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);
  const [justSent, setJustSent] = useState(false);

  // Keep latest callbacks in refs so the frame loop never sees stale props.
  const onWordRef = useRef(onWord);
  onWordRef.current = onWord;

  const handleSegment = useCallback((frames: RawFrame[], aspect: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const guesses = engine.classifier.classify(frames, aspect);
    if (!guesses || guesses.length === 0) return;
    const accepted = guesses[0].confidence >= AUTO_ACCEPT_CONFIDENCE;
    setDebugInfo((prev) => ({
      ...prev,
      last: `${frames.length}f → ${guesses.map((g) => `${g.word} ${Math.round(g.confidence * 100)}%`).join(', ')}`,
    }));
    if (accepted) onWordRef.current(displayWord(guesses[0].word));
    setLastResult({ guesses, accepted });
  }, []);

  const drawOverlay = useCallback((results: HolisticResults, mirrored: boolean) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    canvas.style.transform = mirrored ? 'scaleX(-1)' : '';
    // "Rest line": hands below it count as lowered (the sign is finished).
    const restY = restLineY(results.poseLandmarks ?? null, w / h);
    if (restY !== null && restY > 0.05 && restY < 0.98) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.moveTo(0, restY * h);
      ctx.lineTo(w, restY * h);
      ctx.stroke();
      ctx.restore();
    }
    const hands: Array<[HolisticResults['leftHandLandmarks'], string]> = [
      [results.leftHandLandmarks, '#34d399'],
      [results.rightHandLandmarks, '#60a5fa'],
    ];
    for (const [hand, color] of hands) {
      if (!hand) continue;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(hand[a].x * w, hand[a].y * h);
        ctx.lineTo(hand[b].x * w, hand[b].y * h);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      for (const p of hand) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  /** Handles one Holistic result: overlay, segmentation, live guess. */
  const processResults = useCallback((results: HolisticResults, ts: number, mirrored: boolean) => {
    const video = videoRef.current;
    const engine = engineRef.current;
    if (!video || !engine || !video.videoWidth) return;
    const aspect = video.videoWidth / video.videoHeight;
    drawOverlay(results, mirrored);

    const frame = toRawFrame(results);
    setHandsVisible(!!(frame.lh || frame.rh));

    // Shoulders must be in view; warn after a second without them.
    const pose = results.poseLandmarks;
    const shouldersOk = !!pose && [11, 12].every((i) => {
      const p = pose[i] as { x: number; y: number; visibility?: number };
      return p.y > 0 && p.y < 1 && p.x > 0 && p.x < 1 && (p.visibility ?? 1) > 0.5;
    });
    if (shouldersOk) {
      shouldersMissingSinceRef.current = null;
      setShouldersVisible(true);
    } else {
      shouldersMissingSinceRef.current ??= ts;
      if (ts - shouldersMissingSinceRef.current > 1000) setShouldersVisible(false);
    }
    const segmenter = segmenterRef.current;
    const finished = segmenter.push(frame, aspect, ts);
    setSigning(segmenter.state === 'signing');

    if (debug) {
      const d = debugRef.current;
      d.frames++;
      const now = performance.now();
      if (now - d.since >= 1000) {
        d.fps = (d.frames * 1000) / (now - d.since);
        d.frames = 0;
        d.since = now;
        setDebugInfo((prev) => ({
          ...prev,
          fps: d.fps.toFixed(1),
          engine: engine.delegate,
          camera: `${video.videoWidth}×${video.videoHeight}`,
          shoulders: shouldersOk ? 'yes' : 'NO',
          hands: `${frame.lh ? 'L' : '-'}${frame.rh ? 'R' : '-'}`,
          state: segmenter.state,
          speed: segmenter.speed.toFixed(2),
        }));
      }
    }

    if (finished) {
      setLiveGuess(null);
      handleSegment(finished, aspect);
    } else if (segmenter.state === 'signing' && ts - lastLiveGuessRef.current > LIVE_GUESS_INTERVAL_MS) {
      lastLiveGuessRef.current = ts;
      const partial = segmenter.current();
      const guesses = partial ? engine.classifier.classify(partial, aspect, 1) : null;
      setLiveGuess(guesses?.[0] ?? null);
    } else if (segmenter.state !== 'signing') {
      setLiveGuess(null);
    }
  }, [drawOverlay, handleSegment, debug]);

  const stopCamera = useCallback(() => {
    cameraTicketRef.current++;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    engineRef.current?.setResultsHandler(null);
    const video = videoRef.current;
    if (video) video.srcObject = null;
    segmenterRef.current.reset();
    setCameraOn(false);
    setSigning(false);
    setHandsVisible(false);
    setLiveGuess(null);
  }, []);

  const startCamera = useCallback(async () => {
    const engine = engineRef.current;
    const video = videoRef.current;
    if (!engine || !video || unmountedRef.current) return;
    const ticket = ++cameraTicketRef.current;
    const isCurrent = () => ticket === cameraTicketRef.current && !unmountedRef.current;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!isCurrent()) {
        // Stopped, restarted or unmounted while the camera was starting.
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      video.removeAttribute('src');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      if (!isCurrent()) return; // stopCamera() already released the stream
    } catch (e) {
      if (!isCurrent()) return;
      const name = e instanceof DOMException ? e.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in your browser settings and try again.'
          : name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Could not start the camera. Make sure no other app is using it (and the site is opened over https).',
      );
      return;
    }

    engine.reset();
    segmenterRef.current.reset();
    engine.setResultsHandler((r) => processResults(r, performance.now(), true));
    setCameraOn(true);

    let busy = false;
    let lastTime = -1;
    const loop = async () => {
      rafRef.current = requestAnimationFrame(loop);
      if (busy || video.readyState < 2 || video.currentTime === lastTime) return;
      busy = true;
      lastTime = video.currentTime;
      try {
        await engine.send(video);
      } catch (err) {
        console.error('Holistic error:', err);
      } finally {
        busy = false;
      }
    };
    loop();
  }, [processResults]);

  /** Recognises signs in an uploaded video by stepping through its frames. */
  const processVideoFile = useCallback(async (file: File) => {
    const engine = engineRef.current;
    const video = videoRef.current;
    if (!engine || !video || processingFileRef.current) return;
    const resumeCamera = streamRef.current !== null;
    stopCamera();
    processingFileRef.current = true;
    setError('');
    setLastResult(null);
    const url = URL.createObjectURL(file);
    try {
      video.srcObject = null;
      video.src = url;
      video.muted = true;
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('This video format is not supported by your browser.'));
      });
      engine.reset();
      segmenterRef.current.reset();
      let ts = 0;
      engine.setResultsHandler((r) => processResults(r, ts, false));
      const duration = video.duration;
      setFileProgress(0);
      for (let t = 0; t < duration; t += 1 / VIDEO_FILE_FPS) {
        if (unmountedRef.current) return;
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
          video.currentTime = t;
        });
        ts = t * 1000;
        await engine.send(video);
        setFileProgress(Math.min(1, t / duration));
      }
      const rest = segmenterRef.current.flush();
      if (rest) handleSegment(rest, video.videoWidth / video.videoHeight);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not process this video.');
    } finally {
      engine.setResultsHandler(null);
      setFileProgress(null);
      setSigning(false);
      setLiveGuess(null);
      processingFileRef.current = false;
      video.onseeked = null;
      video.onloadeddata = null;
      video.onerror = null;
      URL.revokeObjectURL(url);
      // Go back to live signing if the camera was on before the upload.
      if (resumeCamera && !unmountedRef.current) startCamera();
    }
  }, [handleSegment, processResults, startCamera, stopCamera]);

  // Load the engine, then start the camera automatically.
  useEffect(() => {
    let cancelled = false;
    unmountedRef.current = false;
    getSignEngine()
      .then((engine) => {
        if (cancelled) return;
        engineRef.current = engine;
        setStatus('ready');
        startCamera();
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Sign engine failed to load:', e);
        setError(e instanceof Error ? e.message : 'Failed to load sign recognition.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
      unmountedRef.current = true;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Release the camera while the tab is hidden (camera light off); resume on return.
  useEffect(() => {
    let resume = false;
    const onVisibility = () => {
      if (document.hidden) {
        resume = streamRef.current !== null || rafRef.current !== null;
        if (resume) stopCamera();
      } else if (resume && !processingFileRef.current && !unmountedRef.current) {
        resume = false;
        startCamera();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stopCamera);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stopCamera);
    };
  }, [startCamera, stopCamera]);

  // Full screen: fill the window and also ask the browser for real full screen
  // (not available everywhere, e.g. iPhone Safari — the window-filling overlay still works).
  const toggleExpanded = useCallback(() => {
    if (expanded) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setExpanded(false);
    } else {
      setExpanded(true);
      rootRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, [expanded]);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  useEffect(() => () => onExpandedChange?.(false), [onExpandedChange]);

  useEffect(() => {
    if (!expanded) return;
    const onFullscreenChange = () => { if (!document.fullscreenElement) setExpanded(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  // Leaving expanded mode (Esc, button, send…) must also leave browser full screen,
  // or the panel would stay in the full-screen layer and swallow clicks.
  useEffect(() => {
    if (!expanded && document.fullscreenElement && document.fullscreenElement === rootRef.current) {
      document.exitFullscreen().catch(() => {});
    }
  }, [expanded]);

  useEffect(() => () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const sendFromCamera = () => {
    if (!sentence.trim()) return;
    onSend();
    setJustSent(true);
    setTimeout(() => setJustSent(false), 2000);
  };

  const hint = !cameraOn
    ? null
    : signing
      ? liveGuess
        ? `Signing… looks like "${displayWord(liveGuess.word)}"`
        : 'Signing…'
      : !shouldersVisible
        ? 'Move back a little so your shoulders are in view'
        : handsVisible
          ? 'Sign one word, then pause or lower your hands'
          : 'Show your head, shoulders and hands to the camera';

  const isPanel = layout === 'panel' && !expanded;
  const toolbarBtn = 'icon-btn w-8 h-8';

  return (
    <div
      ref={rootRef}
      className={
        expanded
          ? 'dark fixed inset-0 z-50 flex flex-col bg-canvas text-ink'
          : isPanel
            ? 'h-full flex flex-col bg-surface'
            : 'mb-3 card overflow-hidden shadow-soft'
      }
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 pl-3.5 pr-2 h-12 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Hand size={15} className="text-sign" />
            Sign camera
          </span>
          {cameraOn ? (
            <span className="inline-flex items-center gap-1.5 h-5 px-2 rounded-full bg-danger-soft text-danger text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" /> Live
            </span>
          ) : status === 'ready' && fileProgress === null ? (
            <span className="text-xs text-ink-3">Off</span>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          {status === 'ready' && (
            <>
              <button
                type="button"
                onClick={() => (cameraOn ? stopCamera() : startCamera())}
                disabled={fileProgress !== null}
                className={toolbarBtn}
                title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
              >
                {cameraOn ? <CameraOff size={16} /> : <Camera size={16} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) processVideoFile(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={fileProgress !== null}
                className={toolbarBtn}
                title="Recognise signs in a video file"
              >
                <Film size={16} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleExpanded}
            className={toolbarBtn}
            title={expanded ? 'Exit full screen (Esc)' : 'Full screen'}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {layout === 'inline' && (
            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                onClose();
              }}
              className={toolbarBtn}
              title="Close camera"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Video */}
      <div className={`relative bg-black ${expanded || isPanel ? 'flex-1 min-h-0' : 'w-full h-[45vh] min-h-56'}`}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-contain"
          style={{ transform: fileProgress === null ? 'scaleX(-1)' : '' }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

        {debug && (
          <div className="absolute top-2 left-2 z-10 max-w-[90%] px-2.5 py-2 rounded-lg bg-black/75 text-[11px] leading-snug font-mono text-white pointer-events-none">
            <div className="font-bold text-emerald-300 mb-0.5">debug</div>
            {Object.entries(debugInfo).map(([k, v]) => (
              <div key={k} className="truncate"><span className="text-white/50">{k}:</span> {v}</div>
            ))}
            {Object.keys(debugInfo).length === 0 && <div className="text-white/60">waiting for frames…</div>}
          </div>
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 text-sm">
            <span className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            Loading sign recognition…
          </div>
        )}
        {status === 'ready' && !cameraOn && fileProgress === null && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60 text-sm">
            <CameraOff size={22} />
            Camera is off
            <button type="button" onClick={startCamera} className="btn btn-sm bg-white/10 text-white hover:bg-white/20">
              Turn on
            </button>
          </div>
        )}
        {signing && <div className="absolute inset-0 ring-4 ring-inset ring-sign/70 pointer-events-none transition-opacity" />}

        {(hint || fileProgress !== null) && (
          <div className="absolute left-3 right-3 bottom-3 flex justify-center pointer-events-none">
            <div className={`max-w-full px-3.5 py-1.5 rounded-2xl text-center text-[13px] font-medium backdrop-blur-md shadow-lift ${
              signing ? 'bg-sign text-white' : 'bg-black/60 text-white/90'
            }`}>
              {fileProgress !== null ? `Analysing video… ${Math.round(fileProgress * 100)}%` : hint}
            </div>
          </div>
        )}
        {fileProgress !== null && (
          <div className="absolute top-0 inset-x-0 h-1 bg-white/10">
            <div className="h-full bg-sign transition-all" style={{ width: `${fileProgress * 100}%` }} />
          </div>
        )}
      </div>

      {/* Results + sentence */}
      <div className={`px-3.5 py-3 space-y-2.5 flex-shrink-0 ${expanded ? 'pb-5' : ''}`}>
        {expanded && (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-h-12 px-4 py-2.5 rounded-xl bg-surface-2 border border-line text-lg font-medium text-ink break-words flex items-center">
              {sentence || (
                <span className="text-ink-3 text-sm font-normal">{justSent ? 'Sent ✓ — sign your next sentence' : 'Recognised words appear here…'}</span>
              )}
            </div>
            <button type="button" onClick={onClear} disabled={!sentence} className="icon-btn w-12 h-12 rounded-xl" title="Clear">
              <Eraser size={18} />
            </button>
            <button
              type="button"
              onClick={sendFromCamera}
              disabled={!sentence.trim()}
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand text-white hover:bg-brand-hover disabled:bg-surface-3 disabled:text-ink-3 transition-colors"
              title="Send"
            >
              <Send size={18} />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-warn-soft text-warn-ink text-xs">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {lastResult ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
            {lastResult.accepted ? (
              <>
                <span className="text-ink-2">
                  Added <span className="font-semibold text-sign-ink">"{displayWord(lastResult.guesses[0].word)}"</span>{' '}
                  <span className="text-ink-3">({Math.round(lastResult.guesses[0].confidence * 100)}%)</span>
                </span>
                {lastResult.guesses.length > 1 && <span className="text-ink-3 ml-1">· Not right?</span>}
                {lastResult.guesses.slice(1).map((g) => (
                  <button
                    key={g.word}
                    type="button"
                    onClick={() => {
                      onReplaceLastWord(displayWord(g.word));
                      setLastResult({ guesses: [g, ...lastResult.guesses.filter((x) => x !== g)], accepted: true });
                    }}
                    className="chip hover:border-line-strong hover:text-ink transition-colors"
                  >
                    {displayWord(g.word)}
                  </button>
                ))}
              </>
            ) : (
              <>
                <span className="font-medium text-warn-ink">Not sure — tap the right word:</span>
                {lastResult.guesses.map((g) => (
                  <button
                    key={g.word}
                    type="button"
                    onClick={() => {
                      onWord(displayWord(g.word));
                      setLastResult({ guesses: [g, ...lastResult.guesses.filter((x) => x !== g)], accepted: true });
                    }}
                    className="chip bg-warn-soft text-warn-ink border-warn/30 hover:border-warn/60 transition-colors"
                  >
                    {displayWord(g.word)} <span className="opacity-60">{Math.round(g.confidence * 100)}%</span>
                  </button>
                ))}
              </>
            )}
          </div>
        ) : !expanded && status === 'ready' && (
          <p className="text-[13px] text-ink-3">
            Sign one word at a time. To finish a word, pause for a moment or lower your hands below the dashed line.
          </p>
        )}

        {showVocabulary && engineRef.current && (
          <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1 p-2 rounded-xl bg-surface-2 border border-line">
            {[...engineRef.current.classifier.vocabulary].sort().map((w) => (
              <span key={w} className="px-1.5 py-0.5 rounded-md bg-surface text-ink-2 text-[11px] border border-line">{w}</span>
            ))}
          </div>
        )}
        <div className="text-[11px] text-ink-3">
          Recognises{' '}
          <button
            type="button"
            onClick={() => setShowVocabulary((v) => !v)}
            disabled={status !== 'ready'}
            className="font-medium text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink disabled:no-underline"
          >
            {showVocabulary ? 'hide words' : '263 common ISL words'}
          </button>{' '}
          · model trained on{' '}
          <a href="https://zenodo.org/records/4010759" target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
            INCLUDE
          </a>{' '}
          (AI4Bharat, CC BY 4.0)
        </div>
      </div>
    </div>
  );
};
