// types.ts

export interface BookingContext {
    client: { name: string; age: number; };
    reservation: { pickup_location_id: string; preferred_car: string; };
    preferences: {
        passengers: number;
        doors: number;
        luggage: 'light' | 'medium' | 'heavy';
        transmission: 'manual' | 'automatic';
        budget: number;
    };
    addons: { gps: boolean; baby_seat: boolean; additional_driver: boolean; };
    meta: { language: string; };
    // NEW: We store the car they selected here
    selectedCar?: CarOffer;
}

export interface CarOffer {
    id: string;
    name: string;
    image: string;
    price: number; // Raw number for math
    price_display: string; // Formatted string
    features: string[];
    description?: string;
}

export interface BackendSessionData {
    upsell_car: CarOffer;
    normal_car: CarOffer; // This will be the car the user selected
    protection: { name: string; price: string; description: string; };
}

export type FlowState = 'CONNECTING' | 'UPSELL_OFFER' | 'NORMAL_OFFER' | 'PROTECTION_OFFER' | 'COMPLETED' | 'ESCALATED';