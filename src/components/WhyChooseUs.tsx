import React from 'react';
import { Sparkles, Layers, HeartHandshake, MapPin } from 'lucide-react';
import { WHY_CHOOSE_US } from '../data/salonData';

export const WhyChooseUs: React.FC = () => {
  const iconMap: Record<string, React.ElementType> = {
    Sparkles,
    Layers,
    HeartHandshake,
    MapPin,
  };

  return (
    <section className="py-10 md:py-16 relative overflow-hidden bg-[#0D0D0D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading: Compact */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#C9A45C] uppercase block mb-1">
            The Golden Wizard Standard
          </span>
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-2">
            Why Clients <span className="gold-gradient-text italic font-normal">Choose Us</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5]">
            Dedicated hair stylists, certified products, and attention to detail on every visit.
          </p>
        </div>

        {/* 4 Feature Cards: 2-column mobile, 4-column desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {WHY_CHOOSE_US.map((item, idx) => {
            const Icon = iconMap[item.icon] || Sparkles;
            return (
              <div
                key={idx}
                className="group p-3.5 sm:p-5 rounded-xl border border-[#C9A45C]/20 hover:border-[#C9A45C]/50 bg-[#171717] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-[#C9A45C]/40 bg-[#111111] flex items-center justify-center text-[#C9A45C] mb-3">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  <h3 className="font-serif-elegant text-xs sm:text-base font-semibold mb-1 text-[#F5F1E8] group-hover:text-[#C9A45C] transition-colors leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-[11px] sm:text-xs font-light text-[#A5A5A5] leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[#A5A5A5]">
                  <span className="text-[#C9A45C] font-mono font-bold">0{idx + 1}</span>
                  <span className="uppercase tracking-wider">Quality Care</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
