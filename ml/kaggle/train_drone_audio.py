#!/usr/bin/env python3
"""
Kernel de Kaggle: MFCC + MLP para deteccion binaria de drones.

Replica EXACTAMENTE la extraccion de features de la HMI
(HMI/src/utils/audioFeatures.ts) para que los pesos generados aqui
sean compatibles con la inferencia del navegador (HMI/src/utils/mlp.ts):

  * f_mel = 2595 * log10(1 + hz/700)  (convencion HTK, igual que la HMI)
  * bank triangular de 26 filtros (100 Hz -> Nyquist) con bins
    redondeados hacia abajo (floor), sin normalizacion
  * poder espectral = |X|^2 de la FFT con ventana Blackman
    (el AnalyserNode de Web Audio devuelve dB de magnitud con Blackman;
     aqui se imita esa cadena dB -> 10^(dB/10) -> bank -> log -> DCT)
  * log(max(energia, 1e-10)) y DCT-II sin normalizacion, 13 coeficientes

Datasets adjuntados (solo lectura):
  amineipad/drone-sound-audio-detection   (MIT)
      /kaggle/input/drone-sound-audio-detection/Binary_Drone_Audio/
          yes_drone/  (1.332 wavs = clase 1)
          unknown/    (10.372 wavs = clase 0, se subsamplea 3:1)
  gautamdhawan55/merged-drone             (licencia desconocida: solo el
      /kaggle/input/merged-drone/dataset/  testing externo, no entrenamiento)
          drone/ (148)  noise/ (125)   16 kHz

Salida: weights.json (W1,b1,W2,b2,W3,b3 + _mean/_std) en /kaggle/working.
Sin GPU, sin llamadas a la API de Kaggle, internet apagado.
"""

import argparse
import json
import math
import random
from pathlib import Path

import numpy as np
import soundfile as sf

try:
    import librosa
except Exception:
    librosa = None

FFT_SIZE = 4096
HOP = 2048
NUM_FILTERS = 26
NUM_COEFFS = 13
LOW_HZ = 100.0
TARGET_SR = 44100
MAX_FRAMES_PER_CLIP = 30
MAX_FRAMES_TEST_PER_CLIP = 12
SEED = 42

DEFAULT_DRONE_ROOT = "/kaggle/input/drone-sound-audio-detection/Binary_Drone_Audio"
DEFAULT_TEST_ROOT = "/kaggle/input/merged-drone/dataset"

FB_CACHE = {}


def hz_to_mel(hz):
    return 2595.0 * math.log10(1.0 + hz / 700.0)


def mel_to_hz(mel):
    return 700.0 * (math.pow(10.0, mel / 2595.0) - 1.0)


def blackman(n):
    i = np.arange(n, dtype=np.float64)
    return 0.42 - 0.5 * np.cos(2.0 * np.pi * i / (n - 1)) + 0.08 * np.cos(4.0 * np.pi * i / (n - 1))


def build_filter_bank(sample_rate, fft_size, num_filters=NUM_FILTERS, low_hz=LOW_HZ):
    key = (sample_rate, fft_size)
    if key in FB_CACHE:
        return FB_CACHE[key]
    nyquist = sample_rate / 2.0
    num_bins = fft_size // 2
    low_mel = hz_to_mel(low_hz)
    high_mel = hz_to_mel(nyquist)

    mel_points = [low_mel + i * (high_mel - low_mel) / (num_filters + 1)
                  for i in range(num_filters + 2)]
    bin_idx = [int(math.floor(mel_to_hz(m) / sample_rate * fft_size)) for m in mel_points]

    filters = []
    for m in range(num_filters):
        start, center, end = bin_idx[m], bin_idx[m + 1], bin_idx[m + 2]
        filt = np.zeros(num_bins, dtype=np.float64)
        for i in range(max(0, start), min(center, num_bins - 1) + 1):
            denom = center - start
            if denom > 0:
                filt[i] = (i - start) / denom
        for i in range(max(0, center), min(end, num_bins - 1) + 1):
            denom = end - center
            if denom > 0:
                filt[i] = (end - i) / denom
        filters.append(filt)
    bank = np.vstack(filters)
    FB_CACHE[key] = bank
    return bank


_DCT_CACHE = {}


def dct_matrix(n_mel, n_coeffs=NUM_COEFFS):
    if n_mel not in _DCT_CACHE:
        k = np.arange(n_coeffs).reshape(-1, 1)
        n = np.arange(n_mel).reshape(1, -1)
        _DCT_CACHE[n_mel] = np.cos(np.pi * k * (n + 0.5) / n_mel)
    return _DCT_CACHE[n_mel]


