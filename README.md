# HYPERFLOW AI

## Adaptive EV Charging Optimization & Recovery Platform

HyperFlow AI is an autonomous, software-only EV charging orchestration platform designed to demonstrate closed-loop intelligent charging management:

```
PREDICT → RECOMMEND → OPTIMIZE → MONITOR → RECOVER
```

---

## Technical Stack & Python Version

- **Backend**: Python 3.10 (FastAPI, Uvicorn, WebSockets, SciPy SLSQP, LightGBM, Scikit-Learn IsolationForest)
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide Icons
- **Virtual Protocol**: OCPP 2.0.1 Smart Charging over WebSockets
- **Environment Target**: Python 3.10 + Node v24

---

## Quickstart Instructions

### 1. Launch Python 3.10 Backend

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

The backend server will start on `http://localhost:8000` with interactive API docs at `http://localhost:8000/docs` and 1Hz WebSockets at `/ws/telemetry` & `/ws/events`.

### 2. Launch React Control Center Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend web app will open at `http://localhost:3000`.

---

## 2-Minute Judge Demo Flow

1. **Driver Recommendation**:
   - Navigate to **Find Best Charge**.
   - Input SOC: `18%`, Target: `80%`. Click **FIND BEST CHARGE**.
   - HyperFlow evaluates 4 nearby hubs using multi-factor composite scoring and recommends **Hub B — Central Metro** over nearest Hub A because it saves 22 minutes of queue wait time.

2. **Active Charging Session & Anti-Taper Pricing**:
   - Click **Active Session**.
   - Watch the SOC circular ring indicator rise. Past 80% SOC, charging transitions to `CV_PHASE` (tapering power).
   - Anti-taper dynamic pricing activates (₹19 - ₹22/kWh) to incentivize clearing congested chargers.

3. **Grid Surge & IEEE C57.91 Thermal Headroom**:
   - Switch to **CPO Control Center**.
   - Trigger **HIGH TEMP (40°C)** or **GRID SURGE** scenario from the bottom simulation bar.
   - Observe transformer thermal headroom decrease. SciPy SLSQP optimizer automatically throttles high-SOC EVs and allocates headroom to critical low-SOC EVs.
   - Inspect the live Virtual OCPP 2.0.1 stream for `SetChargingProfile` messages.

4. **Charger Failure & Anomaly Recovery**:
   - Trigger **CHARGER FAILURE** scenario.
   - Isolation Forest anomaly detector flags Gun-A4 latency (480ms) and power jitter. Gun status updates to `SERVICE_REQUIRED`.
   - HyperFlow automatically removes Gun-A4 from recommendations and reroutes the affected session to Hub B.

5. **Phantom-Slot Late Arrival Handler**:
   - Trigger **DRIVER DELAY** scenario.
   - Reserved driver is delayed 12 minutes. HyperFlow temporarily reallocates capacity to waiting EV #12 while preserving the original driver's reservation priority.

6. **Explainable AI & Live Metrics**:
   - Inspect the **Autonomous AI Decision Feed** for human-readable "WHY?" tags on every system action.
   - Review the **Live Simulation Results** bar showing calculated wait reductions (37.3%), overloads avoided, and driver savings.
>>>>>>> 40cbd66 (feat: complete HyperFlow AI full digital twin, booking flow & 3D visualizer)
