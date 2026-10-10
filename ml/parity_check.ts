// Run by ml/test_parity.py — compares browser features with Python's.
import fs from 'node:fs';
import { sequenceFeatures, trimActive, resample, RawFrame } from '../src/sign/features';

const cases: Array<{ aspect: number; frames: RawFrame[]; expected: number[][] }> =
  JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let maxDiff = 0;
for (const c of cases) {
  const got = resample(trimActive(sequenceFeatures(c.frames, c.aspect))!);
  got.forEach((row, t) => row.forEach((v, d) => { maxDiff = Math.max(maxDiff, Math.abs(v - c.expected[t][d])); }));
}
console.log(`features parity over ${cases.length} videos: max abs diff ${maxDiff.toExponential(2)}`);
if (maxDiff > 1e-5) { console.error('MISMATCH between ml/features.py and src/sign/features.ts'); process.exit(1); }
