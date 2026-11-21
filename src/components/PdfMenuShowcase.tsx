import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BounceCards, { BounceCardObject } from './BounceCards';
import { acquireBodyScrollLock } from '../utils/scrollLock';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

interface PdfMenuPage {
  pageNumber: number;
  title: string;
  subtitle: string;
  previewUrl: string;
  fullUrl: string;
}

const PDF_MENU_PAGES: PdfMenuPage[] = [
  {
    pageNumber: 1,
    title: 'Waxing Menu',
    subtitle: 'Full Arms, Legs, Face Wax, Full Body & Care',
    previewUrl: '/assets/menu-pages/preview/page-1.jpg',
    fullUrl: '/assets/menu-pages/full/page-1.jpg',
  },
  {
    pageNumber: 2,
    title: 'Facial & International Facial',
    subtitle: 'Clean Up, Gold, Diamond, Pearl, Whitening & International Facials',
    previewUrl: '/assets/menu-pages/preview/page-2.jpg',
    fullUrl: '/assets/menu-pages/full/page-2.jpg',
  },
  {
    pageNumber: 3,
    title: 'Pedicure, Manicure & Threading',
    subtitle: 'Regular, Aroma, French, Spa, Crystal & Precision Threading',
    previewUrl: '/assets/menu-pages/preview/page-3.jpg',
    fullUrl: '/assets/menu-pages/full/page-3.jpg',
  },
  {
    pageNumber: 4,
    title: 'Makeup, Piercing & Nail Art',
    subtitle: 'Party, Light & Bridal Makeup, Ear & Nose Piercing, Nail Art',
    previewUrl: '/assets/menu-pages/preview/page-4.jpg',
    fullUrl: '/assets/menu-pages/full/page-4.jpg',
  },
  {
    pageNumber: 5,
    title: 'Women Hair Style & Colors',
    subtitle: 'Styling, Blow Dry, Head Massage, Global Color, Fashion & Streaking',
    previewUrl: '/assets/menu-pages/preview/page-5.jpg',
    fullUrl: '/assets/menu-pages/full/page-5.jpg',
  },
  {
    pageNumber: 6,
    title: 'Straightening, Hair Spa & De-Tan',
    subtitle: 'Smoothing, Rebounding, Perming, Scalp Spa & Full Body De-Tan',
    previewUrl: '/assets/menu-pages/preview/page-6.jpg',
    fullUrl: '/assets/menu-pages/full/page-6.jpg',
  },
  {
    pageNumber: 7,
    title: 'Creative Director & Academy',
    subtitle: 'Golden Wizard Professional Salon — Ravikanth, Trained by Jawed Habib Academy',
    previewUrl: '/assets/menu-pages/preview/page-7.jpg',
    fullUrl: '/assets/menu-pages/full/page-7.jpg',
  },
];

const ZOOM_STEPS = [1, 1.5, 2, 2.5] as const;

