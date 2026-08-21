"""
Transformer Thermal Headroom Simulation inspired by IEEE C57.91 loading principles.
Calculates dynamic transformer safe charging power limits based on:
- Ambient temperature
- Recent loading history
- Current electrical load
- Simulated oil/winding thermal state

Python 3.10 compatible.
"""

from typing import Dict, Any

class TransformerThermalEngine:
    def __init__(self, base_capacity_kw: float = 200.0):
        self.base_capacity_kw = base_capacity_kw

    def calculate_thermal_headroom(
        self,
        ambient_temp_c: float,
        current_load_kw: float,
        thermal_state_pct: float = 65.0,
        recent_load_factor: float = 0.85
    ) -> Dict[str, Any]:
        """
        Calculates safe dynamic continuous capacity and headroom.
        Inspired by IEEE C57.91 thermal transformer derating principles.
        """
        # Baseline reference temperature = 30°C
        temp_delta = ambient_temp_c - 30.0
        
        # Derating factor: ~1.5% capacity derate per °C above reference 30°C
        if temp_delta > 0:
            temp_derating_pct = temp_delta * 0.015
        else:
            temp_derating_pct = 0.0  # Cold ambient allows full rating up to 100%

        # Thermal state derating: if transformer thermal state > 70%, derate additional capacity
        thermal_state_derate = 0.0
        if thermal_state_pct > 70.0:
            thermal_state_derate = (thermal_state_pct - 70.0) * 0.01

        # Total combined derating
        total_derate = min(0.35, temp_derating_pct + thermal_state_derate)
        
        effective_capacity_kw = self.base_capacity_kw * (1.0 - total_derate)
        safe_headroom_kw = max(0.0, effective_capacity_kw - current_load_kw)

        thermal_constraint_active = total_derate > 0.05 or current_load_kw > (effective_capacity_kw * 0.9)

        if total_derate > 0.10:
            why = (
                f"Thermal constraint ACTIVE: High ambient temperature ({ambient_temp_c:.1f}°C) and "
                f"elevated winding thermal state ({thermal_state_pct:.1f}%) reduced safe continuous capacity "
                f"from {self.base_capacity_kw:.0f}kW to {effective_capacity_kw:.1f}kW."
            )
        elif thermal_constraint_active:
            why = (
                f"Thermal monitoring ACTIVE: Feeder load ({current_load_kw:.1f}kW) is approaching "
                f"derated safe limit ({effective_capacity_kw:.1f}kW) at ambient {ambient_temp_c:.1f}°C."
            )
        else:
            why = f"Grid feeder operating within normal thermal limits ({ambient_temp_c:.1f}°C ambient)."

        return {
            "base_capacity_kw": self.base_capacity_kw,
            "effective_capacity_kw": round(effective_capacity_kw, 1),
            "current_load_kw": round(current_load_kw, 1),
            "safe_headroom_kw": round(safe_headroom_kw, 1),
            "ambient_temp_c": round(ambient_temp_c, 1),
            "thermal_state_pct": round(thermal_state_pct, 1),
            "thermal_constraint_active": thermal_constraint_active,
            "derating_pct": round(total_derate * 100.0, 1),
            "why_explanation": why
        }


# Global instance
thermal_engine = TransformerThermalEngine(base_capacity_kw=200.0)
