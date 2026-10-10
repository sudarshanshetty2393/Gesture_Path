// Loads public/models/isl/ the way the browser does (layers-model JSON +
// weights.bin) and re-checks predictions against Keras outputs.
//   node ml/check_saved_model.mjs training/out public/models/isl
import fs from 'node:fs';
import path from 'node:path';
import * as tf from '@tensorflow/tfjs';

const [outDir = 'training/out', modelDir = 'public/models/isl'] = process.argv.slice(2);
const json = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf8'));
const bin = fs.readFileSync(path.join(modelDir, json.weightsManifest[0].paths[0]));
const model = await tf.loadLayersModel(tf.io.fromMemory({
  modelTopology: json.modelTopology,
  weightSpecs: json.weightsManifest[0].weights,
  weightData: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
}));
const check = JSON.parse(fs.readFileSync(path.join(outDir, 'check.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(modelDir, 'meta.json'), 'utf8'));
const probs = model.predict(tf.tensor3d(check.inputs)).arraySync();
let maxDiff = 0;
probs.forEach((p, i) => p.forEach((v, j) => { maxDiff = Math.max(maxDiff, Math.abs(v - check.outputs[i][j])); }));
console.log(`saved model: ${meta.labels.length} words, max diff vs keras ${maxDiff.toExponential(2)}`);
if (maxDiff > 1e-3) process.exit(1);
