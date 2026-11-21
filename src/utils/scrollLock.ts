let lockCount = 0;
let prevHtmlOverflow = '';
let prevHtmlOverscroll = '';
let removeScrollGuards: (() => void) | null = null;

function hasScrollableAncestor(target: EventTarget | null): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function acquireBodyScrollLock(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {};
  }

  if (lockCount === 0) {
    const html = document.documentElement;
    prevHtmlOverflow = html.style.overflow;
    prevHtmlOverscroll = html.style.overscrollBehavior;
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    const preventBackgroundScroll = (event: Event) => {
      if ('touches' in event && (event as TouchEvent).touches.length > 1) return;
      if (hasScrollableAncestor(event.target)) return;
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    removeScrollGuards = () => {
      document.removeEventListener('touchmove', preventBackgroundScroll);
      document.removeEventListener('wheel', preventBackgroundScroll);
    };
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      const html = document.documentElement;
      html.style.overflow = prevHtmlOverflow || '';
      html.style.overscrollBehavior = prevHtmlOverscroll || '';
      removeScrollGuards?.();
      removeScrollGuards = null;
    }
  };
}
