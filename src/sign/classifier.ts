// Runs the trained sign model (public/models/isl/) in the browser.
// TensorFlow.js is imported lazily so the text→sign page doesn't pay for it.

import { RawFrame, FEATURE_DIM, SEQ_LEN, sequenceFeatures, trimActive, resample } from './features';

const MODEL_URL = '/models/isl/model.json';
const META_URL = '/models/isl/meta.json';

interface Meta {
  labels: string[];
  mean: number[];
  std: number[];
  seqLen: number;
  featureDim: number;
}

export interface Guess {
  word: string;
  confidence: number;
}

type Tf = typeof import('@tensorflow/tfjs');

export class SignClassifier {
  private constructor(
    private tf: Tf,
    private model: import('@tensorflow/tfjs').LayersModel,
    private meta: Meta,
  ) {}

  static async load(): Promise<SignClassifier> {
    const tf = await import('@tensorflow/tfjs');
    const [model, meta] = await Promise.all([
      tf.loadLayersModel(MODEL_URL),
      fetch(META_URL).then((r) => {
        if (!r.ok) throw new Error(`Sign model metadata missing (HTTP ${r.status})`);
        return r.json() as Promise<Meta>;
      }),
    ]);
    if (meta.seqLen !== SEQ_LEN || meta.featureDim !== FEATURE_DIM) {
      throw new Error('Sign model does not match this app version (feature layout changed).');
    }
    // Warm up so the first real prediction isn't slow.
    tf.tidy(() => { model.predict(tf.zeros([1, SEQ_LEN, FEATURE_DIM])); });
    return new SignClassifier(tf, model, meta);
  }

  get vocabulary(): string[] {
    return this.meta.labels;
  }

  /** Top-k guesses for one sign, or null if no hand was ever raised. */
  classify(frames: RawFrame[], aspect: number, k = 3): Guess[] | null {
    const trimmed = trimActive(sequenceFeatures(frames, aspect));
    if (!trimmed) return null;
    const seq = resample(trimmed);
    const input = new Float32Array(SEQ_LEN * FEATURE_DIM);
    const { mean, std } = this.meta;
    seq.forEach((f, t) => {
      for (let d = 0; d < FEATURE_DIM; d++) input[t * FEATURE_DIM + d] = (f[d] - mean[d]) / std[d];
    });
    const probs = this.tf.tidy(() =>
      (this.model.predict(this.tf.tensor3d(input, [1, SEQ_LEN, FEATURE_DIM])) as import('@tensorflow/tfjs').Tensor).dataSync(),
    );
    return Array.from(probs)
      .map((p, i) => ({ word: this.meta.labels[i], confidence: p }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, k);
  }
}
