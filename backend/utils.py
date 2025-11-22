import json
import requests

BASE_URL = "https://hackatum25.sixt.io"

# ------------------------------
# Simplification functions
# ------------------------------

def simplify_vehicles(raw_vehicles):
    simplified = []
    for entry in raw_vehicles.get('deals', []):  # <- note we use 'deals'
        vehicle = entry['vehicle']
        pricing = entry.get('pricing', {})
        display_price = pricing.get('displayPrice', {})
        total_price = pricing.get("totalPrice", {})

        simplified.append({
            # Display name
            "id": vehicle["id"],
            "vehicle_name": f"{vehicle['brand']} {vehicle['model']}",
            
            # Categorization
            "category": "recommended_upsell" if vehicle.get("isRecommended") else "same",

            # Prices
            "extra_cost": display_price.get("amount", 0),
            "total_price": total_price.get("amount", 0),

            # Core attributes
            "passengers": vehicle.get("passengersCount"),
            #"bags": vehicle.get("bagsCount"),
            #"group_type": vehicle.get("groupType"),
            "transmission": vehicle.get("transmissionType"),
            #"fuel_type": vehicle.get("fuelType"),

            # Flags
            "is_new": vehicle.get("isNewCar", False),
            #"is_exciting_discount": vehicle.get("isExcitingDiscount", False),

            # Image
            "image": vehicle.get("images", [None])[0]
        })
    
    return simplified
    return simplified

def simplify_protections(raw_protections):
    simplified = []
    for package in raw_protections.get('protectionPackages', []):
        summary = " ".join([inc['description'] for inc in package.get('includes', [])])
        simplified.append({
            'name': package['name'],
            'summary': summary,
            'cost': package.get('price', {}).get('displayPrice', {}).get('amount', 0)
        })
    return simplified

# ------------------------------
# API functions
# ------------------------------

def create_booking():
    """Creates a booking and returns the booking ID."""
    url = f"{BASE_URL}/api/booking"
    response = requests.post(url)
    response.raise_for_status()
    data = response.json()
    print("Created booking:", data)
    return data["id"]

def get_available_vehicles(booking_id):
    url = f"{BASE_URL}/api/booking/{booking_id}/vehicles"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def get_available_addons(booking_id):
    url = f"{BASE_URL}/api/booking/{booking_id}/addons"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def get_available_protections(booking_id):
    url = f"{BASE_URL}/api/booking/{booking_id}/protections"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

# ------------------------------
# Main flow for fetching simplified data
# ------------------------------

def fetch_simplified_data():
    booking_id = create_booking()
    vehicles_raw = get_available_vehicles(booking_id)
    addons_raw = get_available_addons(booking_id)
    protections_raw = get_available_protections(booking_id)

    vehicles = simplify_vehicles(vehicles_raw)
    protections = simplify_protections(protections_raw)

    # Optional: store locally
    with open("simplified_vehicles.json", "w") as f:
        json.dump(vehicles, f, indent=2)
    with open("simplified_protections.json", "w") as f:
        json.dump(protections, f, indent=2)

    print("Simplified vehicles and protections saved locally.")
    return vehicles, addons_raw, protections

# ------------------------------
# Execute when running standalone
# ------------------------------
if __name__ == "__main__":
    v, a, p = fetch_simplified_data()
