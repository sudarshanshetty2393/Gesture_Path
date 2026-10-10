"""Converts the AI4Bharat INCLUDE pose dump into one compact file.

  training/venv/bin/python ml/prepare.py training/raw/pose/INCLUDE training/include_raw.npz

Source: https://zenodo.org/records/6674324 (INCLUDE.zip, CC BY 4.0) — MediaPipe
Holistic keypoints (33 pose + 21 left hand + 21 right hand) per frame.

Quirk of that dump: keypoints are in "pixels" computed as x * H and y * W
(vid_shape = (H, W) = (1080, 1920), landscape video), so normalized image coords
are x / H and y / W. Verified from hand geometry: bone lengths are only
rotation-invariant under this interpretation.
"""
import csv
import os
import pickle
import re
import sys

import numpy as np


def label_of(folder):
    return re.sub(r"^\d+\.\s*", "", folder).strip().lower()


def main(src, dest):
    split_dir = os.path.join(src, "split", "Train_Test_Split")
    rows = []
    for split, fname in (("train", "train_include.csv"), ("test", "test_include.csv")):
        with open(os.path.join(split_dir, fname)) as f:
            for r in csv.DictReader(f):
                rows.append((split, r["FilePath"]))

    labels = sorted({label_of(p.split("/")[1]) for _, p in rows})
    label_idx = {l: i for i, l in enumerate(labels)}

    pose, lh, rh, lh_ok, rh_ok = [], [], [], [], []
    offsets, y, is_test, aspects = [0], [], [], []
    missing = 0
    for split, rel in rows:
        path = os.path.join(src, "signs", "Pose_Signs", os.path.splitext(rel)[0] + ".pkl")
        if not os.path.exists(path):
            missing += 1
            continue
        with open(path, "rb") as f:
            d = pickle.load(f)
        k = np.asarray(d["keypoints"], dtype=np.float64)[..., :2].copy()
        c = np.asarray(d["confidences"])
        h, w = d["vid_shape"]
        k[..., 0] /= h
        k[..., 1] /= w
        pose.append(k[:, :33].astype(np.float32))
        lh.append(k[:, 33:54].astype(np.float32))
        rh.append(k[:, 54:75].astype(np.float32))
        lh_ok.append(c[:, 33] > 0)
        rh_ok.append(c[:, 54] > 0)
        offsets.append(offsets[-1] + len(k))
        y.append(label_idx[label_of(rel.split("/")[1])])
        is_test.append(split == "test")
        aspects.append(w / h)

    np.savez_compressed(
        dest,
        pose=np.concatenate(pose), lh=np.concatenate(lh), rh=np.concatenate(rh),
        lh_ok=np.concatenate(lh_ok), rh_ok=np.concatenate(rh_ok),
        offsets=np.array(offsets), y=np.array(y), is_test=np.array(is_test),
        aspect=np.array(aspects, dtype=np.float32), labels=np.array(labels),
    )
    print(f"{len(y)} videos ({sum(is_test)} test), {len(labels)} words, {missing} missing -> {dest}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
