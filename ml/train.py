"""Trains the sign classifier on INCLUDE landmarks.

  training/venv/bin/python ml/train.py training/include_raw.npz training/out
  node ml/export_tfjs.mjs training/out        # -> public/models/isl/

Uses the official INCLUDE train/test split; 10% of train is held out for
choosing the best epoch, the test split is only used for the final report.
"""
import json
import os
import sys
from multiprocessing import Pool

import numpy as np

import features as F
from dataset import load_frames

AUGMENT_COPIES = 8
EPOCHS = 70
BATCH = 64
ARCH = {"filters": [128, 128, 256], "kernel": [5, 5, 3], "dense": 256}

# Mirror-image pose landmark pairs (MediaPipe pose indices).
POSE_SWAP = np.arange(33)
for a, b in [(1, 4), (2, 5), (3, 6), (7, 8), (9, 10), (11, 12), (13, 14), (15, 16), (17, 18),
             (19, 20), (21, 22), (23, 24), (25, 26), (27, 28), (29, 30), (31, 32)]:
    POSE_SWAP[a], POSE_SWAP[b] = b, a

# Display names for the few INCLUDE folder names that aren't plain words.
DISPLAY = {
    "big large": "big / large", "small little": "small / little", "store or shop": "shop",
    "street or road": "road", "ex. monsoon": "monsoon", "race (ethnicity)": "race",
    "second (number)": "second (2nd)", "you (plural)": "you (all)", "i": "I",
}


def rot(theta):
    c, s = np.cos(theta), np.sin(theta)
    return np.array([[c, -s], [s, c]])


def augment(frames, aspect, rng):
    """Random but sequence-consistent perturbation of raw landmarks."""
    mirror = rng.random() < 0.5
    g_rot = rot(np.deg2rad(rng.uniform(-8, 8)))
    x_stretch = rng.uniform(0.9, 1.1)
    hand_rot = [rot(np.deg2rad(rng.uniform(-12, 12))) for _ in range(2)]
    hand_shift = rng.normal(0, 0.01, size=(2, 2))
    drop_p = rng.uniform(0, 0.08)

    def to_iso(p):
        q = p.astype(np.float64) * [aspect, 1.0]
        return q

    def from_iso(q):
        return (q / [aspect, 1.0]).astype(np.float32)

    centre = np.array([0.5 * aspect, 0.5])
    out = []
    for pose, lh, rh in frames:
        if mirror:
            pose = None if pose is None else np.column_stack([1 - pose[POSE_SWAP, 0], pose[POSE_SWAP, 1]])
            lh, rh = (None if rh is None else np.column_stack([1 - rh[:, 0], rh[:, 1]]),
                      None if lh is None else np.column_stack([1 - lh[:, 0], lh[:, 1]]))

        def glob(q):
            q = (q - centre) @ g_rot.T
            q[:, 0] *= x_stretch
            return q + centre

        new_pose = None if pose is None else from_iso(glob(to_iso(pose)) + rng.normal(0, 0.002, (33, 2)))
        hands = []
        for h_i, hand in enumerate((lh, rh)):
            if hand is None or rng.random() < drop_p:
                hands.append(None)
                continue
            q = to_iso(hand)
            q = (q - q[0]) @ hand_rot[h_i].T + q[0] + hand_shift[h_i]
            hands.append(from_iso(glob(q) + rng.normal(0, 0.002, (21, 2))))
        out.append((new_pose, hands[0], hands[1]))
    return out


def to_sequence(frames, aspect, rng=None):
    feats = F.trim_active(F.sequence_features(frames, aspect))
    if feats is None:
        return None
    if rng is not None and len(feats) > 8:
        n = len(feats)
        a = rng.integers(0, max(1, int(0.1 * n)) + 1)
        b = n - rng.integers(0, max(1, int(0.1 * n)) + 1)
        feats = feats[a:b]
        keep = rng.random(len(feats)) > 0.1
        if keep.sum() >= 4:
            feats = feats[keep]
    return F.resample(feats)


