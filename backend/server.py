from fastapi import FastAPI
from typing import Literal, Optional
from uuid import uuid4
import random
from utils import fetch_simplified_data # <-- get all the data from the provided SIXT APIs
from schemas import BookingRequest  # <-- import the Pydantic models

app = FastAPI(title="SiXT Hackathon API")

# ------------------------------
# In-memory vehicles / protections
# ------------------------------

# Fetch once on startup
vehicles, addons, protections = fetch_simplified_data()

# ------------------------------
# Helper functions
# ------------------------------
def filter_cars(preferred_name, prefs):
    passenger_req = prefs.passengers
    transmission_req = prefs.transmission
    max_price = prefs.budget * 1.3

    same_cats = [v for v in vehicles if v["category"] == "same"]
    upsell_cats = [v for v in vehicles if v["category"] == "recommended_upsell"]

    # --------------------------------------
    # Helper: apply filtering logic in layers
    # --------------------------------------
    def apply_filters(cars):
        """Return the best matching car under layered constraints."""

        # 1. STRICT FILTER: passengers + transmission + budget
        strict = [
            c for c in cars
            if c["passengers"] >= passenger_req
            and (transmission_req is None or c["transmission"].lower() == transmission_req.lower())
            and c["total_price"] <= max_price
        ]
        if strict:
            return max(strict, key=lambda c: c["total_price"])  # choose most expensive

        # 2. RELAX BUDGET (passengers + transmission)
        no_budget = [
            c for c in cars
            if c["passengers"] >= passenger_req
            and (transmission_req is None or c["transmission"].lower() == transmission_req.lower())
        ]
        if no_budget:
            return min(no_budget, key=lambda c: c["total_price"])

        # 3. RELAX transmission (passengers only)
        passenger_only = [
            c for c in cars
            if c["passengers"] >= passenger_req
        ]
        if passenger_only:
            return max(passenger_only, key=lambda c: c["total_price"])

        # 4. Nothing valid → fallback to most expensive overall
        return max(cars, key=lambda c: c["total_price"])

    # --------------------------------------
    # MAIN SELECT
    # --------------------------------------

    # NORMAL CAR — try matching preferred_name first
    preferred_same = [v for v in same_cats if v["vehicle_name"] == preferred_name]
    if preferred_same:
        normal_car = apply_filters(preferred_same)
    else:
        normal_car = apply_filters(same_cats)

    # UPSELL
    upsell_car = apply_filters(upsell_cats)

    return normal_car, upsell_car


def select_cars(preferred_name, budget):
    # Normal car = same category as preferred if exists
    normal_car = next((v for v in vehicles if v['vehicle_name'] == preferred_name and v['category'] == 'same'), None)
    if not normal_car:
        normal_car = random.choice([v for v in vehicles if v['category'] == 'same'])
    
    # Upsell car = recommended_upsell
    upsell_car = random.choice([v for v in vehicles if v['category'] == 'recommended_upsell'])

    return normal_car, upsell_car

def select_protection(budget):
    if budget < 40:
        return protections[2]  # cheap
    elif budget < 70:
        return protections[1]  # medium
    else:
        return protections[0]  # expensive

def format_car_offer(car):
    price_delta = f"+${car['extra_cost']}/day" if car['extra_cost'] > 0 else "Same Price"
    return {
        "id": car['id'],
        "name": car['vehicle_name'],
        "image": car['image'],
        "price_delta": price_delta,
        "description": f"{car['vehicle_name']} with category {car['category']}"
    }

def format_protection_offer(prot):
    return {
        "name": prot['name'],
        "price": f"${prot['cost']}/day",
        "description": prot['summary']
    }

# ------------------------------
# API endpoint
# ------------------------------

@app.post("/api/booking/offer")
def get_booking_offer(booking: BookingRequest):
    print("Incoming preferences →", booking.preferences)

    normal_car, upsell_car = filter_cars(
        preferred_name=booking.reservation.preferred_car,
        prefs=booking.preferences
    )

    protection = select_protection(booking.preferences.budget)

    response = {
        "upsell_car": format_car_offer(upsell_car),
        "normal_car": format_car_offer(normal_car),
        "protection": format_protection_offer(protection)
    }

    return response
