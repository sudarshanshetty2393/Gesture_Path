"""Access to training/include_raw.npz (written by ml/prepare.py)."""


def load_frames(data, i):
    """Returns ([(pose, lh|None, rh|None), ...], aspect) for video i."""
    a, b = data["offsets"][i], data["offsets"][i + 1]
    pose, lh, rh = data["pose"][a:b], data["lh"][a:b], data["rh"][a:b]
    lh_ok, rh_ok = data["lh_ok"][a:b], data["rh_ok"][a:b]
    frames = [(pose[t], lh[t] if lh_ok[t] else None, rh[t] if rh_ok[t] else None) for t in range(b - a)]
    return frames, float(data["aspect"][i])
