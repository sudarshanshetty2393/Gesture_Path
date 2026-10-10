"""Per-frame features for sign recognition.

MUST stay identical to src/sign/features.ts — the browser computes the same
numbers from live MediaPipe Holistic landmarks. ml/test_parity.py checks this.

Input per frame (MediaPipe Holistic, normalized image coords, unmirrored image):
  pose: (33, 2) x,y          (zeros when not detected)
  lh:   (21, 2) x,y or None  (Holistic "left hand")
  rh:   (21, 2) x,y or None  (Holistic "right hand")
  aspect: image width / height (x is scaled by it so distances are isotropic)
"""
import numpy as np

SEQ_LEN = 32
BODY_POINTS = [0, 13, 14, 15, 16]  # nose, elbows, wrists
HAND_DIM = 1 + 40 + 2 + 2          # present, shape, wrist loc, index-tip loc
FEATURE_DIM = len(BODY_POINTS) * 2 + 2 * HAND_DIM  # 100
# A hand counts as "signing" when its wrist is above this many shoulder-widths
# below the shoulder line (i.e. raised, not resting at the hip / on a desk).
ACTIVE_WRIST_MAX_Y = 1.2
MIN_SHOULDER_WIDTH = 1e-3


def body_frame(pose, aspect):
    """Returns (center, scale) from shoulders, or None if pose is missing."""
    if pose is None:
        return None
    ls = np.array([pose[11][0] * aspect, pose[11][1]])
    rs = np.array([pose[12][0] * aspect, pose[12][1]])
    scale = float(np.linalg.norm(ls - rs))
    if scale < MIN_SHOULDER_WIDTH:
        return None
    return (ls + rs) / 2.0, scale


def hand_features(hand, aspect, center, scale):
    out = np.zeros(HAND_DIM, dtype=np.float32)
    if hand is None:
        return out
    pts = np.array(hand, dtype=np.float64)[:, :2] * np.array([aspect, 1.0])
    wrist = pts[0]
    palm = float(np.linalg.norm(pts[9] - wrist))
    if palm < 1e-6:
        return out
    out[0] = 1.0
    out[1:41] = ((pts[1:] - wrist) / palm).reshape(-1)
    out[41:43] = (wrist - center) / scale
    out[43:45] = (pts[8] - center) / scale
    return out


def frame_features(pose, lh, rh, aspect, frame_ref):
    """frame_ref = (center, scale) to use (already resolved, see sequence_features)."""
    center, scale = frame_ref
    feats = np.zeros(FEATURE_DIM, dtype=np.float32)
    if pose is not None:
        body = np.array([[pose[i][0] * aspect, pose[i][1]] for i in BODY_POINTS])
        feats[:10] = ((body - center) / scale).reshape(-1)
    feats[10:10 + HAND_DIM] = hand_features(lh, aspect, center, scale)
    feats[10 + HAND_DIM:] = hand_features(rh, aspect, center, scale)
    return feats


def is_active(feats):
    """True if either hand is present and raised into signing space."""
    for off in (10, 10 + HAND_DIM):
        if feats[off] > 0.5 and feats[off + 42] < ACTIVE_WRIST_MAX_Y:
            return True
    return False


def sequence_features(frames, aspect):
    """frames: list of (pose|None, lh|None, rh|None). Returns (T, FEATURE_DIM) per-frame
    features. Body reference is taken per frame, falling back to the nearest
    earlier (then later) frame with a pose, then to a default."""
    refs = [body_frame(p, aspect) for p, _, _ in frames]
    last = None
    for i, r in enumerate(refs):
        if r is None:
            refs[i] = last
        else:
            last = r
    nxt = None
    for i in range(len(refs) - 1, -1, -1):
        if refs[i] is None:
            refs[i] = nxt
        else:
            nxt = refs[i]
    default = (np.array([0.5 * aspect, 0.5]), 0.3)
    return np.stack([
        frame_features(p, lh, rh, aspect, refs[i] or default)
        for i, (p, lh, rh) in enumerate(frames)
    ]) if frames else np.zeros((0, FEATURE_DIM), dtype=np.float32)


def trim_active(feats):
    """Crops to the first..last active frame (inclusive). None if never active."""
    idx = [i for i in range(len(feats)) if is_active(feats[i])]
    if not idx:
        return None
    return feats[idx[0]:idx[-1] + 1]


def resample(feats, length=SEQ_LEN):
    """Nearest-frame resampling to a fixed length (no blending of absent hands)."""
    n = len(feats)
    idx = np.minimum(np.floor((np.arange(length) + 0.5) * n / length).astype(int), n - 1)
    return feats[idx]
