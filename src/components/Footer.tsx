import React from 'react';
import {
  SALON_INFO,
  DEFAULT_WHATSAPP_BOOKING_MESSAGE,
  getWhatsAppUrl,
} from '../data/salonData';
import { MapPin, Phone, Navigation, Clock, Star, Lock } from 'lucide-react';

interface FooterProps {
  onOpenAdminPortal?: () => void;
  onBookAppointment?: () => void;
  whatsappNumber?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAdminPortal,
  onBookAppointment,
  whatsappNumber,
}) => {
  const currentYear = new Date().getFullYear();
  const whatsappBookingUrl = getWhatsAppUrl(
    DEFAULT_WHATSAPP_BOOKING_MESSAGE,
    whatsappNumber
  );

  const handleNavClick = (href: string) => {
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', `/${href}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t pt-10 sm:pt-14 pb-14 sm:pb-16 relative bg-[#0A0A0A] border-white/5 text-[#A5A5A5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8 pb-8 sm:pb-10 border-b border-white/10">
          {/* Col 1: Salon Identity */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <span className="font-serif-elegant text-xl font-bold tracking-wider uppercase text-[#F5F1E8]">
                Golden Wizard
              </span>
              <span className="text-[10px] tracking-[0.25em] text-[#C9A45C] font-semibold uppercase block">
                Professional Salon
              </span>
            </div>

            <p className="text-xs sm:text-sm font-light leading-relaxed">
              Experience the pinnacle of hair care, modern colour craft, hair straightening, rejuvenating facials, and bridal elegance in Gandi Maisamma, Hyderabad.
            </p>

            {/* Google Rating Chip */}
            <div className="inline-flex items-center gap-2 p-2 px-3 rounded-lg border text-xs bg-[#161616] border-white/10">
              <div className="flex text-[#C9A45C]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-[#C9A45C] text-[#C9A45C]" />
                ))}
              </div>
              <span className="font-semibold text-white">
                {SALON_INFO.rating} / 5.0
              </span>
              <span className="opacity-40">|</span>
              <a
                href={SALON_INFO.googleReviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C9A45C] font-medium hover:underline"
              >
                {SALON_INFO.reviewCount} Google Reviews
              </a>
            </div>
          </div>

          {/* Col 2: Quick Navigation */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-serif-elegant text-base font-semibold tracking-wide uppercase text-[#F5F1E8]">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a
                  href="#home"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('#home');
                  }}
                  className="hover:text-[#C9A45C] transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('#about');
                  }}
                  className="hover:text-[#C9A45C] transition-colors"
                >
                  About the Salon
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('#services');
                  }}
                  className="hover:text-[#C9A45C] transition-colors"
                >
                  Services & Treatments
                </a>
              </li>
              <li>
                <a
                  href="#gallery"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('#gallery');
                  }}
                  className="hover:text-[#C9A45C] transition-colors"
                >
                  Work Gallery
                </a>
              </li>
              <li>
                <a
                  href="#certificates"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('#certificates');
                  }}
                  className="hover:text-[#C9A45C] transition-colors"
                >
                  Certificates
                </a>
              </li>
              <li>
                <a
                  href="#locations"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('#locations');
                  }}
                  className="hover:text-[#C9A45C] transition-colors"
                >
                  Locations
                </a>
              </li>
              <li>
                {onBookAppointment ? (
                  <button
                    type="button"
                    onClick={onBookAppointment}
                    className="text-[#C9A45C] hover:underline font-medium cursor-pointer text-left"
                  >
                    Book Appointment
                  </button>
                ) : (
                  <a
                    href={whatsappBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C9A45C] hover:underline font-medium"
                  >
                    Book Appointment
                  </a>
                )}
              </li>
            </ul>
          </div>

          {/* Col 3: Services Summary */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-serif-elegant text-base font-semibold tracking-wide uppercase text-[#F5F1E8]">
              Signature Offerings
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>Custom Precision Haircuts & Styling</li>
              <li>Balayage, Ombré & Creative Global Colour</li>
              <li>Nanoplastia, Keratin & Botoplex Therapies</li>
              <li>Hydrating Hair Spa & Scalp Rejuvenation</li>
              <li>Bridal Hair & Pre-Wedding Grooming</li>
              <li>Advanced Skin Care, Bleach & Tan Removal</li>
            </ul>
          </div>

          {/* Col 4: Salon Locations & Hours */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-serif-elegant text-base font-semibold tracking-wide uppercase text-[#F5F1E8]">
              Salon Locations
            </h4>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#C9A45C] shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A45C] block">
                    Branch 01 — Gandi Maisamma
                  </span>
                  <span>
                    Door No. 4, M Kotilingareddy, Survey No. 217/A, 4, Gandi Maisamma X Rd,{' '}
                    <strong className="text-[#E3C78D] font-semibold">Opp. Indian Oil Petrol Pump</strong>, Hyderabad, Telangana, India - 500043.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#C9A45C] shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A45C] block">
                    Branch 02 — Dommara Pochampally
                  </span>
                  <span>
                    Plot No. 72, 73, Dommara Pochampally Road, D.P. Pally, Dundigal,{' '}
                    <strong className="text-[#E3C78D] font-semibold">Opposite Pista House (backside)</strong>, Hyderabad, Telangana, India.
                  </span>
                </div>
              </div>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#C9A45C] shrink-0" strokeWidth={1.75} />
                <a href={`tel:${SALON_INFO.phoneRaw}`} className="hover:text-[#C9A45C] transition-colors font-semibold">
                  {SALON_INFO.phoneDisplay} (Both Branches)
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C9A45C] shrink-0" strokeWidth={1.75} />
                <span>Branch 01: Daily 9:00 AM – 9:00 PM</span>
              </p>
              <div className="pt-1 flex flex-col gap-2">
                <a
                  href="#locations"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('#locations');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#C9A45C] hover:underline font-medium"
                >
                  <Navigation className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>View Both Locations &amp; Maps</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs opacity-60">
          <p>© {currentYear} Golden Wizard Professional Salon. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Gandi Maisamma, Hyderabad, Telangana 500043</span>
            {onOpenAdminPortal && (
              <button
                onClick={onOpenAdminPortal}
                className="hover:text-[#C9A45C] transition-colors flex items-center gap-1 text-[11px] underline cursor-pointer"
              >
                <Lock className="w-3 h-3 text-[#C9A45C]" strokeWidth={1.75} />
                <span>Owner Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
