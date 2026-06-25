from django.test import TestCase
import datetime
from .hos_engine import HosEngine, STATUS_DRIVING, STATUS_SLEEPER, STATUS_ON_DUTY, STATUS_OFF_DUTY

class HosEngineTestCase(TestCase):
    def test_short_trip(self):
        # Initial cycle used is 10 hours
        start_time = datetime.datetime(2026, 6, 25, 8, 0, 0)
        engine = HosEngine(initial_cycle_used=10.0, start_time=start_time)
        
        # Simulate short trip: 100 miles, 2 hours driving
        engine.simulate_trip(
            current_loc="A",
            pickup_loc="B",
            dropoff_loc="C",
            dist_to_pickup=50.0,
            duration_to_pickup=1.0,
            dist_to_dropoff=50.0,
            duration_to_dropoff=1.0
        )
        
        # Verify events
        # Events: 
        # 1. Drive A -> B (1 hr)
        # 2. Loading cargo (1 hr)
        # 3. Drive B -> C (1 hr)
        # 4. Unloading cargo (1 hr)
        self.assertTrue(len(engine.events) >= 4)
        
        # Verify Daily Logs generated
        logs = engine.generate_daily_logs()
        self.assertEqual(len(logs), 1) # Should fit in 1 day
        self.assertEqual(logs[0]["totals"]["driving"], 2.0)
        self.assertEqual(logs[0]["totals"]["on_duty"], 2.0) # 1 hr pickup + 1 hr dropoff
        self.assertEqual(logs[0]["totals"]["off_duty"], 20.0) # 24 - 4 = 20.0

    def test_long_trip_hos_limit(self):
        # 3000 miles trip requiring multiple days and breaks
        start_time = datetime.datetime(2026, 6, 25, 8, 0, 0)
        engine = HosEngine(initial_cycle_used=50.0, start_time=start_time)
        
        # 600 miles to pickup (takes 10 hours)
        # 2400 miles to dropoff (takes 40 hours)
        engine.simulate_trip(
            current_loc="A",
            pickup_loc="B",
            dropoff_loc="C",
            dist_to_pickup=600.0,
            duration_to_pickup=10.0,
            dist_to_dropoff=2400.0,
            duration_to_dropoff=40.0
        )
        
        logs = engine.generate_daily_logs()
        # Should spread across multiple days
        self.assertTrue(len(logs) > 1)
        
        # Ensure there is at least one 10-hour sleeper berth or off-duty break
        has_break = False
        for event in engine.events:
            if "Break" in event.remark or "Restart" in event.remark:
                has_break = True
        self.assertTrue(has_break)
