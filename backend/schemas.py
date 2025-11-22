from pydantic import BaseModel
from typing import Literal, Optional

# ------------------------------
# Pydantic models for input
# ------------------------------

class ClientData(BaseModel):
    name: str
    age: int

class ReservationData(BaseModel):
    pickup_location_id: str
    preferred_car: str

class PreferencesData(BaseModel):
    passengers: int
    doors: int
    luggage: Literal['light', 'medium', 'heavy']
    transmission: Optional[str]
    budget: float

class AddonsData(BaseModel):
    gps: bool
    baby_seat: bool
    additional_driver: bool

class MetaData(BaseModel):
    language: str

class BookingRequest(BaseModel):
    client: ClientData
    reservation: ReservationData
    preferences: PreferencesData
    addons: AddonsData
    meta: MetaData
