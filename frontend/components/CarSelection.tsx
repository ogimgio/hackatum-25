'use client';

import { ArrowRight } from 'lucide-react';
import React from 'react';
import { BookingContext, CarOffer } from './types';

// Mock Data (Updated prices/names for demo)
const AVAILABLE_CARS: CarOffer[] = [
    {
        id: 'vw_golf',
        name: 'VOLKSWAGEN GOLF',
        image: 'https://vehicle-pictures-prod.orange.sixt.com/143456/ffffff/18_1.png',
        price: 35,
        price_display: '$35/day',
        features: ['Manual', '5 Seats', 'AC'],
        description: 'Reliable and compact.'
    },
    {
        id: 'toyota_rav4',
        name: 'VOLKSWAGEN T-CROSS',
        image: 'https://vehicle-pictures-prod.orange.sixt.com/142547/ffffff/18_1.png',
        price: 45,
        price_display: '$45/day',
        features: ['Auto', '5 Seats', 'SUV'],
        description: 'Great for families.'
    },
    {
        id: 'bmw_3',
        name: 'SKODA ENYAQ',
        image: 'https://vehicle-pictures-prod.orange.sixt.com/143056/9d9d9c/18_1.png',
        price: 60,
        price_display: '$60/day',
        features: ['Auto', 'Luxury', 'Fast'],
        description: 'Sporty and elegant.'
    }
];

interface Props {
    bookingData: BookingContext;
    onSelect: (car: CarOffer) => void;
    onBack: () => void;
}

const CarSelection: React.FC<Props> = ({ bookingData, onSelect, onBack }) => {
    return (
        <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 font-sans">

            {/* Header Area */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-extrabold text-[#191919] uppercase italic">Select <span className="text-[#ff5f00] not-italic normal-case">Vehicle</span></h2>
                    <p className="text-gray-500 text-sm font-medium">Budget limit: ${bookingData.preferences.budget}/day</p>
                </div>
                <button onClick={onBack} className="text-xs font-bold text-gray-400 hover:text-[#ff5f00] uppercase tracking-wider transition-colors">
                    ← Edit Filters
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {AVAILABLE_CARS.map((car) => (
                    <div key={car.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl hover:border-[#ff5f00]/30 transition-all duration-300 group flex flex-col">

                        {/* Image Area */}
                        <div className="h-40 bg-gray-50 flex items-center justify-center p-4 relative">
                            {/* Price Tag - Sixt Style */}
                            <div className="absolute top-0 left-0 bg-[#ff5f00] text-white px-3 py-1 rounded-br-xl text-sm font-extrabold z-10">
                                {car.price_display}
                            </div>

                            <img src={car.image} alt={car.name} className="object-contain max-h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                        </div>

                        {/* Content */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-[#191919] mb-2 uppercase">{car.name}</h3>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {car.features.map(f => (
                                        <span key={f} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => onSelect(car)}
                                className="w-full py-3 bg-[#191919] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 group-hover:bg-[#ff5f00] transition-colors"
                            >
                                Select <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CarSelection;