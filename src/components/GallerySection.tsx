import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { salonDb, GalleryRecord } from '../services/db';
import { acquireBodyScrollLock } from '../utils/scrollLock';
import { CrownIcon } from './CrownIcon';
import { X, ChevronLeft, ChevronRight, Eye, Grid } from 'lucide-react';

export const GallerySection: React.FC = () => {
  const [galleryItems, setGalleryItems] = useState<GalleryRecord[]>(salonDb.getGallery());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState<boolean>(false);
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    setGalleryItems(salonDb.getGallery());
    return salonDb.subscribe(() => {
      setGalleryItems(salonDb.getGallery());
    });
  }, []);

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'salon', label: 'Salon & Interior' },
    { id: 'haircuts', label: 'Hair Styling' },
    { id: 'colour', label: 'Hair Colour' },
    { id: 'treatments', label: 'Hair Services' },
  ];

  const filteredItems = galleryItems.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'treatments') {
      return item.category === 'treatments' || item.category === 'bridal';
    }
    return item.category === activeFilter;
  });

  const INITIAL_VISIBLE_COUNT = 8;
  const isCapped = !showAllPhotos && filteredItems.length > INITIAL_VISIBLE_COUNT;
  const displayedItems = isCapped
    ? filteredItems.slice(0, INITIAL_VISIBLE_COUNT)
    : filteredItems;

  useEffect(() => {
    if (selectedImageIndex === null) return undefined;
    return acquireBodyScrollLock();
  }, [selectedImageIndex]);

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  const goToNext = useCallback(() => {
    setSelectedImageIndex((prev) =>
      prev === null || filteredItems.length === 0 ? prev : (prev + 1) % filteredItems.length
    );
  }, [filteredItems.length]);

  const goToPrev = useCallback(() => {
    setSelectedImageIndex((prev) =>
      prev === null || filteredItems.length === 0
        ? prev
        : (prev - 1 + filteredItems.length) % filteredItems.length
    );
  }, [filteredItems.length]);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToNext();
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToPrev();
  };

  useEffect(() => {
    if (selectedImageIndex === null) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, closeLightbox, goToNext, goToPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  return (
    <section
      id="gallery"
      className="py-12 md:py-16 relative border-t border-b border-white/5 bg-[#121212]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-2">
            Our <span className="gold-gradient-text italic font-normal">Gallery</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5]">
            Authentic photographs of Golden Wizard Branch 01 and real salon work — click any photo to enlarge.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveFilter(tab.id);
                  setShowAllPhotos(false);
                  setSelectedImageIndex(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#C9A45C] text-[#0D0D0D] shadow-sm'
                    : 'bg-[#1C1C1C] text-[#A5A5A5] hover:text-white border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Natural-Aspect Responsive Masonry Grid (preserves exact original photo ratios without cropping) */}
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
          {displayedItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openLightbox(index)}
              className="group relative w-full text-left break-inside-avoid rounded-lg sm:rounded-xl overflow-hidden cursor-pointer border border-[#C9A45C]/25 hover:border-[#C9A45C] bg-[#0B0B0B] transition-colors block"
            >
              {failedIds[item.id] ? (
                <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-2 bg-[#161616] text-[#C9A45C]">
                  <CrownIcon className="w-8 h-8 opacity-80" />
                  <span className="text-[10px] uppercase tracking-widest text-[#E3C78D]">
                    Golden Wizard
                  </span>
                </div>
              ) : (
                <div className="relative bg-[#0B0B0B]">
                  <img
                    src={item.image}
                    alt={item.alt}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedIds((prev) => ({ ...prev, [item.id]: true }))}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                  <span className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-black/75 border border-[#C9A45C]/40 rounded-full text-[#C9A45C]">
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}

              {/* Clean black-and-gold caption footer below image */}
              <div className="px-2.5 sm:px-3 py-2 sm:py-2.5 bg-[#151515] border-t border-[#C9A45C]/15">
                <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-[#C9A45C] block leading-tight">
                  {item.categoryLabel}
                </span>
                <h3 className="font-serif-elegant text-xs sm:text-sm font-semibold text-[#F5F1E8] line-clamp-1 mt-0.5">
                  {item.title}
                </h3>
              </div>
            </button>
          ))}
        </div>

        {/* View All Photos Option (only shown if items exceed 8) */}
        {filteredItems.length > INITIAL_VISIBLE_COUNT && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowAllPhotos(!showAllPhotos)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border border-[#C9A45C]/40 hover:border-[#C9A45C] bg-[#181818] hover:bg-[#202020] text-[#E3C78D] transition-colors cursor-pointer"
            >
              <Grid className="w-3.5 h-3.5 text-[#C9A45C]" />
              <span>
                {showAllPhotos
                  ? 'Show Less Photos'
                  : `View All Photos (${filteredItems.length})`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal mounted via Portal above header and page */}
      {selectedImageIndex !== null &&
        filteredItems[selectedImageIndex] &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={filteredItems[selectedImageIndex].title}
            onClick={closeLightbox}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="Close preview"
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-[#1C1C1C] border border-[#C9A45C]/40 text-white hover:text-[#C9A45C] flex items-center justify-center transition-colors z-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Previous Button */}
            {filteredItems.length > 1 && (
              <button
                type="button"
                onClick={prevImage}
                aria-label="Previous image"
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#1C1C1C]/85 hover:bg-[#1C1C1C] border border-[#C9A45C]/35 text-white hover:text-[#C9A45C] flex items-center justify-center transition-colors cursor-pointer z-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next Button */}
            {filteredItems.length > 1 && (
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next image"
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#1C1C1C]/85 hover:bg-[#1C1C1C] border border-[#C9A45C]/35 text-white hover:text-[#C9A45C] flex items-center justify-center transition-colors cursor-pointer z-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Full-Resolution Image Container */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl w-full max-h-[88vh] flex flex-col items-center justify-center"
            >
              <img
                src={filteredItems[selectedImageIndex].image}
                alt={filteredItems[selectedImageIndex].alt}
                referrerPolicy="no-referrer"
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl border border-[#C9A45C]/35 shadow-2xl bg-[#0B0B0B]"
              />
              <div className="mt-3 text-center px-2">
                <span className="text-[10px] uppercase tracking-widest text-[#C9A45C] font-semibold">
                  {filteredItems[selectedImageIndex].categoryLabel}
                </span>
                <h4 className="font-serif-elegant text-base sm:text-xl text-white mt-0.5">
                  {filteredItems[selectedImageIndex].title}
                </h4>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Photo {selectedImageIndex + 1} of {filteredItems.length} • Swipe or use arrows
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};

