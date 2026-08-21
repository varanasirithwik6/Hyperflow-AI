"""
Telemetry-based Charger Reliability Anomaly Detector for HyperFlow AI.
Uses Isolation Forest algorithm on simulated EVSE telemetry signals:
- Heartbeat latency (ms)
- Power jitter (kW)
- Error code frequency
- Session dropout rates

Python 3.10 compatible.
"""

import numpy as np
from typing import Dict, Any, Tuple

try:
    from sklearn.ensemble import IsolationForest
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


class ChargerAnomalyDetector:
    def __init__(self):
        self.model = None
        self._train_baseline_model()

    def _train_baseline_model(self):
        """Train Isolation Forest on normal simulated telemetry."""
        if not HAS_SKLEARN:
            return

        try:
            np.random.seed(42)
            # Normal signals: latency 30-80ms, jitter 0.1-0.5kW, errors 0-1
            normal_latency = np.random.normal(50, 10, 800)
            normal_jitter = np.random.normal(0.2, 0.05, 800)
            normal_errors = np.random.poisson(0.2, 800)

            X_normal = np.column_stack([normal_latency, normal_jitter, normal_errors])
            
            # Fit model
            self.model = IsolationForest(contamination=0.08, random_state=42)
            self.model.fit(X_normal)
        except Exception:
            self.model = None

    def evaluate_gun_health(
        self,
        heartbeat_latency_ms: float,
        power_jitter_kw: float,
        error_count: int,
        historical_reliability: float = 95.0
    ) -> Tuple[float, str, str]:
        """
        Evaluates gun telemetry and returns (health_score_pct, status, why_reason).
        """
        # Baseline deterministic checks
        penalty = 0.0
        reasons = []

        if heartbeat_latency_ms > 250:
            penalty += 35.0
            reasons.append(f"Excessive heartbeat latency ({heartbeat_latency_ms:.0f}ms)")
        elif heartbeat_latency_ms > 120:
            penalty += 15.0
            reasons.append(f"Elevated latency ({heartbeat_latency_ms:.0f}ms)")

        if power_jitter_kw > 3.0:
            penalty += 40.0
            reasons.append(f"Severe power fluctuation ({power_jitter_kw:.1f}kW jitter)")
        elif power_jitter_kw > 1.2:
            penalty += 20.0
            reasons.append(f"Moderate power jitter ({power_jitter_kw:.1f}kW)")

        if error_count >= 5:
            penalty += 45.0
            reasons.append(f"High error frequency ({error_count} events/hr)")
        elif error_count >= 2:
            penalty += 20.0
            reasons.append(f"Intermittent error codes ({error_count} events/hr)")

        # Run Isolation Forest if available
        if self.model is not None:
            try:
                sample = np.array([[heartbeat_latency_ms, power_jitter_kw, error_count]])
                anomaly_score = float(self.model.decision_function(sample)[0])
                if anomaly_score < -0.1:
                    penalty += 30.0
                    if "Isolation Forest telemetry anomaly flagged" not in reasons:
                        reasons.append("Isolation Forest telemetry anomaly flagged")
            except Exception:
                pass

        health_score = max(5.0, min(100.0, historical_reliability - penalty))

        if health_score >= 85.0:
            status = "HEALTHY"
            why = "Telemetry signals operating within normal parameters."
        elif health_score >= 40.0:
            status = "DEGRADED"
            why = "Telemetry anomaly detected: " + ", ".join(reasons)
        else:
            status = "SERVICE_REQUIRED"
            why = "CRITICAL: Multiple failure telemetry signals: " + ", ".join(reasons)

        return round(health_score, 1), status, why


# Global instance
anomaly_detector = ChargerAnomalyDetector()
