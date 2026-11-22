import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Search, HelpCircle, ChevronDown, Sparkles, MessageCircle, X } from 'lucide-react';
import { DEFAULT_FAQS, FAQItem, FAQ_CATEGORIES } from '../data/faqData';
import { buildWhatsAppUrl } from '../config/salonContact';
import { SALON_INFO } from '../data/salonData';

const FAQ_STORAGE_KEY = 'gw_faqs';

function loadFaqs(): FAQItem[] {
  try {
    const stored = localStorage.getItem(FAQ_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FAQItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_FAQS;
}

function updateFaqSchema(items: FAQItem[]) {
  try {
    const existing = document.getElementById('faq-json-ld');
    if (existing) existing.remove();
    if (items.length === 0) return;

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };

    const script = document.createElement('script');
    script.id = 'faq-json-ld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(faqSchema);
    document.head.appendChild(script);
  } catch {
    // non-critical
  }
}

export const PublicQASection: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [allFaqs, setAllFaqs] = useState<FAQItem[]>(() => loadFaqs());
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reload from localStorage if another tab updates it
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FAQ_STORAGE_KEY) {
        setAllFaqs(loadFaqs());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const publishedFaqs = useMemo(
    () => allFaqs.filter((f) => f.published),
    [allFaqs]
  );

  const filteredFaqs = useMemo(() => {
    let list = publishedFaqs;

    if (activeCategory !== 'All') {
      list = list.filter((f) => f.category === activeCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      );
    }

    return list;
  }, [publishedFaqs, activeCategory, searchQuery]);

  // Inject JSON-LD schema whenever displayed FAQs change
  useEffect(() => {
    updateFaqSchema(filteredFaqs);
    return () => {
      const existing = document.getElementById('faq-json-ld');
      if (existing) existing.remove();
    };
  }, [filteredFaqs]);

  // Open first item by default when results change
  useEffect(() => {
    setExpandedId(filteredFaqs.length > 0 ? filteredFaqs[0].id : null);
  }, [activeCategory, searchQuery]);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const usedCategories = useMemo(() => {
    const cats = new Set(publishedFaqs.map((f) => f.category));
    return FAQ_CATEGORIES.filter((c) => cats.has(c));
  }, [publishedFaqs]);

  const whatsAppUrl = buildWhatsAppUrl(
    `Hello Golden Wizard Salon! I have a question I couldn't find in your FAQ.`
  );

  return (
    <section
      id="faqs"
      className="py-10 md:py-16 relative border-t border-b border-white/5 bg-[#121212]"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#C9A45C] uppercase block mb-1">
            Salon Wisdom & FAQ
          </span>
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-2">
            Frequently Asked <span className="gold-gradient-text italic font-normal">Questions</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5]">
            Straightforward answers to the questions customers ask most before visiting{' '}
            {SALON_INFO.shortName}.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xl mx-auto mb-5">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g. colour, haircut, pricing, bridal)..."
            className={`w-full pl-10 pr-10 py-3 rounded-lg text-xs sm:text-sm border focus:outline-none transition-colors shadow-sm ${
              isLight
                ? 'bg-white border-[#E8E1D5] text-[#24211C] placeholder-[#8F887D] focus:border-[#A9823D]'
                : 'bg-[#1C1C1C] border-white/10 text-[#F5F1E8] placeholder-white/40 focus:border-[#C9A45C]'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border transition-all cursor-pointer ${
              activeCategory === 'All'
                ? 'bg-[#C9A45C] text-[#0D0D0D] border-[#C9A45C]'
                : isLight
                ? 'border-[#E8E1D5] text-[#4A453F] hover:border-[#C9A45C]'
                : 'border-white/15 text-[#A5A5A5] hover:border-[#C9A45C] hover:text-white'
            }`}
          >
            All
          </button>
          {usedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#C9A45C] text-[#0D0D0D] border-[#C9A45C]'
                  : isLight
                  ? 'border-[#E8E1D5] text-[#4A453F] hover:border-[#C9A45C]'
                  : 'border-white/15 text-[#A5A5A5] hover:border-[#C9A45C] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredFaqs.length === 0 && (
          <div
            className={`text-center py-16 px-6 rounded-xl border max-w-xl mx-auto ${
              isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#181818] border-[#C9A45C]/25'
            }`}
          >
            <HelpCircle className="w-12 h-12 text-[#C9A45C]/60 mx-auto mb-3" />
            <h3 className="font-serif-elegant text-xl font-bold mb-2 text-[#F5F1E8]">
              No matching questions
            </h3>
            <p className={`text-xs sm:text-sm max-w-md mx-auto mb-6 ${
              isLight ? 'text-[#716B61]' : 'text-[#A5A5A5]'
            }`}>
              {searchQuery
                ? `Nothing matched "${searchQuery}". Try a different word or ask us directly on WhatsApp.`
                : 'No FAQs are published in this category yet.'}
            </p>
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                isLight
                  ? 'bg-[#A9823D] text-white hover:bg-[#967232]'
                  : 'bg-[#C9A45C] text-[#0D0D0D] hover:bg-[#D6B979]'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Ask on WhatsApp</span>
            </a>
          </div>
        )}

        {/* FAQ Accordion */}
        {filteredFaqs.length > 0 && (
          <div className="space-y-3">
            {filteredFaqs.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isLight
                      ? 'bg-white border-[#E8E1D5] shadow-sm'
                      : 'bg-[#181818] border-[#C9A45C]/20'
                  } ${isExpanded ? (isLight ? 'border-[#A9823D]' : 'border-[#C9A45C]/60') : ''}`}
                >
                  {/* Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.id)}
                    className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer focus:outline-none"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-7 h-7 rounded-lg bg-[#C9A45C]/15 border border-[#C9A45C]/40 flex items-center justify-center shrink-0 mt-0.5 text-[#C9A45C] font-bold text-xs">
                        Q
                      </div>
                      <div>
                        <span
                          className={`block text-[10px] font-semibold uppercase tracking-widest mb-1 ${
                            isLight ? 'text-[#A9823D]' : 'text-[#C9A45C]/70'
                          }`}
                        >
                          {item.category}
                        </span>
                        <h3
                          className={`font-serif-elegant text-base sm:text-lg font-bold leading-snug transition-colors ${
                            isExpanded
                              ? 'text-[#C9A45C]'
                              : isLight
                              ? 'text-[#24211C]'
                              : 'text-[#F5F1E8]'
                          }`}
                        >
                          {item.question}
                        </h3>
                      </div>
                    </div>

                    <div
                      className={`p-1.5 rounded-lg border transition-transform duration-200 shrink-0 ${
                        isExpanded
                          ? 'bg-[#C9A45C] text-[#0D0D0D] border-[#C9A45C] rotate-180'
                          : 'border-black/10 dark:border-white/10 opacity-60'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div
                      className={`px-5 pb-6 sm:px-6 sm:pb-6 pt-2 border-t flex items-start gap-3.5 ${
                        isLight ? 'border-[#E8E1D5] bg-[#F9F7F2]' : 'border-white/5 bg-[#141414]'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#111111] border border-[#C9A45C] flex items-center justify-center shrink-0 mt-0.5 text-[#C9A45C] font-bold text-xs">
                        A
                      </div>
                      <div className="flex-1">
                        <div className="text-[11px] uppercase tracking-wider text-[#C9A45C] font-bold mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Golden Wizard Advice</span>
                        </div>
                        <p
                          className={`text-xs sm:text-sm leading-relaxed font-light ${
                            isLight ? 'text-[#24211C]' : 'text-[#F5F1E8]'
                          }`}
                        >
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Ask on WhatsApp CTA */}
        {filteredFaqs.length > 0 && (
          <div className="pt-8 flex items-center justify-center">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#C9A45C]/35 bg-[#181818] hover:border-[#C9A45C] text-xs font-semibold tracking-wider uppercase text-[#E3C78D] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#C9A45C]" />
              <span>Didn't find your answer? Ask us on WhatsApp</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
};
