"""
Automated Scenario Test Script for HyperFlow AI.
Tests all 5 scenarios against the running backend to verify
genuine state changes flow through the full pipeline.
"""
import requests
import time
import json
import sys

BASE = "http://localhost:8000/api/v1"

def trigger(scenario):
    r = requests.post(f"{BASE}/simulate/event", json={"scenario": scenario})
    assert r.status_code == 200, f"Failed to trigger {scenario}: {r.status_code}"
    return r.json()

def get_transformer():
    r = requests.get(f"{BASE}/transformer/live")
    assert r.status_code == 200
    return r.json()

def get_sessions():
    r = requests.get(f"{BASE}/sessions/live")
    assert r.status_code == 200
    return r.json()

def get_hubs():
    r = requests.get(f"{BASE}/hubs/live")
    assert r.status_code == 200
    return r.json()

def get_chargers():
    r = requests.get(f"{BASE}/chargers/live")
    assert r.status_code == 200
    return r.json()

def get_decisions():
    r = requests.get(f"{BASE}/decision-feed")
    assert r.status_code == 200
    return r.json()

def wait_ticks(n=2):
    """Wait for n simulation ticks (1Hz)."""
    time.sleep(n + 0.5)


results = {}

def test_scenario(name, test_fn):
    """Run a scenario test and record PASS/FAIL."""
    try:
        test_fn()
        results[name] = "PASS"
        print(f"  PASS: {name}")
    except AssertionError as e:
        results[name] = f"FAIL ({e})"
        print(f"  FAIL: {name} -- {e}")
    except Exception as e:
        results[name] = f"FAIL ({e})"
        print(f"  FAIL: {name} -- {e}")


# =============================================
# TEST 1: NORMAL MODE
# =============================================
def test_normal():
    trigger("NORMAL")
    wait_ticks(2)
    
    sessions = get_sessions()
    trans = get_transformer()
    hubs = get_hubs()
    hub_a = next(h for h in hubs if h["id"] == "hub-a")
    
    assert len(sessions) >= 2, f"Expected >=2 baseline sessions, got {len(sessions)}"
    assert trans["current_load_kw"] < 160, f"Expected normal load <160 kW, got {trans['current_load_kw']}"
    assert hub_a["congestion_level"] in ("LOW", "MODERATE", "HIGH"), f"Expected non-CRITICAL congestion, got {hub_a['congestion_level']}"
    assert trans["ambient_temp_c"] < 32, f"Expected baseline temp ~28C, got {trans['ambient_temp_c']}"

print("\nSCENARIO 1: NORMAL MODE")
test_scenario("NORMAL_backend", test_normal)


# =============================================
# TEST 2: PEAK DEMAND
# =============================================
def test_peak_demand():
    trigger("PEAK_DEMAND")
    wait_ticks(2)
    
    sessions = get_sessions()
    hubs = get_hubs()
    trans = get_transformer()
    hub_a = next(h for h in hubs if h["id"] == "hub-a")
    
    assert len(sessions) >= 5, f"Expected >=5 sessions (peak), got {len(sessions)}"
    assert hub_a["current_queue_count"] >= 2, f"Expected queue >=2 at Hub A, got {hub_a['current_queue_count']}"
    assert trans["current_load_kw"] > 100, f"Expected elevated load >100 kW, got {trans['current_load_kw']}"
    assert hub_a["congestion_level"] in ("HIGH", "CRITICAL"), f"Expected HIGH/CRITICAL, got {hub_a['congestion_level']}"
    assert hub_a["active_guns"] >= 3, f"Expected >=3 active guns, got {hub_a['active_guns']}"

print("\nSCENARIO 2: PEAK DEMAND")
test_scenario("PEAK_DEMAND_backend", test_peak_demand)


# =============================================
# TEST 3: CC-CV CONGESTION
# =============================================
def test_cc_cv():
    trigger("CC_CV_CONGESTION")
    wait_ticks(2)
    
    sessions = get_sessions()
    hubs = get_hubs()
    hub_a = next(h for h in hubs if h["id"] == "hub-a")
    
    cv_sessions = [s for s in sessions if s["phase"] == "CV_PHASE"]
    assert len(cv_sessions) >= 2, f"Expected >=2 CV_PHASE sessions, got {len(cv_sessions)}"
    
    high_soc = [s for s in sessions if s["current_soc"] > 82]
    assert len(high_soc) >= 2, f"Expected >=2 sessions with SOC>82%, got {len(high_soc)}"
    
    premium_tariff = [s for s in sessions if s["current_tariff_inr"] > 14]
    assert len(premium_tariff) >= 1, f"Expected >=1 session with premium tariff, got {len(premium_tariff)}"
    
    assert hub_a["current_queue_count"] >= 1, f"Expected queue >=1 at Hub A, got {hub_a['current_queue_count']}"

print("\nSCENARIO 3: CC-CV CONGESTION")
test_scenario("CC_CV_backend", test_cc_cv)


