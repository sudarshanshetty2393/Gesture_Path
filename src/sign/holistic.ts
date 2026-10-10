// Loads MediaPipe Holistic — the same landmark model the training data
// (AI4Bharat INCLUDE pose dump) was extracted with.
// Loaded via a <script> tag rather than bundled: the package is a
// closure-compiled global script and breaks when Vite/Rollup bundles it.

import type { Point, RawFrame } from './features';

const HOLISTIC_VERSION = '0.5.1675471629';
const BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${HOLISTIC_VERSION}/`;

export interface HolisticResults {
  poseLandmarks?: Point[];
  leftHandLandmarks?: Point[];
  rightHandLandmarks?: Point[];
  image: CanvasImageSource;
}

export interface HolisticInstance {
  setOptions(options: Record<string, unknown>): void;
  onResults(cb: (results: HolisticResults) => void): void;
  initialize(): Promise<void>;
  send(inputs: { image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement }): Promise<void>;
  reset(): void;
  close(): Promise<void>;
}

declare global {
  interface Window {
    Holistic?: new (config: { locateFile: (file: string) => string }) => HolisticInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Holistic) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${BASE_URL}holistic.js`;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        s.remove();
        reject(new Error('Failed to load MediaPipe Holistic — check your internet connection.'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export async function createHolistic(): Promise<HolisticInstance> {
  await loadScript();
  if (!window.Holistic) throw new Error('MediaPipe Holistic did not initialise.');
  const holistic = new window.Holistic({ locateFile: (file) => `${BASE_URL}${file}` });
  holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    refineFaceLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  await holistic.initialize();
  return holistic;
}

export function toRawFrame(results: HolisticResults): RawFrame {
  return {
    pose: results.poseLandmarks ?? null,
    lh: results.leftHandLandmarks ?? null,
    rh: results.rightHandLandmarks ?? null,
  };
}
