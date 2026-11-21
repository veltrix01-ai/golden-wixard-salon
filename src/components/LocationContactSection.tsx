import React from 'react';
import {
  SALON_INFO,
  DEFAULT_WHATSAPP_ENQUIRY_MESSAGE,
  getWhatsAppUrl,
} from '../data/salonData';
import { useTheme } from '../context/ThemeContext';
import { MapPin, Phone, MessageCircle, Navigation, Clock, CheckCircle2, ExternalLink } from 'lucide-react';

interface LocationContactSectionProps {
  whatsappNumber?: string;
}

export const LocationContactSection: React.FC<LocationContactSectionProps> = ({
  whatsappNumber,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const whatsappEnquiryUrl = getWhatsAppUrl(
    DEFAULT_WHATSAPP_ENQUIRY_MESSAGE,
    whatsappNumber
  );

  return (
    <section id="contact" className="py-10 md:py-16 relative border-t border-white/5 bg-[#121212]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading: Compact */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#C9A45C] uppercase block mb-1">
            Location & Hours
          </span>
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-2">
            Visit Our <span className="gold-gradient-text italic font-normal">Salon</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5]">
            Gandi Maisamma X Road, directly opposite Indian Oil Petrol Pump, Hyderabad.
          </p>
        </div>

        {/* Content Grid: Location Card (Left) & Embedded Map (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          {/* Location & Details Card */}
          <div className="lg:col-span-5 border border-[#C9A45C]/30 bg-[#181818] rounded-xl p-4 sm:p-6 flex flex-col justify-between shadow-xl text-[#F5F1E8]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                  Open Today Until 9:00 PM
                </span>
              </div>

              <h3 className={`font-serif-elegant text-2xl sm:text-3xl font-bold mb-1 ${
                isLight ? 'text-[#24211C]' : 'text-[#F5F1E8]'
              }`}>
                {SALON_INFO.name}
              </h3>
              <p className="text-xs text-[#C9A45C] font-semibold tracking-wider uppercase mb-6">
                {SALON_INFO.category}
              </p>

              {/* Address item */}
              <div className="space-y-5 text-sm">
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                    isLight
                      ? 'bg-[#F5F2EB] border-[#A9823D]/30 text-[#A9823D]'
                      : 'bg-[#111111] border-[#C9A45C]/40 text-[#C9A45C]'
                  }`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">
                      Salon Address
                    </h4>
                    <p className={`font-medium leading-relaxed ${isLight ? 'text-[#24211C]' : 'text-[#F5F1E8]'}`}>
                      {SALON_INFO.address.line1},
                    </p>
                    <p className="text-[#C9A45C] font-semibold leading-relaxed">
                      {SALON_INFO.address.landmark},
                    </p>
                    <p className="opacity-75 leading-relaxed text-xs">
                      {SALON_INFO.address.area}, {SALON_INFO.address.city}, {SALON_INFO.address.state} {SALON_INFO.address.pincode}
                    </p>
                  </div>
                </div>

                {/* Phone Item */}
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                    isLight
                      ? 'bg-[#F5F2EB] border-[#A9823D]/30 text-[#A9823D]'
                      : 'bg-[#111111] border-[#C9A45C]/40 text-[#C9A45C]'
                  }`}>
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">
                      Direct Telephone
                    </h4>
                    <a
                      href={`tel:${SALON_INFO.phoneRaw}`}
                      className="font-bold text-base hover:text-[#C9A45C] transition-colors"
                    >
                      {SALON_INFO.phoneDisplay}
                    </a>
                    <p className="text-xs opacity-60 mt-0.5">
                      Direct line for appointments and queries
                    </p>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                    isLight
                      ? 'bg-[#F5F2EB] border-[#A9823D]/30 text-[#A9823D]'
                      : 'bg-[#111111] border-[#C9A45C]/40 text-[#C9A45C]'
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">
                      Operating Hours
                    </h4>
                    <p className={`font-medium ${isLight ? 'text-[#24211C]' : 'text-[#F5F1E8]'}`}>
                      Monday to Sunday: 9:00 AM - 9:00 PM
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Open all 7 days of the week
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10 space-y-3">
              <a
                href={SALON_INFO.googleMapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3 px-4 font-semibold text-xs tracking-wider uppercase rounded-lg flex items-center justify-center gap-2 transition-all shadow-md ${
                  isLight
                    ? 'bg-[#A9823D] hover:bg-[#967232] text-white'
                    : 'bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>Get Directions (Google Maps)</span>
              </a>
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={`tel:${SALON_INFO.phoneRaw}`}
                  className={`py-2.5 px-3 border font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    isLight
                      ? 'bg-white hover:bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C]'
                      : 'bg-[#1F1F1F] hover:bg-[#2a2a2a] border-white/10 text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-[#C9A45C]" />
                  <span>Call Now</span>
                </a>
                <a
                  href={whatsappEnquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-2.5 px-3 border font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    isLight
                      ? 'bg-white hover:bg-[#F5F2EB] border-[#A9823D]/30 text-[#A9823D]'
                      : 'bg-[#1F1F1F] hover:bg-[#2a2a2a] border-[#C9A45C]/35 text-[#E3C78D]'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>Enquire Now</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Authentic Branch 1 Storefront + Interactive Google Maps Frame */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Actual Golden Wizard Branch 1 Storefront Exterior */}
            <figure className={`border rounded-xl overflow-hidden shadow-xl ${
              isLight
                ? 'bg-white border-[#E8E1D5]'
                : 'bg-[#1A1A1A] border-[#C9A45C]/30'
            }`}>
              <div className={`px-3 py-2 border-b flex items-center justify-between text-xs ${
                isLight
                  ? 'bg-[#F9F7F2] border-[#E8E1D5] text-[#24211C]'
                  : 'bg-[#131313] border-white/10 text-[#F5F1E8]'
              }`}>
                <span className="font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C9A45C]" />
                  <span>Golden Wizard Storefront — Branch 01 (Gandi Maisamma)</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#C9A45C] font-semibold">
                  Opp. Indian Oil Petrol Pump
                </span>
              </div>
              <div className="aspect-[4/3] w-full bg-[#0D0D0D] overflow-hidden">
                <img
                  src="/assets/salon/golden-wizard-branch1-storefront.png"
                  alt="Golden Wizard Hair & Beauty Salon Branch 01 exterior storefront in Gandi Maisamma, Hyderabad"
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                />
              </div>
            </figure>

            <div className={`border rounded-xl overflow-hidden flex flex-col flex-1 min-h-[280px] shadow-xl relative ${
              isLight
                ? 'bg-white border-[#E8E1D5]'
                : 'bg-[#1A1A1A] border-[#C9A45C]/30'
            }`}>
              <div className={`p-3 border-b flex items-center justify-between text-xs ${
                isLight
                  ? 'bg-[#F9F7F2] border-[#E8E1D5] text-[#24211C]'
                  : 'bg-[#131313] border-white/10 text-[#F5F1E8]'
              }`}>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C9A45C]" />
                  <span className="font-medium">Google Maps Navigation</span>
                </span>
                <a
                  href={SALON_INFO.googleMapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C9A45C] hover:underline flex items-center gap-1"
                >
                  <span>Open in Full App</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex-1 w-full relative min-h-[260px]">
                <iframe
                  title="Golden Wizard Professional Salon Map"
                  src="https://maps.google.com/maps?q=4,+Gandi+Maisamma+X+Rd,+Opposite+Indian+Oil+Petrol+Pump,+Gandi+Maisamma,+Hyderabad,+Telangana+500043&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '260px' }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className={`w-full h-full ${
                    isLight ? '' : 'filter invert-[0.9] hue-rotate-180 contrast-[1.1] grayscale-[0.2]'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
