"""
train.py - Offline MLP trainer for drone detection

Usage:
  python train.py dataset.json [--epochs 100] [--lr 0.01] [--hidden1 32] [--hidden2 16]

Input JSON format (exported from HMI ML Calibration):
  {
    "sampleRate": 44100,
    "fftSize": 4096,
    "numFilters": 26,
    "numCoeffs": 13,
    "clips": [
      {"id": "...", "label": "dron", "timestamp": ..., "mfcc": [2.3, 4.1, ...]},
      {"id": "...", "label": "no_dron", "timestamp": ..., "mfcc": [...]}
    ]
  }

Output: weights.json (compatible with HMI's MLP inference)
"""

import json
import sys
import argparse
import numpy as np


class MLP:
    """2-hidden-layer MLP: input -> hidden1 -> hidden2 -> output (2 classes)"""

    def __init__(self, input_size: int, hidden1: int, hidden2: int, lr: float = 0.01):
        self.lr = lr
        # He initialization
        self.W1 = np.random.randn(hidden1, input_size) * np.sqrt(2.0 / input_size)
        self.b1 = np.zeros(hidden1)
        self.W2 = np.random.randn(hidden2, hidden1) * np.sqrt(2.0 / hidden1)
        self.b2 = np.zeros(hidden2)
        self.W3 = np.random.randn(2, hidden2) * np.sqrt(2.0 / hidden2)
        self.b3 = np.zeros(2)

    def relu(self, x: np.ndarray) -> np.ndarray:
        return np.maximum(0, x)

    def softmax(self, x: np.ndarray) -> np.ndarray:
        exps = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return exps / np.sum(exps, axis=-1, keepdims=True)

    def forward(self, x: np.ndarray):
        """Forward pass. Returns (h1_pre, h1, h2_pre, h2, logits, probs)."""
        h1_pre = x @ self.W1.T + self.b1
        h1 = self.relu(h1_pre)
        h2_pre = h1 @ self.W2.T + self.b2
        h2 = self.relu(h2_pre)
        logits = h2 @ self.W3.T + self.b3
        probs = self.softmax(logits)
        return h1_pre, h1, h2_pre, h2, logits, probs

    def train_step(self, x: np.ndarray, y: np.ndarray):
        """Single gradient descent step on one sample (x: 1D, y: one-hot 1D)."""
        x = x.reshape(1, -1)
        y = y.reshape(1, -1)

        h1_pre, h1, h2_pre, h2, logits, probs = self.forward(x)

        # Cross-entropy loss gradient dL/dlogits
        dlogits = probs - y  # (1, 2)

        # Backprop to W3, b3
        dW3 = dlogits.T @ h2  # (2, hidden2)
        db3 = dlogits.sum(axis=0)  # (2,)
        dh2 = dlogits @ self.W3  # (1, hidden2)

        # Backprop through ReLU (h2)
        dh2_pre = dh2 * (h2_pre > 0).astype(float)  # (1, hidden2)

        # Backprop to W2, b2
        dW2 = dh2_pre.T @ h1  # (hidden2, hidden1)
        db2 = dh2_pre.sum(axis=0)  # (hidden2,)
        dh1 = dh2_pre @ self.W2  # (1, hidden1)

        # Backprop through ReLU (h1)
        dh1_pre = dh1 * (h1_pre > 0).astype(float)  # (1, hidden1)

        # Backprop to W1, b1
        dW1 = dh1_pre.T @ x  # (hidden1, input_size)
        db1 = dh1_pre.sum(axis=0)  # (hidden1,)

        # Gradient descent update
        self.W3 -= self.lr * dW3
        self.b3 -= self.lr * db3
        self.W2 -= self.lr * dW2
        self.b2 -= self.lr * db2
        self.W1 -= self.lr * dW1
        self.b1 -= self.lr * db1

    def predict(self, x: np.ndarray) -> np.ndarray:
        """Return probabilities for a single sample or batch."""
        if x.ndim == 1:
            x = x.reshape(1, -1)
        _, _, _, _, _, probs = self.forward(x)
        return probs

    def loss(self, x: np.ndarray, y: np.ndarray) -> float:
        """Cross-entropy loss for a batch."""
        _, _, _, _, _, probs = self.forward(x)
        return -np.mean(np.sum(y * np.log(probs + 1e-10), axis=-1))

    def accuracy(self, x: np.ndarray, y: np.ndarray) -> float:
        """Accuracy for a batch. y is one-hot."""
        probs = self.predict(x)
        preds = np.argmax(probs, axis=-1)
        true = np.argmax(y, axis=-1)
        return np.mean(preds == true)

    def export_weights(self) -> dict:
        """Export weights as plain Python lists (JSON-serializable)."""
        return {
            "W1": self.W1.tolist(),
            "b1": self.b1.tolist(),
            "W2": self.W2.tolist(),
            "b2": self.b2.tolist(),
            "W3": self.W3.tolist(),
            "b3": self.b3.tolist(),
        }


