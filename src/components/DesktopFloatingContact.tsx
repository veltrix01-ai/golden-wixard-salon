import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export const DesktopFloatingContact: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!showScrollTop) return null;

  return (
    <div
      aria-label="Scroll to top"
      className="hidden lg:block fixed bottom-4 right-4 z-30 pointer-events-auto"
    >
      <button
        onClick={scrollToTop}
        aria-label="Scroll back to top"
        title="Scroll to top"
        className="w-8 h-8 rounded-sm bg-[#181818]/90 hover:bg-[#252525] border border-white/15 text-[#EAE2D5] hover:text-[#C6A15B] flex items-center justify-center shadow-md transition-all cursor-pointer"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
    </div>
  );
};
