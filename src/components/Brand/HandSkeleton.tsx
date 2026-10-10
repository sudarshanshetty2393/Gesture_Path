import React, { useEffect, useRef, useState } from 'react';

// An animated 21-point hand skeleton — the same landmark layout MediaPipe uses
// for sign recognition — cycling through hand shapes. Purely decorative.

type Vec = [number, number];

interface Pose {
  label: string;
  /** Curl per finger 0 (straight) → 1 (folded): thumb, index, middle, ring, pinky. */
  curl: [number, number, number, number, number];
  /** Extra sideways spread per finger, degrees. */
  spread?: [number, number, number, number, number];
  wave?: boolean;
}

export const POSES: Pose[] = [
  { label: 'hello', curl: [0, 0, 0, 0, 0], wave: true },
  { label: 'one', curl: [0.85, 0, 1, 1, 1] },
  { label: 'two', curl: [0.85, 0, 0, 1, 1], spread: [0, -6, 8, 0, 0] },
  { label: 'I love you', curl: [0, 0, 1, 1, 0], spread: [-8, 0, 0, 0, 6] },
  { label: 'yes', curl: [0.8, 1, 1, 1, 1] },
];

const CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

// Finger roots (relative to the wrist at 0,0; y up is negative), lengths and base angles.
const ROOTS: Vec[] = [[-30, -20], [-24, -74], [-3, -79], [17, -75], [34, -64]];
const LENGTHS = [[24, 21, 18], [30, 21, 17], [33, 23, 18], [31, 21, 17], [24, 17, 15]];
const BASE_ANGLE = [-58, -11, 0, 9, 21];
const JOINT_BEND = [70, 95, 65];

const rad = (d: number) => (d * Math.PI) / 180;

function handPoints(curl: number[], spread: number[], rotation: number): Vec[] {
  const pts: Vec[] = new Array(21);
  pts[0] = [0, 0];
  for (let f = 0; f < 5; f++) {
    const c = curl[f];
    // The thumb folds across the palm; the other fingers fold towards the viewer.
    let dir = BASE_ANGLE[f] + spread[f] + (f === 0 ? c * 75 : 0);
    const root: Vec = f === 0 ? [ROOTS[0][0] * (1 - c * 0.15), ROOTS[0][1]] : ROOTS[f];
    pts[f * 4 + 1] = root;
    let [x, y] = root;
    let bend = 0;
    for (let s = 0; s < 3; s++) {
      bend += c * JOINT_BEND[s] * (f === 0 ? 0.55 : 1);
      // Orthographic projection: a segment folding towards the camera shortens (cos),
      // and past 90° it points back down towards the palm.
      const len = LENGTHS[f][s] * Math.cos(rad(bend));
      x += Math.sin(rad(dir)) * len;
      y -= Math.cos(rad(dir)) * len;
      pts[f * 4 + 2 + s] = [x, y];
      if (f === 0) dir += c * 12;
    }
  }
  const r = rad(rotation);
  return pts.map(([px, py]) => [px * Math.cos(r) - py * Math.sin(r), px * Math.sin(r) + py * Math.cos(r)]);
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface HandSkeletonProps {
  size?: number;
  /** ms each pose is held (including the transition). */
  holdMs?: number;
  onPoseChange?: (label: string) => void;
  className?: string;
  /** Colours of the bones gradient. */
  from?: string;
  to?: string;
  dotColor?: string;
}

export const HandSkeleton: React.FC<HandSkeletonProps> = ({
  size = 220,
  holdMs = 2600,
  onPoseChange,
  className = '',
  from = '#93c5fd',
  to = '#5eead4',
  dotColor = '#ffffff',
}) => {
  const [points, setPoints] = useState<Vec[]>(() => handPoints(POSES[0].curl, [0, 0, 0, 0, 0], 0));
  const onPoseChangeRef = useRef(onPoseChange);
  onPoseChangeRef.current = onPoseChange;
  const gradientId = useRef(`hand-grad-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    onPoseChangeRef.current?.(POSES[0].label);
    if (reduced) return;
    let raf = 0;
    let lastIndex = 0;
    const start = performance.now();
    const transitionMs = 650;
    const tick = (now: number) => {
      // rAF timestamps can be slightly earlier than performance.now() at start.
      const elapsed = Math.max(0, now - start);
      const index = Math.floor(elapsed / holdMs) % POSES.length;
      const prev = POSES[(index + POSES.length - 1) % POSES.length];
      const pose = POSES[index];
      const t = ease(Math.min(1, (elapsed % holdMs) / transitionMs));
      const zero = [0, 0, 0, 0, 0];
      const curl = pose.curl.map((c, i) => prev.curl[i] + (c - prev.curl[i]) * t);
      const spread = (pose.spread ?? zero).map((s, i) => (prev.spread ?? zero)[i] + (s - (prev.spread ?? zero)[i]) * t);
      const waveAmount = (pose.wave ? t : 0) + (prev.wave ? 1 - t : 0);
      const rotation = Math.sin(now / 260) * 14 * waveAmount;
      setPoints(handPoints(curl, spread, rotation));
      // Announce the new shape once it has fully formed (like real recognition).
      if (index !== lastIndex && t >= 1) {
        lastIndex = index;
        onPoseChangeRef.current?.(pose.label);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [holdMs]);

  return (
    <svg viewBox="-80 -175 160 195" width={size} height={size * (195 / 160)} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
          {/* style (not attributes) so CSS variables like rgb(var(--brand)) work */}
          <stop offset="0%" style={{ stopColor: from }} />
          <stop offset="100%" style={{ stopColor: to }} />
        </linearGradient>
      </defs>
      <g stroke={`url(#${gradientId})`} strokeWidth={3.2} strokeLinecap="round">
        {CONNECTIONS.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} />
        ))}
      </g>
      <g style={{ fill: dotColor }}>
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 4 === 0 && i > 0 ? 4 : i === 0 ? 5 : 3.2} />
        ))}
      </g>
    </svg>
  );
};
