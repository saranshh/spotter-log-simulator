import datetime
import requests
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .hos_engine import HosEngine

# Default coordinate mapping for standard US cities in case Nominatim fails
FALLBACK_COORDINATES = {
    "new york": (40.7128, -74.0060),
    "chicago": (41.8781, -87.6298),
    "los angeles": (34.0522, -118.2437),
    "houston": (29.7604, -95.3698),
    "miami": (25.7617, -80.1918),
    "seattle": (47.6062, -122.3321),
    "denver": (39.7392, -104.9903),
    "atlanta": (33.7490, -84.3880),
    "san francisco": (37.7749, -122.4194),
    "boston": (42.3601, -71.0589),
}

def geocode_location(location_name: str) -> tuple:
    """
    Geocode a string address into (lat, lon) using OpenStreetMap Nominatim.
    Falls back to a default coordinate map or random US offset to ensure the app stays robust.
    """
    clean_name = location_name.strip().lower()
    
    # Try local dictionary first
    for city, coords in FALLBACK_COORDINATES.items():
        if city in clean_name:
            return coords[0], coords[1]
            
    # Try Nominatim API
    url = f"https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": "SpotterHOSApp/1.0 (contact: support@spotterhos.com)"}
    params = {"q": location_name, "format": "json", "limit": 1}
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        if response.status_code == 200 and len(response.json()) > 0:
            data = response.json()[0]
            return float(data["lat"]), float(data["lon"])
    except Exception as e:
        print(f"Geocoding failed for {location_name}: {e}")

    # Final fallback: New York coords
    return 40.7128, -74.0060

def get_osrm_route(coords: list) -> dict:
    """
    Gets route from OSRM between a sequence of coordinates.
    coords is a list of tuples: [(lat, lon), ...]
    Returns OSRM route data.
    """
    # OSRM expects format: {lon},{lat};{lon},{lat}...
    coord_strings = [f"{lon},{lat}" for lat, lon in coords]
    coord_query = ";".join(coord_strings)
    
    url = f"http://router.project-osrm.org/route/v1/driving/{coord_query}?overview=full&geometries=geojson&steps=true"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"OSRM request failed: {e}")
        
    return {}

@api_view(["POST"])
def plan_trip(request):
    try:
        current_loc = request.data.get("current_location", "").strip()
        pickup_loc = request.data.get("pickup_location", "").strip()
        dropoff_loc = request.data.get("dropoff_location", "").strip()
        cycle_hours_used = float(request.data.get("cycle_hours_used", 0.0))
        
        if not current_loc or not pickup_loc or not dropoff_loc:
            return Response(
                {"error": "Please provide current_location, pickup_location, and dropoff_location."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Geocode the locations
        current_lat, current_lon = geocode_location(current_loc)
        pickup_lat, pickup_lon = geocode_location(pickup_loc)
        dropoff_lat, dropoff_lon = geocode_location(dropoff_loc)
        
        # Get routes
        # Path: Current -> Pickup -> Dropoff
        route_coords = [(current_lat, current_lon), (pickup_lat, pickup_lon), (dropoff_lat, dropoff_lon)]
        route_data = get_osrm_route(route_coords)
        
        if not route_data or "routes" not in route_data or len(route_data["routes"]) == 0:
            # If OSRM failed, calculate a straight-line fallback route
            # Let's provide a basic structured response so frontend doesn't crash
            return Response(
                {"error": "Could not calculate route between these locations. Please check the address details."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )
            
        route = route_data["routes"][0]
        legs = route.get("legs", [])
        
        # Extract distances and durations for the two segments:
        # Leg 0: Current -> Pickup
        # Leg 1: Pickup -> Dropoff
        if len(legs) >= 2:
            dist_to_pickup_miles = (legs[0].get("distance", 0.0)) / 1609.34
            duration_to_pickup_hours = (legs[0].get("duration", 0.0)) / 3600.0
            
            dist_to_dropoff_miles = (legs[1].get("distance", 0.0)) / 1609.34
            duration_to_dropoff_hours = (legs[1].get("duration", 0.0)) / 3600.0
        else:
            # Fallback if only 1 leg returned (should not happen for 3 coordinate points)
            total_dist_miles = (route.get("distance", 0.0)) / 1609.34
            total_duration_hours = (route.get("duration", 0.0)) / 3600.0
            dist_to_pickup_miles = total_dist_miles * 0.3
            duration_to_pickup_hours = total_duration_hours * 0.3
            dist_to_dropoff_miles = total_dist_miles * 0.7
            duration_to_dropoff_hours = total_duration_hours * 0.7

        # Run HOS Simulator Engine
        start_time_str = request.data.get("start_time", "").strip()
        if start_time_str:
            try:
                # Parse YYYY-MM-DDTHH:MM format from datetime-local input
                start_time = datetime.datetime.fromisoformat(start_time_str)
            except Exception:
                start_time = datetime.datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
        else:
            start_time = datetime.datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)

        engine = HosEngine(initial_cycle_used=cycle_hours_used, start_time=start_time)
        
        engine.simulate_trip(
            current_loc=current_loc,
            pickup_loc=pickup_loc,
            dropoff_loc=dropoff_loc,
            dist_to_pickup=dist_to_pickup_miles,
            duration_to_pickup=duration_to_pickup_hours,
            dist_to_dropoff=dist_to_dropoff_miles,
            duration_to_dropoff=duration_to_dropoff_hours
        )
        
        daily_logs = engine.generate_daily_logs()
        
        # Serialize events
        serialized_events = []
        for e in engine.events:
            serialized_events.append({
                "start_time": e.start_time.isoformat(),
                "end_time": e.end_time.isoformat(),
                "status": e.status,
                "location": e.location,
                "remark": e.remark,
                "miles": round(e.miles, 1)
            })

        # Format geometry for frontend Leaflet Map (list of [lat, lon])
        # OSRM returns geometry as GeoJSON (coordinates are [lon, lat])
        geometry_coords = route.get("geometry", {}).get("coordinates", [])
        map_polyline = [[lat, lon] for lon, lat in geometry_coords]

        # Structure full output
        output_data = {
            "geocoding": {
                "current": {"lat": current_lat, "lon": current_lon, "label": current_loc},
                "pickup": {"lat": pickup_lat, "lon": pickup_lon, "label": pickup_loc},
                "dropoff": {"lat": dropoff_lat, "lon": dropoff_lon, "label": dropoff_loc},
            },
            "summary": {
                "total_distance_miles": round((route.get("distance", 0.0)) / 1609.34, 1),
                "total_duration_hours": round((route.get("duration", 0.0)) / 3600.0, 1),
                "trip_start_time": start_time.isoformat(),
                "trip_end_time": engine.current_time.isoformat(),
                "total_simulated_days": len(daily_logs),
                "total_simulated_hours": round((engine.current_time - start_time).total_seconds() / 3600.0, 1)
            },
            "route_polyline": map_polyline,
            "events": serialized_events,
            "daily_logs": daily_logs
        }
        
        return Response(output_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
