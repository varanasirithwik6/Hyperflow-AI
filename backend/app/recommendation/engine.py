"""
AI Smart Recommendation Engine for HyperFlow AI.
Evaluates nearby hubs using multi-factor composite scoring:
- Distance
- Queue wait time
- Charging duration
- Cost
- Charger reliability
- Transformer headroom
"""

from typing import List, Dict, Any

class SmartRecommendationEngine:
    def calculate_composite_score(
        self,
        distance_km: float,
        wait_min: float,
        total_cost: float,
        reliability_score: float,
        headroom_pct: float
    ) -> float:
        dist_score = max(0.0, 100.0 - distance_km * 15.0)
        wait_score = max(0.0, 100.0 - wait_min * 3.5)
        cost_score = max(0.0, 100.0 - (total_cost / 10.0))
        
        return round(
            dist_score * 0.20 +
            wait_score * 0.35 +
            reliability_score * 0.25 +
            cost_score * 0.10 +
            headroom_pct * 0.10,
            1
        )

recommendation_engine = SmartRecommendationEngine()
