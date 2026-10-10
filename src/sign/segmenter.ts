// Splits a live landmark stream into one-sign segments.
//
// A sign starts when a hand is raised into signing space. It ends when
//  - the hands are lowered / leave the frame for END_GAP_MS (as in the training
//    clips, see features.trimActive), or
//  - the hands stay still for HOLD_END_MS — for people who keep their hands up
//    or resting on a desk in view between signs.
// All thresholds are in milliseconds (not frames) so slow devices behave the
// same as fast ones. Pause/speed values were measured on the INCLUDE dataset:
// signing hands move ~1.2 shoulder-widths/s (median) and pauses inside a sign
// are < 400 ms for 97% of signs.

import { RawFrame, isActive, sequenceFeatures, handLocations } from './features';

const END_GAP_MS = 600;       // hands down / out of view this long => sign finished (dips inside a sign are < 600 ms for 99.3% of signs)
const HOLD_END_MS = 700;      // hands still this long => sign finished
const STILL_SPEED = 0.5;      // shoulder-widths per second
const SPEED_WINDOW_MS = 250;  // speed measured over this window (smooths tracking jitter)
const MIN_SIGN_MS = 300;      // shorter blips are ignored
const MIN_ACTIVE_FRAMES = 3;
const MAX_SIGN_MS = 4000;     // force a cut if a "sign" never ends
const PRE_ROLL = 2;           // frames kept before the first active frame

export type SegmenterState = 'idle' | 'signing' | 'waitingForMotion';

export class SignSegmenter {
  private frames: RawFrame[] = [];
  private stamps: number[] = [];
  private activeCount = 0;
  private startTs = 0;
  private lastActiveTs = 0;
  private lastActiveIdx = -1;
  private lastMovingTs = 0;
  private lastMovingIdx = -1;
  private moved = false;
  private inactiveSince = -1;
  private history: RawFrame[] = [];
  private track: Array<{ ts: number; pos: number[] | null }> = [];
  state: SegmenterState = 'idle';
  /** Latest hand speed (shoulder-widths/s), for the debug panel. */
  speed = 0;

  /** Feed one frame. Returns the frames of a finished sign, or null. */
  push(frame: RawFrame, aspect: number, ts: number): RawFrame[] | null {
    // Activity is judged on this frame alone (its own body reference).
    const feats = sequenceFeatures([frame], aspect)[0];
    const active = isActive(feats);
    this.speed = this.measureSpeed(handLocations(feats), ts);
    const moving = this.speed > STILL_SPEED;

    if (this.state === 'waitingForMotion') {
      // Only a real lowering (not a brief tracking dropout) returns to idle.
      if (!active) {
        if (this.inactiveSince < 0) this.inactiveSince = ts;
        if (ts - this.inactiveSince >= END_GAP_MS) this.state = 'idle';
        return null;
      }
      this.inactiveSince = -1;
      if (!moving) return null;
      // else: hands moving again — start a new sign below
    }

    if (this.state !== 'signing') {
      this.history.push(frame);
      if (this.history.length > PRE_ROLL) this.history.shift();
      if (!active) return null;
      this.state = 'signing';
      this.frames = this.history.slice(0, -1);
      this.stamps = this.frames.map(() => ts);
      this.history = [];
      this.activeCount = 0;
      this.startTs = ts;
      this.lastActiveTs = ts;
      this.lastMovingTs = ts;
      this.lastMovingIdx = -1;
      this.moved = moving;
    }

    this.frames.push(frame);
    this.stamps.push(ts);
    // Until the hands actually move, slide the start forward so a sign doesn't
    // begin with a long still stretch (hands resting in view).
    if (!this.moved && !moving && this.frames.length > PRE_ROLL + 1) {
      const drop = this.frames.length - (PRE_ROLL + 1);
      this.frames.splice(0, drop);
      this.stamps.splice(0, drop);
      this.lastActiveIdx = Math.max(-1, this.lastActiveIdx - drop);
      this.startTs = this.stamps[0];
      this.activeCount = Math.min(this.activeCount, this.frames.length - 1);
    }
    const idx = this.frames.length - 1;
    if (active) {
      this.activeCount++;
      this.lastActiveTs = ts;
      this.lastActiveIdx = idx;
    }
    if (moving) {
      this.moved = true;
      this.lastMovingTs = ts;
      this.lastMovingIdx = idx;
    }

    if (!active && ts - this.lastActiveTs >= END_GAP_MS) {
      return this.finish('idle', this.lastActiveIdx);
    }
    if (active && ts - this.lastMovingTs >= HOLD_END_MS) {
      return this.finish('waitingForMotion', this.endOfMotionIdx());
    }
    if (ts - this.startTs >= MAX_SIGN_MS) {
      return this.finish('waitingForMotion', this.lastActiveIdx);
    }
    return null;
  }

  /** Frames of the sign in progress (for live "current guess"), or null. */
  current(): RawFrame[] | null {
    return this.state === 'signing' && this.isValid(this.lastActiveIdx)
      ? this.frames.slice(0, this.lastActiveIdx + 1)
      : null;
  }

  /** Ends any sign in progress (e.g. at the end of an uploaded video). */
  flush(): RawFrame[] | null {
    return this.state === 'signing' ? this.finish('idle', this.lastActiveIdx) : null;
  }

  reset() {
    this.frames = [];
    this.stamps = [];
    this.history = [];
    this.track = [];
    this.activeCount = 0;
    this.state = 'idle';
    this.speed = 0;
  }

  /** Keep a short final hold after the last movement (signs often end with one). */
  private endOfMotionIdx(): number {
    if (this.lastMovingIdx < 0) return this.lastActiveIdx;
    const until = this.stamps[this.lastMovingIdx] + 200;
    let i = this.lastMovingIdx;
    while (i + 1 <= this.lastActiveIdx && this.stamps[i + 1] <= until) i++;
    return i;
  }

  private isValid(endIdx: number): boolean {
    if (endIdx < 0 || this.activeCount < MIN_ACTIVE_FRAMES || !this.moved) return false;
    return this.stamps[endIdx] - this.startTs >= MIN_SIGN_MS;
  }

  private finish(next: SegmenterState, endIdx: number): RawFrame[] | null {
    const seg = this.isValid(endIdx) ? this.frames.slice(0, endIdx + 1) : null;
    this.frames = [];
    this.stamps = [];
    this.activeCount = 0;
    this.state = next;
    this.inactiveSince = -1;
    return seg;
  }

  /** Fastest hand displacement over the last SPEED_WINDOW_MS, in shoulder-widths/s. */
  private measureSpeed(pos: number[] | null, ts: number): number {
    this.track.push({ ts, pos });
    while (this.track.length > 2 && ts - this.track[1].ts >= SPEED_WINDOW_MS) this.track.shift();
    const old = this.track[0];
    const dt = (ts - old.ts) / 1000;
    if (!pos || !old.pos || dt <= 0) return 0;
    // A hand that was tracked a moment ago but is lost now is usually moving fast
    // (motion blur), so count it as movement rather than stillness.
    for (let h = 0; h < pos.length; h += 4) {
      if (Number.isNaN(pos[h]) && !Number.isNaN(old.pos[h])) return STILL_SPEED * 2;
    }
    let max = 0;
    for (let i = 0; i < pos.length; i++) {
      if (Number.isNaN(pos[i]) || Number.isNaN(old.pos[i])) continue;
      max = Math.max(max, Math.abs(pos[i] - old.pos[i]));
    }
    return max / dt;
  }
}
