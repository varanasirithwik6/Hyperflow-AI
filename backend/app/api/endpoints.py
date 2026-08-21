"""
FastAPI REST Router for HyperFlow AI.
Python 3.10 compatible.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any

from app.models.schema import (
    DriverInput, RecommendationResponse, SimulationScenarioRequest,
    LiveMetrics, TransformerStatus, OCPPMessage, AIDecisionEvent,
    PowerAllocationItem, BookingRequest, Reservation, SlotAvailability
)
from app.simulation.engine import sim_engine
from app.ml.charging_predictor import charging_predictor
from app.optimizer.grid_optimizer import grid_optimizer

router = APIRouter(prefix="/api/v1")


@router.post("/recommend", response_model=RecommendationResponse)
def get_recommendation(driver_input: DriverInput):
    """AI Smart Charging Recommendation Engine."""
    return sim_engine.get_recommendation(driver_input)


@router.post("/predict-session")
def predict_charging_session(
    initial_soc: float = 18.0,
    target_soc: float = 80.0,
    capacity_kwh: float = 40.5,
    max_power_kw: float = 60.0,
    ambient_temp_c: float = 28.0
):
    """Non-Linear LightGBM CC-CV Charging Predictor."""
    return charging_predictor.predict_session(
        initial_soc=initial_soc,
        target_soc=target_soc,
        capacity_kwh=capacity_kwh,
        max_power_kw=max_power_kw,
        ambient_temp_c=ambient_temp_c
    )


@router.post("/queue/predict")
def predict_queue():
    """Predict near-future 30-minute queue conditions."""
    hub_a = sim_engine.hubs["hub-a"]
    queue_30m = [
        {"minute": 0, "queue_count": hub_a.current_queue_count, "congestion": "HIGH"},
        {"minute": 5, "queue_count": hub_a.current_queue_count + 1, "congestion": "HIGH"},
        {"minute": 10, "queue_count": hub_a.current_queue_count + 2, "congestion": "HIGH"},
        {"minute": 15, "queue_count": hub_a.predicted_queue_15m, "congestion": "HIGH"},
        {"minute": 20, "queue_count": max(1, hub_a.predicted_queue_15m - 1), "congestion": "MODERATE"},
        {"minute": 25, "queue_count": max(1, hub_a.predicted_queue_15m - 2), "congestion": "MODERATE"},
        {"minute": 30, "queue_count": 1, "congestion": "LOW"}
    ]
    return {
        "hub_id": "hub-a",
        "current_queue": hub_a.current_queue_count,
        "predicted_queue_15m": hub_a.predicted_queue_15m,
        "estimated_wait_min": hub_a.estimated_wait_min,
        "congestion_level": hub_a.congestion_level,
        "queue_trajectory_30m": queue_30m
    }


@router.post("/optimize")
def run_optimization():
    """Manually trigger SLSQP power allocation optimization."""
    trans = sim_engine.get_transformer_status()
    active_sess = [s.dict() for s in sim_engine.sessions.values() if s.hub_id == "hub-a"]
    allocated, before_kw, after_kw = grid_optimizer.optimize_allocations(
        active_sessions=active_sess,
        safe_capacity_kw=trans.safe_headroom_kw + trans.current_load_kw
    )
    return {
        "transformer_status": trans,
        "total_power_before_kw": before_kw,
        "total_power_after_kw": after_kw,
        "allocations": allocated
    }


@router.post("/simulate/event")
def trigger_scenario_event(req: SimulationScenarioRequest):
    """Trigger digital simulation scenarios."""
    sim_engine.trigger_scenario(req.scenario)
    return {
        "status": "success",
        "active_scenario": sim_engine.current_scenario,
        "message": f"Scenario '{req.scenario}' triggered successfully."
    }


@router.post("/twin/ambient-temp")
def set_ambient_temp(payload: Dict[str, Any]):
    temp_c = float(payload.get("temp_c", 28.0))
    sim_engine.set_ambient_temp(temp_c)
    return {"status": "success", "ambient_temp_c": sim_engine.ambient_temp_c}


@router.post("/twin/spawn-ev")
def spawn_ev(payload: Dict[str, Any]):
    hub_id = payload.get("hub_id", "hub-a")
    vehicle_model = payload.get("vehicle_model", "Tata Nexon EV")
    capacity = float(payload.get("capacity_kwh", 40.5))
    initial_soc = float(payload.get("initial_soc", 18.0))
    target_soc = float(payload.get("target_soc", 80.0))
    urgency = payload.get("urgency", "CRITICAL")
    sim_engine.spawn_ev(hub_id, vehicle_model, capacity, initial_soc, target_soc, urgency)
    return {"status": "success", "hub_id": hub_id, "queue_count": len(sim_engine.hub_queues.get(hub_id, []))}


@router.post("/twin/gun-control")
def gun_control(payload: Dict[str, Any]):
    gun_id = payload.get("gun_id", "gun-hub-a-1")
    action = payload.get("action", "FAULT")
    sim_engine.gun_control(gun_id, action)
    return {"status": "success", "gun_id": gun_id, "action": action}


@router.get("/hubs/live")
def get_live_hubs():
    return list(sim_engine.hubs.values())


@router.get("/chargers/live")
def get_live_chargers():
    return list(sim_engine.guns.values())


@router.get("/sessions/live")
def get_live_sessions():
    return list(sim_engine.sessions.values())


@router.get("/transformer/live", response_model=TransformerStatus)
def get_transformer_status():
    return sim_engine.get_transformer_status()


@router.get("/ocpp/live", response_model=List[OCPPMessage])
def get_ocpp_feed():
    return sim_engine.ocpp_messages


@router.get("/decision-feed", response_model=List[AIDecisionEvent])
def get_decision_feed():
    return sim_engine.decision_feed


@router.get("/metrics", response_model=LiveMetrics)
def get_live_metrics():
    """Live calculated quantitative simulation metrics."""
    return sim_engine.get_live_metrics()


# ============================================================
# RESERVATION / PHANTOM-SLOT BOOKING ENDPOINTS
# ============================================================

@router.post("/reservation/book", response_model=Reservation)
def book_reservation(req: BookingRequest):
    """Create a new charging slot reservation."""
    try:
        reservation = sim_engine.create_reservation(
            hub_id=req.hub_id,
            vehicle_model=req.vehicle_model,
            arrival_time=req.arrival_time,
            target_soc=req.target_soc,
            driver_id=req.driver_id,
            reservation_date=req.reservation_date
        )
        return reservation
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reservation/{reservation_id}/arrive", response_model=Reservation)
def reservation_arrive(reservation_id: str):
    """Mark the reserved driver as arrived. Assigns gun or queues EV.
    Also terminates any active Phantom-Slot for this reservation."""
    try:
        return sim_engine.driver_arrived(reservation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/reservation/{reservation_id}/simulate-delay", response_model=Reservation)
def reservation_simulate_delay(reservation_id: str, delay_min: float = 12.0):
    """Simulate late arrival and activate Phantom-Slot if delay > 8 min.
    Reservation remains 100% PROTECTED regardless of delay."""
    try:
        return sim_engine.simulate_late_arrival(reservation_id, delay_min)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/reservations", response_model=List[Reservation])
def list_reservations():
    """List all active reservations (for CPO view and Driver Dashboard)."""
    return list(sim_engine.reservations.values())


@router.get("/reservation/{reservation_id}", response_model=Reservation)
def get_reservation(reservation_id: str):
    """Get a single reservation by ID."""
    res = sim_engine.reservations.get(reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Reservation {reservation_id} not found")
    return res


@router.post("/reservation/{reservation_id}/cancel", response_model=Reservation)
def cancel_reservation(reservation_id: str):
    """Cancel a future reservation. Slot becomes available again."""
    try:
        return sim_engine.cancel_reservation(reservation_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/availability", response_model=List[SlotAvailability])
def get_slot_availability(
    hub_id: str = Query(..., description="Hub ID to check availability for"),
    date: str = Query(..., description="Date in YYYY-MM-DD format")
):
    """Get available/booked/unavailable charging slots for a hub on a specific date."""
    try:
        return sim_engine.get_slot_availability(hub_id=hub_id, date=date)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
