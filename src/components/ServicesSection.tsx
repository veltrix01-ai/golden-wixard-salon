import React, { useState, useEffect } from 'react';
import { salonDb, ServiceRecord } from '../services/db';
import { getWhatsAppUrl } from '../data/salonData';
import { CrownIcon } from './CrownIcon';
import {
  MessageCircle,
  Calendar,
  Search,
  Sparkles,
  Scissors,
  Palette,
  HeartHandshake,
  Smile,
} from 'lucide-react';

interface ServicesSectionProps {
  onSelectServiceForBooking: (serviceName: string) => void;
  whatsappNumber?: string;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  onSelectServiceForBooking,
  whatsappNumber,
}) => {
  const [services, setServices] = useState<ServiceRecord[]>(salonDb.getServices());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setServices(salonDb.getServices());
    return salonDb.subscribe(() => {
      setServices(salonDb.getServices());
    });
  }, []);

  const categories = [
    {
      id: 'all',
      label: 'All Services',
      icon: Sparkles,
      count: services.length,
    },
    {
      id: 'hair',
      label: 'Hair Services',
      icon: Scissors,
      count: services.filter((s) => s.category === 'hair').length,
    },
    {
      id: 'treatments',
      label: 'Colour & Treatments',
      icon: Palette,
      count: services.filter((s) => s.category === 'treatments').length,
    },
    {
      id: 'bridal',
      label: 'Bridal & Makeup',
      icon: HeartHandshake,
      count: services.filter((s) => s.category === 'bridal').length,
    },
    {
      id: 'beauty',
      label: 'Beauty & Grooming',
      icon: Smile,
      count: services.filter((s) => s.category === 'beauty').length,
    },
  ];

  const filteredServices = services.filter((service) => {
    const matchesCategory =
      activeCategory === 'all' || service.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getWhatsAppServiceUrl = (service: ServiceRecord) => {
    const message = `Hello Golden Wizard Professional Salon, I would like to enquire about your "${service.name}" (${service.categoryLabel}) service. Please share details and available time slots.`;
    return getWhatsAppUrl(message, whatsappNumber);
  };

  const stylistConsultUrl = getWhatsAppUrl(
    'Hello Golden Wizard Salon, I would like to consult with a stylist about my hair and beauty needs.',
    whatsappNumber
  );

  return (
    <section
      id="services"
      className="py-16 md:py-24 relative bg-[#111111] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 mb-3">
            <CrownIcon className="w-4 h-4 text-[#C6A15B]" />
            <span className="text-xs font-semibold tracking-[0.25em] text-[#C6A15B] uppercase">
              Bespoke Hair &amp; Beauty
            </span>
            <CrownIcon className="w-4 h-4 text-[#C6A15B]" />
          </div>

          <h2 className="font-serif-elegant text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight text-[#F5F1E8]">
            Our Premium{' '}
            <span className="gold-gradient-text italic font-normal">Services</span>
          </h2>

          <div className="flex items-center justify-center gap-3 my-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#C6A15B]" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#C6A15B]" />
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#C6A15B]" />
          </div>

          <p className="text-sm sm:text-base font-light text-[#EAE2D5]/80">
            Explore our complete spectrum of professional styling, colouring craft, nourishing treatments, and salon grooming designed for both everyday elegance and special celebrations.
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-sm text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#C6A15B] text-[#111111] shadow-[0_2px_12px_rgba(198,161,91,0.3)] font-semibold'
                      : 'bg-[#1B1B1B] text-[#EAE2D5]/80 hover:text-[#F8F5EF] hover:bg-[#252525] border border-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-sm ${
                      isActive
                        ? 'bg-[#111111]/20 text-[#111111]'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services (e.g. Balayage, Keratin)..."
              className="w-full pl-9 pr-8 py-2 rounded-sm text-xs sm:text-sm focus:outline-none focus:border-[#C6A15B] transition-colors border bg-[#1B1B1B] border-white/10 text-[#F8F5EF] placeholder-white/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear service search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-16 rounded-sm border bg-[#171717] border-white/5">
            <p className="text-base mb-2 text-[#F5F1E8]">
              No services match &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="text-xs text-[#C6A15B] underline cursor-pointer"
            >
              Reset filters and view all services
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="group rounded-sm border transition-all duration-300 flex flex-col overflow-hidden hover:shadow-xl bg-[#181818] border-[#C6A15B]/20 hover:border-[#C6A15B]/60 shadow-black/60"
              >
                {/* Service Card Image */}
                <div className="relative h-52 sm:h-56 overflow-hidden bg-[#0B0B0B] border-b border-white/5">
                  <img
                    src={service.image}
                    alt={service.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain object-center"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#181818]/40 via-transparent to-transparent" />

                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 bg-[#111111]/90 text-[#D6B979] border border-[#C6A15B]/30 rounded-sm backdrop-blur-md">
                      {service.categoryLabel}
                    </span>
                  </div>

                  {/* Duration */}
                  {service.duration && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-black/75 text-white/80 rounded-sm">
                        {service.duration}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif-elegant text-xl font-semibold mb-2 group-hover:text-[#C6A15C] transition-colors text-[#F8F5EF]">
                      {service.name}
                    </h3>
                    <p className="text-xs sm:text-sm leading-relaxed font-light mb-5 text-[#EAE2D5]/75">
                      {service.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center gap-2.5">
                    {/* WhatsApp Enquiry Button */}
                    <a
                      href={getWhatsAppServiceUrl(service)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#C6A45C]/35 hover:border-[#C6A15B] text-[#D6B979] hover:text-[#F8F5EF] text-xs font-medium rounded-sm transition-all text-center"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#C6A15B]" />
                      <span>Enquire on WhatsApp</span>
                    </a>

                    {/* Book / Request Slot */}
                    <button
                      type="button"
                      onClick={() => onSelectServiceForBooking(service.name)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1 py-2.5 px-3 bg-[#C6A15B]/15 hover:bg-[#C6A15B] text-[#C6A15B] hover:text-[#111111] text-xs font-semibold rounded-sm transition-all cursor-pointer"
                      title="Select this service for appointment request"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Slot</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note about consulting */}
        <div className="mt-12 text-center p-6 border rounded-sm max-w-3xl mx-auto bg-[#161616] border-[#C6A15B]/20">
          <p className="text-xs sm:text-sm mb-3 text-[#EAE2D5]/90">
            Looking for a custom makeover, combination package, or specific consultation?
          </p>
          <a
            href={stylistConsultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-[#C6A15B] hover:text-[#D6B979] uppercase transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chat Directly with our Salon Stylists on WhatsApp →</span>
          </a>
        </div>
      </div>
    </section>
  );
};
