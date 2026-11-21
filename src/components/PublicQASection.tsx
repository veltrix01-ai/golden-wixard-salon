import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Search, HelpCircle, Calendar, ChevronLeft, ChevronRight, ChevronDown, Sparkles, RefreshCw, AlertCircle, X } from 'lucide-react';

export interface PublicQuestionItem {
  id: string;
  question: string;
  asker_name?: string | null;
  answer?: string | null;
  answered_at?: string | null;
}

interface PublicQAResponse {
  questions: PublicQuestionItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export const PublicQASection: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [questions, setQuestions] = useState<PublicQuestionItem[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch answered questions from server
  const fetchQuestions = async (page: number, query: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        q: query,
      });

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: PublicQAResponse = await res.json();
      setQuestions(data.questions || []);
      setTotalQuestions(data.total || 0);
      setTotalPages(data.totalPages || 1);

      updateFaqSchema(data.questions || []);
    } catch (err) {
      console.error('Failed to load published questions:', err);
      setErrorMessage('Could not load answered questions at this time. Please try refreshing.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions(currentPage, debouncedQuery);
  }, [currentPage, debouncedQuery]);

  // Dynamic JSON-LD FAQPage Schema
  const updateFaqSchema = (items: PublicQuestionItem[]) => {
    try {
      const existingScript = document.getElementById('faq-json-ld');
      if (existingScript) existingScript.remove();
      if (items.length === 0) return;

      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items
          .filter((item) => item.answer)
          .map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer || '',
            },
          })),
      };

      const script = document.createElement('script');
      script.id = 'faq-json-ld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(faqSchema);
      document.head.appendChild(script);
    } catch (e) {
      console.warn('Failed to inject FAQ JSON-LD', e);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Recently Answered';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  // Accordion state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleAccordion = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (questions.length > 0) {
      setExpandedIds(new Set([questions[0].id]));
    }
  }, [questions]);

  return (
    <section
      id="faqs"
      className="py-10 md:py-16 relative border-t border-b border-white/5 bg-[#121212]"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading: Compact */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#C9A45C] uppercase block mb-1">
            Salon Wisdom & FAQ
          </span>
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-2">
            Frequently Asked <span className="gold-gradient-text italic font-normal">Questions</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5]">
            Verified answers published by salon stylists regarding haircuts, balayage, keratin care, and bookings.
          </p>
        </div>

        {/* Live Search Input */}
        <div className="relative max-w-xl mx-auto mb-10">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search answered questions (e.g. balayage, keratin, facial, haircut)..."
            className={`w-full pl-10 pr-10 py-3 rounded-lg text-xs sm:text-sm border focus:outline-none transition-colors shadow-sm ${
              isLight
                ? 'bg-white border-[#E8E1D5] text-[#24211C] placeholder-[#8F887D] focus:border-[#A9823D]'
                : 'bg-[#1C1C1C] border-white/10 text-[#F5F1E8] placeholder-white/40 focus:border-[#C9A45C]'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between mb-8 max-w-xl mx-auto">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => fetchQuestions(currentPage, debouncedQuery)}
              className="underline hover:opacity-80 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`p-6 rounded-xl border animate-pulse space-y-3 ${
                  isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#181818] border-white/5'
                }`}
              >
                <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-1/4" />
                <div className="h-14 bg-black/5 dark:bg-white/5 rounded w-full mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && questions.length === 0 && (
          <div
            className={`text-center py-16 px-6 rounded-xl border max-w-xl mx-auto ${
              isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#181818] border-[#C9A45C]/25'
            }`}
          >
            <HelpCircle className="w-12 h-12 text-[#C9A45C]/60 mx-auto mb-3" />
            <h3 className="font-serif-elegant text-xl font-bold mb-2">
              No Published Answers Yet
            </h3>
            <p className={`text-xs sm:text-sm max-w-md mx-auto mb-6 ${
              isLight ? 'text-[#716B61]' : 'text-[#A5A5A5]'
            }`}>
              {searchQuery
                ? `No published answers match "${searchQuery}". Clear your search query or submit a question below.`
                : 'Have a styling or treatment query? Ask our stylists and owner below. Every verified answer is published here.'}
            </p>
            <a
              href="#ask-question-form"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                isLight ? 'bg-[#A9823D] text-white hover:bg-[#967232]' : 'bg-[#C9A45C] text-[#0D0D0D] hover:bg-[#D6B979]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask a Question</span>
            </a>
          </div>
        )}

        {/* Questions and Answers Accordion Layout */}
        {!isLoading && !errorMessage && questions.length > 0 && (
          <div className="space-y-4">
            {questions.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isLight
                      ? 'bg-white border-[#E8E1D5] shadow-sm'
                      : 'bg-[#181818] border-[#C9A45C]/25'
                  } ${isExpanded ? 'border-[#C9A45C]' : ''}`}
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
                        <h3 className={`font-serif-elegant text-base sm:text-lg font-bold leading-snug transition-colors ${
                          isExpanded ? 'text-[#C9A45C]' : isLight ? 'text-[#24211C]' : 'text-[#F5F1E8]'
                        }`}>
                          {item.question}
                        </h3>
                        <div className="text-[11px] opacity-60 mt-1 flex items-center gap-2">
                          <span>Asked by {item.asker_name ? item.asker_name : 'Customer'}</span>
                          {item.answered_at && (
                            <>
                              <span>-</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#C9A45C]" />
                                {formatDate(item.answered_at)}
                              </span>
                            </>
                          )}
                        </div>
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

                  {/* Accordion Content (Answer) */}
                  {isExpanded && item.answer && (
                    <div
                      className={`px-5 pb-6 sm:px-6 sm:pb-6 pt-2 border-t flex items-start gap-3.5 animate-fade-in ${
                        isLight ? 'border-[#E8E1D5] bg-[#F9F7F2]' : 'border-white/5 bg-[#141414]'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#111111] border border-[#C9A45C] flex items-center justify-center shrink-0 mt-0.5 text-[#C9A45C] shadow-sm font-bold text-xs">
                        A
                      </div>
                      <div className="flex-1">
                        <div className="text-[11px] uppercase tracking-wider text-[#C9A45C] font-bold mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Golden Wizard Verified Advice</span>
                        </div>
                        <div className={`text-xs sm:text-sm leading-relaxed font-light ${
                          isLight ? 'text-[#24211C]' : 'text-[#F5F1E8]'
                        }`}>
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-6 flex items-center justify-between border-t border-black/10 dark:border-white/10 text-xs">
                <span className="opacity-60">
                  Showing page <strong className="text-[#C9A45C]">{currentPage}</strong> of{' '}
                  <strong className="text-[#C9A45C]">{totalPages}</strong> ({totalQuestions} total questions)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-lg border border-black/10 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#C9A45C] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-lg border border-black/10 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#C9A45C] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            {/* Ask Question CTA link below FAQ */}
            <div className="pt-4 flex items-center justify-center">
              <a
                href="#ask-question-form"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById('ask-question-form');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#C9A45C]/35 bg-[#181818] hover:border-[#C9A45C] text-xs font-semibold tracking-wider uppercase text-[#E3C78D] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C9A45C]" />
                <span>Have a Question? Ask Our Hairstylist</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
