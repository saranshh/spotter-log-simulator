# Spotter ELD & HOS Planner

A Full-stack application built using **Django** (backend) and **React + Vite** (frontend) that takes trip coordinates/details, geocodes them using OpenStreetMap Nominatim, plots routes via OSRM, simulates Hours of Service (HOS) logs matching FMCSA regulations, and displays interactive canvas driver log sheets.

---

## Features
- 🚚 **Dynamic Routing**: Plots route from Current location $\to$ Pickup $\to$ Dropoff using OpenStreetMap (OSRM).
- 🕒 **Start Time Configuration**: Input custom date/time to simulate HOS logs dynamically.
- 📈 **HOS Simulation Engine**: Calculates FMCSA property-carrying rules (11h driving limit, 14h duty window, 30-min break, 70h/8d cycle limit, and 34h cycle restarts).
- ⛽ **Automatic Stops**: Automatically schedules fueling stops every 1,000 miles and 1-hour loading/unloading times at stops.
- 🎨 **Drivers Daily Log (Canvas)**: Generates 24-hour daily logs with grid lines, hour notations, total hours, remarks, and 70-hour recap blocks.
- 📍 **Location Autocomplete**: Live search and suggestions for locations using Nominatim API.
- ✨ **Premium Design**: Dark-themed dashboard with glassmorphism, responsive grid layout, and outfit typography.

---

## Technical Stack
- **Backend**: Django, Django REST Framework, requests
- **Frontend**: React (Vite), Leaflet & React-Leaflet, Lucide Icons, Canvas API

---

## Setup & Running Instructions

### Backend (Django)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/env/activate  # On macOS/Linux
   ```
3. Install dependencies:
   ```bash
   pip install django djangorestframework django-cors-headers requests
   ```
4. Run system checks and database migrations:
   ```bash
   python manage.py check
   python manage.py migrate
   ```
5. Start the server on port `8000`:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
6. Run unit tests to verify HOS rules:
   ```bash
   python manage.py test
   ```

### Frontend (React + Vite)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the required Node packages:
   ```bash
   npm install
   ```
3. Launch the Vite dev server:
   ```bash
   npm run dev
   ```
4. Open the displayed local URL in your browser (usually `http://localhost:5173/` or `http://localhost:5174/`).

---

## HOS & Simulation Assumptions
- **70h / 8-Day Limit**: Property-carrying driver (standard interstate rules).
- **Fueling stops**: Automatically scheduled at least once every 1,000 miles (takes 30 mins).
- **Loading & Unloading**: Took 1 hour of On-Duty (not driving) time at both Pickup and Dropoff locations.
