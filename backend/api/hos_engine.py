import datetime
from dataclasses import dataclass, field
from typing import List, Dict, Any

# HOS Duty Statuses matching the 24h log grid rows:
# Row 1: Off Duty (OFF)
# Row 2: Sleeper Berth (SB)
# Row 3: Driving (D)
# Row 4: On Duty - Not Driving (ON)
STATUS_OFF_DUTY = 1
STATUS_SLEEPER = 2
STATUS_DRIVING = 3
STATUS_ON_DUTY = 4

@dataclass
class DrivingEvent:
    start_time: datetime.datetime
    end_time: datetime.datetime
    status: int
    location: str
    remark: str
    miles: float = 0.0

class HosEngine:
    def __init__(self, initial_cycle_used: float, start_time: datetime.datetime = None):
        self.current_time = start_time or datetime.datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
        # HOS tracking variables
        self.driving_since_10h = 0.0      # max 11 hrs
        self.duty_window_since_10h = 0.0  # max 14 hrs
        self.driving_since_30m = 0.0      # max 8 hrs
        
        # We model the last 7 days of duty hours to support the 70hr/8day rolling limit
        # Let's distribute initial_cycle_used evenly over the previous 7 days
        self.daily_duty_history = [initial_cycle_used / 7.0] * 7
        self.current_day_duty = 0.0
        
        self.events: List[DrivingEvent] = []
        self.total_miles = 0.0
        self.miles_since_fuel = 0.0

    def get_cycle_used_last_8_days(self) -> float:
        # Sum of previous 7 days + current day
        return sum(self.daily_duty_history) + self.current_day_duty

    def add_event(self, duration_hours: float, status: int, location: str, remark: str, miles_driven: float = 0.0):
        start = self.current_time
        self.current_time += datetime.timedelta(hours=duration_hours)
        end = self.current_time
        
        # Log event
        self.events.append(DrivingEvent(
            start_time=start,
            end_time=end,
            status=status,
            location=location,
            remark=remark,
            miles=miles_driven
        ))
        
        # Update metrics
        is_on_duty = (status == STATUS_DRIVING or status == STATUS_ON_DUTY)
        if is_on_duty:
            self.current_day_duty += duration_hours
            
        # Update HOS counters
        if status == STATUS_DRIVING:
            self.driving_since_10h += duration_hours
            self.driving_since_30m += duration_hours
            self.total_miles += miles_driven
            self.miles_since_fuel += miles_driven
            
        if status != STATUS_OFF_DUTY and status != STATUS_SLEEPER:
            self.duty_window_since_10h += duration_hours

    def perform_10h_break(self, location: str, is_sleeper: bool = True):
        status = STATUS_SLEEPER if is_sleeper else STATUS_OFF_DUTY
        remark = "10hr Sleeper Berth Break" if is_sleeper else "10hr Off Duty Break"
        
        # Add 10 hour break
        self.add_event(10.0, status, location, remark)
        
        # Reset 10h HOS counters
        self.driving_since_10h = 0.0
        self.duty_window_since_10h = 0.0
        self.driving_since_30m = 0.0

    def perform_30m_break(self, location: str):
        # 30-minute break is 0.5 hours
        self.add_event(0.5, STATUS_OFF_DUTY, location, "30-minute Rest Break")
        self.driving_since_30m = 0.0

    def perform_34h_restart(self, location: str):
        self.add_event(34.0, STATUS_OFF_DUTY, location, "34hr Off Duty Restart")
        # Reset all limits
        self.driving_since_10h = 0.0
        self.duty_window_since_10h = 0.0
        self.driving_since_30m = 0.0
        # Reset cycle hours
        self.daily_duty_history = [0.0] * 7
        self.current_day_duty = 0.0

    def perform_fueling(self, location: str):
        # Fueling takes 30 mins (0.5 hrs) on duty
        self.add_event(0.5, STATUS_ON_DUTY, location, "Fueling Vehicle")
        self.miles_since_fuel = 0.0

    def simulate_trip(self, current_loc: str, pickup_loc: str, dropoff_loc: str,
                      dist_to_pickup: float, duration_to_pickup: float,
                      dist_to_dropoff: float, duration_to_dropoff: float):
        
        # Average speed helper
        speed_to_pickup = dist_to_pickup / max(duration_to_pickup, 0.1)
        speed_to_dropoff = dist_to_dropoff / max(duration_to_dropoff, 0.1)

        # ----------------------------------------------------
        # SEGMENT 1: Current Location to Pickup Location
        # ----------------------------------------------------
        self.simulate_driving_segment(
            start_loc=current_loc,
            end_loc=pickup_loc,
            distance=dist_to_pickup,
            duration=duration_to_pickup,
            speed=speed_to_pickup
        )

        # ----------------------------------------------------
        # ARRIVAL AT PICKUP: 1 hour On-Duty loading
        # ----------------------------------------------------
        if self.duty_window_since_10h + 1.0 > 14.0:
            self.perform_10h_break(pickup_loc)
            
        if self.get_cycle_used_last_8_days() + 1.0 > 70.0:
            self.perform_34h_restart(pickup_loc)

        self.add_event(1.0, STATUS_ON_DUTY, pickup_loc, "Loading Cargo (Pickup)")

        # ----------------------------------------------------
        # SEGMENT 2: Pickup Location to Dropoff Location
        # ----------------------------------------------------
        self.simulate_driving_segment(
            start_loc=pickup_loc,
            end_loc=dropoff_loc,
            distance=dist_to_dropoff,
            duration=duration_to_dropoff,
            speed=speed_to_dropoff
        )

        # ----------------------------------------------------
        # ARRIVAL AT DROPOFF: 1 hour On-Duty unloading
        # ----------------------------------------------------
        if self.duty_window_since_10h + 1.0 > 14.0:
            self.perform_10h_break(dropoff_loc)
            
        if self.get_cycle_used_last_8_days() + 1.0 > 70.0:
            self.perform_34h_restart(dropoff_loc)

        self.add_event(1.0, STATUS_ON_DUTY, dropoff_loc, "Unloading Cargo (Dropoff)")

    def simulate_driving_segment(self, start_loc: str, end_loc: str, distance: float, duration: float, speed: float):
        remaining_duration = duration
        remaining_distance = distance
        
        while remaining_duration > 0:
            # 1. Check if 70-hour limit is reached
            if self.get_cycle_used_last_8_days() >= 70.0:
                self.perform_34h_restart(start_loc)
                continue

            # 2. Check 14-hour duty window
            available_duty_window = 14.0 - self.duty_window_since_10h
            if available_duty_window <= 0.1:
                self.perform_10h_break(start_loc)
                continue

            # 3. Check 11-hour driving limit
            available_driving = 11.0 - self.driving_since_10h
            if available_driving <= 0.1:
                self.perform_10h_break(start_loc)
                continue

            # 4. Check 8-hour driving break limit
            available_before_break = 8.0 - self.driving_since_30m
            if available_before_break <= 0.1:
                self.perform_30m_break(start_loc)
                continue

            # 5. Check if fueling is needed (every 1000 miles)
            miles_to_next_fuel = 1000.0 - self.miles_since_fuel
            if miles_to_next_fuel <= 10:
                self.perform_fueling(start_loc)
                continue

            # Calculate how much we can drive in this chunk
            drive_chunk = min(
                remaining_duration,
                available_duty_window,
                available_driving,
                available_before_break
            )
            
            # Limit chunk by distance to fueling if fuel is needed during this drive
            chunk_distance = drive_chunk * speed
            if chunk_distance > miles_to_next_fuel:
                # Drive only up to the fueling point
                drive_chunk = miles_to_next_fuel / speed
                chunk_distance = miles_to_next_fuel
                
            # Perform the driving chunk
            location_desc = f"En Route ({start_loc} -> {end_loc})"
            self.add_event(drive_chunk, STATUS_DRIVING, location_desc, f"Driving to destination", chunk_distance)
            
            remaining_duration -= drive_chunk
            remaining_distance -= chunk_distance

    def generate_daily_logs(self, shipper_commodity: str = "General Freight", carrier_name: str = "Antigravity Logistics LLC") -> List[Dict[str, Any]]:
        # Sort events by start time
        if not self.events:
            return []

        # Find the start date of the first event
        start_date = self.events[0].start_time.date()
        end_date = self.events[-1].end_time.date()
        total_days = (end_date - start_date).days + 1

        daily_logs = []
        
        # We will loop day-by-day and allocate statuses to the 96 intervals (15 mins each) of that day
        for day_idx in range(total_days):
            current_date = start_date + datetime.timedelta(days=day_idx)
            day_start = datetime.datetime.combine(current_date, datetime.time.min)
            day_end = datetime.datetime.combine(current_date, datetime.time.max)

            # Initialize 96 intervals with OFF_DUTY (status 1) by default
            grid = [STATUS_OFF_DUTY] * 96
            remarks = []
            miles_today = 0.0

            # Overlap events onto this specific day's 24 hours
            for event in self.events:
                # Calculate overlap of event with [day_start, day_end]
                overlap_start = max(event.start_time, day_start)
                overlap_end = min(event.end_time, day_end)

                if overlap_start < overlap_end:
                    # There is overlap
                    # Translate times to 15-minute index (0 to 95)
                    start_mins = (overlap_start - day_start).total_seconds() / 60.0
                    end_mins = (overlap_end - day_start).total_seconds() / 60.0
                    
                    start_idx = int(round(start_mins / 15.0))
                    end_idx = int(round(end_mins / 15.0))
                    
                    # Bound indexes
                    start_idx = max(0, min(95, start_idx))
                    end_idx = max(0, min(96, end_idx))
                    
                    for idx in range(start_idx, end_idx):
                        grid[idx] = event.status

                    # Collect remarks that happened on this day
                    # We can use the start of the event if it starts today, or show continuation
                    time_str = overlap_start.strftime("%H:%M")
                    if event.start_time >= day_start and event.start_time <= day_end:
                        remarks.append(f"{time_str} - {event.remark} at {event.location}")
                    elif overlap_start == day_start:
                        remarks.append(f"00:00 - Continue {event.remark} from yesterday")
                    
                    # Accumulate miles driven today
                    if event.status == STATUS_DRIVING:
                        # Estimate proportional miles
                        event_total_duration = (event.end_time - event.start_time).total_seconds() / 3600.0
                        if event_total_duration > 0:
                            overlap_duration = (overlap_end - overlap_start).total_seconds() / 3600.0
                            miles_today += event.miles * (overlap_duration / event_total_duration)

            # Calculate totals for the 4 statuses in hours (each interval is 0.25 hours)
            off_duty_hrs = grid.count(STATUS_OFF_DUTY) * 0.25
            sleeper_hrs = grid.count(STATUS_SLEEPER) * 0.25
            driving_hrs = grid.count(STATUS_DRIVING) * 0.25
            on_duty_hrs = grid.count(STATUS_ON_DUTY) * 0.25

            # Calculate Recap Metrics
            duty_today = driving_hrs + on_duty_hrs
            
            prev_7_days_duty = self.daily_duty_history[day_idx : day_idx + 7] if day_idx + 7 <= len(self.daily_duty_history) else self.daily_duty_history[-7:]
            while len(prev_7_days_duty) < 7:
                prev_7_days_duty.insert(0, 0.0)
                
            total_last_7_days = sum(prev_7_days_duty) + duty_today
            available_tomorrow = max(0.0, 70.0 - total_last_7_days)

            self.daily_duty_history.append(duty_today)

            daily_logs.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "grid": grid,
                "totals": {
                    "off_duty": off_duty_hrs,
                    "sleeper": sleeper_hrs,
                    "driving": driving_hrs,
                    "on_duty": on_duty_hrs,
                    "total": off_duty_hrs + sleeper_hrs + driving_hrs + on_duty_hrs
                },
                "miles_today": round(miles_today, 1),
                "remarks": remarks,
                "shipper_commodity": shipper_commodity,
                "carrier_name": carrier_name,
                "recap": {
                    "duty_today": round(duty_today, 2),
                    "total_7_days": round(total_last_7_days, 2),
                    "available_tomorrow": round(available_tomorrow, 2)
                }
            })

        return daily_logs
