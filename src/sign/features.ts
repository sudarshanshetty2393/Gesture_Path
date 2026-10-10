// Per-frame features for sign recognition.
// MUST stay identical to ml/features.py — the model was trained on features
// computed there. ml/test_parity.py checks both produce the same numbers.

export type Point = { x: number; y: number };

export interface RawFrame {
  pose: Point[] | null; // 33 Holistic pose landmarks
  lh: Point[] | null;   // Holistic "left hand", 21 landmarks
  rh: Point[] | null;   // Holistic "right hand", 21 landmarks
}

export const SEQ_LEN = 32;
const BODY_POINTS = [0, 13, 14, 15, 16]; // nose, elbows, wrists
const HAND_DIM = 1 + 40 + 2 + 2;          // present, shape, wrist loc, index-tip loc
export const FEATURE_DIM = BODY_POINTS.length * 2 + 2 * HAND_DIM; // 100
const ACTIVE_WRIST_MAX_Y = 1.2;
const MIN_SHOULDER_WIDTH = 1e-3;

type BodyRef = { cx: number; cy: number; scale: number };

function bodyFrame(pose: Point[] | null, aspect: number): BodyRef | null {
  if (!pose) return null;
  const lx = pose[11].x * aspect, ly = pose[11].y;
  const rx = pose[12].x * aspect, ry = pose[12].y;
  const scale = Math.hypot(lx - rx, ly - ry);
  if (scale < MIN_SHOULDER_WIDTH) return null;
  return { cx: (lx + rx) / 2, cy: (ly + ry) / 2, scale };
}

function handFeatures(hand: Point[] | null, aspect: number, ref: BodyRef, out: Float32Array, off: number) {
  if (!hand) return;
  const wx = hand[0].x * aspect, wy = hand[0].y;
  const palm = Math.hypot(hand[9].x * aspect - wx, hand[9].y - wy);
  if (palm < 1e-6) return;
  out[off] = 1;
  for (let i = 1; i < 21; i++) {
    out[off + 1 + (i - 1) * 2] = (hand[i].x * aspect - wx) / palm;
    out[off + 2 + (i - 1) * 2] = (hand[i].y - wy) / palm;
  }
  out[off + 41] = (wx - ref.cx) / ref.scale;
  out[off + 42] = (wy - ref.cy) / ref.scale;
  out[off + 43] = (hand[8].x * aspect - ref.cx) / ref.scale;
  out[off + 44] = (hand[8].y - ref.cy) / ref.scale;
}

function frameFeatures(f: RawFrame, aspect: number, ref: BodyRef): Float32Array {
  const out = new Float32Array(FEATURE_DIM);
  if (f.pose) {
    BODY_POINTS.forEach((p, i) => {
      out[i * 2] = (f.pose![p].x * aspect - ref.cx) / ref.scale;
      out[i * 2 + 1] = (f.pose![p].y - ref.cy) / ref.scale;
    });
  }
  handFeatures(f.lh, aspect, ref, out, 10);
  handFeatures(f.rh, aspect, ref, out, 10 + HAND_DIM);
  return out;
}

/** True if either hand is present and raised into signing space. */
export function isActive(feats: Float32Array): boolean {
  for (const off of [10, 10 + HAND_DIM]) {
    if (feats[off] > 0.5 && feats[off + 42] < ACTIVE_WRIST_MAX_Y) return true;
  }
  return false;
}

/** Per-frame features; body reference falls back to the nearest earlier, then later, frame with a pose. */
export function sequenceFeatures(frames: RawFrame[], aspect: number): Float32Array[] {
  const refs = frames.map((f) => bodyFrame(f.pose, aspect));
  let last: BodyRef | null = null;
  for (let i = 0; i < refs.length; i++) {
    if (refs[i] === null) refs[i] = last; else last = refs[i];
  }
  let next: BodyRef | null = null;
  for (let i = refs.length - 1; i >= 0; i--) {
    if (refs[i] === null) refs[i] = next; else next = refs[i];
  }
  const fallback: BodyRef = { cx: 0.5 * aspect, cy: 0.5, scale: 0.3 };
  return frames.map((f, i) => frameFeatures(f, aspect, refs[i] ?? fallback));
}

/** Crops to the first..last active frame (inclusive). null if never active. */
export function trimActive(feats: Float32Array[]): Float32Array[] | null {
  let first = -1, last = -1;
  feats.forEach((f, i) => {
    if (isActive(f)) { if (first < 0) first = i; last = i; }
  });
  return first < 0 ? null : feats.slice(first, last + 1);
}

/** Nearest-frame resampling to a fixed length. */
export function resample(feats: Float32Array[], length = SEQ_LEN): Float32Array[] {
  const n = feats.length;
  return Array.from({ length }, (_, t) => feats[Math.min(Math.floor(((t + 0.5) * n) / length), n - 1)]);
}
