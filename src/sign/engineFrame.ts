// Runs inside sign-engine.html (an isolated same-origin iframe) — see engine.ts.
import { createHolistic, Delegate, HolisticInstance, HolisticResults } from './holistic';
import { SignClassifier } from './classifier';
import type { SignEngine } from './engine';

declare global {
  interface Window {
    createSignEngine?: () => Promise<SignEngine>;
  }
}

// Frames are larger than Holistic needs; landmarks are normalized so downscaling is lossless for us.
const MAX_FRAME_SIDE = 960;

/** Debug override from the app URL: ?mp=cpu or ?mp=gpu. */
function preferredDelegate(): Delegate | undefined {
  try {
    const mp = new URLSearchParams(window.parent.location.search).get('mp')?.toUpperCase();
    return mp === 'CPU' || mp === 'GPU' ? mp : undefined;
  } catch {
    return undefined;
  }
}

window.createSignEngine = async () => {
  const classifierPromise = SignClassifier.load();
  let handler: ((r: HolisticResults) => void) | null = null;
  let holistic: HolisticInstance = await createHolistic(preferredDelegate());
  const classifier = await classifierPromise;
  // VIDEO mode needs strictly increasing timestamps (the self-test used 40–400 ms).
  let lastTs = 1000;

  // The parent's <video> is from another realm, so MediaPipe's instanceof
  // checks fail on it; copy each frame onto a canvas owned by this frame.
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available.');

  return {
    classifier,
    get delegate() { return holistic.delegate; },
    setResultsHandler: (h) => { handler = h; },
    async send(video) {
      const w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) return;
      const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(w, h));
      const cw = Math.round(w * scale), ch = Math.round(h * scale);
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      ctx.drawImage(video, 0, 0, cw, ch);
      lastTs = Math.max(lastTs + 1, Math.round(performance.now()));
      let results: HolisticResults;
      try {
        results = holistic.detect(canvas, lastTs);
      } catch (e) {
        // A MediaPipe abort leaves the graph unusable — rebuild it (same CPU/GPU choice).
        const delegate = holistic.delegate;
        try { holistic.close(); } catch { /* already broken */ }
        holistic = await createHolistic(delegate);
        throw e;
      }
      handler?.(results);
    },
    reset() {
      // Tracking state adapts within a few frames; timestamps simply keep increasing.
    },
  };
};
