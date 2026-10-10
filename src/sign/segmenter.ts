// Splits a live landmark stream into one-sign segments.
// A sign starts when a hand is raised into signing space and ends when the
// hands are lowered (or leave the frame) for END_GAP_MS. Matches how the
// training clips were trimmed (features.trimActive).

import { RawFrame, isActive, sequenceFeatures } from './features';

const END_GAP_MS = 350;      // hands down this long => sign finished
const MIN_ACTIVE_FRAMES = 6; // shorter blips are ignored
const MAX_SIGN_MS = 4000;    // force a cut if hands never go down
const PRE_ROLL = 2;          // frames kept before the first active frame

export type SegmenterState = 'idle' | 'signing' | 'waitingForRest';

export class SignSegmenter {
  private frames: RawFrame[] = [];
  private activeCount = 0;
  private startTs = 0;
  private lastActiveTs = 0;
  private lastActiveIdx = -1;
  private history: RawFrame[] = [];
  state: SegmenterState = 'idle';

  /** Feed one frame. Returns the frames of a finished sign, or null. */
  push(frame: RawFrame, aspect: number, ts: number): RawFrame[] | null {
    // Activity is judged on this frame alone (its own body reference).
    const active = isActive(sequenceFeatures([frame], aspect)[0]);

    if (this.state === 'waitingForRest') {
      if (!active) this.state = 'idle';
      return null;
    }

    if (this.state === 'idle') {
      this.history.push(frame);
      if (this.history.length > PRE_ROLL) this.history.shift();
      if (!active) return null;
      this.state = 'signing';
      this.frames = this.history.slice(0, -1);
      this.history = [];
      this.activeCount = 0;
      this.startTs = ts;
    }

    this.frames.push(frame);
    if (active) {
      this.activeCount++;
      this.lastActiveTs = ts;
      this.lastActiveIdx = this.frames.length - 1;
    }

    if (!active && ts - this.lastActiveTs >= END_GAP_MS) {
      return this.finish('idle');
    }
    if (ts - this.startTs >= MAX_SIGN_MS) {
      return this.finish('waitingForRest');
    }
    return null;
  }

  /** Frames of the sign in progress (for live "current guess"), or null. */
  current(): RawFrame[] | null {
    return this.state === 'signing' && this.activeCount >= MIN_ACTIVE_FRAMES
      ? this.frames.slice(0, this.lastActiveIdx + 1)
      : null;
  }

  /** Ends any sign in progress (e.g. at the end of an uploaded video). */
  flush(): RawFrame[] | null {
    return this.state === 'signing' ? this.finish('idle') : null;
  }

  reset() {
    this.frames = [];
    this.history = [];
    this.activeCount = 0;
    this.state = 'idle';
  }

  private finish(next: SegmenterState): RawFrame[] | null {
    const seg = this.activeCount >= MIN_ACTIVE_FRAMES ? this.frames.slice(0, this.lastActiveIdx + 1) : null;
    this.frames = [];
    this.activeCount = 0;
    this.state = next;
    return seg;
  }
}
