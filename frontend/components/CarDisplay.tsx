import { Check, Shield } from 'lucide-react';
import { BackendSessionData, FlowState } from './types';

export const CarDisplay = ({ state, data }: { state: FlowState, data: BackendSessionData }) => {
    if (state === 'UPSELL_OFFER' || state === 'NORMAL_OFFER') {
        const car = state === 'UPSELL_OFFER' ? data.upsell_car : data.normal_car;
        return (
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-xl max-w-xs border border-gray-200 animate-in slide-in-from-right duration-700">
                <div className="relative h-32 w-full mb-3 overflow-hidden rounded-lg bg-gray-100">
                    <img src={car.image} alt={car.name} className="w-full h-full object-contain" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">{car.name}</h3>
                <p className="text-sm text-slate-500 mb-2">{car.description}</p>
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm">
                    {car.price_delta}
                </div>
            </div>
        );
    }

    if (state === 'PROTECTION_OFFER') {
        return (
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur p-6 rounded-2xl shadow-xl max-w-xs border-l-4 border-blue-600 animate-in slide-in-from-right duration-700">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Shield size={24} /></div>
                    <h3 className="font-bold text-lg text-slate-900">{data.protection.name}</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-600 mb-4">
                    <li className="flex gap-2"><Check size={16} className="text-green-500" /> Zero Excess</li>
                    <li className="flex gap-2"><Check size={16} className="text-green-500" /> Glass & Tire Cover</li>
                    <li className="flex gap-2"><Check size={16} className="text-green-500" /> 24/7 Support</li>
                </ul>
                <div className="font-bold text-slate-900 text-lg">{data.protection.price}</div>
            </div>
        );
    }

    return null;
};