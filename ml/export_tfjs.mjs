// Builds the browser model (public/models/isl/) from weights trained in
// ml/train.py, then checks TF.js predictions match Keras on held-out samples.
//
//   node ml/export_tfjs.mjs training/out
//
// Architecture here MUST match build_model() in ml/train.py.

import fs from 'node:fs';
import path from 'node:path';
import * as tf from '@tensorflow/tfjs';

const outDir = process.argv[2] ?? 'training/out';
const destDir = process.argv[3] ?? 'public/models/isl';

const arch = JSON.parse(fs.readFileSync(path.join(outDir, 'arch.json'), 'utf8'));
const weightsBin = fs.readFileSync(path.join(outDir, 'weights.bin'));
const weightsBuf = weightsBin.buffer.slice(weightsBin.byteOffset, weightsBin.byteOffset + weightsBin.byteLength);
const meta = JSON.parse(fs.readFileSync(path.join(outDir, 'meta.json'), 'utf8'));
const check = JSON.parse(fs.readFileSync(path.join(outDir, 'check.json'), 'utf8'));

function buildModel({ seqLen, featureDim, numClasses, filters, kernel, dense }) {
  const m = tf.sequential();
  m.add(tf.layers.inputLayer({ inputShape: [seqLen, featureDim] }));
  filters.forEach((f, i) => {
    m.add(tf.layers.conv1d({ filters: f, kernelSize: kernel[i], padding: 'same', useBias: false }));
    m.add(tf.layers.batchNormalization({ epsilon: 1e-3 }));
    m.add(tf.layers.activation({ activation: 'relu' }));
    if (i === 1) m.add(tf.layers.maxPooling1d({ poolSize: 2 }));
  });
  m.add(tf.layers.globalAveragePooling1d());
  m.add(tf.layers.dense({ units: dense, activation: 'relu' }));
  m.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }));
  return m;
}

const model = buildModel(arch);

// weights.bin = all Keras weights (model.get_weights() order: layer by layer),
// float32, concatenated. TF.js model.weights puts all non-trainable weights
// last, so assign per layer instead.
let offset = 0;
let wi = 0;
for (const layer of model.layers) {
  const tensors = layer.weights.map((w) => {
    const shape = arch.shapes[wi];
    if (JSON.stringify(shape) !== JSON.stringify(w.shape)) {
      throw new Error(`Weight ${wi} (${w.name}) shape mismatch: keras ${JSON.stringify(shape)} vs tfjs ${JSON.stringify(w.shape)}`);
    }
    const n = shape.reduce((a, b) => a * b, 1);
    const t = tf.tensor(new Float32Array(weightsBuf, offset, n), shape);
    offset += n * 4;
    wi++;
    return t;
  });
  if (tensors.length) layer.setWeights(tensors);
}
if (wi !== arch.shapes.length) throw new Error(`Expected ${arch.shapes.length} weights, assigned ${wi}`);
if (offset !== weightsBuf.byteLength) throw new Error(`Unused weight bytes: ${weightsBuf.byteLength - offset}`);

// Parity check against Keras outputs.
const x = tf.tensor3d(check.inputs, [check.inputs.length, arch.seqLen, arch.featureDim]);
const probs = model.predict(x).arraySync();
let maxDiff = 0;
let argmaxAgree = 0;
probs.forEach((p, i) => {
  p.forEach((v, j) => { maxDiff = Math.max(maxDiff, Math.abs(v - check.outputs[i][j])); });
  if (p.indexOf(Math.max(...p)) === check.outputs[i].indexOf(Math.max(...check.outputs[i]))) argmaxAgree++;
});
console.log(`parity: max |tfjs - keras| = ${maxDiff.toExponential(2)}, top-1 agree ${argmaxAgree}/${probs.length}`);
if (maxDiff > 1e-3 || argmaxAgree !== probs.length) throw new Error('TF.js model does not match Keras — not exporting.');

fs.mkdirSync(destDir, { recursive: true });
await model.save(tf.io.withSaveHandler(async (artifacts) => {
  const weightsManifest = [{ paths: ['weights.bin'], weights: artifacts.weightSpecs }];
  fs.writeFileSync(path.join(destDir, 'model.json'), JSON.stringify({
    format: 'layers-model',
    generatedBy: 'ml/export_tfjs.mjs',
    modelTopology: artifacts.modelTopology,
    weightsManifest,
  }));
  fs.writeFileSync(path.join(destDir, 'weights.bin'), Buffer.from(artifacts.weightData));
  return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
}));
fs.writeFileSync(path.join(destDir, 'meta.json'), JSON.stringify(meta));
console.log(`exported to ${destDir}`);