def mfcc_frames(y, sample_rate, max_frames=MAX_FRAMES_PER_CLIP):
    """Frames de MFCC de una senal mono. Para cada ventana FFT_SIZE con
    ventana Blackman y salto HOP: potencia -> bank -> log -> DCT."""
    fft_size = FFT_SIZE
    if len(y) < fft_size:
        y = np.pad(y, (0, fft_size - len(y)))
    positions = range(0, len(y) - fft_size + 1, HOP)
    frames = np.stack([y[i:i + fft_size] for i in positions]).astype(np.float64)
    if frames.shape[0] > max_frames:
        frames = frames[:max_frames]
    frames = frames * blackman(fft_size)

    spectra = np.abs(np.fft.rfft(frames, axis=1))[:, :fft_size // 2]
    power = spectra ** 2
    power[~np.isfinite(power)] = 1e-10
    power = np.maximum(power, 1e-10)

    bank = build_filter_bank(sample_rate, fft_size)
    mel = np.log(power @ bank.T)
    mel = np.maximum(mel, 1e-10)

    dct = dct_matrix(NUM_FILTERS)
    mfcc = dct @ mel.T
    return mfcc.T.astype(np.float32)  # (n_frames, NUM_COEFFS)


def load_mono(path, target_sr=TARGET_SR):
    data, sr = sf.read(str(path), dtype="float32", always_2d=True)
    y = data.mean(axis=1)
    if sr != target_sr:
        if librosa is None:
            raise RuntimeError("librosa requerido para resamplear (pip install librosa)")
        y = librosa.resample(y, orig_sr=sr, target_sr=target_sr,
                             res_type="soxr_hq")
    return y.astype(np.float32)


def list_wavs(root, label, max_clips=None, rng=None):
    wavs = sorted(Path(root).rglob("*.wav"))
    if max_clips is not None and len(wavs) > max_clips:
        idx = rng.sample(range(len(wavs)), max_clips)
        wavs = [wavs[i] for i in idx]
    return [(w, label) for w in wavs]


def build_dataset(drone_root, test_root):
    rng = random.Random(SEED)
    yes_dir = Path(drone_root) / "yes_drone"
    unknown_dir = Path(drone_root) / "unknown"

    drone_clips = list_wavs(yes_dir, 1)
    unknown_target = 3 * len(drone_clips)
    unknown_clips = list_wavs(unknown_dir, 0, max_clips=unknown_target, rng=rng)
    print(f"Clips: dron={len(drone_clips)}  unknown(subsample {unknown_target})="
          f"{len(unknown_clips)}")

    X, y, clip_ids = [], [], []
    clip_idx = 0
    for clips in (drone_clips, unknown_clips):
        for path, label in clips:
            try:
                frames = mfcc_frames(load_mono(path))
            except Exception as exc:
                print(f"  skip {path.name}: {exc}")
                continue
            for f in frames:
                X.append(f)
                y.append(label)
                clip_ids.append(clip_idx)
            clip_idx += 1
    print(f"FramesMFCC: {len(X)}  (dron={y.count(1)}, no_dron={y.count(0)})")

    # Split train/val a nivel de clip (20% de los clips de cada clase)
    X_np = np.stack(X).astype(np.float32)
    y_np = np.array(y, dtype=np.int64)
    clip_ids_np = np.array(clip_ids, dtype=np.int64)

    val_clip_ids = set()
    for c in (0, 1):
        idx = np.random.RandomState(SEED).permutation(np.unique(clip_ids_np[y_np == c]))
        n_val = max(1, int(len(idx) * 0.2))
        val_clip_ids.update(int(i) for i in idx[:n_val])

    is_val = np.array([c in val_clip_ids for c in clip_ids_np])
    return (X_np[~is_val], y_np[~is_val], X_np[is_val], y_np[is_val])


def load_external_test(test_root):
    """merged-drone: solo para reportar dominio real (16 kHz, mic array)."""
    rows = []
    for name, label in (("drone", 1), ("noise", 0)):
        for path in sorted((Path(test_root) / name).rglob("*.wav")):
            try:
                frames = mfcc_frames(load_mono(path), max_frames=MAX_FRAMES_TEST_PER_CLIP)
            except Exception as exc:
                print(f"  skip test {path.name}: {exc}")
                continue
            for f in frames:
                rows.append((f, label))
    X = np.stack([r[0] for r in rows]).astype(np.float32)
    y = np.array([r[1] for r in rows], dtype=np.int64)
    return X, y


def one_hot(y):
    oh = np.zeros((len(y), 2), dtype=np.float64)
    oh[np.arange(len(y)), y] = 1.0
    return oh


class MLP:
    """Igual que ml/train.py: input -> relu(32) -> relu(16) -> softmax(2)."""

    def __init__(self, input_size, hidden1, hidden2, lr):
        self.lr = lr
        self.W1 = np.random.randn(hidden1, input_size) * np.sqrt(2.0 / input_size)
        self.b1 = np.zeros(hidden1)
        self.W2 = np.random.randn(hidden2, hidden1) * np.sqrt(2.0 / hidden1)
        self.b2 = np.zeros(hidden2)
        self.W3 = np.random.randn(2, hidden2) * np.sqrt(2.0 / hidden2)
        self.b3 = np.zeros(2)

    def forward(self, x):
        h1_pre = x @ self.W1.T + self.b1
        h1 = np.maximum(0, h1_pre)
        h2_pre = h1 @ self.W2.T + self.b2
        h2 = np.maximum(0, h2_pre)
        logits = h2 @ self.W3.T + self.b3
        exps = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
        probs = exps / np.sum(exps, axis=-1, keepdims=True)
        return h1_pre, h1, h2_pre, h2, probs

    def train_step(self, x, y):
        x = x.reshape(1, -1)
        y = y.reshape(1, -1)
        h1_pre, h1, h2_pre, h2, probs = self.forward(x)
        dlogits = (probs - y)
        dW3 = dlogits.T @ h2
        db3 = dlogits.sum(axis=0)
        dh2 = dlogits @ self.W3
        dh2_pre = dh2 * (h2_pre > 0)
        dW2 = dh2_pre.T @ h1
        db2 = dh2_pre.sum(axis=0)
        dh1 = dh2_pre @ self.W2
        dh1_pre = dh1 * (h1_pre > 0)
        dW1 = dh1_pre.T @ x
        db1 = dh1_pre.sum(axis=0)
        self.W3 -= self.lr * dW3
        self.b3 -= self.lr * db3
        self.W2 -= self.lr * dW2
        self.b2 -= self.lr * db2
        self.W1 -= self.lr * dW1
        self.b1 -= self.lr * db1

    def predict(self, x):
        if x.ndim == 1:
            x = x.reshape(1, -1)
        _, _, _, _, probs = self.forward(x)
        return probs

    def export(self):
        return {
            "W1": self.W1.tolist(), "b1": self.b1.tolist(),
            "W2": self.W2.tolist(), "b2": self.b2.tolist(),
            "W3": self.W3.tolist(), "b3": self.b3.tolist(),
        }


def metrics(probs, y):
    pred = probs.argmax(axis=1)
    acc = float((pred == y).mean())
    recall = {}
    for c in (0, 1):
        m = y == c
        recall[c] = float((pred[m] == c).mean()) if m.sum() else float("nan")
    return acc, recall


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--drone-root", default=DEFAULT_DRONE_ROOT)
    ap.add_argument("--test-root", default=DEFAULT_TEST_ROOT)
    ap.add_argument("--epochs", type=int, default=60)
    ap.add_argument("--lr", type=float, default=0.01)
    ap.add_argument("--hidden1", type=int, default=32)
    ap.add_argument("--hidden2", type=int, default=16)
    ap.add_argument("--output", default="weights.json")
    args = ap.parse_args()

    np.random.seed(SEED)
    X_tr, y_tr, X_va, y_va = build_dataset(args.drone_root, args.test_root)

    mean = X_tr.mean(axis=0)
    std = X_tr.std(axis=0) + 1e-10
    X_tr = (X_tr - mean) / std
    X_va = (X_va - mean) / std

    model = MLP(X_tr.shape[1], args.hidden1, args.hidden2, args.lr)
    y_oh = one_hot(y_tr)
    best_acc, best_patience, patience = 0.0, 15, 0
    best_export = None

    for epoch in range(1, args.epochs + 1):
        perm = np.random.permutation(len(X_tr))
        for i in perm:
            model.train_step(X_tr[i], y_oh[i])
        acc_tr, rec_tr = metrics(model.predict(X_tr), y_tr)
        acc_va, rec_va = metrics(model.predict(X_va), y_va)
        if epoch == 1 or epoch % 5 == 0:
            print(f"epoch {epoch:3d}  acc_tr={acc_tr:.2%}  acc_va={acc_va:.2%}  "
                  f"recall_va[n0]={rec_va[0]:.2%} recall_va[n1]={rec_va[1]:.2%}")
        if acc_va > best_acc:
            best_acc, patience = acc_va, 0
            best_export = model.export()
        else:
            patience += 1
            if patience >= best_patience:
                print(f"early stop en epoch {epoch}")
                break

    if best_export is None:
        best_export = model.export()
    best_export["_mean"] = mean.tolist()
    best_export["_std"] = std.tolist()
    with open(args.output, "w") as f:
        json.dump(best_export, f, indent=2)
    print(f"weights guardados en {args.output} (best acc_va={best_acc:.2%})")

    try:
        X_te, y_te = load_external_test(args.test_root)
        X_te = (X_te - mean) / std
        acc_te, rec_te = metrics(model.predict(X_te), y_te)
        print(f"MERGED-DRONE externo: acc={acc_te:.2%}  "
              f"recall_drone={rec_te[1]:.2%}  recall_noise={rec_te[0]:.2%}")
    except Exception as exc:
        print(f"test externo omitido: {exc}")


if __name__ == "__main__":
    main()
