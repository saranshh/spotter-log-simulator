import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Vite
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for different stop types
const currentIcon = L.divIcon({
  className: "custom-div-icon",
  html: "<div style='background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;'></div>",
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const pickupIcon = L.divIcon({
  className: "custom-div-icon",
  html: "<div style='background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;'></div>",
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const dropoffIcon = L.divIcon({
  className: "custom-div-icon",
  html: "<div style='background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;'></div>",
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Component to dynamically fit the map bounds to the polyline
function RecenterMap({ polyline }) {
  const map = useMap();
  useEffect(() => {
    if (polyline && polyline.length > 0) {
      const bounds = L.latLngBounds(polyline);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [polyline, map]);
  return null;
}

export default function TripMap({ geocoding, routePolyline, events }) {
  // Default center if no route is loaded (centered on US)
  const defaultCenter = [37.0902, -95.7129];
  const defaultZoom = 4;

  const polylineColor = "#3b82f6"; // Blue route

  return (
    <div style={{ height: "100%", width: "100%", borderRadius: "12px", overflow: "hidden", minHeight: "350px" }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routePolyline && routePolyline.length > 0 && (
          <>
            <Polyline positions={routePolyline} color={polylineColor} weight={5} opacity={0.8} />
            <RecenterMap polyline={routePolyline} />
          </>
        )}

        {geocoding?.current && (
          <Marker position={[geocoding.current.lat, geocoding.current.lon]} icon={currentIcon}>
            <Popup>
              <strong>Start / Current Location</strong> <br />
              {geocoding.current.label}
            </Popup>
          </Marker>
        )}

        {geocoding?.pickup && (
          <Marker position={[geocoding.pickup.lat, geocoding.pickup.lon]} icon={pickupIcon}>
            <Popup>
              <strong>Pickup Location</strong> <br />
              {geocoding.pickup.label}
            </Popup>
          </Marker>
        )}

        {geocoding?.dropoff && (
          <Marker position={[geocoding.dropoff.lat, geocoding.dropoff.lon]} icon={dropoffIcon}>
            <Popup>
              <strong>Dropoff Location</strong> <br />
              {geocoding.dropoff.label}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
