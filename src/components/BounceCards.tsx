'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CrownIcon } from './CrownIcon';
import './BounceCards.css';

export interface BounceCardObject {
  id?: string;
  src: string;
  alt?: string;
  label?: string;
  countLabel?: string;
}

export type BounceCardInput = string | BounceCardObject;

export interface BounceCardsProps {
  className?: string;
  images?: BounceCardInput[];
  containerWidth?: number;
  containerHeight?: number;
  cardSize?: number;
  cardAspect?: number;
  spread?: number;
  rotation?: number;
  arc?: number;
  hoverScale?: number;
  bounciness?: number;
  animationDelay?: number;
  animationStagger?: number;
  borderWidth?: number;
  borderColor?: string;
  radius?: number;
  shadow?: boolean;
  enableHover?: boolean;
  activeIndex?: number;
  imageFit?: 'cover' | 'contain';
  showOverlay?: boolean;
  onCardClick?: (index: number, item: BounceCardObject) => void;
  onSelectIndex?: (index: number) => void;
  onCardHover?: (index: number | null) => void;
  onSwipeNext?: () => void;
  onSwipePrev?: () => void;
  onDragStateChange?: (dragging: boolean) => void;
}

interface SpringState {
  x: number;
  y: number;
  rot: number;
  scale: number;
  vx: number;
  vy: number;
  vrot: number;
  vscale: number;
  prevRel: number;
}

