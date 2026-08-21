"""
LightGBM Non-Linear CC-CV Charging Predictor for HyperFlow AI.
Models real-world lithium-ion battery charging behavior:
- Constant Current (CC Phase) up to ~80% SOC
- Constant Voltage (CV Phase) exponential power taper from 80% to 100% SOC
- Ambient temperature impacts & C-rate limits.
Python 3.10 compatible.
"""

import math
import numpy as np
from typing import Dict, Any, List, Tuple

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False


class CCCVChargingPredictor:
    def __init__(self):
        self.is_trained = False
        self.lgb_model = None
        self._init_or_train_model()

    def _init_or_train_model(self):
        """Train a lightweight synthetic LightGBM model on CC-CV parameters."""
        if not HAS_LIGHTGBM:
            self.is_trained = False
            return
        
        try:
            # Generate synthetic training samples (SOC_start, SOC_end, capacity, max_power, temp -> duration_min)
            np.random.seed(42)
            n_samples = 1500
            
            soc_starts = np.random.uniform(5, 75, n_samples)
            soc_ends = np.random.uniform(80, 100, n_samples)
            capacities = np.random.choice([30.2, 40.5, 60.0, 72.0, 39.2], n_samples)
            max_powers = np.random.choice([30, 50, 60, 100, 120], n_samples)
            temps = np.random.uniform(10, 45, n_samples)
            
            X = np.column_stack([soc_starts, soc_ends, capacities, max_powers, temps])
            
            # Target calculation based on physics solver
            y = []
            for i in range(n_samples):
                dur, _, _ = self._numerical_cccv_solver(
                    soc_starts[i], soc_ends[i], capacities[i], max_powers[i], temps[i]
                )
                y.append(dur)
            y = np.array(y)

            train_data = lgb.Dataset(X, label=y)
            params = {
                'objective': 'regression',
                'metric': 'rmse',
                'learning_rate': 0.05,
                'num_leaves': 15,
                'verbose': -1
            }
            self.lgb_model = lgb.train(params, train_data, num_boost_round=50)
            self.is_trained = True
        except Exception:
            self.is_trained = False

    def _numerical_cccv_solver(
        self,
        initial_soc: float,
        target_soc: float,
        capacity_kwh: float,
        max_power_kw: float,
        ambient_temp_c: float
    ) -> Tuple[float, float, List[Dict[str, Any]]]:
        """
        Physics-inspired CC-CV solver.
        Returns (total_duration_min, time_to_80_min, trajectory_points)
        """
        # Temp derating factor
        temp_factor = 1.0
        if ambient_temp_c > 35:
            temp_factor = max(0.85, 1.0 - (ambient_temp_c - 35) * 0.015)
        elif ambient_temp_c < 15:
            temp_factor = max(0.80, 1.0 - (15 - ambient_temp_c) * 0.012)
            
        effective_max_power = max_power_kw * temp_factor

        current_soc = initial_soc
        dt_min = 1.0  # 1-minute steps
        elapsed_min = 0.0
        time_to_80 = 0.0
        trajectory = []
        
        reached_80 = False

        while current_soc < target_soc and elapsed_min < 180:
            # Power calculation: CC vs CV
            if current_soc < 80.0:
                phase = "CC_PHASE"
                current_power = effective_max_power
            else:
                phase = "CV_PHASE"
                # Exponential decay from 80% to 100% SOC
                taper_ratio = math.exp(-0.065 * (current_soc - 80.0))
                current_power = max(8.0, effective_max_power * taper_ratio)

            # Energy added in dt_min
            energy_step_kwh = (current_power * (dt_min / 60.0)) * 0.92
            soc_step = (energy_step_kwh / capacity_kwh) * 100.0
            
            trajectory.append({
                "minute": round(elapsed_min, 1),
                "soc": round(min(target_soc, current_soc), 1),
                "power_kw": round(current_power, 1),
                "phase": phase
            })

            current_soc += soc_step
            elapsed_min += dt_min

            if not reached_80 and current_soc >= 80.0:
                time_to_80 = elapsed_min
                reached_80 = True

        if not reached_80:
            time_to_80 = elapsed_min

        # Add final endpoint
        trajectory.append({
            "minute": round(elapsed_min, 1),
            "soc": round(min(100.0, current_soc), 1),
            "power_kw": round(trajectory[-1]["power_kw"] if trajectory else 10.0, 1),
            "phase": "CV_PHASE" if current_soc >= 80 else "CC_PHASE"
        })

        return elapsed_min, time_to_80, trajectory

    def predict_session(
        self,
        initial_soc: float,
        target_soc: float,
        capacity_kwh: float,
        max_power_kw: float,
        ambient_temp_c: float = 28.0,
        tariff_per_kwh: float = 14.0
    ) -> Dict[str, Any]:
        """
        Main prediction interface. Returns trajectory and time estimates.
        Uses LightGBM for duration estimate if available, and physics trajectory generator.
        """
        dur_min, time_to_80, trajectory = self._numerical_cccv_solver(
            initial_soc, target_soc, capacity_kwh, max_power_kw, ambient_temp_c
        )
        
        # If LightGBM is trained, refine overall duration prediction
        if self.is_trained and self.lgb_model is not None:
            try:
                X_pred = np.array([[initial_soc, target_soc, capacity_kwh, max_power_kw, ambient_temp_c]])
                predicted_dur = float(self.lgb_model.predict(X_pred)[0])
                if predicted_dur > 0:
                    dur_min = (dur_min * 0.4) + (predicted_dur * 0.6)
            except Exception:
                pass

        total_energy_kwh = ((target_soc - initial_soc) / 100.0) * capacity_kwh / 0.92
        
        # Progressive Anti-Taper Tariff calculation
        # 0-80%: base, 80-85%: +14%, 85-90%: +35%, 90%+: +57%
        base_kwh = min(total_energy_kwh, max(0, ((min(80.0, target_soc) - initial_soc) / 100.0) * capacity_kwh / 0.92))
        taper_kwh = max(0.0, total_energy_kwh - base_kwh)
        
        estimated_cost = (base_kwh * tariff_per_kwh) + (taper_kwh * (tariff_per_kwh * 1.35))

        return {
            "initial_soc": initial_soc,
            "target_soc": target_soc,
            "time_to_80_min": round(time_to_80, 1),
            "time_to_target_min": round(dur_min, 1),
            "total_energy_kwh": round(total_energy_kwh, 2),
            "estimated_cost_inr": round(estimated_cost, 2),
            "trajectory": trajectory,
            "model_type": "LightGBM + Physics Taper Hybrid" if self.is_trained else "Physics Taper Predictor (Prototype)"
        }


# Global Singleton
charging_predictor = CCCVChargingPredictor()
