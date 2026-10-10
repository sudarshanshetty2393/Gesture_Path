// Body + hand landmarks with MediaPipe Tasks Vision HolisticLandmarker — the
// same holistic model family the training data (AI4Bharat INCLUDE pose dump)
// was extracted with. Checked against the legacy @mediapipe/holistic on the same
// videos: same left/right hand assignment, landmarks within ~0.1% of the image.
//
// The legacy package only ran on the GPU (WebGL) and returned no hands on some
// newer phone GPUs (e.g. Galaxy S25). Here the GPU is used only if it passes a
// self-test on a known image; otherwise the CPU (WebAssembly) is used.

import { FilesetResolver, HolisticLandmarker } from '@mediapipe/tasks-vision';
import type { Point, RawFrame } from './features';

const TASKS_VERSION = '0.10.21'; // keep in sync with package.json
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task';

// Self-test: a "hello" frame from the INCLUDE dataset (CC BY 4.0) with a raised
// right hand, and where the CPU finds that hand's wrist.
const SELF_TEST_IMAGE = '/models/isl/selftest.jpg';
const SELF_TEST_RIGHT_WRIST = { x: 0.374, y: 0.362 };
const SELF_TEST_TOLERANCE = 0.06;

export type Delegate = 'GPU' | 'CPU';

export interface HolisticResults {
  poseLandmarks?: Point[];
  leftHandLandmarks?: Point[];
  rightHandLandmarks?: Point[];
}

export interface HolisticInstance {
  delegate: Delegate;
  /** Landmarks for one video frame; timestamps must increase. */
  detect(image: HTMLCanvasElement | HTMLImageElement, timestampMs: number): HolisticResults;
  close(): void;
}

async function create(delegate: Delegate): Promise<HolisticInstance> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker = await HolisticLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minHandLandmarksConfidence: 0.5,
  });
  return {
    delegate,
    detect(image, timestampMs) {
      const r = landmarker.detectForVideo(image, timestampMs);
      return {
        poseLandmarks: r.poseLandmarks[0],
        leftHandLandmarks: r.leftHandLandmarks[0],
        rightHandLandmarks: r.rightHandLandmarks[0],
      };
    },
    close: () => landmarker.close(),
  };
}

/** True if this instance finds the raised hand in the self-test image where the CPU does. */
async function passesSelfTest(instance: HolisticInstance): Promise<boolean> {
  const img = new Image();
  img.src = SELF_TEST_IMAGE;
  await img.decode();
  let result: HolisticResults = {};
  // A few frames let the tracker lock on, as it would on live video.
  for (let i = 1; i <= 10; i++) result = instance.detect(img, i * 40);
  const wrist = result.rightHandLandmarks?.[0];
  return !!wrist
    && Math.abs(wrist.x - SELF_TEST_RIGHT_WRIST.x) < SELF_TEST_TOLERANCE
    && Math.abs(wrist.y - SELF_TEST_RIGHT_WRIST.y) < SELF_TEST_TOLERANCE;
}

/**
 * GPU when it works correctly on this device, otherwise CPU.
 * `preferred` forces one (debug: ?mp=cpu / ?mp=gpu).
 */
export async function createHolistic(preferred?: Delegate): Promise<HolisticInstance> {
  if (preferred) return create(preferred);
  try {
    const gpu = await create('GPU');
    if (await passesSelfTest(gpu)) return gpu;
    console.warn('MediaPipe GPU self-test failed on this device — using the CPU.');
    gpu.close();
  } catch (e) {
    console.warn('MediaPipe GPU unavailable — using the CPU.', e);
  }
  return create('CPU');
}

export function toRawFrame(results: HolisticResults): RawFrame {
  return {
    pose: results.poseLandmarks ?? null,
    lh: results.leftHandLandmarks ?? null,
    rh: results.rightHandLandmarks ?? null,
  };
}