const DEFAULT_EASE_SPRING = {
  stiffness: 200,
  damping: 19,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function getSignedCircularOffset(index: number, center: number, total: number): number {
  if (total <= 0) return 0;
  let rel = index - center;
  const half = total / 2;
  while (rel > half) rel -= total;
  while (rel < -half) rel += total;
  return rel;
}

const BounceCards: React.FC<BounceCardsProps> = ({
  className = '',
  images = [],
  containerWidth = 880,
  containerHeight = 350,
  cardSize = 232,
  cardAspect = 1.18,
  spread = 148,
  rotation = 8.5,
  arc = 14,
  hoverScale = 1.07,
  bounciness = 0.56,
  animationDelay = 0.15,
  animationStagger = 0.04,
  borderWidth = 2.5,
  borderColor = 'rgba(201, 164, 92, 0.72)',
  radius = 22,
  shadow = true,
  enableHover = true,
  activeIndex = 0,
  imageFit = 'cover',
  showOverlay = true,
  onCardClick,
  onSelectIndex,
  onCardHover,
  onSwipeNext,
  onSwipePrev,
  onDragStateChange,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [canHoverDevice, setCanHoverDevice] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [failedSrcs, setFailedSrcs] = useState<Record<string, boolean>>({});
  const [availableWidth, setAvailableWidth] = useState<number>(containerWidth);
  const [isDraggingUI, setIsDraggingUI] = useState<boolean>(false);

  // Real-time interactive drag & physics refs
  const dragUnitsRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const suppressClickRef = useRef<boolean>(false);
  const suppressTimerRef = useRef<number | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);

  const normalizedItems = useMemo<BounceCardObject[]>(() => {
    return images.map((item, idx) =>
      typeof item === 'string'
        ? { src: item, alt: `Service ${idx + 1}` }
        : {
            id: item.id,
            src: item.src,
            alt: item.alt || item.label || `Service ${idx + 1}`,
            label: item.label,
            countLabel: item.countLabel,
          }
    );
  }, [images]);

  useEffect(() => {
    const el = stageRef.current?.parentElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const parentW = el.clientWidth;
      if (parentW > 0) setAvailableWidth(parentW);
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setCanHoverDevice(window.matchMedia('(hover: hover)').matches);
    }
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIsVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (suppressTimerRef.current !== null) {
        window.clearTimeout(suppressTimerRef.current);
      }
    };
  }, []);

  const n = normalizedItems.length;
  const centerIdx = n > 0 ? ((activeIndex % n) + n) % n : 0;

  const isCompactMobile = availableWidth < 540;
  const isTablet = availableWidth >= 540 && availableWidth < 840;
  const visibleWing = isCompactMobile ? 1 : 2;

  const responsiveRatio = Math.min(1, availableWidth / Math.max(containerWidth, 300));
  const effCardWidth = isCompactMobile
    ? Math.round(Math.min(206, availableWidth * 0.56))
    : isTablet
    ? Math.round(cardSize * 0.86)
    : cardSize;
  const effCardHeight = Math.round(effCardWidth * cardAspect);

  const effSpread = isCompactMobile
    ? Math.round(effCardWidth * 0.52)
    : isTablet
    ? Math.round(spread * 0.78)
    : spread;

  const effHeight = Math.max(
    Math.round(effCardHeight * 1.24),
    Math.round(containerHeight * Math.max(0.84, responsiveRatio))
  );

  const springStatesRef = useRef<SpringState[]>([]);
  const mountedAtRef = useRef<number>(0);

  const activeHover = enableHover && canHoverDevice && !isDraggingUI ? hoveredIdx : null;

  // Store latest callbacks & geometry in refs for window pointer listeners
  const dragContextRef = useRef({
    n,
    centerIdx,
    effSpread,
    onSelectIndex,
    onSwipeNext,
    onSwipePrev,
    onDragStateChange,
  });
  dragContextRef.current = {
    n,
    centerIdx,
    effSpread,
    onSelectIndex,
    onSwipeNext,
    onSwipePrev,
    onDragStateChange,
  };

  useEffect(() => {
    const prev = springStatesRef.current;
    const next: SpringState[] = [];
    for (let i = 0; i < n; i++) {
      const rel = getSignedCircularOffset(i, centerIdx, n);
      if (prev[i]) {
        next.push(prev[i]);
      } else {
        next.push({
          x: rel * effSpread,
          y: 36 + Math.abs(rel) * 8,
          rot: rel * rotation,
          scale: rel === 0 ? 0.82 : 0.7,
          vx: 0,
          vy: 0,
          vrot: 0,
          vscale: 0,
          prevRel: rel,
        });
      }
    }
    springStatesRef.current = next;
    if (mountedAtRef.current === 0) {
      mountedAtRef.current = performance.now();
    }
  }, [n, centerIdx, effSpread, rotation]);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (n === 0) return;

    const clampedBounce = Math.max(0.1, Math.min(1, bounciness));
    const baseStiffness = DEFAULT_EASE_SPRING.stiffness + clampedBounce * 110;
    const baseDamping = Math.max(12, DEFAULT_EASE_SPRING.damping - (clampedBounce - 0.5) * 6);

    let rafId = 0;
    let lastTime = performance.now();

    const getTargetFor = (i: number, rel: number) => {
      const absRel = Math.abs(rel);
      const isHovered = activeHover === i;

      if (!isVisible && !reduceMotion) {
        return {
          x: Math.sign(rel) * effSpread * Math.min(absRel, 2.2),
          y: 44 + absRel * 8,
          rot: rel * rotation,
          scale: 0.72,
          opacity: absRel <= visibleWing ? 0.9 : 0,
          z: Math.max(1, 30 - Math.round(absRel * 8)),
        };
      }

      // Smooth continuous x, y, rot, scale, opacity, z interpolation for real-time dragging
      let x = 0;
      if (absRel <= 1) {
        x = rel * effSpread;
      } else if (absRel <= 2) {
        const dir = rel >= 0 ? 1 : -1;
        x = dir * lerp(effSpread, effSpread * 1.86, absRel - 1);
      } else {
        const dir = rel >= 0 ? 1 : -1;
        x = dir * effSpread * (isCompactMobile ? 1.35 : 2.05);
      }

      let y = 0;
      if (absRel <= 1) {
        y = lerp(-10, 12 + arc * 0.35, absRel);
      } else if (absRel <= 2) {
        y = lerp(12 + arc * 0.35, 28 + arc, absRel - 1);
      } else {
        y = 38 + arc;
      }

      const rot = rel * rotation * (absRel > 1.5 ? 0.85 : 1);

      let scale = 0.66;
      if (absRel <= 1) {
        scale = lerp(hoverScale, 0.91, absRel);
      } else if (absRel <= 2) {
        scale = lerp(0.91, 0.79, absRel - 1);
      } else {
        scale = lerp(0.79, 0.66, absRel - 2);
      }

      if (isHovered && absRel < 0.25) {
        y -= 4;
        scale += 0.02;
      } else if (isHovered && absRel <= visibleWing) {
        x += Math.sign(rel || 1) * 9;
        y -= 8;
        scale += 0.05;
      }

      let opacity = 1;
      if (absRel > visibleWing) {
        opacity = clamp(1 - (absRel - visibleWing) / 0.55, 0, 1);
      } else if (absRel > 1.6) {
        opacity = lerp(1, 0.94, (absRel - 1.6) / 0.4);
      }

      const z = isHovered
        ? Math.max(24, 42 - Math.round(absRel * 8))
        : Math.max(2, Math.round(40 - Math.min(absRel, 3.2) * 11));

      return { x, y, rot, scale, opacity, z };
    };

    const applyTransform = (
      el: HTMLButtonElement | null,
      s: SpringState,
      z: number,
      opacity: number,
      interactive: boolean
    ) => {
      if (!el) return;
      el.style.transform = `translate3d(calc(-50% + ${s.x.toFixed(2)}px), calc(-50% + ${s.y.toFixed(2)}px), 0) rotate(${s.rot.toFixed(2)}deg) scale(${s.scale.toFixed(4)})`;
      el.style.zIndex = String(z);
      el.style.opacity = String(opacity);
      el.style.pointerEvents = interactive ? 'auto' : 'none';
    };

    const tick = (now: number) => {
      rafId = 0;
      const dt = Math.min(0.032, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      const dragging = isDraggingRef.current;
      const dragUnits = dragUnitsRef.current;
      const effectiveCenter = centerIdx + dragUnits;

      // Faster, tighter tracking while pointer is dragging; bouncy spring on release
      const stiffness = dragging ? 560 : baseStiffness;
      const damping = dragging ? 38 : baseDamping;

      let moving = dragging || Math.abs(dragUnits) > 0.001;
      const elapsedSec = (now - mountedAtRef.current) / 1000;
      const wrapThreshold = Math.max(2.1, n / 2 - 0.35);

      for (let i = 0; i < n; i++) {
        const state = springStatesRef.current[i];
        if (!state) continue;

        const rel = getSignedCircularOffset(i, effectiveCenter, n);

        // Snap cards that crossed the back seam cleanly without flying across front
        if (Math.abs(rel - state.prevRel) > wrapThreshold) {
          const hiddenTarget = getTargetFor(i, rel);
          state.x = hiddenTarget.x;
          state.y = hiddenTarget.y;
          state.rot = hiddenTarget.rot;
          state.scale = hiddenTarget.scale;
          state.vx = 0;
          state.vy = 0;
          state.vrot = 0;
          state.vscale = 0;
        }
        state.prevRel = rel;

        const target = getTargetFor(i, rel);
        const isInteractive = !dragging && Math.abs(rel) <= visibleWing + 0.15;

        if (reduceMotion) {
          state.x = target.x;
          state.y = target.y;
          state.rot = target.rot;
          state.scale = target.scale;
          applyTransform(cardRefs.current[i], state, target.z, target.opacity, isInteractive);
          continue;
        }

        const staggerGate = animationDelay + Math.min(Math.abs(rel), 3) * animationStagger;
        if (!dragging && isVisible && elapsedSec < staggerGate && activeHover === null) {
          moving = true;
          applyTransform(cardRefs.current[i], state, target.z, target.opacity, isInteractive);
          continue;
        }

        const integrate = (pos: number, vel: number, tgt: number): [number, number] => {
          const force = (tgt - pos) * stiffness;
          const accel = force - vel * damping;
          const nextVel = vel + accel * dt;
          const nextPos = pos + nextVel * dt;
          return [nextPos, nextVel];
        };

        const [nx, nvx] = integrate(state.x, state.vx, target.x);
        const [ny, nvy] = integrate(state.y, state.vy, target.y);
        const [nrot, nvrot] = integrate(state.rot, state.vrot, target.rot);
        const [nscale, nvscale] = integrate(state.scale, state.vscale, target.scale);

        state.x = nx;
        state.y = ny;
        state.rot = nrot;
        state.scale = nscale;
        state.vx = nvx;
        state.vy = nvy;
        state.vrot = nvrot;
        state.vscale = nvscale;

        if (
          Math.abs(target.x - nx) > 0.08 ||
          Math.abs(nvx) > 0.25 ||
          Math.abs(target.y - ny) > 0.08 ||
          Math.abs(nvy) > 0.25 ||
          Math.abs(target.rot - nrot) > 0.05 ||
          Math.abs(nvrot) > 0.2 ||
          Math.abs(target.scale - nscale) > 0.0008 ||
          Math.abs(nvscale) > 0.002
        ) {
          moving = true;
        } else if (!dragging) {
          state.x = target.x;
          state.y = target.y;
          state.rot = target.rot;
          state.scale = target.scale;
          state.vx = 0;
          state.vy = 0;
          state.vrot = 0;
          state.vscale = 0;
        }

        applyTransform(cardRefs.current[i], state, target.z, target.opacity, isInteractive);
      }

      if (moving) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const wakeLoop = () => {
      if (!rafId) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    wakeRef.current = wakeLoop;
    wakeLoop();

    return () => {
      wakeRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    n,
    centerIdx,
    activeHover,
    isVisible,
    effSpread,
    isCompactMobile,
    visibleWing,
    rotation,
    arc,
    hoverScale,
    bounciness,
    animationDelay,
    animationStagger,
  ]);

  // Unified pointer interaction (Desktop Mouse Drag + Mobile/Tablet Finger Swipe)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (n <= 1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const pointerId = e.pointerId;
    const pointerType = e.pointerType;
    const startX = e.clientX;
    const startY = e.clientY;
    let lastX = startX;
    let lastT = performance.now();
    let vx = 0;
    let mode: 'pending' | 'horizontal' | 'vertical' = 'pending';

    const cleanupListeners = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (mode === 'pending') {
        const threshold = pointerType === 'mouse' ? 6 : 9;
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

        if (pointerType !== 'mouse' && Math.abs(dy) > Math.abs(dx) * 1.15) {
          mode = 'vertical';
          cleanupListeners();
          return;
        }

        mode = 'horizontal';
        isDraggingRef.current = true;
        suppressClickRef.current = true;
        if (suppressTimerRef.current !== null) {
          window.clearTimeout(suppressTimerRef.current);
          suppressTimerRef.current = null;
        }
        setIsDraggingUI(true);
        dragContextRef.current.onDragStateChange?.(true);
      }

      if (mode !== 'horizontal') return;
      if (ev.cancelable) ev.preventDefault();

      const now = performance.now();
      const dt = Math.max(4, now - lastT) / 1000;
      const instV = (ev.clientX - lastX) / dt;
      vx = vx * 0.55 + instV * 0.45;
      lastX = ev.clientX;
      lastT = now;

      const stepPx = Math.max(95, dragContextRef.current.effSpread);
      dragUnitsRef.current = clamp(-dx / stepPx, -1.6, 1.6);
      wakeRef.current?.();
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanupListeners();

      if (mode === 'horizontal') {
        const dx = ev.clientX - startX;
        const {
          n: total,
          centerIdx: currentCenter,
          effSpread: spreadPx,
          onSelectIndex: selectFn,
          onSwipeNext: nextFn,
          onSwipePrev: prevFn,
          onDragStateChange: dragCb,
        } = dragContextRef.current;

        const stepPx = Math.max(95, spreadPx);
        const dragUnits = -dx / stepPx;

        let stepShift = 0;
        if (Math.abs(vx) > 260) {
          // Fast flick gesture
          stepShift = vx < 0 ? 1 : -1;
        } else if (Math.abs(dx) >= 36 || Math.abs(dragUnits) >= 0.28) {
          stepShift = Math.round(dragUnits);
          if (stepShift === 0) {
            stepShift = dx < 0 ? 1 : -1;
          }
        }
        stepShift = clamp(stepShift, -2, 2);

        isDraggingRef.current = false;
        dragUnitsRef.current = 0;
        setIsDraggingUI(false);
        dragCb?.(false);

        if (stepShift !== 0 && total > 1) {
          if (selectFn) {
            const targetIdx = ((currentCenter + stepShift) % total + total) % total;
            selectFn(targetIdx);
          } else if (stepShift > 0) {
            nextFn?.();
          } else {
            prevFn?.();
          }
        } else {
          wakeRef.current?.();
        }

        // Suppress accidental click firing right after pointer drag release
        suppressTimerRef.current = window.setTimeout(() => {
          suppressClickRef.current = false;
          suppressTimerRef.current = null;
        }, 90);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleSetHover = (idx: number | null) => {
    setHoveredIdx(idx);
    onCardHover?.(idx);
  };

  return (
    <div
      className={`bounce-cards-wrapper ${className}`}
      style={{ width: '100%', maxWidth: `${containerWidth}px` }}
    >
      <div
        ref={stageRef}
        className={`bounce-cards-stage${isDraggingUI ? ' is-dragging' : ''}`}
        style={{
          width: '100%',
          height: `${effHeight}px`,
        }}
        onPointerDown={handlePointerDown}
        onDragStart={(e) => e.preventDefault()}
        onMouseLeave={() => handleSetHover(null)}
      >
        {normalizedItems.map((item, idx) => {
          const isFocal = idx === centerIdx;
          const isHovered = hoveredIdx === idx;
          const isBroken = Boolean(failedSrcs[item.src]);

          return (
            <button
              key={item.id || `${item.src}-${idx}`}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              type="button"
              onClick={(e) => {
                if (suppressClickRef.current) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                onCardClick?.(idx, item);
              }}
              onMouseEnter={() => handleSetHover(idx)}
              onFocus={() => handleSetHover(idx)}
              onBlur={() => handleSetHover(null)}
              data-focal={isFocal ? 'true' : 'false'}
              aria-pressed={isFocal}
              aria-label={item.label ? `${item.label} menu card` : item.alt}
              className="bounce-card"
              style={{
                width: `${effCardWidth}px`,
                height: `${effCardHeight}px`,
              }}
            >
              <div
                className="bounce-card-float"
                style={
                  {
                    '--float-delay': `${(idx * 0.35).toFixed(2)}s`,
                    '--float-dur': `${(4.1 + (idx % 3) * 0.4).toFixed(2)}s`,
                  } as React.CSSProperties
                }
              >
                <div
                  className="bounce-card-frame"
                  style={{
                    borderRadius: `${radius}px`,
                    border: `${borderWidth}px solid ${
                      isFocal || isHovered ? '#E3C78D' : borderColor
                    }`,
                    boxShadow: shadow
                      ? isFocal
                        ? '0 26px 56px rgba(0, 0, 0, 0.88), 0 0 32px rgba(201, 164, 92, 0.28), inset 0 0 0 1px rgba(227, 199, 141, 0.35)'
                        : '0 16px 36px rgba(0, 0, 0, 0.68), inset 0 0 0 1px rgba(201, 164, 92, 0.16)'
                      : 'none',
                  }}
                >
                  <div className="bounce-card-media">
                    {isBroken ? (
                      <div className="bounce-card-fallback">
                        <CrownIcon className="w-8 h-8 text-[#C9A45C]" />
                        <span className="font-serif-elegant text-xs font-semibold text-[#F5F1E8]">
                          {item.label || 'Golden Wizard'}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={item.src}
                        alt={item.alt || item.label || 'Golden Wizard Salon card'}
                        className={`bounce-card-image${
                          imageFit === 'contain' ? ' bounce-card-image--contain' : ''
                        }`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        draggable={false}
                        onError={() =>
                          setFailedSrcs((prev) => ({ ...prev, [item.src]: true }))
                        }
                      />
                    )}
                    {showOverlay && (item.label || item.countLabel) && (
                      <div className="bounce-card-overlay">
                        {item.countLabel && (
                          <span className="bounce-card-count">{item.countLabel}</span>
                        )}
                        {item.label && <span className="bounce-card-title">{item.label}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BounceCards;
