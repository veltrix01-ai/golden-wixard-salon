import React, { useEffect } from 'react';
import { CalendarDays, Phone } from 'lucide-react';
import {
  SALON_INFO,
  DEFAULT_WHATSAPP_BOOKING_MESSAGE,
  getWhatsAppUrl,
} from '../data/salonData';

interface FloatingContactDockProps {
  onBookClick?: () => void;
  whatsappNumber?: string;
}

export const FloatingContactDock: React.FC<FloatingContactDockProps> = ({
  onBookClick,
  whatsappNumber,
}) => {
  // Purge any legacy drag position stored in previous visits
  useEffect(() => {
    try {
      localStorage.removeItem('gw_contact_dock_position_v3');
      localStorage.removeItem('gw_contact_dock_position');
    } catch (_) {}
  }, []);

  const whatsappBookingUrl = getWhatsAppUrl(
    DEFAULT_WHATSAPP_BOOKING_MESSAGE,
    whatsappNumber
  );

  return (
    <aside
      aria-label="Salon Quick Contact"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 max-w-[calc(100vw-2rem)] select-none pointer-events-auto"
      style={{
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="flex items-center divide-x divide-[#C9A45C]/25 bg-[#111111]/92 backdrop-blur-md border border-[#C9A45C]/35 rounded-2xl shadow-2xl shadow-black/80 transition-all duration-200 overflow-hidden"
      >
        {/* Action 1: Book Appointment (Opens Branch Selector when wired) */}
        {onBookClick ? (
          <button
            type="button"
            onClick={onBookClick}
            className="flex items-center gap-2.5 px-4 py-2.5 sm:px-5 sm:py-3 text-left hover:bg-[#C9A45C]/10 active:bg-[#C9A45C]/20 transition-colors cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[#C9A45C]"
            aria-label="Select branch and book an appointment"
          >
            <div className="w-8 h-8 rounded-lg bg-[#C9A45C]/15 border border-[#C9A45C]/30 flex items-center justify-center shrink-0 group-hover:border-[#E3C78D] group-hover:scale-105 transition-all">
              <CalendarDays className="w-4 h-4 text-[#E3C78D]" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold tracking-wider text-[#F5F1E8] uppercase group-hover:text-[#E3C78D] transition-colors">
                Book
              </span>
              <span className="text-[9px] text-[#A5A5A5] tracking-tight">
                Appointment
              </span>
            </div>
          </button>
        ) : (
          <a
            href={whatsappBookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-4 py-2.5 sm:px-5 sm:py-3 text-left hover:bg-[#C9A45C]/10 active:bg-[#C9A45C]/20 transition-colors cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[#C9A45C]"
            aria-label="Book an Appointment on WhatsApp"
          >
            <div className="w-8 h-8 rounded-lg bg-[#C9A45C]/15 border border-[#C9A45C]/30 flex items-center justify-center shrink-0 group-hover:border-[#E3C78D] group-hover:scale-105 transition-all">
              <CalendarDays className="w-4 h-4 text-[#E3C78D]" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold tracking-wider text-[#F5F1E8] uppercase group-hover:text-[#E3C78D] transition-colors">
                Book
              </span>
              <span className="text-[9px] text-[#A5A5A5] tracking-tight">
                Appointment
              </span>
            </div>
          </a>
        )}

        {/* Action 2: Direct Call */}
        <a
          href={`tel:${SALON_INFO.phoneRaw}`}
          className="flex items-center gap-2.5 px-4 py-2.5 sm:px-5 sm:py-3 text-left hover:bg-[#C9A45C]/10 active:bg-[#C9A45C]/20 transition-colors cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[#C9A45C]"
          aria-label="Call Golden Wizard Salon at 86863 85552"
        >
          <div className="w-8 h-8 rounded-lg bg-[#C9A45C]/15 border border-[#C9A45C]/30 flex items-center justify-center shrink-0 group-hover:border-[#E3C78D] group-hover:scale-105 transition-all">
            <Phone className="w-4 h-4 text-[#E3C78D]" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold tracking-wider text-[#F5F1E8] uppercase group-hover:text-[#E3C78D] transition-colors">
              Call
            </span>
            <span className="text-[9px] text-[#A5A5A5] font-mono tracking-tight">
              86863 85552
            </span>
          </div>
        </a>
      </div>
    </aside>
  );
};
