"""
SciPy SLSQP Grid-Aware Smart Power Optimizer for HyperFlow AI.
Constrained non-linear optimization allocating total available transformer continuous capacity
among active EV charging sessions.

Objectives:
1. Prevent transformer capacity / thermal overload (Hard constraint)
2. Prioritize critically depleted low-SOC EVs
3. Throttle high-SOC EVs in deep CC-CV taper
4. Maximize overall hub throughput and reduce total driver wait time.

Python 3.10 compatible.
"""

import numpy as np
from scipy.optimize import minimize
from typing import List, Dict, Any, Tuple


class GridPowerOptimizer:
    def __init__(self):
        pass

    def _soc_urgency_weight(self, soc_pct: float, urgency: str) -> float:
        """Higher weight = higher priority to receive power."""
        base_weight = (100.0 - soc_pct) / 100.0
        if urgency == "CRITICAL":
            return base_weight * 2.5
        elif urgency == "LOW":
            return base_weight * 0.5
        return base_weight * 1.0

    def _max_soc_allowed_power(self, soc_pct: float, max_gun_power: float) -> float:
        """Physical CC-CV upper bound constraint."""
        if soc_pct < 80.0:
            return max_gun_power
        elif soc_pct < 88.0:
            return min(max_gun_power * 0.55, 30.0)
        elif soc_pct < 95.0:
            return min(max_gun_power * 0.30, 15.0)
        else:
            return min(max_gun_power * 0.15, 8.0)

    def optimize_allocations(
        self,
        active_sessions: List[Dict[str, Any]],
        safe_capacity_kw: float
    ) -> Tuple[List[Dict[str, Any]], float, float]:
        """
        Executes SciPy SLSQP optimization over active sessions under safe_capacity_kw limit.
        Returns (allocated_items, power_before_total, power_after_total)
        """
        if not active_sessions:
            return [], 0.0, 0.0

        n = len(active_sessions)
        initial_powers = np.array([float(s.get("allocated_power_kw", 30.0)) for s in active_sessions])
        power_before_total = float(np.sum(initial_powers))

        weights = np.array([
            self._soc_urgency_weight(float(s["current_soc"]), s.get("urgency", "MEDIUM"))
            for s in active_sessions
        ])
        
        bounds = []
        for s in active_sessions:
            soc = float(s["current_soc"])
            max_gun = float(s.get("max_power_kw", 60.0))
            upper = self._max_soc_allowed_power(soc, max_gun)
            lower = 3.0 if soc < 95.0 else 2.0  # Min maintenance charge
            bounds.append((lower, upper))

        # SLSQP Objective Function: Minimize negative weighted utility
        def objective(p):
            # Utility = sum(weight_i * p_i) - 0.001 * sum(p_i^2)
            utility = np.sum(weights * p) - 0.0005 * np.sum(p ** 2)
            return -utility

        # Hard Constraint: sum(p) <= safe_capacity_kw
        def constraint_feeder(p):
            return safe_capacity_kw - np.sum(p)

        constraints = [{'type': 'ineq', 'fun': constraint_feeder}]

        # Run SLSQP Optimization
        x0 = np.clip(initial_powers, [b[0] for b in bounds], [b[1] for b in bounds])
        if np.sum(x0) > safe_capacity_kw:
            x0 = x0 * (safe_capacity_kw / np.sum(x0))

        res = minimize(
            objective,
            x0,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints,
            options={'maxiter': 100, 'ftol': 1e-4}
        )

        optimized_powers = res.x if res.success else x0
        
        # Enforce exact safety clamp if optimizer slightly exceeds
        if np.sum(optimized_powers) > safe_capacity_kw:
            optimized_powers = optimized_powers * (safe_capacity_kw / np.sum(optimized_powers))

        power_after_total = float(np.sum(optimized_powers))

        results = []
        for i, s in enumerate(active_sessions):
            p_before = round(initial_powers[i], 1)
            p_after = round(float(optimized_powers[i]), 1)
            soc = float(s["current_soc"])
            
            delta = p_after - p_before
            if delta > 2.0:
                action = "BOOSTED"
                why = (
                    f"Prioritized low SOC ({soc:.0f}%) EV; allocated +{delta:.1f}kW available "
                    f"transformer headroom."
                )
            elif delta < -2.0:
                action = "THROTTLED"
                why = (
                    f"Throttled by {abs(delta):.1f}kW due to high SOC ({soc:.0f}%) taper phase "
                    f"and transformer thermal constraint."
                )
            else:
                action = "MAINTAINED"
                why = f"Maintained stable power allocation ({p_after:.1f}kW) for SOC {soc:.0f}%."

            results.append({
                "session_id": s["id"],
                "vehicle_model": s["vehicle_model"],
                "soc_pct": soc,
                "power_before_kw": p_before,
                "power_after_kw": p_after,
                "priority_level": s.get("urgency", "MEDIUM"),
                "ai_action": action,
                "why_reason": why
            })

        return results, round(power_before_total, 1), round(power_after_total, 1)


# Global Instance
grid_optimizer = GridPowerOptimizer()
