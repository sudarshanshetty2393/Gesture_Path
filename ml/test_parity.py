"""Checks src/sign/features.ts computes exactly what ml/features.py computes.

  training/venv/bin/python ml/test_parity.py training/include_raw.npz
"""
import json
import subprocess
import sys

import numpy as np

import features as F
from dataset import load_frames


def main(npz):
    data = dict(np.load(npz))
    rng = np.random.default_rng(0)
    cases = []
    for i in rng.choice(len(data["y"]), 25, replace=False):
        frames, aspect = load_frames(data, int(i))
        # Exercise missing-pose fallback too.
        if i % 3 == 0:
            frames[0] = (None, frames[0][1], frames[0][2])
        seq = F.resample(F.trim_active(F.sequence_features(frames, aspect)))
        cases.append({
            "aspect": float(aspect),
            "frames": [{
                "pose": None if p is None else [{"x": float(a), "y": float(b)} for a, b in p],
                "lh": None if l is None else [{"x": float(a), "y": float(b)} for a, b in l],
                "rh": None if r is None else [{"x": float(a), "y": float(b)} for a, b in r],
            } for p, l, r in frames],
            "expected": seq.tolist(),
        })
    path = "training/parity_cases.json"
    with open(path, "w") as f:
        json.dump(cases, f)
    subprocess.run(["npx", "-y", "tsx@4.19.2", "ml/parity_check.ts", path], check=True)


if __name__ == "__main__":
    main(sys.argv[1])
