'use client';

import {
    Baby,
    Car,
    DollarSign,
    Gauge,
    Luggage,
    MapPin,
    Navigation,
    UserPlus,
    Users
} from 'lucide-react';
import React, { useState } from 'react';
import { BookingContext } from './types';

interface BookingFormProps {
    onSubmit: (data: BookingContext) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmit }) => {
    // --- State ---
    const [name, setName] = useState('Jonas Schmidt');
    const [age, setAge] = useState<number | ''>(23);
    const [pickup, setPickup] = useState('LAX_AIRPORT');
    const [passengers, setPassengers] = useState(1);
    const [doors, setDoors] = useState(3);
    const [luggage, setLuggage] = useState<'light' | 'medium' | 'heavy'>('light');
    const [transmission, setTransmission] = useState<'manual' | 'automatic'>('manual');
    const [budget, setBudget] = useState<number | ''>(35);
    const [gps, setGps] = useState(false);
    const [babySeat, setBabySeat] = useState(false);
    const [addDriver, setAddDriver] = useState(false);

    const handleSubmit = () => {
        onSubmit({
            client: { name, age: Number(age) || 25 },
            reservation: { pickup_location_id: pickup, preferred_car: 'Any' },
            preferences: { passengers, doors, luggage, transmission, budget: Number(budget) || 0 },
            addons: { gps, baby_seat: babySeat, additional_driver: addDriver },
            meta: { language: 'en' }
        });
    };

    // --- SIXT UI STYLES ---
    const sixtOrange = "text-[#ff5f00]";
    const sixtBgOrange = "bg-[#ff5f00]";
    const sixtBorderOrange = "border-[#ff5f00]";

    const labelStyle = "text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1";
    const inputStyle = `w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 focus:ring-1 focus:ring-[#ff5f00] focus:border-[#ff5f00] outline-none transition-all placeholder:font-medium`;

    // Toggle Buttons
    const toggleBtnBase = "flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all border";
    const toggleBtnActive = "bg-[#ff5f00] text-white border-[#ff5f00] shadow-md"; // Sixt Active State
    const toggleBtnInactive = "bg-white text-gray-400 border-transparent hover:border-gray-200 hover:text-gray-600";

    // Addon Buttons
    const addonBtnBase = "py-2 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-2";
    const addonBtnActive = "bg-[#fff0e6] border-[#ff5f00] text-[#ff5f00]"; // Light orange background for active addons
    const addonBtnInactive = "border-gray-200 text-gray-400 hover:bg-gray-50";

    return (
        <div className="w-full max-w-xl mx-auto animate-in slide-in-from-bottom-4 duration-500 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">

                {/* Header: Sixt Black Background */}
                <div className="bg-[#191919] px-6 py-4 flex items-center justify-between relative overflow-hidden">
                    {/* Orange Accent Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#ff5f00]" />

                    <div className="z-10">
                        <h1 className="text-lg font-extrabold text-white tracking-tight uppercase italic">SIXT <span className="text-[#ff5f00] not-italic font-normal normal-case">Rental</span></h1>
                        <p className="text-[10px] text-gray-400 font-medium">Enter details to unlock our fleet.</p>
                    </div>
                    <div className="h-8 w-8 bg-[#2d2d2d] rounded-full flex items-center justify-center z-10">
                        <MapPin className="text-[#ff5f00]" size={16} />
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">

                    {/* 1. CLIENT SECTION */}
                    <div>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-3">
                                <label className={labelStyle}>Full Name</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputStyle} />
                            </div>
                            <div className="col-span-1">
                                <label className={labelStyle}>Age</label>
                                <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className={inputStyle} />
                            </div>
                            <div className="col-span-4">
                                <label className={labelStyle}>Pickup Location</label>
                                <select value={pickup} onChange={(e) => setPickup(e.target.value)} className={`${inputStyle} appearance-none`}>
                                    <option value="LAX_AIRPORT">LAX Airport (Los Angeles)</option>
                                    <option value="JFK_AIRPORT">JFK Airport (New York)</option>
                                    <option value="BERLIN">Berlin City Center</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    {/* 2. PREFERENCES SECTION */}
                    <div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            {/* Passengers */}
                            <div>
                                <label className={labelStyle}><Users size={10} className={sixtOrange} /> Passengers</label>
                                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                                    <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="w-8 h-7 flex items-center justify-center text-gray-500 hover:bg-white rounded shadow-sm font-bold text-xs">-</button>
                                    <span className="flex-1 text-center font-bold text-sm text-gray-800">{passengers}</span>
                                    <button onClick={() => setPassengers(Math.min(9, passengers + 1))} className="w-8 h-7 flex items-center justify-center text-gray-500 hover:bg-white rounded shadow-sm font-bold text-xs">+</button>
                                </div>
                            </div>
                            {/* Doors */}
                            <div>
                                <label className={labelStyle}><Car size={10} className={sixtOrange} /> Doors</label>
                                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                    {[2, 3, 4, 5].map(num => (
                                        <button key={num} onClick={() => setDoors(num)} className={`${toggleBtnBase} ${doors === num ? toggleBtnActive : toggleBtnInactive}`}>
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            {/* Transmission */}
                            <div>
                                <label className={labelStyle}><Gauge size={10} className={sixtOrange} /> Gearbox</label>
                                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                    <button onClick={() => setTransmission('manual')} className={`${toggleBtnBase} ${transmission === 'manual' ? toggleBtnActive : toggleBtnInactive}`}>Man</button>
                                    <button onClick={() => setTransmission('automatic')} className={`${toggleBtnBase} ${transmission === 'automatic' ? toggleBtnActive : toggleBtnInactive}`}>Auto</button>
                                </div>
                            </div>
                            {/* Luggage */}
                            <div>
                                <label className={labelStyle}><Luggage size={10} className={sixtOrange} /> Luggage</label>
                                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                    {(['light', 'medium', 'heavy'] as const).map(s => (
                                        <button key={s} onClick={() => setLuggage(s)} className={`${toggleBtnBase} ${luggage === s ? toggleBtnActive : toggleBtnInactive}`}>
                                            {s.slice(0, 1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Budget */}
                        <div>
                            <label className={labelStyle}><DollarSign size={10} className={sixtOrange} /> Max Budget per Day (USD) </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                                <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} className={`${inputStyle} pl-6`} placeholder="e.g. 50" />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    {/* 3. ADDONS SECTION */}
                    <div>
                        <label className={labelStyle}>Extras</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setGps(!gps)} className={`${addonBtnBase} ${gps ? addonBtnActive : addonBtnInactive}`}>
                                <Navigation size={12} /> GPS
                            </button>
                            <button onClick={() => setBabySeat(!babySeat)} className={`${addonBtnBase} ${babySeat ? addonBtnActive : addonBtnInactive}`}>
                                <Baby size={12} /> Seat
                            </button>
                            <button onClick={() => setAddDriver(!addDriver)} className={`${addonBtnBase} ${addDriver ? addonBtnActive : addonBtnInactive}`}>
                                <UserPlus size={12} /> Driver
                            </button>
                        </div>
                    </div>

                </div>

                {/* Footer: Sixt Orange CTA */}
                <div className="px-5 pb-5 pt-0">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-[#ff5f00] hover:bg-[#e05000] text-white text-sm font-extrabold uppercase tracking-wide py-3 rounded-xl shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        Show Vehicles
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingForm;