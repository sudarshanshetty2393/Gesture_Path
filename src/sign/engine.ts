// Module-level singleton: MediaPipe Holistic + the sign classifier are heavy
// to load, so they are created once and reused across camera open/close.
//
// They run inside a hidden same-origin iframe (sign-engine.html) because the
// JASigning avatar script loaded by index.html (public/cwa/allcsa.js) replaces
// window.WebAssembly with a wasm2js polyfill, which breaks MediaPipe and
// TensorFlow.js. The iframe has its own, untouched globals; the parent calls
// into it directly (same origin), passing its <video> element as input.

import type { HolisticResults } from './holistic';
import type { SignClassifier } from './classifier';

export interface SignEngine {
  classifier: SignClassifier;
  /** Routes Holistic results to the current consumer (camera or video file). */
  setResultsHandler(handler: ((r: HolisticResults) => void) | null): void;
  /** Runs Holistic on the video's current frame; results go to the handler. */
  send(video: HTMLVideoElement): Promise<void>;
  /** Clears tracking state (call when switching between camera and a video file). */
  reset(): void;
}

const FRAME_URL = '/sign-engine.html';
const FRAME_TIMEOUT_MS = 30000;

let enginePromise: Promise<SignEngine> | null = null;

function loadFrame(): Promise<Window> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.src = FRAME_URL;
    iframe.title = 'sign recognition engine';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    Object.assign(iframe.style, {
      position: 'absolute', width: '0', height: '0', border: '0', visibility: 'hidden', pointerEvents: 'none',
    });
    const started = Date.now();
    const poll = () => {
      const win = iframe.contentWindow;
      if (win?.createSignEngine) return resolve(win);
      if (Date.now() - started > FRAME_TIMEOUT_MS) {
        iframe.remove();
        return reject(new Error('Sign recognition engine did not start.'));
      }
      setTimeout(poll, 100);
    };
    iframe.onload = poll;
    iframe.onerror = () => { iframe.remove(); reject(new Error('Could not load the sign recognition engine.')); };
    document.body.appendChild(iframe);
  });
}

export function getSignEngine(): Promise<SignEngine> {
  if (!enginePromise) {
    enginePromise = loadFrame()
      .then((win) => win.createSignEngine!())
      .catch((e) => {
        enginePromise = null; // allow retry
        throw e;
      });
  }
  return enginePromise;
}
