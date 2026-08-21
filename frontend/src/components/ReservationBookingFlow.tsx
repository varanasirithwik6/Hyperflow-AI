/**
 * ReservationBookingFlow.tsx
 * Real Phantom-Slot Booking Flow — fully connected to the HyperFlow AI backend.
 * Features: Date picker, slot availability grid, conflict prevention, cancel booking,
 *           multiple reservations view, Phantom-Slot demo, backend persistence.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar, Clock, ShieldCheck, Zap, Car, MapPin, AlertTriangle,
  CheckCircle2, Loader2, X, Timer, Radio, Sparkles, Lock, List,
  XCircle, RefreshCw, ChevronDown, ChevronUp
} from "lucide-react";
import { Hub, Reservation, BookingRequest, SlotAvailability } from "../types";
import {
  bookReservation, markDriverArrived, simulateLateArrival,
  cancelReservation, fetchSlotAvailability, fetchReservations
} from "../services/api";

interface Props {
  hubs: Hub[];
  liveReservations?: Reservation[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  RESERVED:       { label: "RESERVED",        color: "text-cyan-300",   bg: "bg-cyan-950/40",   border: "border-cyan-500/50" },
  ARRIVED:        { label: "ARRIVED",          color: "text-emerald-300",bg: "bg-emerald-950/40",border: "border-emerald-500/50" },
  QUEUED:         { label: "QUEUED",           color: "text-amber-300",  bg: "bg-amber-950/40",  border: "border-amber-500/50" },
  CHARGING:       { label: "CHARGING",         color: "text-emerald-400",bg: "bg-emerald-950/40",border: "border-emerald-500/60" },
  COMPLETED:      { label: "COMPLETED",        color: "text-slate-300",  bg: "bg-slate-800/40",  border: "border-slate-700" },
  LATE:           { label: "LATE",             color: "text-amber-300",  bg: "bg-amber-950/40",  border: "border-amber-500/50" },
  PHANTOM_ACTIVE: { label: "PHANTOM ACTIVE",   color: "text-purple-300", bg: "bg-purple-950/40", border: "border-purple-500/50" },
  CANCELLED:      { label: "CANCELLED",        color: "text-red-300",    bg: "bg-red-950/40",    border: "border-red-500/40" },
};

// Helpers
function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}
function getDateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function formatDateDisplay(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── BOOKING MODAL ────────────────────────────────────────────────────────────
interface BookingModalProps {
  hubs: Hub[];
  onClose: () => void;
  onBooked: (r: Reservation) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ hubs, onClose, onBooked }) => {
  const [hubId, setHubId] = useState(hubs[1]?.id || hubs[0]?.id || "hub-b");
  const [vehicleModel, setVehicleModel] = useState("Tata Nexon EV");
  const [date, setDate] = useState(getDateOffset(1)); // default: tomorrow
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [targetSoc, setTargetSoc] = useState(80);

  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHub = hubs.find(h => h.id === hubId);

  // Load availability when hub or date changes
  const loadSlots = useCallback(async () => {
    if (!hubId || !date) return;
    setLoadingSlots(true);
    setSelectedSlot("");
    const result = await fetchSlotAvailability(hubId, date);
    setSlots(result);
    setLoadingSlots(false);
  }, [hubId, date]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleBook = async () => {
    if (!selectedSlot) { setError("Please select an available time slot."); return; }
    setError(null);
    setIsBooking(true);
    try {
      const req: BookingRequest = {
        hub_id: hubId,
        vehicle_model: vehicleModel,
        reservation_date: date,
        arrival_time: selectedSlot,
        target_soc: targetSoc,
      };
      const res = await bookReservation(req);
      onBooked(res);
      onClose();
    } catch (e: any) {
      setError(e.message || "Booking failed. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel p-6 rounded-2xl border border-cyan-500/50 max-w-lg w-full space-y-5 font-mono animate-scale-up shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-extrabold text-white">BOOK A CHARGING SLOT</h3>
              <p className="text-[10px] text-cyan-400 font-bold">Phantom-Slot Protected Reservation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hub Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3 text-cyan-400" /> Select Charging Hub
          </label>
          <select
            value={hubId}
            onChange={e => setHubId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl p-2.5 text-white text-xs transition outline-none"
          >
            {hubs.map(h => (
              <option key={h.id} value={h.id}>{h.name} — Wait: {h.estimated_wait_min}m | Rel: {h.reliability_score}%</option>
            ))}
          </select>
          {selectedHub && (
            <div className="flex gap-2 text-[10px] font-mono text-slate-400">
              <span className={selectedHub.congestion_level === "HIGH" || selectedHub.congestion_level === "CRITICAL" ? "text-amber-400" : "text-emerald-400"}>
                ● {selectedHub.congestion_level}
              </span>
              <span>{selectedHub.active_guns}/{selectedHub.total_guns} guns active</span>
              <span>{selectedHub.distance_km} km</span>
            </div>
          )}
        </div>

        {/* Date Picker */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" /> Select Date
          </label>
          {/* Quick date buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {[0, 1, 2, 7].map(offset => (
              <button
                key={offset}
                onClick={() => setDate(getDateOffset(offset))}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  date === getDateOffset(offset)
                    ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : offset === 2 ? "+2 days" : "+1 week"}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={date}
            min={getTodayISO()}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl p-2.5 text-white text-xs transition outline-none"
          />
          {date && <p className="text-[10px] text-slate-400">Selected: <strong className="text-white">{formatDateDisplay(date)}</strong></p>}
        </div>

        {/* Slot Availability Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> Available Slots
            </label>
            <button onClick={loadSlots} className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-0.5 transition">
              <RefreshCw className="w-2.5 h-2.5" /> Refresh
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-3 text-[9px] font-mono text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500/40 border border-emerald-500/60 inline-block" /> AVAILABLE</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500/30 border border-amber-500/40 inline-block" /> BOOKED</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-700/50 border border-slate-700 inline-block" /> UNAVAILABLE</span>
          </div>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> Loading availability...
            </div>
          ) : slots.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No slots data. Select a hub and date.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {slots.map(slot => {
                const isAvail = slot.status === "AVAILABLE";
                const isBooked = slot.status === "BOOKED";
                const isSelected = selectedSlot === slot.time_slot;
                return (
                  <button
                    key={slot.time_slot}
                    disabled={!isAvail}
                    onClick={() => setSelectedSlot(slot.time_slot)}
                    title={isBooked ? `Booked (${slot.reservation_id})` : slot.status}
                    className={`p-2 rounded-lg text-[10px] font-bold border text-center transition ${
                      isSelected
                        ? "bg-cyan-500/30 border-cyan-500 text-cyan-200 shadow-glow"
                        : isAvail
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                        : isBooked
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400/60 cursor-not-allowed"
                        : "bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    {slot.time_slot}
                    <div className="text-[8px] mt-0.5 font-normal">
                      {isBooked ? "BOOKED" : isAvail ? "FREE" : "N/A"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {selectedSlot && (
            <p className="text-[10px] text-cyan-400 font-bold">
              ✓ Selected: {formatDateDisplay(date)} at <strong>{selectedSlot}</strong>
            </p>
          )}
        </div>

        {/* Vehicle & SOC */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Car className="w-3 h-3 text-cyan-400" /> Vehicle
            </label>
            <select
              value={vehicleModel}
              onChange={e => setVehicleModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl p-2.5 text-white text-xs transition outline-none"
            >
              <option>Tata Nexon EV</option>
              <option>MG ZS EV</option>
              <option>BYD Atto 3</option>
              <option>Tata Tiago EV</option>
              <option>Hyundai Ioniq 5</option>
              <option>Mahindra XUV400</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> Target SOC ({targetSoc}%)
            </label>
            <input
              type="range"
              min={30}
              max={100}
              value={targetSoc}
              onChange={e => setTargetSoc(Number(e.target.value))}
              className="w-full mt-2 accent-cyan-400 h-2 cursor-pointer rounded-lg"
            />
            <p className="text-[9px] text-slate-500 text-center">{targetSoc}% target charge</p>
          </div>
        </div>

        {/* Protection Notice */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200">
          <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>Your reservation is <strong>always protected</strong>. If you arrive late (&gt;8 min), HyperFlow AI may temporarily use the unused capacity — your slot is never cancelled.</span>
        </div>

        {error && <div className="text-red-400 text-xs bg-red-950/30 p-2 rounded-lg border border-red-500/30">{error}</div>}

        <button
          onClick={handleBook}
          disabled={isBooking || !selectedSlot}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-glow active:scale-95 disabled:opacity-60"
        >
          {isBooking
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming Reservation...</>
            : <><Sparkles className="w-4 h-4" /> CONFIRM BOOKING</>
          }
        </button>
      </div>
    </div>
  );
};

// ─── RESERVATION CARD ─────────────────────────────────────────────────────────
interface ReservationCardProps {
  reservation: Reservation;
  onUpdate: (r: Reservation) => void;
  onRemove: (id: string) => void;
}

const ReservationCard: React.FC<ReservationCardProps> = ({ reservation, onUpdate, onRemove }) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const statusCfg = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.RESERVED;

  const act = async (action: string, fn: () => Promise<Reservation>) => {
    setError(null);
    setIsLoading(action);
    try {
      const updated = await fn();
      onUpdate(updated);
    } catch (e: any) {
      setError(e.message || `${action} failed`);
    } finally {
      setIsLoading(null);
    }
  };

  const canAct = ["RESERVED", "LATE", "PHANTOM_ACTIVE"].includes(reservation.status);
  const canCancel = !["CHARGING", "COMPLETED", "CANCELLED"].includes(reservation.status);
  const canDelay = reservation.status === "RESERVED";

  return (
    <div className={`glass-panel rounded-2xl border ${statusCfg.border} ${statusCfg.bg} space-y-3 animate-fade-in overflow-hidden`}>
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 pb-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {reservation.reservation_id}
              </span>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusCfg.border} ${statusCfg.color} ${statusCfg.bg}`}>
                {statusCfg.label}
              </span>
              {reservation.reservation_protected && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                  <Lock className="w-2 h-2" /> PROTECTED
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              {reservation.hub_name} · {formatDateDisplay(reservation.reservation_date)} · {reservation.arrival_time}
            </p>
          </div>
        </div>
        <button onClick={() => setCollapsed(c => !c)} className="text-slate-500 hover:text-slate-300 transition ml-2">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400 mb-0.5">Driver ID</div>
              <div className="font-bold text-white">{reservation.driver_id}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400 mb-0.5">Vehicle</div>
              <div className="font-bold text-slate-200 text-[10px]">{reservation.vehicle_model}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400 mb-0.5">Target SOC</div>
              <div className="font-bold text-emerald-400">{reservation.target_soc}%</div>
            </div>
            {reservation.gun_id
              ? <div className="bg-slate-950/60 p-2 rounded-xl border border-emerald-500/30">
                  <div className="text-[9px] text-slate-400 mb-0.5">Assigned Gun</div>
                  <div className="font-bold text-emerald-400">{reservation.gun_id}</div>
                </div>
              : <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-[9px] text-slate-400 mb-0.5">Date</div>
                  <div className="font-bold text-white text-[10px]">{formatDateDisplay(reservation.reservation_date)}</div>
                </div>
            }
          </div>

          {/* Phantom-Slot Active Panel */}
          {reservation.phantom_active && (
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/50 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> PHANTOM-SLOT ACTIVE
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
                <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800 text-center">
                  <div className="text-[9px] text-slate-400">Expected</div>
                  <div className="font-bold text-white">{reservation.expected_arrival_time}</div>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded-lg border border-amber-500/40 text-center">
                  <div className="text-[9px] text-slate-400">Actual (Est.)</div>
                  <div className="font-bold text-amber-400">{reservation.actual_arrival_time}</div>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded-lg border border-red-500/40 text-center">
                  <div className="text-[9px] text-slate-400">Delay</div>
                  <div className="font-bold text-red-400">+{reservation.delay_min} min</div>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded-lg border border-purple-500/40 text-center">
                  <div className="text-[9px] text-slate-400">Top-Up</div>
                  <div className="font-bold text-purple-400">{reservation.phantom_topup_min} min</div>
                </div>
              </div>
              <div className="text-[10px] text-purple-200 bg-purple-950/30 p-2 rounded-lg border border-purple-500/30">
                <strong className="text-purple-300">Temp EV:</strong> {reservation.phantom_ev_id} (14% SOC) receiving {reservation.phantom_topup_min}-min top-up.{" "}
                <strong className="text-emerald-300">Your reservation remains 100% PROTECTED.</strong>
              </div>
            </div>
          )}

          {/* Late (below threshold) */}
          {reservation.status === "LATE" && !reservation.phantom_active && (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs font-mono text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              Driver +{reservation.delay_min} min late (below 8-min threshold). Bay held for {reservation.driver_id}.
            </div>
          )}

          {/* Charging Active */}
          {reservation.status === "CHARGING" && (
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs font-mono text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>{reservation.driver_id}</strong> charging on <strong>{reservation.gun_id}</strong>.
                {reservation.delay_min > 0 && " Phantom-Slot EV-17 released."} 18% → {reservation.target_soc}% target.
              </span>
            </div>
          )}

          {/* Queued */}
          {reservation.status === "QUEUED" && (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs font-mono text-amber-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              {reservation.driver_id} is queued at {reservation.hub_name}. Will be assigned next available gun.
            </div>
          )}

          {/* Cancelled */}
          {reservation.status === "CANCELLED" && (
            <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 text-xs font-mono text-red-300 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              Reservation cancelled. Slot is now available for other drivers.
            </div>
          )}

          {error && (
            <div className="text-red-400 text-xs font-mono bg-red-950/30 p-2 rounded-lg border border-red-500/30">{error}</div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {canAct && (
              <button
                onClick={() => act("ARRIVED", () => markDriverArrived(reservation.reservation_id))}
                disabled={!!isLoading}
                className="flex-1 min-w-[120px] py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isLoading === "ARRIVED" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                I'VE ARRIVED
              </button>
            )}

            {canDelay && (
              <button
                onClick={() => act("DELAY", () => simulateLateArrival(reservation.reservation_id, 12))}
                disabled={!!isLoading}
                className="flex-1 min-w-[120px] py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-extrabold rounded-xl text-xs border border-amber-500/50 transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isLoading === "DELAY" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Timer className="w-3.5 h-3.5" />}
                SIMULATE DELAY
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => {
                  if (window.confirm(`Cancel reservation ${reservation.reservation_id}?`)) {
                    act("CANCEL", () => cancelReservation(reservation.reservation_id));
                  }
                }}
                disabled={!!isLoading}
                title="Cancel this reservation"
                className="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-xs border border-red-500/30 transition-all duration-200 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
              >
                {isLoading === "CANCEL" ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                CANCEL
              </button>
            )}

            {reservation.status === "CANCELLED" && (
              <button
                onClick={() => onRemove(reservation.reservation_id)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-xl text-xs border border-slate-700 transition-all duration-200 flex items-center justify-center gap-1"
              >
                <X className="w-3 h-3" /> Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const ReservationBookingFlow: React.FC<Props> = ({ hubs, liveReservations }) => {
  const [showModal, setShowModal] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showList, setShowList] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync from WebSocket telemetry (live reservations prop)
  useEffect(() => {
    if (liveReservations && liveReservations.length > 0) {
      setReservations(prev => {
        const map = new Map<string, Reservation>(prev.map(r => [r.reservation_id, r]));
        liveReservations.forEach(r => {
          const current = map.get(r.reservation_id);
          // If the user simulated a delay, phantom top-up, or arrived, preserve that state from being reset
          if (current && (current.phantom_active || current.status === 'PHANTOM_ACTIVE' || current.status === 'CHARGING' || current.status === 'CANCELLED') && r.status === 'RESERVED') {
            map.set(r.reservation_id, { ...r, ...current });
          } else {
            map.set(r.reservation_id, r);
          }
        });
        return Array.from(map.values());
      });
    }
  }, [liveReservations]);

  // On mount: load all reservations from backend
  useEffect(() => {
    fetchReservations().then(all => {
      if (all.length > 0) setReservations(all);
    });
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const all = await fetchReservations();
    setReservations(all);
    setIsRefreshing(false);
  };

  const handleBooked = (r: Reservation) => {
    setReservations(prev => [r, ...prev]);
    setShowList(true);
  };

  const handleUpdate = (updated: Reservation) => {
    setReservations(prev => prev.map(r => r.reservation_id === updated.reservation_id ? updated : r));
  };

  const handleRemove = (id: string) => {
    setReservations(prev => prev.filter(r => r.reservation_id !== id));
  };

  const activeCount = reservations.filter(r => !["COMPLETED", "CANCELLED"].includes(r.status)).length;

  return (
    <>
      {/* ── Book New Slot CTA */}
      <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Charging Slot Reservation</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
            PHANTOM-SLOT PROTECTED
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Reserve a bay in advance for any future date. HyperFlow AI activates Phantom-Slot if you're late — your reservation is never cancelled.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-glow active:scale-95"
          >
            <Calendar className="w-4 h-4" /> BOOK A CHARGING SLOT
          </button>
          {reservations.length > 0 && (
            <button
              onClick={() => setShowList(v => !v)}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 transition flex items-center gap-1"
            >
              <List className="w-3.5 h-3.5" />
              {activeCount > 0 && <span className="bg-cyan-500 text-slate-950 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>}
            </button>
          )}
        </div>
      </div>

      {/* ── MY RESERVATIONS LIST */}
      {showList && reservations.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <List className="w-3.5 h-3.5 text-cyan-400" />
              MY RESERVATIONS ({reservations.length})
            </h4>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          {reservations.map(res => (
            <ReservationCard
              key={res.reservation_id}
              reservation={res}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* ── Booking Modal */}
      {showModal && (
        <BookingModal
          hubs={hubs}
          onClose={() => setShowModal(false)}
          onBooked={handleBooked}
        />
      )}
    </>
  );
};