def load_dataset(path: str):
    """Load JSON dataset. Returns (X, y, info)."""
    with open(path, "r") as f:
        data = json.load(f)

    clips = data["clips"]
    if len(clips) < 2:
        raise ValueError(f"Dataset too small: {len(clips)} clips (need at least 2)")

    X = []
    y = []
    for clip in clips:
        mfcc = clip["mfcc"]
        if clip["label"] == "dron":
            y.append(1)
        elif clip["label"] == "no_dron":
            y.append(0)
        else:
            print(f"WARNING: Unknown label '{clip['label']}', skipping")
            continue
        X.append(mfcc)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)

    # One-hot encode
    y_onehot = np.zeros((len(y), 2))
    y_onehot[np.arange(len(y)), y] = 1

    print(f"Dataset loaded: {len(X)} samples, {X.shape[1]} features")
    print(f"  DRON:    {int(y.sum())} clips")
    print(f"  NO DRON: {int((1 - y).sum())} clips")

    return X, y_onehot, data


def main():
    parser = argparse.ArgumentParser(description="Train MLP for drone audio detection")
    parser.add_argument("dataset", help="Path to dataset JSON (exported from HMI)")
    parser.add_argument("--epochs", type=int, default=100, help="Training epochs")
    parser.add_argument("--lr", type=float, default=0.01, help="Learning rate")
    parser.add_argument("--hidden1", type=int, default=32, help="First hidden layer size")
    parser.add_argument("--hidden2", type=int, default=16, help="Second hidden layer size")
    parser.add_argument("--output", default="weights.json", help="Output weights file")
    args = parser.parse_args()

    print("=" * 50)
    print("MLP Trainer - Drone Audio Detection")
    print("=" * 50)

    # Load data
    X, y, _ = load_dataset(args.dataset)
    input_size = X.shape[1]

    # Normalize features (standardize)
    mean = X.mean(axis=0)
    std = X.std(axis=0) + 1e-10
    X_norm = (X - mean) / std

    # Split into train/val (80/20)
    n = len(X_norm)
    indices = np.random.permutation(n)
    split = int(n * 0.8)
    train_idx = indices[:split]
    val_idx = indices[split:]

    X_train, y_train = X_norm[train_idx], y[train_idx]
    X_val, y_val = X_norm[val_idx], y[val_idx]

    print(f"\nTraining set:   {len(X_train)} samples")
    print(f"Validation set: {len(X_val)} samples")
    print(f"Architecture:   {input_size} -> {args.hidden1} -> {args.hidden2} -> 2")
    print(f"Epochs:         {args.epochs}")
    print(f"Learning rate:  {args.lr}")
    print()

    # Train
    model = MLP(input_size, args.hidden1, args.hidden2, lr=args.lr)

    best_val_acc = 0
    best_weights = None
    patience = 20
    patience_counter = 0

    for epoch in range(1, args.epochs + 1):
        # Shuffle training data
        perm = np.random.permutation(len(X_train))
        X_shuffled = X_train[perm]
        y_shuffled = y_train[perm]

        # SGD over each sample
        for i in range(len(X_shuffled)):
            model.train_step(X_shuffled[i], y_shuffled[i])

        # Evaluate
        train_loss = model.loss(X_train, y_train)
        train_acc = model.accuracy(X_train, y_train)
        val_loss = model.loss(X_val, y_val)
        val_acc = model.accuracy(X_val, y_val)

        if epoch % 10 == 0 or epoch == 1:
            print(f"Epoch {epoch:4d}/{args.epochs}  "
                  f"train_loss={train_loss:.4f}  train_acc={train_acc:.2%}  "
                  f"val_loss={val_loss:.4f}  val_acc={val_acc:.2%}")

        # Early stopping
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_weights = model.export_weights()
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\nEarly stopping at epoch {epoch}")
                break

    # Save best weights
    if best_weights is not None:
        # Save normalization params alongside for potential use
        best_weights["_mean"] = mean.tolist()
        best_weights["_std"] = std.tolist()

        with open(args.output, "w") as f:
            json.dump(best_weights, f, indent=2)

    print(f"\n{'=' * 50}")
    print(f"Training complete!")
    print(f"Best validation accuracy: {best_val_acc:.2%}")
    print(f"Weights saved to: {args.output}")
    print(f"{'=' * 50}")

    # Final evaluation on all data
    all_acc = model.accuracy(X_norm, y)
    print(f"Full dataset accuracy: {all_acc:.2%}")

    # Per-class performance
    probs = model.predict(X_norm)
    preds = np.argmax(probs, axis=-1)
    true = np.argmax(y, axis=-1)

    dron_total = (true == 1).sum()
    dron_correct = ((preds == 1) & (true == 1)).sum()
    nodron_total = (true == 0).sum()
    nodron_correct = ((preds == 0) & (true == 0)).sum()

    if dron_total > 0:
        print(f"DRON recall:    {dron_correct}/{dron_total} = {dron_correct/dron_total:.2%}")
    if nodron_total > 0:
        print(f"NO DRON recall: {nodron_correct}/{nodron_total} = {nodron_correct/nodron_total:.2%}")


if __name__ == "__main__":
    main()
