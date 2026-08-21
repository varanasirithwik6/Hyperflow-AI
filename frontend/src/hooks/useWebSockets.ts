import { useEffect, useState, useRef } from 'react';
import { Hub, EVSession, TransformerStatus, LiveMetrics, AIDecisionEvent, OCPPMessage, Reservation } from '../types';

export interface TelemetryPayload {
  scenario: string;
  hubs: Hub[];
  sessions: EVSession[];
  transformer: TransformerStatus;
  metrics: LiveMetrics;
  reservations: Reservation[];
}

export interface EventsPayload {
  decision_feed: AIDecisionEvent[];
  ocpp_messages: OCPPMessage[];
}

export const useWebSockets = () => {
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [events, setEvents] = useState<EventsPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const telemetryWsRef = useRef<WebSocket | null>(null);
  const eventsWsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;

    const connectTelemetry = () => {
      try {
        const ws = new WebSocket(`${wsProtocol}//${host}/ws/telemetry`);
        telemetryWsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            setTelemetry(data);
          } catch (e) {
            console.error('Error parsing telemetry JSON:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          setTimeout(connectTelemetry, 3000);
        };
      } catch (err) {
        console.warn('Telemetry WS connection failed, retrying...');
      }
    };

    const connectEvents = () => {
      try {
        const ws = new WebSocket(`${wsProtocol}//${host}/ws/events`);
        eventsWsRef.current = ws;

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            setEvents(data);
          } catch (e) {
            console.error('Error parsing events JSON:', e);
          }
        };

        ws.onclose = () => {
          setTimeout(connectEvents, 3000);
        };
      } catch (err) {
        console.warn('Events WS connection failed, retrying...');
      }
    };

    connectTelemetry();
    connectEvents();

    return () => {
      telemetryWsRef.current?.close();
      eventsWsRef.current?.close();
    };
  }, []);

  return { telemetry, events, isConnected };
};
