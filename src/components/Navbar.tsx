import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CrownIcon } from './CrownIcon';
import PillNav, { type PillNavItem } from './PillNav';
import AnimatedList, { type AnimatedListItem } from './AnimatedList';
import {
  SALON_INFO,
  DEFAULT_WHATSAPP_BOOKING_MESSAGE,
  DEFAULT_WHATSAPP_ENQUIRY_MESSAGE,
  getWhatsAppUrl,
} from '../data/salonData';
import { Phone, CalendarDays, Clock, MapPin, Lock, Star, MessageCircle, Building2 } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  InformationCircleIcon,
  Scissor01Icon,
  Award01Icon,
  Image01Icon,
  StarIcon,
  HelpCircleIcon,
  BubbleChatIcon,
} from '@hugeicons/core-free-icons';

interface NavbarProps {
  onOpenBookingModal?: () => void;
  onOpenAdminPortal?: () => void;
  whatsappNumber?: string;
}

const SECTION_SCROLL_ORDER = [
  '#home',
  '#services',
  '#menu',
  '#booking',
  '#gallery',
  '#about',
  '#certificates',
  '#reviews',
  '#ask-question-form',
  '#faqs',
  '#contact',
  '#locations',
];

const listIcon = (icon: typeof Home01Icon) => (
  <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} color="#C9A45C" />
);

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBookingModal,
  onOpenAdminPortal,
  whatsappNumber,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState<string>('#home');

  const whatsappBookingUrl = useMemo(
    () => getWhatsAppUrl(DEFAULT_WHATSAPP_BOOKING_MESSAGE, whatsappNumber),
    [whatsappNumber]
  );
  const whatsappEnquiryUrl = useMemo(
    () => getWhatsAppUrl(DEFAULT_WHATSAPP_ENQUIRY_MESSAGE, whatsappNumber),
    [whatsappNumber]
  );

  useEffect(() => {
    let rafId = 0;

    const updateScrollState = () => {
      rafId = 0;
      setIsScrolled(window.scrollY > 20);

      if (window.location.pathname !== '/') return;

      if (window.scrollY < 100) {
        setActiveHref('#home');
        return;
      }

      const threshold = window.innerHeight * 0.35;
      let current = '#home';

      for (const id of SECTION_SCROLL_ORDER) {
        const el = document.querySelector(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) {
          current = id;
        }
      }

      setActiveHref(current);
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateScrollState);
      }
    };

    updateScrollState();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleLinkClick = useCallback((href: string) => {
    if (!href) return;
    if (href.startsWith('http')) {
      return;
    }
    setActiveHref(href);

    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', `/${href}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      setTimeout(() => {
        const element = document.querySelector(href);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return;
    }

    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const desktopItems: PillNavItem[] = useMemo(
    () => [
      { label: 'Home', href: '#home' },
      { label: 'About', href: '#about' },
      { label: 'Services', href: '#services' },
      { label: 'Credentials', href: '#certificates' },
      { label: 'Gallery', href: '#gallery' },
      { label: 'Reviews', href: '#reviews' },
      { label: 'Ask', href: '#ask-question-form' },
      { label: 'Q&A', href: '#faqs' },
      { label: 'Contact', href: '#contact' },
      { label: 'Locations', href: '#locations' },
    ],
    []
  );

  const mobileItems: AnimatedListItem[] = useMemo(
    () => [
      { id: '#home', title: 'Home', description: 'Salon overview & highlights', icon: listIcon(Home01Icon), href: '#home' },
      { id: '#about', title: 'About', description: 'Our story & standards', icon: listIcon(InformationCircleIcon), href: '#about' },
      { id: '#services', title: 'Services', description: 'Treatments & 7-page menu', icon: listIcon(Scissor01Icon), href: '#services' },
      { id: '#certificates', title: 'Credentials', description: 'Certified salon artistry', icon: listIcon(Award01Icon), href: '#certificates' },
      { id: '#gallery', title: 'Gallery', description: 'Our salon work & styles', icon: listIcon(Image01Icon), href: '#gallery' },
      { id: '#reviews', title: 'Reviews', description: 'Verified 4.4★ Google reviews', icon: listIcon(StarIcon), href: '#reviews' },
      { id: '#ask-question-form', title: 'Ask', description: 'Ask our hairstylists directly', icon: listIcon(BubbleChatIcon), href: '#ask-question-form' },
      { id: '#faqs', title: 'Q&A', description: 'Published stylist answers', icon: listIcon(HelpCircleIcon), href: '#faqs' },
      {
        id: '#contact',
        title: 'Contact',
        description: 'Gandi Maisamma location & hours',
        icon: <MapPin className="w-[18px] h-[18px] text-[#C9A45C]" strokeWidth={1.8} />,
        href: '#contact',
      },
      {
        id: '#locations',
        title: 'Locations',
        description: 'Branch 01 & Branch 02 addresses & maps',
        icon: <Building2 className="w-[18px] h-[18px] text-[#C9A45C]" strokeWidth={1.8} />,
        href: '#locations',
      },
    ],
    []
  );

  const pillActiveHref =
    activeHref === '#menu' || activeHref === '#booking' ? '#services' : activeHref;
  const mobileSelectedIndex = Math.max(
    0,
    mobileItems.findIndex((item) => item.href === pillActiveHref)
  );

  // Custom Link component passed to PillNav so anchor clicks smoothly scroll and respect SPA routing
  const SalonNavLink = useCallback(
    ({ href, onClick, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a
        href={href}
        onClick={(e) => {
          onClick?.(e);
          if (href && href.startsWith('#')) {
            e.preventDefault();
            handleLinkClick(href);
          }
        }}
        {...rest}
      >
        {children}
      </a>
    ),
    [handleLinkClick]
  );

  return (
    <>
      {/* Top micro announcement bar */}
      <div className="border-b text-xs py-2 px-4 sm:px-6 lg:px-8 hidden md:block bg-[#141414] border-white/5 text-[#A5A5A5]">
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <span className="font-serif-elegant font-bold tracking-wider uppercase text-[#F5F1E8] whitespace-nowrap">
              Golden Wizard <span className="text-[#C9A45C]">Salon</span>
            </span>
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#C9A45C] shrink-0" strokeWidth={1.75} />
              <span className="truncate">Gandi Maisamma X Rd, Opp. Indian Oil Petrol Pump, Hyderabad</span>
            </span>
            <span className="hidden xl:flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-[#C9A45C]" strokeWidth={1.75} />
              Open Daily until 9:00 PM
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[#C9A45C] font-semibold flex items-center gap-1 whitespace-nowrap">
              <Star className="w-3.5 h-3.5 fill-[#C9A45C] text-[#C9A45C]" />
              <span>4.4 / 5.0 Google Rating (171 Reviews)</span>
            </span>
            <a
              href={`tel:${SALON_INFO.phoneRaw}`}
              className="hover:text-[#C9A45C] transition-colors flex items-center gap-1 font-medium text-[#F5F1E8] whitespace-nowrap"
            >
              <Phone className="w-3 h-3 text-[#C9A45C]" strokeWidth={1.75} />
              {SALON_INFO.phoneDisplay}
            </a>
            {onOpenAdminPortal && (
              <button
                type="button"
                onClick={onOpenAdminPortal}
                className="text-[11px] text-[#C9A45C] hover:underline flex items-center gap-1 ml-1 cursor-pointer font-semibold whitespace-nowrap"
              >
                <Lock className="w-3 h-3" strokeWidth={1.75} />
                <span>Owner Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main sticky navigation */}
      <header
        className={`sticky top-0 z-[60] transition-[background-color,border-color,padding,box-shadow] duration-300 ${
          isScrolled
            ? 'bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#C9A45C]/25 py-2.5 shadow-lg shadow-black/50'
            : 'bg-[#0D0D0D]/90 backdrop-blur-sm border-b border-white/5 py-3'
        }`}
      >
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="w-full flex items-center justify-between gap-3">
            {/* Primary PillNav Navigation Bar (splits logo + nav pills on desktop, collapses into single AnimatedList hamburger menu on mobile) */}
            <div className="flex-1 min-w-0 flex items-center">
              <PillNav
                logo={<CrownIcon className="w-full h-full text-[#C9A45C]" />}
                logoAlt="Golden Wizard Professional Salon"
                logoHref="#home"
                items={desktopItems}
                activeHref={pillActiveHref}
                linkComponent={SalonNavLink}
                theme="dark"
                layout="split"
                itemStyle="pill"
                hoverEffect="fill"
                indicator="dot"
                surface="glass"
                size="md"
                collapse="auto"
                highlightColor="#C9A45C"
                highlightTextColor="#0D0D0D"
                barColor="#111111"
                textColor="#F5F5F5"
                ariaLabel="Golden Wizard Primary Navigation"
                style={{
                  '--pn-x': '10px',
                  '--pn-gap': '4px',
                  '--pn-solid': '#111111',
                  '--pn-edge': 'rgba(201, 164, 92, 0.25)',
                  '--pn-rim': 'rgba(201, 164, 92, 0.14)',
                  '--pn-tile': 'linear-gradient(180deg, #1E1E1E 0%, #131313 100%)',
                  '--pn-tile-rim':
                    'inset 0 0 0 1px rgba(201, 164, 92, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 10px -4px rgba(0, 0, 0, 0.7)',
                  '--pn-ring': 'rgba(201, 164, 92, 0.65)',
                  '--pn-row-hover': 'rgba(201, 164, 92, 0.1)',
                } as React.CSSProperties}
                collapsedLabel={
                  <a
                    href="#home"
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick('#home');
                    }}
                    className="flex flex-col text-left leading-tight mr-auto pl-1 min-w-0 focus:outline-none"
                  >
                    <span className="font-serif-elegant text-sm sm:text-base font-bold tracking-wider uppercase text-[#F5F1E8] truncate">
                      Golden Wizard
                    </span>
                    <span className="text-[9px] tracking-[0.22em] text-[#C9A45C] font-semibold uppercase truncate">
                      Professional Salon
                    </span>
                  </a>
                }
                renderMobilePanel={({ close }) => (
                  <div className="flex flex-col gap-2.5 pt-1 pb-1">
                    <AnimatedList
                      items={mobileItems}
                      initialSelectedIndex={mobileSelectedIndex}
                      animation="none"
                      theme="dark"
                      animateOnce={true}
                      selectOnHover={false}
                      enableArrowNavigation={true}
                      showGradients={false}
                      displayScrollbar={false}
                      frame={false}
                      accentColor="#C9A45C"
                      width="100%"
                      maxHeight="none"
                      gap={6}
                      radius={12}
                      style={{
                        '--al-tile': 'linear-gradient(180deg, #1A1A1A 0%, #121212 100%)',
                        '--al-tile-edge': 'rgba(201, 164, 92, 0.16)',
                        '--al-tile-highlight': 'rgba(255, 255, 255, 0.05)',
                        '--al-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
                        '--al-well': 'rgba(201, 164, 92, 0.12)',
                        '--al-ink': '#F5F5F5',
                        '--al-muted': '#A5A5A5',
                        '--al-thumb': 'rgba(201, 164, 92, 0.35)',
                      } as React.CSSProperties}
                      renderItem={(item) => {
                        const entry = typeof item === 'object' ? item : { title: String(item) };
                        const isExternal = typeof entry.href === 'string' && entry.href.startsWith('http');
                        const inner = (
                          <>
                            {entry.icon && (
                              <span className="animated-list__lead">{entry.icon}</span>
                            )}
                            <span className="animated-list__text">
                              <span className="animated-list__title">{entry.title}</span>
                              {entry.description && (
                                <span className="animated-list__description">{entry.description}</span>
                              )}
                            </span>
                          </>
                        );
                        if (isExternal && entry.href) {
                          return (
                            <a
                              href={entry.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => close()}
                              className="flex items-center gap-3 w-full text-inherit no-underline"
                            >
                              {inner}
                            </a>
                          );
                        }
                        return inner;
                      }}
                      onItemSelect={(item) => {
                        const targetHref = typeof item === 'object' && item.href ? String(item.href) : '#home';
                        close();
                        if (!targetHref.startsWith('http')) {
                          window.setTimeout(() => {
                            handleLinkClick(targetHref);
                          }, 40);
                        }
                      }}
                    />

                    {/* Quick Mobile Salon Actions inside Menu Footer */}
                    <div className="px-1.5 pt-2 border-t border-white/10 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        {onOpenBookingModal ? (
                          <button
                            type="button"
                            onClick={() => {
                              close();
                              onOpenBookingModal();
                            }}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>Book Appointment</span>
                          </button>
                        ) : (
                          <a
                            href={whatsappBookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => close()}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] text-xs font-bold uppercase tracking-wider transition-colors"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>Book Appointment</span>
                          </a>
                        )}
                        <a
                          href={whatsappEnquiryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => close()}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#25D366]/45 bg-[#161616] text-[#25D366] text-xs font-bold uppercase tracking-wider hover:bg-[#1E1E1E] transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Enquire Now</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${SALON_INFO.phoneRaw}`}
                          onClick={() => close()}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#C9A45C]/35 bg-[#181818] text-[#F5F1E8] text-xs font-semibold hover:border-[#C9A45C] transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#C9A45C]" />
                          <span>Call Salon</span>
                        </a>
                        {onOpenAdminPortal && (
                          <button
                            type="button"
                            onClick={() => {
                              close();
                              onOpenAdminPortal();
                            }}
                            className="flex-1 py-2 px-3 rounded-xl border border-white/10 bg-[#141414] text-[#C9A45C] text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-[#C9A45C]/40 transition-colors cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>Owner Portal</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>

            {/* Right Action Buttons (Tablet & Desktop): Call Us & Book Appointment (WhatsApp) */}
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
              <a
                href={`tel:${SALON_INFO.phoneRaw}`}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors border border-white/10 hover:border-[#C9A45C]/50 text-[#F5F1E8] bg-[#1B1B1B] hover:bg-[#242424] whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5 text-[#C9A45C]" strokeWidth={1.75} />
                <span>Call Us</span>
              </a>

              {onOpenBookingModal ? (
                <button
                  type="button"
                  onClick={onOpenBookingModal}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold tracking-wider uppercase rounded-xl bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Book Appointment</span>
                </button>
              ) : (
                <a
                  href={whatsappBookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold tracking-wider uppercase rounded-xl bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Book Appointment</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

