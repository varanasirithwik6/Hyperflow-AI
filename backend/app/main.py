"""
HyperFlow AI - Adaptive EV Charging Optimization & Recovery Platform
FastAPI Entrypoint & Real-Time WebSocket Server.

Python 3.10 compatible.
"""

import asyncio
import json
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.endpoints import router as api_router
from app.simulation.engine import sim_engine

# Active WebSocket Connection Managers
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_json(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                pass


telemetry_manager = ConnectionManager()
events_manager = ConnectionManager()


async def background_simulation_loop():
    """1Hz background tick updating simulation state & broadcasting WebSockets."""
    while True:
        try:
            sim_engine.simulation_tick()
            
            # Broadcast Telemetry Payload
            telemetry_payload = {
                "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
                "scenario": sim_engine.current_scenario,
                "hubs": [h.dict() for h in sim_engine.hubs.values()],
                "sessions": [s.dict() for s in sim_engine.sessions.values()],
                "transformer": sim_engine.get_transformer_status().dict(),
                "metrics": sim_engine.get_live_metrics().dict(),
                "reservations": [r.dict() for r in sim_engine.reservations.values()]
            }
            await telemetry_manager.broadcast_json(telemetry_payload)

            # Broadcast Events & OCPP Payload
            events_payload = {
                "decision_feed": [d.dict() for d in sim_engine.decision_feed[:15]],
                "ocpp_messages": [o.dict() for o in sim_engine.ocpp_messages[:15]]
            }
            await events_manager.broadcast_json(events_payload)

        except Exception as e:
            print(f"[SimLoop Error] {e}")

        await asyncio.sleep(1.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch 1Hz simulation loop
    sim_task = asyncio.create_task(background_simulation_loop())
    yield
    # Shutdown
    sim_task.cancel()


app = FastAPI(
    title="HyperFlow AI Engine",
    description="Adaptive EV Charging Optimization & Recovery Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST Routes
app.include_router(api_router)


@app.get("/")
def root():
    return {
        "name": "HyperFlow AI Backend Engine",
        "status": "OPERATIONAL",
        "version": "1.0.0 (Python 3.10)",
        "scenario": sim_engine.current_scenario,
        "docs": "/docs"
    }


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await telemetry_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        telemetry_manager.disconnect(websocket)


@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await events_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        events_manager.disconnect(websocket)
