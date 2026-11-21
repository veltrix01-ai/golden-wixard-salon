import React, { useState, useEffect, useRef } from 'react';
import {
  SALON_INFO,
  DEFAULT_WHATSAPP_BOOKING_MESSAGE,
  DEFAULT_WHATSAPP_ENQUIRY_MESSAGE,
  getWhatsAppUrl,
} from '../data/salonData';
import { CalendarCheck, Phone, MessageSquare, Navigation, GripHorizontal, RotateCcw } from 'lucide-react';

interface MobileBottomBarProps {
  onBookClick?: () => void;
  whatsappNumber?: string;
}

interface Position {
  x: number;
  y: number;
  isCustom: boolean;
}

const STORAGE_KEY = 'gw_mobile_dock_pos_v2';

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ whatsappNumber }) => {
  const dockRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Position state (null = docked at bottom default)
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return { x: 0, y: 0, isCustom: false };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  // Keep inside viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!position.isCustom || !dockRef.current) return;
      const dockWidth = dockRef.current.offsetWidth || 340;
      const dockHeight = dockRef.current.offsetHeight || 75;

      const maxX = Math.max(0, window.innerWidth - dockWidth - 12);
      const maxY = Math.max(60, window.innerHeight - dockHeight - 12);

      const clampedX = Math.min(Math.max(12, position.x), maxX);
      const clampedY = Math.min(Math.max(60, position.y), maxY);

      if (clampedX !== position.x || clampedY !== position.y) {
        setPosition({ x: clampedX, y: clampedY, isCustom: true });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // Pointer drag start
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button[data-reset="true"]')) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);

    const currentRect = dockRef.current?.getBoundingClientRect();
    const currentX = currentRect ? currentRect.left : 0;
    const currentY = currentRect ? currentRect.top : (window.innerHeight - 85);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
    };

    if (dragHandleRef.current) {
      try {
        dragHandleRef.current.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Pointer drag move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const dockWidth = dockRef.current?.offsetWidth || 340;
    const dockHeight = dockRef.current?.offsetHeight || 75;

    const rawX = dragStartRef.current.initialX + dx;
    const rawY = dragStartRef.current.initialY + dy;

    // Viewport clamp
    const minX = 8;
    const maxX = Math.max(minX, window.innerWidth - dockWidth - 8);
    const minY = 60; // below top navbar
    const maxY = Math.max(minY, window.innerHeight - dockHeight - 8);

    const clampedX = Math.min(Math.max(minX, rawX), maxX);
    const clampedY = Math.min(Math.max(minY, rawY), maxY);

    setPosition({ x: clampedX, y: clampedY, isCustom: true });
  };

  // Pointer drag end & edge snap
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragHandleRef.current) {
      try {
        dragHandleRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    const dockWidth = dockRef.current?.offsetWidth || 340;
    const dockHeight = dockRef.current?.offsetHeight || 75;

    const currentX = position.x;
    const currentY = position.y;

    const snapThresholdBottom = window.innerHeight - 140;
    const snapThresholdTop = 130;

    let finalPos: Position;

    // Snap to default bottom dock if released near the bottom
    if (currentY >= snapThresholdBottom) {
      finalPos = { x: 0, y: 0, isCustom: false };
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    } else {
      // Snap to top or keep horizontal side position
      let finalY = currentY;
      if (currentY <= snapThresholdTop) {
        finalY = 70; // neat dock right under header
      }

      // Horizontal edge assist
      let finalX = currentX;
      if (currentX < 40) {
        finalX = 12;
      } else if (currentX > window.innerWidth - dockWidth - 40) {
        finalX = window.innerWidth - dockWidth - 12;
      }

      finalPos = { x: finalX, y: finalY, isCustom: true };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos));
      } catch {
        // ignore
      }
    }

    setPosition(finalPos);
  };

  // Reset to default bottom dock
  const handleResetPosition = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    const defaultPos: Position = { x: 0, y: 0, isCustom: false };
    setPosition(defaultPos);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'r' || e.key === 'R') {
      handleResetPosition(e);
      return;
    }

    const step = 25;
    const dockWidth = dockRef.current?.offsetWidth || 340;
    const dockHeight = dockRef.current?.offsetHeight || 75;

    let curX = position.isCustom ? position.x : (window.innerWidth - dockWidth) / 2;
    let curY = position.isCustom ? position.y : (window.innerHeight - dockHeight);

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      curY = Math.max(65, curY - step);
      const newPos = { x: curX, y: curY, isCustom: true };
      setPosition(newPos);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos)); } catch {}
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      curY = Math.min(window.innerHeight - dockHeight - 8, curY + step);
      if (curY >= window.innerHeight - 130) {
        handleResetPosition(e);
      } else {
        const newPos = { x: curX, y: curY, isCustom: true };
        setPosition(newPos);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos)); } catch {}
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      curX = Math.max(8, curX - step);
      const newPos = { x: curX, y: curY, isCustom: true };
      setPosition(newPos);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos)); } catch {}
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      curX = Math.min(window.innerWidth - dockWidth - 8, curX + step);
      const newPos = { x: curX, y: curY, isCustom: true };
      setPosition(newPos);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos)); } catch {}
    }
  };

  const whatsappBookingUrl = getWhatsAppUrl(
    DEFAULT_WHATSAPP_BOOKING_MESSAGE,
    whatsappNumber
  );
  const whatsappUrl = getWhatsAppUrl(
    DEFAULT_WHATSAPP_ENQUIRY_MESSAGE,
    whatsappNumber
  );

  // Styling based on docked vs floating position
  const containerStyle: React.CSSProperties = position.isCustom
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: 'calc(100vw - 24px)',
        maxWidth: '440px',
        zIndex: 50,
        touchAction: 'none',
      }
    : {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      };

  return (
    <div
      ref={dockRef}
      style={containerStyle}
      role="toolbar"
      aria-label="Salon contact and booking actions"
      className={`transition-shadow ${
        position.isCustom
          ? 'shadow-[0_12px_40px_rgba(0,0,0,0.9)]'
          : 'shadow-[0_-8px_30px_rgba(0,0,0,0.85)]'
      }`}
    >
      <div
        className={`bg-[#111111]/95 backdrop-blur-md border border-[#C6A15B]/40 overflow-hidden ${
          position.isCustom ? 'rounded-lg' : 'border-x-0 border-b-0 rounded-t-lg'
        }`}
      >
        {/* Dedicated Drag Handle Bar */}
        <div
          ref={dragHandleRef}
          tabIndex={0}
          role="button"
          aria-label="Drag to reposition contact dock. Press arrow keys to move or R to reset to bottom."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className={`w-full py-1.5 px-3 bg-[#181818] border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing select-none text-[10px] text-[#EAE2D5]/70 focus:outline-none focus:bg-[#202020] transition-colors ${
            isDragging ? 'bg-[#222222]' : ''
          }`}
        >
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B]" />
            <span className="text-[9px] uppercase tracking-wider font-semibold">
              {position.isCustom ? 'Moved' : 'Dock'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[#C6A15B]/80 hover:text-[#C6A15B]">
            <GripHorizontal className="w-4 h-3" />
            <span className="text-[9px] tracking-widest uppercase font-semibold">
              {isDragging ? 'Release to snap' : 'Hold & Drag'}
            </span>
          </div>

          {position.isCustom ? (
            <button
              type="button"
              data-reset="true"
              onClick={handleResetPosition}
              title="Reset dock to default bottom position"
              aria-label="Reset dock to bottom"
              className="text-[#C6A15B] hover:text-white flex items-center gap-1 text-[9px] uppercase font-semibold tracking-wider p-0.5 rounded cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* 4 Equal-Width Action Sections */}
        <nav
          aria-label="Mobile contact buttons"
          className={`grid grid-cols-4 divide-x divide-white/10 py-2.5 px-1 ${
            !position.isCustom ? 'pb-[max(0.65rem,env(safe-area-inset-bottom))]' : ''
          }`}
        >
          {/* 1. BOOK */}
          <a
            href={whatsappBookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-1 px-0.5 text-center active:scale-95 transition-transform group cursor-pointer min-h-[44px]"
            aria-label="Book an appointment on WhatsApp"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1A1A1A] border border-[#C6A15B]/60 flex items-center justify-center mb-1 group-active:border-[#C6A15B] shadow-sm">
              <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C6A15B]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#D6B979] uppercase">
              Book
            </span>
            <span className="text-[8px] sm:text-[9px] text-[#C6A15B] leading-tight font-medium truncate max-w-full">
              Appointment
            </span>
          </a>

          {/* 2. CALL */}
          <a
            href={`tel:${SALON_INFO.phoneRaw}`}
            className="flex flex-col items-center justify-center py-1 px-0.5 text-center active:scale-95 transition-transform group min-h-[44px]"
            aria-label={`Call salon directly at ${SALON_INFO.phoneDisplay}`}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1A1A1A] border border-[#C6A15B]/40 flex items-center justify-center mb-1 group-active:border-[#C6A15B] shadow-sm">
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C6A15B]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#F8F5EF] uppercase">
              Call
            </span>
            <span className="text-[8px] sm:text-[9px] text-[#C6A15B] font-mono leading-tight truncate max-w-full">
              86863 85552
            </span>
          </a>

          {/* 3. WHATSAPP */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-1 px-0.5 text-center active:scale-95 transition-transform group min-h-[44px]"
            aria-label="Chat with Golden Wizard Salon on WhatsApp"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1A1A1A] border border-[#C6A15B]/40 flex items-center justify-center mb-1 group-active:border-[#C6A15B] shadow-sm">
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C6A15B]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#F8F5EF] uppercase">
              WhatsApp
            </span>
            <span className="text-[8px] sm:text-[9px] text-[#C6A15B] leading-tight font-medium truncate max-w-full">
              Chat with Us
            </span>
          </a>

          {/* 4. DIRECTIONS */}
          <a
            href={SALON_INFO.googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-1 px-0.5 text-center active:scale-95 transition-transform group min-h-[44px]"
            aria-label="Get Google Maps directions to the salon"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1A1A1A] border border-[#C6A15B]/40 flex items-center justify-center mb-1 group-active:border-[#C6A15B] shadow-sm">
              <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C6A15B]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#F8F5EF] uppercase">
              Directions
            </span>
            <span className="text-[8px] sm:text-[9px] text-white/50 leading-tight truncate max-w-full">
              Google Maps
            </span>
          </a>
        </nav>
      </div>
    </div>
  );
};
