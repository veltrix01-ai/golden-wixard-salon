import React from 'react';
import { SALON_INFO } from '../data/salonData';
import { Star, ExternalLink, CheckCircle2 } from 'lucide-react';

export const ReviewsSection: React.FC = () => {
  return (
    <section
      id="reviews"
      className="py-10 md:py-16 relative overflow-hidden border-t border-b border-white/5 bg-[#121212]"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading: Compact */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#C9A45C] uppercase block mb-1">
            Client Feedback
          </span>
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-2">
            Verified <span className="gold-gradient-text italic font-normal">Google Reviews</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5]">
            Genuine customer ratings on Google Maps from clients in Gandi Maisamma, Hyderabad.
          </p>
        </div>

        {/* Compact Verified Rating Card */}
        <div className="border border-[#C9A45C]/30 bg-[#181818] rounded-xl p-5 sm:p-7 shadow-lg text-center max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            {/* Rating Number */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif-elegant text-4xl sm:text-5xl font-bold text-[#C9A45C]">
                {SALON_INFO.rating}
              </span>
              <span className="text-base opacity-60 font-light">/ 5.0</span>
            </div>

            <div className="h-10 w-[1px] hidden sm:block bg-white/10" />

            {/* Stars & Count */}
            <div className="text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-1 text-[#C9A45C]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#C9A45C] text-[#C9A45C]" />
                ))}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1 text-xs font-semibold text-[#F5F1E8]">
                <span>{SALON_INFO.reviewCount} Verified Google Reviews</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline-block" />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center">
            <a
              href={SALON_INFO.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] transition-all shadow-sm"
            >
              <span>View Reviews on Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
