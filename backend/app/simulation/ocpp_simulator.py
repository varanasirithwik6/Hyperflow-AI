"""
Virtual OCPP 2.0.1 Smart Charging Protocol Simulator for HyperFlow AI.
Generates structured JSON protocol payloads for smart charging commands over WebSockets:
- SetChargingProfile (Power limits)
- TransactionEvent (Started, Updated, Ended)
- StatusNotification (Available, Occupied, Faulted)
- Heartbeat

Python 3.10 compatible.
"""

import time
from datetime import datetime
from typing import Dict, Any, List
from app.models.schema import OCPPMessage


class OcppProtocolSimulator:
    def __init__(self):
        self.message_counter = 1000

    def _next_id(self) -> str:
        self.message_counter += 1
        return f"msg-{self.message_counter}"

    def build_set_charging_profile(
        self,
        evse_id: str,
        session_id: str,
        power_limit_kw: float,
        reason: str = "SLSQP Grid Headroom Optimization"
    ) -> OCPPMessage:
        """Constructs an OCPP 2.0.1 SetChargingProfile message."""
        ts = datetime.utcnow().strftime("%H:%M:%S")
        payload = {
            "customData": {"vendorId": "HyperFlow-AI"},
            "evseId": evse_id,
            "chargingProfile": {
                "id": self.message_counter,
                "stackLevel": 1,
                "chargingProfilePurpose": "TxProfile",
                "chargingProfileKind": "Absolute",
                "chargingSchedule": [
                    {
                        "startSchedule": datetime.utcnow().isoformat() + "Z",
                        "duration": 3600,
                        "chargingRateUnit": "kW",
                        "chargingSchedulePeriod": [
                            {"startPeriod": 0, "limit": round(power_limit_kw, 1)}
                        ]
                    }
                ]
            },
            "reason": reason
        }
        
        summary = f"EVSE {evse_id} SetChargingProfile: Limit set to {power_limit_kw:.1f} kW ({reason})"
        return OCPPMessage(
            timestamp=ts,
            message_id=self._next_id(),
            action="SetChargingProfile",
            evse_id=evse_id,
            payload=payload,
            summary=summary
        )

    def build_status_notification(
        self,
        evse_id: str,
        connector_status: str,
        reason: str = "Normal operation"
    ) -> OCPPMessage:
        """Constructs an OCPP 2.0.1 StatusNotification message."""
        ts = datetime.utcnow().strftime("%H:%M:%S")
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "connectorStatus": connector_status,  # Available, Occupied, Reserved, Faulted
            "evseId": evse_id,
            "connectorId": 1,
            "info": reason
        }
        summary = f"EVSE {evse_id} StatusNotification: Status changed to {connector_status}"
        return OCPPMessage(
            timestamp=ts,
            message_id=self._next_id(),
            action="StatusNotification",
            evse_id=evse_id,
            payload=payload,
            summary=summary
        )

    def build_transaction_event(
        self,
        evse_id: str,
        session_id: str,
        event_type: str,
        soc_pct: float,
        power_kw: float
    ) -> OCPPMessage:
        """Constructs an OCPP 2.0.1 TransactionEvent message."""
        ts = datetime.utcnow().strftime("%H:%M:%S")
        payload = {
            "eventType": event_type,  # Started, Updated, Ended
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "triggerReason": "MeterValuePeriodic",
            "seqNo": self.message_counter,
            "transactionInfo": {"transactionId": session_id, "chargingState": "Charging"},
            "evse": {"id": evse_id, "connectorId": 1},
            "meterValue": [
                {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "sampledValue": [
                        {"value": str(round(power_kw, 1)), "measurand": "Power.Active.Import", "unit": "kW"},
                        {"value": str(round(soc_pct, 1)), "measurand": "StateOfCharge", "unit": "Percent"}
                    ]
                }
            ]
        }
        summary = f"EVSE {evse_id} TransactionEvent ({event_type}): SOC {soc_pct:.0f}%, Power {power_kw:.1f} kW"
        return OCPPMessage(
            timestamp=ts,
            message_id=self._next_id(),
            action="TransactionEvent",
            evse_id=evse_id,
            payload=payload,
            summary=summary
        )


# Global instance
ocpp_simulator = OcppProtocolSimulator()
