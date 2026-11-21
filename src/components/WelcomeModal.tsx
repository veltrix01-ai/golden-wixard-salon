import React, { useState, useEffect } from 'react';
import { CrownIcon } from './CrownIcon';
import { acquireBodyScrollLock } from '../utils/scrollLock';
import { CalendarDays, Phone, X, MessageSquareQuote, Clock, MapPin, Star } from 'lucide-react';
import {
  SALON_INFO,
  DEFAULT_WHATSAPP_BOOKING_MESSAGE,
  getWhatsAppUrl,
} from '../data/salonData';

interface WelcomeModalProps {
  onBookAppointment?: () => void;
  onAskQuestion?: () => void;
  whatsappNumber?: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  onBookAppointment,
  onAskQuestion,
  whatsappNumber,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const whatsappBookingUrl = getWhatsAppUrl(
    DEFAULT_WHATSAPP_BOOKING_MESSAGE,
    whatsappNumber
  );

  useEffect(() => {
    // Show modal automatically after exactly 2 seconds on visit
    const hasSeenWelcome = sessionStorage.getItem('gw_welcome_modal_dismissed');
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000); // Exactly 2 seconds delay
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('gw_welcome_modal_dismissed', 'true');
  };

  const handleAsk = () => {
    handleClose();
    if (onAskQuestion) {
      onAskQuestion();
    } else {
      const el = document.getElementById('ask-question-form') || document.getElementById('faqs');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    return acquireBodyScrollLock();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in transition-opacity"
    >
      <div
        className="relative w-full max-w-md bg-[#141414] border border-[#C9A45C]/40 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/90 text-center overflow-hidden max-h-[92vh] overflow-y-auto"
        style={{
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 35px rgba(201, 164, 92, 0.18)',
        }}
      >
        {/* Subtle decorative gold light glow in background */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 bg-[#C9A45C]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close welcome message"
          className="absolute top-3.5 right-3.5 p-2 text-[#A5A5A5] hover:text-[#F5F1E8] hover:bg-white/5 rounded-xl transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Brand Emblem */}
        <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#1C1C1C] border border-[#C9A45C]/60 flex items-center justify-center text-[#C9A45C] shadow-md mb-3">
          <CrownIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#C9A45C]" />
        </div>

        {/* Header Tagline */}
        <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-1">
          Welcome to Golden Wizard
        </div>

        {/* Title */}
        <h2
          id="welcome-modal-title"
          className="text-lg sm:text-xl font-serif-elegant font-bold text-[#F5F1E8] tracking-wide leading-snug mb-2"
        >
          Professional Hair Styling & Beauty Salon
        </h2>

        {/* Supporting Text */}
        <p className="text-xs sm:text-sm text-[#A5A5A5] mb-4 leading-relaxed max-w-sm mx-auto">
          Discover professional hair styling and beauty care. We're here to help you look and feel your best.
        </p>

        {/* Quick Verified Salon Strip */}
        <div className="grid grid-cols-2 gap-2 text-left bg-[#1B1B1B] border border-white/5 rounded-xl p-2.5 mb-4 text-[11px] sm:text-xs text-[#A5A5A5]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C9A45C] shrink-0" />
            <span>Daily until 9:00 PM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-[#C9A45C] text-[#C9A45C] shrink-0" />
            <span className="text-[#F5F1E8] font-medium">4.4 Google Rating</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 border-t border-white/5 pt-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-[#C9A45C] shrink-0" />
            <span className="truncate">Gandi Maisamma &amp; Dommara Pochampally</span>
          </div>
        </div>

        {/* Primary Action Buttons: BOOK APPOINTMENT & CALL SALON */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-3.5">
          {/* Book Appointment Action */}
          {onBookAppointment ? (
            <button
              type="button"
              onClick={() => {
                handleClose();
                onBookAppointment();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold tracking-wider uppercase rounded-xl bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <CalendarDays className="w-4 h-4 text-[#0D0D0D]" strokeWidth={2} />
              <span>Book Appointment</span>
            </button>
          ) : (
            <a
              href={whatsappBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold tracking-wider uppercase rounded-xl bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <CalendarDays className="w-4 h-4 text-[#0D0D0D]" strokeWidth={2} />
              <span>Book Appointment</span>
            </a>
          )}

          {/* Call Salon Action */}
          <a
            href={`tel:${SALON_INFO.phoneRaw}`}
            onClick={handleClose}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold tracking-wider uppercase rounded-xl border border-[#C9A45C]/50 hover:border-[#C9A45C] bg-[#1B1B1B] hover:bg-[#242424] text-[#F5F1E8] transition-all"
          >
            <Phone className="w-4 h-4 text-[#C9A45C]" strokeWidth={2} />
            <span>Call Salon</span>
          </a>
        </div>

        {/* Third Action: Have a hairstyle question? ASK OUR HAIRSTYLIST */}
        <div className="pt-3 border-t border-white/10 flex flex-col items-center">
          <p className="text-xs text-[#A5A5A5] mb-1.5">Have a hairstyle question?</p>
          <button
            type="button"
            onClick={handleAsk}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold tracking-wide rounded-xl border border-white/10 hover:border-[#C9A45C]/50 bg-[#161616] hover:bg-[#202020] text-[#E3C78D] transition-colors cursor-pointer"
          >
            <MessageSquareQuote className="w-3.5 h-3.5 text-[#C9A45C]" />
            <span>Ask Our Hairstylist</span>
          </button>
        </div>

        {/* Explore Dismiss Action */}
        <button
          type="button"
          onClick={handleClose}
          className="mt-3 text-[11px] text-[#A5A5A5] hover:text-[#C9A45C] transition-colors cursor-pointer underline underline-offset-4"
        >
          Explore salon services & portfolio
        </button>
      </div>
    </div>
  );
};
