from fastapi import FastAPI
import random
from utils import fetch_simplified_data
from schemas import BookingRequest
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="SiXT Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fetch once on startup
vehicles, _, protections = fetch_simplified_data()

# ------------------------------
# Helper functions
# ------------------------------
def filter_cars(preferred_name, prefs):
    """Filters and selects the best matching normal and upsell cars based on preferences."""
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

    # NORMAL CAR — try matching preferred_name first
    preferred_same = [v for v in same_cats if v["vehicle_name"] == preferred_name]
    if preferred_same:
        normal_car = apply_filters(preferred_same)
    else:
        normal_car = apply_filters(same_cats)

    # UPSELL
    upsell_car = apply_filters(upsell_cats)

    return normal_car, upsell_car

def select_protection(budget):
    """Selects a protection package based on the user's budget."""
    if budget < 40:
        return protections[2]  # cheap
    elif budget < 70:
        return protections[1]  # medium
    else:
        return protections[0]  # expensive

def format_car_offer(car):
    """Formats the car offer for the API response."""
    price_delta = f"+${car['extra_cost']}/day" if car['extra_cost'] > 0 else "Same Price"
    return {
        "id": car['id'],
        "name": car['vehicle_name'],
        "image": car['image'],
        "price_delta": price_delta,
        "description": car['description']
    }

def format_protection_offer(prot):
    """Formats the protection offer for the API response."""
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
