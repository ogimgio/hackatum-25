'use client';

import BookingForm from '@/components/BookingForm';
import CarSelection from '@/components/CarSelection';
import WhisperDIDAgent from '@/components/WhisperDIDAgent';
import { BookingContext, CarOffer } from '@/components/types';
import { useState } from 'react';

export default function CarRentalApp() {
  // 1. New State: 'selection'
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
      // Save the selected car into the context so the Agent knows what they picked
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

      {/* View 3: AI Agent */}
      {view === 'agent' && bookingData && (
        <WhisperDIDAgent
          bookingContext={bookingData}
          onBack={() => setView('selection')}
        />
      )}
    </div>
  );
}