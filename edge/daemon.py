"""Edge daemon: client-side FL worker.

Local training loop that calibrates throughput, trains, and submits updates.
"""
import time
from typing import Dict, Optional

from config import settings


class EdgeDaemon:
    """Edge FL worker. Runs locally, sends only weight updates to cloud."""

    def __init__(self, client_id: str, server_url: str,
                 num_samples: int = 0, class_dist: Optional[Dict[str, int]] = None):
        self.client_id = client_id
        self.server_url = server_url
        self.num_samples = num_samples
        self.class_dist = class_dist or {}
        self.round = 0
        self.last_loss = 0.0
        self.last_auc = 0.0

    def calibrate(self, train_batch_fn) -> Dict:
        """Run one batch, measure speed, return calibration payload."""
        start = time.time()
        train_batch_fn()
        elapsed = time.time() - start

        samples_per_sec = settings.BATCH_SIZE / max(elapsed, 1e-6)
        epoch_sec = (self.num_samples / settings.BATCH_SIZE) * elapsed

        return {
            "client_id": self.client_id,
            "num_samples": self.num_samples,
            "time_per_batch": elapsed,
            "samples_per_sec": samples_per_sec,
            "estimated_epoch_time": epoch_sec,
            "class_distribution": self.class_dist,
            "batch_size": settings.BATCH_SIZE
        }

    def train_local(self, train_fn, val_fn=None, epochs: int = None) -> Dict:
        """Train for N epochs locally."""
        epochs = epochs or settings.LOCAL_EPOCHS
        history = []

        for epoch in range(epochs):
            start = time.time()
            loss = train_fn()
            elapsed = time.time() - start
            history.append({"epoch": epoch + 1, "loss": loss, "time_sec": elapsed})
            self.last_loss = loss

        if val_fn:
            self.last_auc = val_fn()

        return {
            "client_id": self.client_id,
            "epochs_completed": epochs,
            "loss_history": history,
            "final_loss": self.last_loss,
            "val_auc": self.last_auc
        }

    def submit_update(self, weights: list, trained_on_version: int) -> Dict:
        """Build the update payload to send to cloud."""
        self.round += 1
        return {
            "client_id": self.client_id,
            "trained_on_version": trained_on_version,
            "epochs_completed": settings.LOCAL_EPOCHS,
            "num_samples": self.num_samples,
            "class_distribution": self.class_dist,
            "weights": weights
        }