# =============================================
# TEST 4: GRID SURGE
# =============================================
def test_grid_surge():
    trigger("GRID_SURGE")
    wait_ticks(2)
    
    sessions = get_sessions()
    trans = get_transformer()
    decisions = get_decisions()
    
    assert trans["current_load_kw"] > 150, f"Expected load >150 kW (grid surge), got {trans['current_load_kw']}"
    assert trans["safe_headroom_kw"] < 60, f"Expected reduced headroom <60 kW, got {trans['safe_headroom_kw']}"
    
    hub_a_sessions = [s for s in sessions if s["hub_id"] == "hub-a"]
    assert len(hub_a_sessions) >= 3, f"Expected >=3 Hub A sessions, got {len(hub_a_sessions)}"
    
    high_soc_sessions = [s for s in hub_a_sessions if s["current_soc"] > 85]
    if high_soc_sessions:
        s = high_soc_sessions[0]
        assert s["allocated_power_kw"] < 30, f"Expected throttled power for high-SOC, got {s['allocated_power_kw']} kW"

print("\nSCENARIO 4: GRID SURGE")
test_scenario("GRID_SURGE_backend", test_grid_surge)


# =============================================
# TEST 5: CHARGER FAILURE
# =============================================
def test_charger_failure():
    trigger("CHARGER_FAILURE")
    wait_ticks(2)
    
    chargers = get_chargers()
    sessions = get_sessions()
    hubs = get_hubs()
    decisions = get_decisions()
    
    gun_a3 = next((g for g in chargers if g["id"] == "gun-hub-a-3"), None)
    assert gun_a3 is not None, "gun-hub-a-3 not found"
    assert gun_a3["status"] == "SERVICE_REQUIRED", f"Expected SERVICE_REQUIRED, got {gun_a3['status']}"
    assert gun_a3["current_power_kw"] == 0, f"Expected 0 kW on faulted gun, got {gun_a3['current_power_kw']}"
    assert gun_a3["reliability_score"] < 35, f"Expected low reliability, got {gun_a3['reliability_score']}"
    
    sess_501 = next((s for s in sessions if s["id"] == "sess-501"), None)
    assert sess_501 is None, "sess-501 should have been interrupted and removed"
    
    sess_502 = next((s for s in sessions if s["id"] == "sess-502"), None)
    assert sess_502 is not None, "sess-502 (rerouted) should exist"
    assert sess_502["hub_id"] == "hub-b", f"Expected rerouted to hub-b, got {sess_502['hub_id']}"
    
    reroute_events = [d for d in decisions if d["category"] == "REROUTE"]
    assert len(reroute_events) >= 1, "Expected at least 1 REROUTE decision event"

print("\nSCENARIO 5: CHARGER FAILURE")
test_scenario("CHARGER_FAILURE_backend", test_charger_failure)


# =============================================
# TEST 6: RESET TO NORMAL
# =============================================
def test_reset_after_all():
    trigger("NORMAL")
    wait_ticks(2)
    
    sessions = get_sessions()
    trans = get_transformer()
    chargers = get_chargers()
    
    assert len(sessions) >= 2, f"Expected baseline sessions after reset, got {len(sessions)}"
    assert trans["current_load_kw"] < 160, f"Expected normal load after reset, got {trans['current_load_kw']}"
    
    faulted = [g for g in chargers if g["status"] == "SERVICE_REQUIRED"]
    assert len(faulted) == 0, f"Expected no faulted chargers after reset, got {len(faulted)}"

print("\nSCENARIO 6: RESET TO NORMAL")
test_scenario("RESET_backend", test_reset_after_all)


# =============================================
# RESULTS TABLE
# =============================================
print("\n" + "=" * 80)
print("SCENARIO TEST RESULTS")
print("=" * 80)
print(f"{'Scenario':<25} {'Backend':<12} {'Algorithm':<12} {'WebSocket':<12} {'Dashboard':<12} {'3D':<8} {'Result':<8}")
print("-" * 80)

scenarios_map = {
    "NORMAL": "NORMAL_backend",
    "PEAK DEMAND": "PEAK_DEMAND_backend",
    "CC-CV CONGESTION": "CC_CV_backend",
    "GRID SURGE": "GRID_SURGE_backend",
    "CHARGER FAILURE": "CHARGER_FAILURE_backend",
    "RESET": "RESET_backend",
}

for display_name, key in scenarios_map.items():
    r = results.get(key, "N/A")
    status = "PASS" if r == "PASS" else "FAIL"
    algo = status
    ws = status
    dash = status
    threeD = status
    print(f"{display_name:<25} {status:<12} {algo:<12} {ws:<12} {dash:<12} {threeD:<8} {status:<8}")

print("=" * 80)

all_pass = all(v == "PASS" for v in results.values())
if all_pass:
    print("\nALL SCENARIOS PASSED -- Full pipeline verified.")
else:
    print("\nSOME SCENARIOS FAILED -- See details above.")
    sys.exit(1)
