import React from 'react';
import { Sparkles, ShieldCheck, HeartHandshake, Award } from 'lucide-react';

export const About: React.FC = () => {
  const highlights = [
    {
      title: 'Hygienic Ambience',
      desc: 'Spotless, air-conditioned salon with sanitized tools for each client.',
      icon: Sparkles,
    },
    {
      title: 'Certified Stylists',
      desc: 'Creative Director Ravikanth trained at Jawed Habib Academy in modern hair & beauty craft.',
      icon: Award,
    },
    {
      title: 'Quality Products',
      desc: 'Authentic formulas for long-lasting hair health and radiant finish.',
      icon: ShieldCheck,
    },
    {
      title: 'Personalized Care',
      desc: 'One-on-one consultation before every haircut, colour, or treatment.',
      icon: HeartHandshake,
    },
  ];

  return (
    <section
      id="about"
      className="py-10 md:py-16 relative overflow-hidden border-t border-b border-white/5 bg-[#121212]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Short & Concise Salon Introduction */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#C9A45C] uppercase block mb-1">
            About Golden Wizard
          </span>
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-3">
            Personalized Craft & <span className="gold-gradient-text italic font-normal">Care</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5] leading-relaxed">
            Located at Gandi Maisamma X Road and Dommara Pochampally in Hyderabad, <strong className="font-medium text-[#F5F1E8]">Golden Wizard Professional Salon</strong> offers specialized haircuts, bespoke colouring, keratin reconditioning, and bridal beauty tailored to your individual style.
          </p>
        </div>

        {/* Genuine Branch 1 Wide Interior & Team Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-8">
          <figure className="rounded-xl overflow-hidden border border-[#C9A45C]/30 bg-[#0D0D0D] shadow-lg">
            <div className="aspect-[16/7] w-full overflow-hidden bg-[#0D0D0D]">
              <img
                src="/assets/salon/golden-wizard-branch1-interior-stations.png"
                alt="Golden Wizard Branch 1 interior styling stations, wooden mirrors, wash chair, and waiting sofa"
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
            <figcaption className="px-3.5 py-2.5 border-t border-white/5 flex items-center justify-between text-[11px] sm:text-xs">
              <span className="font-medium text-[#F5F1E8]">
                Styling Stations, Wash Bay &amp; Lounge
              </span>
              <span className="text-[#C9A45C] uppercase tracking-wider text-[10px] font-semibold">
                Branch 01 Interior
              </span>
            </figcaption>
          </figure>

          <figure className="rounded-xl overflow-hidden border border-[#C9A45C]/30 bg-[#0D0D0D] shadow-lg">
            <div className="aspect-[16/7] w-full overflow-hidden bg-[#0D0D0D]">
              <img
                src="/assets/salon/golden-wizard-branch1-team-styling.png"
                alt="Golden Wizard salon stylists attending clients inside the Gandi Maisamma branch"
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
            <figcaption className="px-3.5 py-2.5 border-t border-white/5 flex items-center justify-between text-[11px] sm:text-xs">
              <span className="font-medium text-[#F5F1E8]">
                Salon Professionals &amp; Client Care
              </span>
              <span className="text-[#C9A45C] uppercase tracking-wider text-[10px] font-semibold">
                Branch 01 Team
              </span>
            </figcaption>
          </figure>
        </div>

        {/* 4 Compact Feature Badges (2-col mobile, 4-col desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="p-3.5 sm:p-4 rounded-xl border border-[#C9A45C]/15 bg-[#181818] flex flex-col justify-between hover:border-[#C9A45C]/40 transition-colors"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-[#111111] border border-[#C9A45C]/35 flex items-center justify-center text-[#C9A45C] mb-2.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif-elegant text-xs sm:text-sm font-semibold text-[#F5F1E8] mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#A5A5A5] leading-normal font-light">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
