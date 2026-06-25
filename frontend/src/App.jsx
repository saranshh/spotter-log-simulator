import React, { useState } from "react";
import TripMap from "./components/TripMap";
import EldLogSheet from "./components/EldLogSheet";
import LocationInput from "./components/LocationInput";
import { Navigation, Calendar, Clock, MapPin, Truck, AlertTriangle, Play, ChevronLeft, ChevronRight, FileText, Compass } from "lucide-react";
import "./App.css";

const API_BASE_URL = "http://localhost:8000";

export default function App() {
  const [currentLocation, setCurrentLocation] = useState("Chicago, IL");
  const [pickupLocation, setPickupLocation] = useState("Atlanta, GA");
  const [dropoffLocation, setDropoffLocation] = useState("Miami, FL");
  const [cycleHoursUsed, setCycleHoursUsed] = useState("10");
  const [shipperCommodity, setShipperCommodity] = useState("Fresh Produce");
  const [carrierName, setCarrierName] = useState("Antigravity Logistics LLC");
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    // Default to today at 08:00 local time
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}T08:00`;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tripData, setTripData] = useState(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTripData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/plan-trip/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_location: currentLocation,
          pickup_location: pickupLocation,
          dropoff_location: dropoffLocation,
          cycle_hours_used: parseFloat(cycleHoursUsed) || 0.0,
          shipper_commodity: shipperCommodity,
          carrier_name: carrierName,
          start_time: startTime,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to calculate route and logs.");
      }

      const data = await response.json();
      setTripData(data);
      setSelectedDayIdx(0);
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ minHeight: "100vh", padding: "1.5rem", boxSizing: "border-box" }}>
      {/* Top Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)", padding: "0.5rem", borderRadius: "10px", boxShadow: "0 0 15px rgba(59, 130, 246, 0.4)" }}>
            <Truck size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, background: "linear-gradient(to right, #f8fafc, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Spotter ELD & HOS Planner
            </h1>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              FMCSA COMPLIANT LOG SIMULATOR
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="dot" style={{ height: "8px", width: "8px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 8px #10b981" }} />
          <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>System Active</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1.5rem" }}>
        
        {/* Left Column: Form Controls */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%" }}>
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 0, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Navigation size={18} color="#3b82f6" /> Trip Parameters
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <LocationInput
                label="Current / Start Location"
                value={currentLocation}
                onChange={setCurrentLocation}
                placeholder="e.g. Chicago, IL"
                icon={MapPin}
                iconColor="#64748b"
              />

              <LocationInput
                label="Pickup Location (1h Loading)"
                value={pickupLocation}
                onChange={setPickupLocation}
                placeholder="e.g. Atlanta, GA"
                icon={MapPin}
                iconColor="#10b981"
              />

              <LocationInput
                label="Dropoff Location (1h Unloading)"
                value={dropoffLocation}
                onChange={setDropoffLocation}
                placeholder="e.g. Miami, FL"
                icon={MapPin}
                iconColor="#ef4444"
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label>Cycle Hours Used</label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    step="0.1"
                    value={cycleHoursUsed}
                    onChange={(e) => setCycleHoursUsed(e.target.value)}
                    placeholder="0 - 70"
                  />
                </div>
                <div>
                  <label>Shipper/Commodity</label>
                  <input
                    type="text"
                    value={shipperCommodity}
                    onChange={(e) => setShipperCommodity(e.target.value)}
                    placeholder="e.g. Produce"
                  />
                </div>
              </div>

              <div>
                <label>Trip Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Carrier Name</label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  placeholder="Carrier Name"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "0.5rem" }}>
                {loading ? (
                  <>Simulating Logs...</>
                ) : (
                  <>
                    <Play size={16} fill="white" /> Plan & Simulate
                  </>
                )}
              </button>
            </form>
          </div> 

          {/* Quick Info Box if data is ready */}
          {tripData && (
            <div className="glass-panel" style={{ padding: "1.5rem", marginTop: ".8rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginTop: 0, marginBottom: "1rem", color: "#94a3b8" }}>
                Trip Summary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Total Distance:</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{tripData.summary.total_distance_miles} mi</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Est. Drive Time:</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{tripData.summary.total_duration_hours} hrs</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Total Days:</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{tripData.summary.total_simulated_days} days</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Trip Duration:</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{tripData.summary.total_simulated_hours} hrs</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="glass-panel" style={{ padding: "1rem", borderColor: "rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.05)", marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
              <AlertTriangle color="#ef4444" size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: "0.85rem", color: "#fca5a5" }}>{error}</div>
            </div>
          )}
        </aside>

        {/* Right Column: Map + Log Grid Details */}
        <main style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Top Panel: Leaflet Map & Timeline */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", height: "400px" }} className="map-timeline-row">
            
            {/* Map Area */}
            <div className="glass-panel" style={{ padding: "0.5rem" }}>
              <TripMap
                geocoding={tripData?.geocoding}
                routePolyline={tripData?.route_polyline}
                events={tripData?.events}
              />
            </div>

            {/* Timeline Events Panel */}
            <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Compass size={18} color="#3b82f6" />
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>Driver Event Log</h3>
              </div>
              <div style={{ padding: "1rem", overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
                {tripData ? (
                  tripData.events.map((evt, idx) => {
                    let badgeColor = "#64748b";
                    if (evt.status === 3) badgeColor = "#2563eb"; // Driving
                    else if (evt.status === 4) badgeColor = "#10b981"; // On duty
                    else if (evt.status === 2) badgeColor = "#f59e0b"; // Sleeper

                    const startDateStr = new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endDateStr = new Date(evt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={idx} className="timeline-item" style={{ display: "flex", gap: "0.75rem", borderLeft: "2px solid rgba(255,255,255,0.05)", paddingLeft: "1rem", position: "relative" }}>
                        <div style={{ position: "absolute", left: "-6px", top: "4px", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: badgeColor }} />
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{evt.remark}</span>
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{startDateStr} - {endDateStr}</span>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{evt.location}</span>
                          {evt.miles > 0 && (
                            <span style={{ display: "block", fontSize: "0.75rem", color: "#3b82f6", marginTop: "2px" }}>+{evt.miles} miles</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
                    No simulation run yet. Enter trip parameters and click "Plan & Simulate".
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Panel: Canvas Daily Logs sheets */}
          {tripData && tripData.daily_logs.length > 0 && (
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileText size={18} color="#3b82f6" /> Daily Log Sheet (Day {selectedDayIdx + 1} of {tripData.daily_logs.length})
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    onClick={() => setSelectedDayIdx(Math.max(0, selectedDayIdx - 1))}
                    disabled={selectedDayIdx === 0}
                    style={{ padding: "0.4rem 0.6rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", background: "none" }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {tripData.daily_logs[selectedDayIdx].date}
                  </span>
                  <button
                    onClick={() => setSelectedDayIdx(Math.min(tripData.daily_logs.length - 1, selectedDayIdx + 1))}
                    disabled={selectedDayIdx === tripData.daily_logs.length - 1}
                    style={{ padding: "0.4rem 0.6rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", background: "none" }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              
              <EldLogSheet 
                logData={{
                  ...tripData.daily_logs[selectedDayIdx],
                  carrier_name: carrierName,
                  shipper_commodity: shipperCommodity
                }} 
              />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
