// Runs inside sign-engine.html (an isolated same-origin iframe) — see engine.ts.
import { createHolistic, HolisticInstance, HolisticResults } from './holistic';
import { SignClassifier } from './classifier';
import type { SignEngine } from './engine';

declare global {
  interface Window {
    createSignEngine?: () => Promise<SignEngine>;
  }
}

// Frames are larger than Holistic needs; landmarks are normalized so downscaling is lossless for us.
const MAX_FRAME_SIDE = 960;

window.createSignEngine = async () => {
  const classifierPromise = SignClassifier.load();
  let handler: ((r: HolisticResults) => void) | null = null;
  let holistic: HolisticInstance | null = null;

  const ensureHolistic = async () => {
    if (!holistic) {
      holistic = await createHolistic();
      holistic.onResults((r) => handler?.(r));
    }
    return holistic;
  };
  await ensureHolistic();
  const classifier = await classifierPromise;

  // The parent's <video> is from another realm, so MediaPipe's instanceof
  // checks fail on it; copy each frame onto a canvas owned by this frame.
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available.');

  return {
    classifier,
    setResultsHandler: (h) => { handler = h; },
    async send(video) {
      const w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) return;
      const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(w, h));
      const cw = Math.round(w * scale), ch = Math.round(h * scale);
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      ctx.drawImage(video, 0, 0, cw, ch);
      const instance = await ensureHolistic();
      try {
        await instance.send({ image: canvas });
      } catch (e) {
        // A MediaPipe abort leaves the graph unusable — rebuild it on the next frame.
        holistic = null;
        instance.close().catch(() => {});
        throw e;
      }
    },
    reset() {
      holistic?.reset();
    },
  };
};