_DATA = None


def _init(npz):
    global _DATA
    _DATA = dict(np.load(npz))


def _make(args):
    i, n_aug = args
    rng = np.random.default_rng(1000 + i)
    frames, aspect = load_frames(_DATA, i)
    seqs = [to_sequence(frames, aspect)]
    for _ in range(n_aug):
        seqs.append(to_sequence(augment(frames, aspect, rng), aspect, rng))
    return [s for s in seqs if s is not None]


def build_model(num_classes):
    import keras
    from keras import layers
    m = keras.Sequential([keras.Input((F.SEQ_LEN, F.FEATURE_DIM))])
    for i, (f, k) in enumerate(zip(ARCH["filters"], ARCH["kernel"])):
        m.add(layers.Conv1D(f, k, padding="same", use_bias=False))
        m.add(layers.BatchNormalization(epsilon=1e-3))
        m.add(layers.Activation("relu"))
        if i == 1:
            m.add(layers.MaxPooling1D(2))
        m.add(layers.Dropout(0.15))
    m.add(layers.GlobalAveragePooling1D())
    m.add(layers.Dropout(0.4))
    m.add(layers.Dense(ARCH["dense"], activation="relu"))
    m.add(layers.Dropout(0.4))
    m.add(layers.Dense(num_classes, activation="softmax"))
    return m


def topk(probs, y, k):
    return float(np.mean([y[i] in np.argsort(-probs[i])[:k] for i in range(len(y))]))


