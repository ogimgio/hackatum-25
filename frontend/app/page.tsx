'use client';

import BookingForm from '@/components/BookingForm';
import CarSelection from '@/components/CarSelection';
import WhisperDIDAgent from '@/components/WhisperDIDAgent';
import { BookingContext, CarOffer } from '@/components/types';
import { useState } from 'react';

export default function CarRentalApp() {
  const [view, setView] = useState<'booking' | 'selection' | 'agent'>('booking');
  const [bookingData, setBookingData] = useState<BookingContext | null>(null);

  // Step 1: Form Submitted -> Go to Selection
  const handleBookingSubmit = (data: BookingContext) => {
    setBookingData(data);
    setView('selection');
  };

  // Step 2: Car Selected -> Go to Agent
  const handleCarSelect = (car: CarOffer) => {
    if (bookingData) {
      setBookingData({ ...bookingData, selectedCar: car });
      setView('agent');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">

      {/* View 1: Booking Form */}
      {view === 'booking' && (
        <BookingForm onSubmit={handleBookingSubmit} />
      )}

      {/* View 2: Car Selection Grid */}
      {view === 'selection' && bookingData && (
        <CarSelection
          bookingData={bookingData}
          onSelect={handleCarSelect}
          onBack={() => setView('booking')}
        />
      )}

      {/* View 3: AI Agent 
         CRITICAL FIX: 
         We render this ALWAYS (even at the start), but keep it hidden using CSS ('hidden' class).
         This allows the connection to establish in the background while the user is browsing cars.
      */}
      <div className={view === 'agent' ? 'block w-full' : 'hidden'}>
        <WhisperDIDAgent
          bookingContext={bookingData}
          onBack={() => setView('selection')}
          isActive={view === 'agent'} // Tells the agent: "You are now on screen, start talking."
        />
      </div>
    </div>
  );
}