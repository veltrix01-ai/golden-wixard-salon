import React from 'react';
import {
  SALON_INFO,
  DEFAULT_WHATSAPP_BOOKING_MESSAGE,
  getWhatsAppUrl,
} from '../data/salonData';
import SpecularButton from './SpecularButton';
import { Star, CalendarDays, Phone, MapPin } from 'lucide-react';

interface HeroProps {
  onExploreServices?: () => void;
  onBookAppointment?: () => void;
  whatsappNumber?: string;
}

export const Hero: React.FC<HeroProps> = ({
  onBookAppointment,
  whatsappNumber,
}) => {
  const whatsappBookingUrl = getWhatsAppUrl(
    DEFAULT_WHATSAPP_BOOKING_MESSAGE,
    whatsappNumber
  );

  return (
    <section id="home" className="relative min-h-[68vh] sm:min-h-[75vh] md:min-h-[85vh] flex items-center justify-center overflow-hidden bg-[#0D0D0D]">
      {/* Background Image with Elegant Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/salon/golden-wizard-branch1-interior-stations.png"
          alt="Golden Wizard Professional Salon interior styling stations and mirrors"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
        {/* Multilayered ambient gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/85 to-[#0D0D0D]/75" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/30 to-black/70 pointer-events-none" />
      </div>

      {/* Hero Content: Space-efficient */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20 text-center">
        {/* Location & Trust Kicker */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border mb-3 sm:mb-4 backdrop-blur-md bg-[#151515]/85 border-[#C9A45C]/30 text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-[#A5A5A5]">
          <MapPin className="w-3 h-3 text-[#C9A45C]" strokeWidth={1.75} />
          <span>Gandi Maisamma, Hyderabad</span>
        </div>

        {/* Rating Score */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs bg-[#1B1B1B] border-white/10 text-[#F5F1E8]">
            <div className="flex text-[#C9A45C]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-[#C9A45C] text-[#C9A45C]" />
              ))}
            </div>
            <span className="font-bold text-[#C9A45C]">{SALON_INFO.rating}/5</span>
            <span className="text-white/20">|</span>
            <a
              href={SALON_INFO.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A5A5A5] hover:text-[#E3C78D] font-medium transition-colors"
            >
              {SALON_INFO.reviewCount} Reviews
            </a>
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="font-serif-elegant text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] mb-3 sm:mb-4 text-[#F5F1E8]">
          Where Style Meets <span className="gold-gradient-text italic font-normal">Elegance</span>
        </h1>

        {/* Description: Short & Informative */}
        <p className="max-w-xl mx-auto text-xs sm:text-base font-light leading-relaxed mb-6 sm:mb-8 text-[#A5A5A5]">
          Haircuts, balayage, keratin reconditioning, bridal artistry, and luxury grooming at <strong className="font-medium text-[#F5F1E8]">Golden Wizard Professional Salon</strong>.
        </p>

        {/* Two Clear Main Actions: Primary SpecularButton ("Book an Appointment") + Call Now */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xl mx-auto">
          {/* Action 1: Primary SpecularButton (Opens Branch Selection when wired, WhatsApp fallback otherwise) */}
          <SpecularButton
            size="lg"
            radius={18}
            tint="#ffffff"
            tintOpacity={0.04}
            textColor="#f5f5f5"
            lineColor="#C9A45C"
            baseColor="#80652F"
            intensity={1}
            idleIntensity={0.35}
            shineSize={10}
            shineFade={34}
            thickness={1.2}
            glow={1}
            followMouse
            proximity={250}
            type={onBookAppointment ? 'button' : undefined}
            href={onBookAppointment ? undefined : whatsappBookingUrl}
            target={onBookAppointment ? undefined : '_blank'}
            rel={onBookAppointment ? undefined : 'noopener noreferrer'}
            onClick={onBookAppointment ? () => onBookAppointment() : undefined}
            className="w-full sm:w-auto font-semibold tracking-wide whitespace-nowrap cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 text-[#C9A45C] shrink-0" strokeWidth={1.75} />
            <span>Book an Appointment</span>
          </SpecularButton>

          {/* Action 2: CALL NOW */}
          <a
            href={`tel:${SALON_INFO.phoneRaw}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-[18px] text-xs sm:text-sm font-semibold tracking-wider uppercase bg-[#1B1B1B] hover:bg-[#252525] text-[#F5F1E8] border border-[#C9A45C]/35 hover:border-[#C9A45C] transition-all duration-200 shadow-md group cursor-pointer whitespace-nowrap"
            aria-label="Call salon at 86863 85552"
          >
            <Phone className="w-4 h-4 text-[#C9A45C] group-hover:text-[#E3C78D] transition-colors shrink-0" strokeWidth={1.75} />
            <span>Call Now (86863 85552)</span>
          </a>
        </div>

        {/* Clean Hours Strip */}
        <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap items-center justify-center gap-4 text-[11px] sm:text-xs text-[#A5A5A5]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Open Daily: 9:00 AM – 9:00 PM
          </span>
          <span className="text-white/20">•</span>
          <span>Opposite Indian Oil Petrol Pump</span>
        </div>
      </div>
    </section>
  );
};
