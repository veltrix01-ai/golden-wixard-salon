/**
 * HumanVerification — Cloudflare Turnstile widget
 *
 * Renders the official Cloudflare Turnstile challenge inside the existing
 * form. When the visitor solves the challenge, Turnstile calls onVerify with
 * a one-time token. That token is sent to the backend which verifies it with
 * Cloudflare's siteverify API before saving the question.
 *
 * The site key (VITE_TURNSTILE_SITE_KEY) is public — it identifies your
 * Cloudflare Turnstile widget and is safe to embed in the browser.
 * The secret key NEVER appears here; it stays in the backend .env file.
 */

import React, { useEffect, useRef } from 'react';

// Cloudflare Turnstile attaches itself to window after the script loads.
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          size?: 'normal' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface HumanVerificationProps {
  /** Called with the Turnstile token when the visitor passes the challenge. */
  onVerify: (token: string) => void;
  /** Called when the token expires so the form can clear it. */
  onExpire?: () => void;
  /** Whether the form is currently submitting (disables interaction). */
  disabled?: boolean;
  isLight?: boolean;
}

// The Turnstile script URL — loaded once per page.
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export const HumanVerification: React.FC<HumanVerificationProps> = ({
  onVerify,
  onExpire,
  disabled = false,
  isLight = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  // Load the Turnstile script once.
  useEffect(() => {
    if (document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)) return;
    const script = document.createElement('script');
    script.src = `${TURNSTILE_SCRIPT_SRC}?render=explicit`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Render the widget once the script is ready.
  useEffect(() => {
    if (mountedRef.current) return;

    function renderWidget() {
      if (!containerRef.current || !window.turnstile || !SITE_KEY) return;
      mountedRef.current = true;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: isLight ? 'light' : 'dark',
        size: 'normal',
        callback: (token: string) => {
          onVerify(token);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        'error-callback': () => {
          if (onExpire) onExpire(); // treat errors same as expiry — form clears token
        },
      });
    }

    // Turnstile script may already be loaded, or we may need to wait for it.
    if (window.turnstile) {
      renderWidget();
    } else {
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, [isLight, onVerify, onExpire]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  if (!SITE_KEY) {
    // Site key not configured — show a warning box in development only.
    return (
      <div className="p-3 rounded border border-amber-500/50 bg-amber-950/30 text-amber-300 text-xs">
        ⚠ Turnstile site key not configured. Add <code>VITE_TURNSTILE_SITE_KEY</code> to your <code>.env</code> file.
      </div>
    );
  }

  return (
    <div
      className={`rounded-sm border transition-all ${
        isLight
          ? 'bg-[#F9F7F2] border-black/10'
          : 'bg-[#141414] border-[#C6A15B]/30'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Cloudflare Turnstile mounts its iframe into this div */}
      <div ref={containerRef} className="flex justify-center py-2" />
    </div>
  );
};
