import React from 'react';
import {
  SALON_BRANCHES,
  BranchId,
  getBranchWhatsAppBookingUrl,
} from '../data/salonData';
import { CrownIcon } from './CrownIcon';
import {
  MapPin,
  Navigation,
  Phone,
  Calendar,
  ExternalLink,
  Clock,
  Star,
  Compass,
} from 'lucide-react';

interface OurBranchesSectionProps {
  whatsappNumber?: string;
  onSelectBranchForBooking?: (branchId: BranchId) => void;
}

export const OurBranchesSection: React.FC<OurBranchesSectionProps> = ({
  whatsappNumber,
  onSelectBranchForBooking,
}) => {
  return (
    <section
      id="locations"
      className="py-12 md:py-16 relative border-t border-white/5 bg-[#0D0D0D]"
    >
      {/* Backwards-compatible anchor alias */}
      <span id="branches" className="sr-only" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.22em] text-[#C9A45C] uppercase block mb-1.5">
            Golden Wizard Professional Hair &amp; Beauty Salon
          </span>
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-2 uppercase">
            Our <span className="gold-gradient-text italic font-normal">Locations</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5]">
            Find your nearest Golden Wizard Professional Hair &amp; Beauty Salon. Two locations, one premium experience.
          </p>
        </div>

        {/* Two Equal-Height Location Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {SALON_BRANCHES.map((branch) => {
            const whatsappUrl = getBranchWhatsAppBookingUrl(branch.id, whatsappNumber);

            return (
              <article
                key={branch.id}
                className="border border-[#C9A45C]/35 bg-[#151515] hover:border-[#C9A45C]/60 rounded-2xl p-5 sm:p-7 flex flex-col justify-between shadow-xl transition-colors text-[#F5F1E8]"
              >
                <div className="flex-1 flex flex-col">
                  {/* Top Brand Identity & Branch Label Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#1C1C1C] border border-[#C9A45C]/50 flex items-center justify-center shrink-0">
                        <CrownIcon className="w-5 h-5 text-[#C9A45C]" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#C9A45C]/15 border border-[#C9A45C]/40 text-[#E3C78D] text-[11px] font-bold uppercase tracking-wider">
                        {branch.branchLabel}
                      </span>
                    </div>

                    {branch.isVerifiedLocation && branch.rating && branch.reviewCount ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1D1D1D] border border-white/10 text-[11px] text-[#F5F1E8]">
                        <Star className="w-3 h-3 fill-[#C9A45C] text-[#C9A45C]" />
                        <span className="font-bold text-[#C9A45C]">
                          {branch.rating}/5
                        </span>
                        <span className="text-white/25">|</span>
                        <span className="text-[#A5A5A5]">
                          {branch.reviewCount} Reviews
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1D1D1D] border border-[#C9A45C]/25 text-[11px] text-[#E3C78D] font-medium">
                        <Compass className="w-3 h-3 text-[#C9A45C]" />
                        <span>New Branch Location</span>
                      </span>
                    )}
                  </div>

                  {/* Business & Branch Title */}
                  <h3 className="font-serif-elegant text-xl sm:text-2xl font-bold text-[#F5F1E8] leading-snug mb-1">
                    {branch.name}
                  </h3>
                  <p className="text-xs text-[#C9A45C] font-semibold tracking-wider uppercase mb-5">
                    {branch.shortArea}
                  </p>

                  {/* Branch Address, Landmark, Contact & Hours */}
                  <div className="space-y-4 text-xs sm:text-sm mb-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#111111] border border-[#C9A45C]/35 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4 text-[#C9A45C]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5A5] mb-1">
                          Complete Address
                        </h4>
                        <div className="text-[#F5F1E8] font-medium leading-relaxed space-y-0.5">
                          {branch.addressLines.map((line, idx) => (
                            <p key={idx}>{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#111111] border border-[#C9A45C]/35 flex items-center justify-center shrink-0 mt-0.5">
                        <Navigation className="w-4 h-4 text-[#C9A45C]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5A5] mb-1">
                          Landmark
                        </h4>
                        <p className="text-[#E3C78D] font-semibold leading-relaxed">
                          {branch.landmark}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#111111] border border-[#C9A45C]/35 flex items-center justify-center shrink-0 mt-0.5">
                        <Phone className="w-4 h-4 text-[#C9A45C]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5A5] mb-1">
                          Direct Telephone &amp; WhatsApp
                        </h4>
                        <a
                          href={`tel:${branch.phoneRaw || '+918686385552'}`}
                          className="font-bold text-sm sm:text-base text-[#F5F1E8] hover:text-[#C9A45C] transition-colors"
                        >
                          {branch.phoneDisplay || '+91 86863 85552'}
                        </a>
                      </div>
                    </div>

                    {branch.hours && (
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#111111] border border-[#C9A45C]/35 flex items-center justify-center shrink-0 mt-0.5">
                          <Clock className="w-4 h-4 text-[#C9A45C]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5A5] mb-1">
                            Salon Hours
                          </h4>
                          <p className="text-[#F5F1E8] font-medium">
                            {branch.hours}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Branch Visual Identity (Strictly Separated per Branch) */}
                  <div className="mb-5">
                    {branch.id === 'branch-1' ? (
                      <figure className="border border-[#C9A45C]/30 rounded-xl overflow-hidden bg-[#0D0D0D]">
                        <div className="aspect-[16/10] w-full overflow-hidden bg-[#0D0D0D]">
                          <img
                            src="/assets/salon/golden-wizard-branch1-storefront.png"
                            alt="Golden Wizard Hair & Beauty Salon Branch 01 exterior storefront in Gandi Maisamma, Hyderabad"
                            className="w-full h-full object-cover object-center"
                            loading="lazy"
                          />
                        </div>
                        <figcaption className="px-3 py-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#A5A5A5]">
                          <span>Actual Salon Storefront — Branch 01</span>
                          <span className="text-[#C9A45C] font-semibold">Gandi Maisamma</span>
                        </figcaption>
                      </figure>
                    ) : (
                      <figure className="border border-[#C9A45C]/30 rounded-xl overflow-hidden bg-[#0D0D0D]">
                        <div className="aspect-[16/10] w-full overflow-hidden bg-[#0D0D0D]">
                          <img
                            src="/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.36.39_PM_d9eccf59.jpeg"
                            alt="Golden Wizard Professional Hair & Beauty Salon Branch 02 exterior storefront in Dommara Pochampally, Dundigal"
                            className="w-full h-full object-cover object-center"
                            loading="lazy"
                          />
                        </div>
                        <figcaption className="px-3 py-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#A5A5A5]">
                          <span>Actual Salon Storefront — Branch 02</span>
                          <span className="text-[#C9A45C] font-semibold">Dommara Pochampally</span>
                        </figcaption>
                      </figure>
                    )}
                  </div>

                  {/* Separate Map Preview per Branch */}
                  <div className="mt-auto border border-[#C9A45C]/25 rounded-xl overflow-hidden bg-[#111111]">
                    <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center gap-1.5 text-[#A5A5A5] truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#C9A45C] shrink-0" />
                        <span className="truncate">{branch.mapReferenceNote}</span>
                      </span>
                      <a
                        href={branch.googleMapsSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#C9A45C] hover:underline font-semibold flex items-center gap-1 shrink-0"
                      >
                        <span>View on Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="w-full h-48 sm:h-52 relative">
                      <iframe
                        title={`${branch.name} — ${branch.branchLabel} Map`}
                        src={branch.googleMapsEmbedUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full h-full filter invert-[0.9] hue-rotate-180 contrast-[1.1] grayscale-[0.2]"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mt-5 pt-5 border-t border-white/10 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Appointment</span>
                    </a>

                    <a
                      href={branch.googleMapsDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl border border-[#C9A45C]/45 bg-[#1B1B1B] hover:bg-[#242424] text-[#F5F1E8] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#C9A45C]" />
                      <span>Get Directions</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <a
                      href={`tel:${branch.phoneRaw || '+918686385552'}`}
                      className="w-full py-2.5 px-3 rounded-xl border border-white/10 bg-[#121212] hover:border-[#C9A45C]/50 text-[#F5F1E8] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#C9A45C]" />
                      <span>Call {branch.branchNumber}</span>
                    </a>

                    <a
                      href={branch.googleMapsSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl border border-white/10 bg-[#121212] hover:border-[#C9A45C]/50 text-[#E3C78D] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#C9A45C]" />
                      <span>View on Google Maps</span>
                    </a>
                  </div>

                  {onSelectBranchForBooking && (
                    <button
                      type="button"
                      onClick={() => onSelectBranchForBooking(branch.id)}
                      className="w-full py-1.5 text-[11px] text-[#C9A45C] hover:text-[#E3C78D] hover:underline font-medium transition-colors cursor-pointer"
                    >
                      Or select {branch.branchNumber} in the online booking form
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