def main(npz, out_dir):
    import keras
    os.makedirs(out_dir, exist_ok=True)
    data = dict(np.load(npz))
    labels = [str(l) for l in data["labels"]]
    y_all, is_test = data["y"], data["is_test"]
    rng = np.random.default_rng(0)

    train_idx = np.where(~is_test)[0]
    test_idx = np.where(is_test)[0]
    # Stratified 10% validation from train.
    val_idx = []
    for c in range(len(labels)):
        members = train_idx[y_all[train_idx] == c]
        if len(members) >= 5:
            val_idx.extend(rng.choice(members, max(1, len(members) // 10), replace=False))
    val_set = set(int(i) for i in val_idx)
    fit_idx = np.array([i for i in train_idx if int(i) not in val_set])
    print(f"fit {len(fit_idx)}, val {len(val_idx)}, test {len(test_idx)}")

    with Pool(6, initializer=_init, initargs=(npz,)) as pool:
        fit_seqs = pool.map(_make, [(int(i), AUGMENT_COPIES) for i in fit_idx], chunksize=16)
        clean = lambda idx: pool.map(_make, [(int(i), 0) for i in idx], chunksize=16)
        val_seqs, test_seqs = clean(val_idx), clean(test_idx)

    def stack(seq_lists, idx):
        X, Y = [], []
        for s_list, i in zip(seq_lists, idx):
            for s in s_list:
                X.append(s)
                Y.append(y_all[i])
        return np.stack(X).astype(np.float32), np.array(Y)

    X_fit, Y_fit = stack(fit_seqs, fit_idx)
    X_val, Y_val = stack(val_seqs, val_idx)
    X_test, Y_test = stack(test_seqs, test_idx)
    print(f"sequences: fit {len(X_fit)}, val {len(X_val)}, test {len(X_test)} "
          f"(dropped {len(test_idx) - len(X_test)} test videos with no raised hand)")

    clean_fit = np.stack([s[0] for s in fit_seqs if s])
    # Rounded as stored in meta.json, so the browser normalizes identically.
    mean = np.round(clean_fit.reshape(-1, F.FEATURE_DIM).mean(0), 6)
    std = np.round(np.maximum(clean_fit.reshape(-1, F.FEATURE_DIM).std(0), 0.05), 6)
    norm = lambda X: ((X - mean) / std).astype(np.float32)

    keras.utils.set_random_seed(0)
    model = build_model(len(labels))
    steps = EPOCHS * int(np.ceil(len(X_fit) / BATCH))
    model.compile(
        optimizer=keras.optimizers.AdamW(keras.optimizers.schedules.CosineDecay(1e-3, steps), weight_decay=1e-4),
        loss=keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
        metrics=["accuracy"],
    )
    best = keras.callbacks.ModelCheckpoint(os.path.join(out_dir, "best.weights.h5"), monitor="val_accuracy",
                                           save_best_only=True, save_weights_only=True)
    model.fit(norm(X_fit), keras.utils.to_categorical(Y_fit, len(labels)), batch_size=BATCH, epochs=EPOCHS,
              validation_data=(norm(X_val), keras.utils.to_categorical(Y_val, len(labels))),
              callbacks=[best], verbose=2)
    model.load_weights(os.path.join(out_dir, "best.weights.h5"))

    p_val = model.predict(norm(X_val), verbose=0)
    p_test = model.predict(norm(X_test), verbose=0)
    # Mirrored test = how a left-handed signer would look.
    mirror_seqs = []
    for i in test_idx:
        frames, aspect = load_frames(data, int(i))
        mf = [(None if p is None else np.column_stack([1 - p[POSE_SWAP, 0], p[POSE_SWAP, 1]]),
               None if r is None else np.column_stack([1 - r[:, 0], r[:, 1]]),
               None if l is None else np.column_stack([1 - l[:, 0], l[:, 1]])) for p, l, r in frames]
        s = to_sequence(mf, aspect)
        if s is not None:
            mirror_seqs.append((s, y_all[i]))
    p_mirror = model.predict(norm(np.stack([s for s, _ in mirror_seqs])), verbose=0)
    y_mirror = np.array([y for _, y in mirror_seqs])

    report = {
        "val_top1": topk(p_val, Y_val, 1),
        "test_top1": topk(p_test, Y_test, 1),
        "test_top3": topk(p_test, Y_test, 3),
        "test_mirrored_top1": topk(p_mirror, y_mirror, 1),
        "test_videos": int(len(Y_test)),
    }
    conf = p_test.max(1)
    correct = p_test.argmax(1) == Y_test
    for th in (0.3, 0.45, 0.6):
        sel = conf >= th
        report[f"test_at_conf_{th}"] = {"share_accepted": float(sel.mean()),
                                        "accuracy_when_accepted": float(correct[sel].mean()) if sel.any() else None}
    print(json.dumps(report, indent=2))

    weights = model.get_weights()
    with open(os.path.join(out_dir, "weights.bin"), "wb") as f:
        for w in weights:
            f.write(np.ascontiguousarray(w, dtype=np.float32).tobytes())
    with open(os.path.join(out_dir, "arch.json"), "w") as f:
        json.dump({**ARCH, "seqLen": F.SEQ_LEN, "featureDim": F.FEATURE_DIM, "numClasses": len(labels),
                   "shapes": [list(w.shape) for w in weights]}, f)
    with open(os.path.join(out_dir, "meta.json"), "w") as f:
        json.dump({
            "labels": [DISPLAY.get(l, l) for l in labels],
            "mean": [round(float(v), 6) for v in mean],
            "std": [round(float(v), 6) for v in std],
            "seqLen": F.SEQ_LEN,
            "featureDim": F.FEATURE_DIM,
            "source": "INCLUDE (AI4Bharat), CC BY 4.0 — https://zenodo.org/records/4010759",
            "report": report,
        }, f)
    check_x = norm(X_test[:24])
    with open(os.path.join(out_dir, "check.json"), "w") as f:
        json.dump({"inputs": check_x.tolist(), "outputs": model.predict(check_x, verbose=0).tolist()}, f)
    with open(os.path.join(out_dir, "report.json"), "w") as f:
        json.dump(report, f, indent=2)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
