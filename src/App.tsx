/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { salonDb } from './services/db';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { ServicesSection } from './components/ServicesSection';
import { PdfMenuShowcase } from './components/PdfMenuShowcase';
import { CertificateShowcase } from './components/CertificateShowcase';
import { WhyChooseUs } from './components/WhyChooseUs';
import { GallerySection } from './components/GallerySection';
import { ReviewsSection } from './components/ReviewsSection';
import { PublicQASection } from './components/PublicQASection';
import { AskQuestionForm } from './components/AskQuestionForm';
import { BookingSection } from './components/BookingSection';
import { LocationContactSection } from './components/LocationContactSection';
import { OurBranchesSection } from './components/OurBranchesSection';
import { BranchBookingModal } from './components/BranchBookingModal';
import { Footer } from './components/Footer';
import { FloatingContactDock } from './components/FloatingContactDock';
import { WelcomeModal } from './components/WelcomeModal';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage, AdminTab } from './pages/AdminDashboardPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BranchId } from './data/salonData';
import { Sparkles, X } from 'lucide-react';

function MainAppContent() {
  const isLight = false;

  // Client-side URL path routing
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  // Admin session token — stored in sessionStorage so it survives page refreshes
  // within the same browser session tab, but is cleared when the tab is closed.
  // On mount, we re-validate any stored token with /api/admin/me before trusting it.
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  useEffect(() => {
    // On mount: attempt to restore session from sessionStorage
    // We call /api/admin/me to verify the stored token is still valid.
    // If the token is expired or invalid, we clear it and show the login page.
    if (typeof window === 'undefined') { setAuthChecked(true); return; }

    // Remove any old localStorage tokens from previous implementations
    localStorage.removeItem('gw_admin_token');
    localStorage.removeItem('gw_admin_username');

    const storedToken = sessionStorage.getItem('gw_admin_token');
    const storedUsername = sessionStorage.getItem('gw_admin_username');

    if (!storedToken) {
      setAuthChecked(true);
      return;
    }

    // Validate the stored token with the server before restoring the session
    fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.authenticated) {
          setAdminToken(storedToken);
          setAdminUsername(data.username || storedUsername || '');
        } else {
          sessionStorage.removeItem('gw_admin_token');
          sessionStorage.removeItem('gw_admin_username');
        }
      })
      .catch(() => {
        sessionStorage.removeItem('gw_admin_token');
        sessionStorage.removeItem('gw_admin_username');
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // Switch between Q&A administration and full salon operations suite
  const [adminViewMode, setAdminViewMode] = useState<'qa' | 'salon'>('qa');

  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<string>('');
  const [selectedBranchForBooking, setSelectedBranchForBooking] = useState<BranchId>('branch-1');
  const [isBranchBookingModalOpen, setIsBranchBookingModalOpen] = useState(false);
  const [settings, setSettings] = useState(salonDb.getSettings());
  const [dismissAnnouncement, setDismissAnnouncement] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('gw_announcement_dismissed_session') === 'true';
    }
    return false;
  });

  // Fetch verified settings from server endpoint
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error('Not ok');
      })
      .then((data) => {
        if (data && typeof data === 'object') {
          setSettings((prev) => ({
            ...prev,
            announcement: data.announcement || prev.announcement,
            showAnnouncement:
              data.showAnnouncement !== undefined
                ? data.showAnnouncement
                : prev.showAnnouncement,
            whatsappNumber: data.whatsappNumber || prev.whatsappNumber,
            phone: data.phone || prev.phone,
            hours: data.hours || prev.hours,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Sync settings with local db fallback
  useEffect(() => {
    return salonDb.subscribe(() => {
      setSettings((prev) => ({ ...prev, ...salonDb.getSettings() }));
    });
  }, []);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Safe client-side navigation
  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route security guard: Protect /admin, /admin/questions, /admin/settings
  const isProtectedAdminPath =
    currentPath === '/admin' ||
    currentPath.startsWith('/admin/') && currentPath !== '/admin/login';

  useEffect(() => {
    // Don't redirect until we've checked sessionStorage for a valid token
    if (!authChecked) return;
    if (isProtectedAdminPath && !adminToken) {
      window.history.replaceState(null, '', '/admin/login');
      setCurrentPath('/admin/login');
    }
  }, [currentPath, adminToken, isProtectedAdminPath, authChecked]);

  // If already authenticated and user visits /admin/login, smoothly redirect
  useEffect(() => {
    if (!authChecked) return;
    if (currentPath === '/admin/login' && adminToken) {
      navigate('/admin');
    }
  }, [currentPath, adminToken, authChecked]);

  // Login handler — saves token to sessionStorage so refresh restores the session
  const handleLoginSuccess = (token: string, username: string) => {
    sessionStorage.setItem('gw_admin_token', token);
    sessionStorage.setItem('gw_admin_username', username);
    setAdminToken(token);
    setAdminUsername(username);
    navigate('/admin');
  };

  // Logout handler — clears sessionStorage and in-memory token
  const handleLogout = () => {
    const tokenToRevoke = adminToken;
    if (tokenToRevoke) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenToRevoke}` },
      }).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('gw_admin_token');
      sessionStorage.removeItem('gw_admin_username');
      localStorage.removeItem('gw_admin_token');
      localStorage.removeItem('gw_admin_username');
    }
    setAdminToken(null);
    setAdminUsername('');
    navigate('/admin/login');
  };

  const scrollToBooking = () => {
    if (currentPath !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById('booking');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return;
    }
    const el = document.getElementById('booking');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToServices = () => {
    if (currentPath !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById('services');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return;
    }
    const el = document.getElementById('services');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToAskQuestion = () => {
    if (currentPath !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById('ask-question-form') || document.getElementById('faqs');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return;
    }
    const el = document.getElementById('ask-question-form') || document.getElementById('faqs');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectServiceForBooking = (serviceName: string) => {
    setSelectedServiceForBooking(serviceName);
    scrollToBooking();
  };

  const handleChooseBranchForm = (branchId: BranchId) => {
    setSelectedBranchForBooking(branchId);
    scrollToBooking();
  };

  const openBranchBookingModal = () => {
    setIsBranchBookingModalOpen(true);
  };

  // -------------------------------------------------------------
  // LOADING: Wait for sessionStorage auth check before rendering admin routes
  // This prevents a flash to /admin/login when the owner has a valid stored token
  // -------------------------------------------------------------
  if (!authChecked && (currentPath === '/admin/login' || isProtectedAdminPath)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="text-[#C9A45C] text-sm font-semibold tracking-widest uppercase animate-pulse">
          Verifying session…
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ROUTE 1: /admin/login (Owner Login Page)
  // -------------------------------------------------------------
  if (currentPath === '/admin/login') {
    return (
      <AdminLoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // -------------------------------------------------------------
  // ROUTE 2: /admin, /admin/questions, /admin/settings (Owner Dashboard)
  // -------------------------------------------------------------
  if (isProtectedAdminPath && adminToken) {
    if (adminViewMode === 'salon') {
      return (
        <AdminDashboard
          token={adminToken}
          username={adminUsername}
          onUsernameUpdated={(newUsername) => setAdminUsername(newUsername)}
          onLogout={handleLogout}
          onViewPublicSite={() => navigate('/')}
          onSwitchToQA={() => setAdminViewMode('qa')}
        />
      );
    }

    let initialTab: AdminTab = 'overview';
    if (currentPath === '/admin/questions') {
      initialTab = 'pending';
    } else if (currentPath === '/admin/menu') {
      initialTab = 'menu';
    } else if (currentPath === '/admin/certificates') {
      initialTab = 'certificates';
    } else if (currentPath === '/admin/bookings') {
      initialTab = 'bookings';
    } else if (currentPath === '/admin/settings') {
      initialTab = 'settings';
    }

    return (
      <AdminDashboardPage
        token={adminToken}
        username={adminUsername}
        onUsernameUpdated={(newUsername) => setAdminUsername(newUsername)}
        initialTab={initialTab}
        onTabChange={(tab) => {
          if (tab === 'overview') {
            if (window.location.pathname !== '/admin') {
              window.history.pushState(null, '', '/admin');
              setCurrentPath('/admin');
            }
          } else if (tab === 'menu') {
            if (window.location.pathname !== '/admin/menu') {
              window.history.pushState(null, '', '/admin/menu');
              setCurrentPath('/admin/menu');
            }
          } else if (tab === 'certificates') {
            if (window.location.pathname !== '/admin/certificates') {
              window.history.pushState(null, '', '/admin/certificates');
              setCurrentPath('/admin/certificates');
            }
          } else if (tab === 'pending' || tab === 'answered') {
            if (window.location.pathname !== '/admin/questions') {
              window.history.pushState(null, '', '/admin/questions');
              setCurrentPath('/admin/questions');
            }
          } else if (tab === 'bookings') {
            if (window.location.pathname !== '/admin/bookings') {
              window.history.pushState(null, '', '/admin/bookings');
              setCurrentPath('/admin/bookings');
            }
          } else if (tab === 'settings') {
            if (window.location.pathname !== '/admin/settings') {
              window.history.pushState(null, '', '/admin/settings');
              setCurrentPath('/admin/settings');
            }
          }
        }}
        onLogout={handleLogout}
        onNavigateHome={() => navigate('/')}
        onSwitchToSalonOperations={() => setAdminViewMode('salon')}
      />
    );
  }

  // -------------------------------------------------------------
  // ROUTE 3: / (Public Golden Wizard Salon Website & Q&A)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col relative bg-[#0D0D0D] text-[#F5F1E8]">
      {/* Welcome Announcement Bar (Configurable, Gold Gradient, Session Dismissible) */}
      {settings.showAnnouncement && settings.announcement && !dismissAnnouncement && (
        <aside
          aria-label="Salon Announcement"
          className="bg-gradient-to-r from-[#D6B979] via-[#C6A15B] to-[#D6B979] text-[#111111] text-[11px] sm:text-xs py-2 px-4 font-semibold flex items-center justify-between text-center relative z-50 shadow-sm border-b border-black/10 animate-fade-in"
        >
          <div className="flex-1 flex items-center justify-center gap-2 max-w-5xl mx-auto tracking-wide">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#111111]" />
            <span className="line-clamp-2 sm:line-clamp-1">{settings.announcement}</span>
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('gw_announcement_dismissed_session', 'true');
              }
              setDismissAnnouncement(true);
            }}
            className="text-[#111111]/70 hover:text-[#111111] p-1 ml-2 rounded transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss announcement banner"
            title="Dismiss announcement for this session"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Premium Sticky Navigation with Working Theme Switcher & Admin Link */}
      <Navbar
        onOpenBookingModal={openBranchBookingModal}
        onOpenAdminPortal={() => navigate('/admin/login')}
        whatsappNumber={settings.whatsappNumber}
      />

      {/* Main Content Sections: Prioritized Customer Flow (isolated stacking context below sticky header and modals) */}
      <main className="flex-1 relative z-0 isolate">
        {/* 1. Salon Introduction: Hero */}
        <Hero
          onExploreServices={scrollToServices}
          onBookAppointment={openBranchBookingModal}
          whatsappNumber={settings.whatsappNumber}
        />

        {/* 2. Services (Existing Visual Service Photograph Showcase) */}
        <ServicesSection
          onSelectServiceForBooking={handleSelectServiceForBooking}
          whatsappNumber={settings.whatsappNumber}
        />

        {/* 2b. Official 7-Page PDF Menu Showcase */}
        <PdfMenuShowcase />

        {/* 3. Appointment Booking (Immediately Accessible) */}
        <BookingSection
          preselectedService={selectedServiceForBooking}
          onClearPreselectedService={() => setSelectedServiceForBooking('')}
          selectedBranchId={selectedBranchForBooking}
          onSelectBranchId={setSelectedBranchForBooking}
          whatsappNumber={settings.whatsappNumber}
        />

        {/* 4. Our Work: Compact 2-Column Genuine Photo Gallery */}
        <GallerySection />

        {/* 5. Salon Introduction: Compact About */}
        <About />

        {/* 6. Why Choose Us: 4 Key Standards */}
        <WhyChooseUs />

        {/* 7. Recognition & Professional Credentials */}
        <CertificateShowcase />

        {/* 8. Verified Google Reviews (4.4 Rating & 171 Reviews) */}
        <ReviewsSection />

        {/* 9. Ask a Question Form */}
        <AskQuestionForm />

        {/* 10. Frequently Asked Questions (Answered & Searchable) */}
        <PublicQASection />

        {/* 11. Salon Location & Contact (Phone, Timings, Map) */}
        <LocationContactSection whatsappNumber={settings.whatsappNumber} />

        {/* 12. Our Branches (Branch 1 & Branch 2) */}
        <OurBranchesSection
          whatsappNumber={settings.whatsappNumber}
          onSelectBranchForBooking={handleChooseBranchForm}
        />
      </main>

      {/* Footer with Salon Owner Portal Trigger */}
      <Footer
        onOpenAdminPortal={() => navigate('/admin/login')}
        onBookAppointment={openBranchBookingModal}
        whatsappNumber={settings.whatsappNumber}
      />

      {/* Floating Contact Dock (BOOK APPOINTMENT + CALL only) */}
      <FloatingContactDock
        onBookClick={openBranchBookingModal}
        whatsappNumber={settings.whatsappNumber}
      />

      {/* Welcome Modal on Site Open (2s delay, Book, Call, Ask question options) */}
      <WelcomeModal
        onBookAppointment={openBranchBookingModal}
        onAskQuestion={scrollToAskQuestion}
        whatsappNumber={settings.whatsappNumber}
      />

      {/* Branch Selection Modal for Book Appointment triggers */}
      <BranchBookingModal
        isOpen={isBranchBookingModalOpen}
        onClose={() => setIsBranchBookingModalOpen(false)}
        onChooseFormForBranch={handleChooseBranchForm}
        whatsappNumber={settings.whatsappNumber}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppContent />
    </ThemeProvider>
  );
}
