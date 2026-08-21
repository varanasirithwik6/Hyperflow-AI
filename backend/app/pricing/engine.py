"""
Anti-Taper Dynamic Pricing Engine for HyperFlow AI.
Calculates progressive congestion surcharges past 80% SOC:
- 0–80% SOC: ₹14/kWh (Normal fast charging)
- 80–85% SOC: ₹16/kWh
- 85–90% SOC: ₹19/kWh
- 90%+ SOC: ₹22/kWh (Progressive congestion surcharge)
"""

class AntiTaperPricingEngine:
    # Configurable grid carbon intensity factor (kg CO2 per kWh)
    GRID_CARBON_INTENSITY_KG_PER_KWH: float = 0.45
    AVOIDED_EMISSIONS_FACTOR_KG_PER_KWH: float = 0.28

    def get_tariff_for_soc(self, soc_pct: float, base_tariff: float = 14.0) -> float:
        if soc_pct >= 90.0:
            return round(base_tariff * 1.57, 2)  # ₹22.00
        elif soc_pct >= 85.0:
            return round(base_tariff * 1.35, 2)  # ₹19.00
        elif soc_pct >= 80.0:
            return round(base_tariff * 1.14, 2)  # ₹16.00
        return base_tariff

    def calculate_session_cost(self, initial_soc: float, target_soc: float, capacity_kwh: float, base_tariff: float = 14.0) -> float:
        total_energy = ((target_soc - initial_soc) / 100.0) * capacity_kwh / 0.92
        base_kwh = min(total_energy, max(0.0, ((min(80.0, target_soc) - initial_soc) / 100.0) * capacity_kwh / 0.92))
        taper_kwh = max(0.0, total_energy - base_kwh)
        return round((base_kwh * base_tariff) + (taper_kwh * (base_tariff * 1.35)), 2)

    def calculate_co2_impact(self, energy_kwh: float) -> tuple[float, float]:
        """Calculates (co2_emitted_kg, co2_avoided_kg)."""
        emitted = round(energy_kwh * self.GRID_CARBON_INTENSITY_KG_PER_KWH, 2)
        avoided = round(energy_kwh * self.AVOIDED_EMISSIONS_FACTOR_KG_PER_KWH, 2)
        return emitted, avoided

pricing_engine = AntiTaperPricingEngine()