export const PdfMenuShowcase: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [modalPageIndex, setModalPageIndex] = useState<number | null>(null);
  const [zoomIdx, setZoomIdx] = useState<number>(0);
  const [isHoveringStage, setIsHoveringStage] = useState<boolean>(false);
  const [isDraggingCards, setIsDraggingCards] = useState<boolean>(false);
  const [fullImageLoaded, setFullImageLoaded] = useState<boolean>(false);
  const pauseUntilRef = useRef<number>(0);

  const totalPages = PDF_MENU_PAGES.length;
  const currentZoom = ZOOM_STEPS[zoomIdx];

  const pauseAutoRotate = useCallback((ms = 7500) => {
    pauseUntilRef.current = Date.now() + ms;
  }, []);

  const selectCenterIndex = useCallback(
    (index: number) => {
      const normalized = ((index % totalPages) + totalPages) % totalPages;
      pauseAutoRotate();
      setActiveIndex(normalized);
    },
    [totalPages, pauseAutoRotate]
  );

  const goNextCard = useCallback(() => {
    pauseAutoRotate();
    setActiveIndex((prev) => (prev + 1) % totalPages);
  }, [totalPages, pauseAutoRotate]);

  const goPrevCard = useCallback(() => {
    pauseAutoRotate();
    setActiveIndex((prev) => (prev - 1 + totalPages) % totalPages);
  }, [totalPages, pauseAutoRotate]);

  // Subtle ambient rotation only when idle (pauses on drag, hover, click, or open modal)
  useEffect(() => {
    if (modalPageIndex !== null || isDraggingCards) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      if (isHoveringStage || isDraggingCards || Date.now() < pauseUntilRef.current) return;
      setActiveIndex((prev) => (prev + 1) % totalPages);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [modalPageIndex, isHoveringStage, isDraggingCards, totalPages]);

  const openModalPage = useCallback(
    (index: number) => {
      const normalized = ((index % totalPages) + totalPages) % totalPages;
      pauseAutoRotate();
      setActiveIndex(normalized);
      setZoomIdx(0);
      setFullImageLoaded(false);
      setModalPageIndex(normalized);
    },
    [totalPages, pauseAutoRotate]
  );

  const handleCardClick = useCallback(
    (index: number) => {
      pauseAutoRotate();
      if (index !== activeIndex) {
        // Side card: smoothly bring it to the center first
        setActiveIndex(index);
      } else {
        // Center card: open the full-resolution original PDF page viewer
        openModalPage(index);
      }
    },
    [activeIndex, pauseAutoRotate, openModalPage]
  );

  const closeModal = useCallback(() => {
    setModalPageIndex(null);
    setZoomIdx(0);
  }, []);

  const goModalPrev = useCallback(() => {
    setModalPageIndex((prev) => {
      if (prev === null) return null;
      const next = (prev - 1 + totalPages) % totalPages;
      setActiveIndex(next);
      setZoomIdx(0);
      setFullImageLoaded(false);
      return next;
    });
  }, [totalPages]);

  const goModalNext = useCallback(() => {
    setModalPageIndex((prev) => {
      if (prev === null) return null;
      const next = (prev + 1) % totalPages;
      setActiveIndex(next);
      setZoomIdx(0);
      setFullImageLoaded(false);
      return next;
    });
  }, [totalPages]);

  // Reference-counted body scroll lock + Escape / Arrow keys when PDF viewer is open
  useEffect(() => {
    if (modalPageIndex === null) return;
    const releaseLock = acquireBodyScrollLock();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goModalNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goModalPrev();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      releaseLock();
      window.removeEventListener('keydown', handleKey);
    };
  }, [modalPageIndex, closeModal, goModalNext, goModalPrev]);

  // Preload adjacent full-resolution pages when modal is open
  useEffect(() => {
    if (modalPageIndex === null) return;
    const prevIdx = (modalPageIndex - 1 + totalPages) % totalPages;
    const nextIdx = (modalPageIndex + 1) % totalPages;
    [prevIdx, nextIdx].forEach((idx) => {
      const img = new Image();
      img.src = PDF_MENU_PAGES[idx].fullUrl;
    });
  }, [modalPageIndex, totalPages]);

  const bounceCardItems = useMemo<BounceCardObject[]>(() => {
    return PDF_MENU_PAGES.map((page) => ({
      id: `pdf-page-${page.pageNumber}`,
      src: page.previewUrl,
      alt: `Golden Wizard Salon Original Menu Page ${page.pageNumber}: ${page.title}`,
      label: page.title,
      countLabel: `Page ${page.pageNumber} of ${totalPages}`,
    }));
  }, [totalPages]);

  const activePage = PDF_MENU_PAGES[activeIndex] || PDF_MENU_PAGES[0];
  const modalPage =
    modalPageIndex !== null ? PDF_MENU_PAGES[modalPageIndex] : null;

  const handleShowcaseKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (modalPageIndex !== null) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNextCard();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrevCard();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModalPage(activeIndex);
    }
  };

  return (
    <section
      id="menu"
      className="py-12 md:py-20 relative border-t border-white/5 bg-[#0A0A0A] overflow-x-clip"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading matching Golden Wizard black-and-gold visual design */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-3 mb-2.5">
            <span className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#C9A45C]" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-[#C9A45C] uppercase">
              Official 7-Page Menu Booklet
            </span>
            <span className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#C9A45C]" />
          </div>

          <h2 className="font-serif-elegant text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F5F1E8] leading-[1.12] mb-2.5">
            Official Salon{' '}
            <span className="gold-gradient-text italic font-normal">Price Menu</span>
          </h2>

          <p className="text-xs sm:text-sm md:text-base font-light text-[#A5A5A5] max-w-lg mx-auto leading-relaxed">
            Drag, swipe, or use the arrows to flip through all 7 pages of our original Golden Wizard printed menu. Tap any center card to read full prices.
          </p>
        </div>

        {/* Overlapping Golden-Bordered PDF Cards Showcase */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Official 7-page Golden Wizard Salon PDF Menu Showcase"
          onKeyDown={handleShowcaseKeyDown}
          onMouseEnter={() => setIsHoveringStage(true)}
          onMouseLeave={() => setIsHoveringStage(false)}
          className="relative rounded-3xl border border-[#C9A45C]/30 bg-gradient-to-b from-[#141414] via-[#101010] to-[#0B0B0B] px-2 py-6 sm:px-8 sm:py-9 shadow-2xl overflow-hidden focus:outline-none focus:ring-1 focus:ring-[#C9A45C]/50"
        >
          {/* Ambient golden spotlight behind center PDF card */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#C9A45C]/12 blur-3xl"
          />

          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={goPrevCard}
              aria-label="Previous PDF menu page"
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-[#C9A45C]/40 bg-[#161616]/90 hover:bg-[#C9A45C] text-[#E3C78D] hover:text-[#0D0D0D] transition-all cursor-pointer z-50 shrink-0 shadow-lg mr-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0 flex justify-center">
              <BounceCards
                images={bounceCardItems}
                containerWidth={860}
                containerHeight={390}
                cardSize={232}
                cardAspect={1.414}
                spread={144}
                rotation={8.5}
                arc={14}
                hoverScale={1.08}
                bounciness={0.56}
                animationDelay={0.1}
                animationStagger={0.04}
                borderWidth={2.5}
                borderColor="rgba(201, 164, 92, 0.72)"
                radius={18}
                shadow
                enableHover
                activeIndex={activeIndex}
                imageFit="contain"
                showOverlay={false}
                onCardClick={(idx) => handleCardClick(idx)}
                onSelectIndex={selectCenterIndex}
                onSwipeNext={goNextCard}
                onSwipePrev={goPrevCard}
                onDragStateChange={(dragging) => {
                  setIsDraggingCards(dragging);
                  if (dragging) pauseAutoRotate();
                }}
              />
            </div>

            <button
              type="button"
              onClick={goNextCard}
              aria-label="Next PDF menu page"
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-[#C9A45C]/40 bg-[#161616]/90 hover:bg-[#C9A45C] text-[#E3C78D] hover:text-[#0D0D0D] transition-all cursor-pointer z-50 shrink-0 shadow-lg ml-2"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Active PDF Page Indicator & Navigation Bar */}
          <div className="relative z-10 mt-5 text-center px-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C9A45C]/30 bg-[#171717] text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-[#E3C78D] mb-2">
              <span>
                Page {activePage.pageNumber} of {totalPages}
              </span>
            </div>

            <p className="font-serif-elegant text-lg sm:text-xl font-bold text-[#F5F1E8]">
              {activePage.title}
            </p>
            <p className="text-xs sm:text-sm font-light text-[#A5A5A5] mt-0.5 max-w-lg mx-auto">
              {activePage.subtitle}
            </p>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => openModalPage(activeIndex)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-[#C9A45C]/45 bg-[#181818] hover:bg-[#C9A45C] text-[#E3C78D] hover:text-[#0D0D0D] transition-colors cursor-pointer shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open Full Page {activePage.pageNumber}</span>
              </button>
            </div>

            {/* 7-Page Dot Navigation + Mobile Arrows */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={goPrevCard}
                aria-label="Previous PDF menu page"
                className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full border border-[#C9A45C]/35 bg-[#181818] text-[#E3C78D] active:scale-95 transition-transform cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5">
                {PDF_MENU_PAGES.map((page, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={page.pageNumber}
                      type="button"
                      onClick={() => selectCenterIndex(idx)}
                      aria-label={`Select Page ${page.pageNumber}: ${page.title}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'w-7 bg-[#E3C78D]'
                          : 'w-2 bg-white/25 hover:bg-[#C9A45C]/70'
                      }`}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={goNextCard}
                aria-label="Next PDF menu page"
                className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full border border-[#C9A45C]/35 bg-[#181818] text-[#E3C78D] active:scale-95 transition-transform cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* High-Resolution Full-Size PDF Page Modal mounted via Portal above page content */}
      {modalPage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Golden Wizard Menu Page ${modalPage.pageNumber}: ${modalPage.title}`}
            onClick={closeModal}
            className="fixed inset-0 z-[100] bg-black/94 backdrop-blur-md flex flex-col"
          >
            {/* Modal Top Toolbar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-2.5 sm:px-6 sm:py-3 bg-[#141414]/98 border-b border-[#C9A45C]/30 flex items-center justify-between gap-2 shrink-0"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A45C] block">
                  Page {modalPage.pageNumber} of {totalPages}
                </span>
                <h3 className="font-serif-elegant text-sm sm:text-lg font-bold text-[#F5F1E8] truncate">
                  {modalPage.title}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}
                  disabled={zoomIdx === 0}
                  aria-label="Zoom out"
                  className="p-2 rounded-lg border border-white/15 bg-[#1C1C1C] text-[#F5F1E8] hover:border-[#C9A45C] disabled:opacity-40 cursor-pointer disabled:cursor-default"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="text-[11px] font-mono text-[#E3C78D] min-w-[42px] text-center">
                  {Math.round(currentZoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setZoomIdx((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))
                  }
                  disabled={zoomIdx === ZOOM_STEPS.length - 1}
                  aria-label="Zoom in"
                  className="p-2 rounded-lg border border-white/15 bg-[#1C1C1C] text-[#F5F1E8] hover:border-[#C9A45C] disabled:opacity-40 cursor-pointer disabled:cursor-default"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {zoomIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => setZoomIdx(0)}
                    aria-label="Reset zoom"
                    className="hidden sm:inline-flex p-2 rounded-lg border border-white/15 bg-[#1C1C1C] text-[#E3C78D] hover:border-[#C9A45C] cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close full-size PDF page view"
                  className="ml-1 p-2 rounded-lg border border-[#C9A45C]/45 bg-[#1C1C1C] text-white hover:bg-[#C9A45C] hover:text-[#0D0D0D] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable High-Resolution Image Viewport (Preserves Full Aspect Ratio) */}
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) closeModal();
              }}
              className="flex-1 overflow-auto relative flex p-3 sm:p-6"
            >
              {/* Previous Page Modal Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goModalPrev();
                }}
                aria-label="Previous menu page"
                className="fixed left-2 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#161616]/95 hover:bg-[#C9A45C] border border-[#C9A45C]/45 text-[#E3C78D] hover:text-[#0D0D0D] flex items-center justify-center transition-all cursor-pointer z-20 shadow-xl"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div
                onClick={(e) => e.stopPropagation()}
                className={`relative m-auto flex items-center justify-center ${
                  zoomIdx === 0 ? 'max-w-full' : ''
                }`}
              >
                {!fullImageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full border-2 border-[#C9A45C] border-t-transparent animate-spin" />
                  </div>
                )}
                <img
                  src={modalPage.fullUrl}
                  alt={`Golden Wizard Salon Original Menu Page ${modalPage.pageNumber}: ${modalPage.title}`}
                  onLoad={() => setFullImageLoaded(true)}
                  onClick={() =>
                    setZoomIdx((z) => (z === 0 ? 1 : 0))
                  }
                  style={{
                    width:
                      zoomIdx === 0
                        ? 'auto'
                        : `${Math.round(currentZoom * 720)}px`,
                    maxWidth: zoomIdx === 0 ? '92vw' : 'none',
                    maxHeight: zoomIdx === 0 ? '76vh' : 'none',
                  }}
                  className={`object-contain rounded-xl border-2 border-[#C9A45C]/60 shadow-2xl bg-black transition-opacity duration-200 ${
                    zoomIdx === 0 ? 'cursor-zoom-in' : 'cursor-zoom-out'
                  } ${fullImageLoaded ? 'opacity-100' : 'opacity-80'}`}
                  draggable={false}
                />
              </div>

              {/* Next Page Modal Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goModalNext();
                }}
                aria-label="Next menu page"
                className="fixed right-2 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#161616]/95 hover:bg-[#C9A45C] border border-[#C9A45C]/45 text-[#E3C78D] hover:text-[#0D0D0D] flex items-center justify-center transition-all cursor-pointer z-20 shadow-xl"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Bottom Page Selector Bar (Pages 1-7) */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-2.5 bg-[#141414]/98 border-t border-white/10 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap shrink-0"
            >
              {PDF_MENU_PAGES.map((page, idx) => {
                const isCurrent = idx === modalPageIndex;
                return (
                  <button
                    key={page.pageNumber}
                    type="button"
                    onClick={() => openModalPage(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#C9A45C] text-[#0D0D0D] font-bold'
                        : 'bg-[#1D1D1D] text-[#A5A5A5] hover:text-[#F5F1E8] border border-white/10'
                    }`}
                  >
                    Page {page.pageNumber}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
