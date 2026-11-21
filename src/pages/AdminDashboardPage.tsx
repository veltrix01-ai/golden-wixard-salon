import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  HelpCircle,
  CheckCircle2,
  Clock,
  Settings,
  LogOut,
  Send,
  Eye,
  Trash2,
  Edit,
  RotateCcw,
  AlertCircle,
  Menu,
  X,
  ExternalLink,
  Shield,
  Palette,
  Sparkles,
  Calendar,
  Phone,
  MessageSquare,
  Check,
  XCircle,
  Sun,
  Moon,
  Store,
  MapPin,
  RefreshCw,
  Scissors,
  Award,
} from 'lucide-react';
import { MenuManagerPanel } from '../components/admin/MenuManagerPanel';
import { CertificateManagerPanel } from '../components/admin/CertificateManagerPanel';
import { OwnerSecuritySettingsPanel } from '../components/admin/OwnerSecuritySettingsPanel';

interface QuestionItem {
  id: string;
  question: string;
  asker_name?: string | null;
  answer?: string | null;
  status: 'pending' | 'answered';
  created_at: string;
  answered_at?: string | null;
}

export type AdminTab = 'overview' | 'menu' | 'certificates' | 'pending' | 'answered' | 'bookings' | 'settings';

export interface BookingItem {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  preferred_date: string;
  preferred_time: string;
  notes?: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  assigned_staff?: string | null;
  created_at: string;
}

interface AdminDashboardPageProps {
  token: string;
  username: string;
  onUsernameUpdated?: (newUsername: string) => void;
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  onSwitchToSalonOperations?: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  token,
  username,
  onUsernameUpdated,
  initialTab = 'overview',
  onTabChange,
  onLogout,
  onNavigateHome,
  onSwitchToSalonOperations,
}) => {
  const isLight = false;

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSwitchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
    onTabChange?.(tab);
  };

  // Active in-memory session token getter
  const getAuthToken = () => token;

  // Questions state
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Bookings state
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  // Website Settings state
  const [businessName, setBusinessName] = useState('Golden Wizard Professional Salon');
  const [salonPhone, setSalonPhone] = useState('+91 86863 85552');
  const [whatsappNumber, setWhatsappNumber] = useState('918686385552');
  const [salonAddress, setSalonAddress] = useState('4, Gandi Maisamma X Rd, Opposite Indian Oil Petrol Pump, Gandi Maisamma, Hyderabad, Telangana 500043');
  const [openingHours, setOpeningHours] = useState('Monday to Sunday: 9:00 AM - 9:00 PM (Open daily until 9:00 PM)');
  const [googleMapsLink, setGoogleMapsLink] = useState('https://www.google.com/maps/dir/?api=1&destination=Golden+Wizard+Professional+Salon+Gandi+Maisamma+Hyderabad+500043');
  const [announcementText, setAnnouncementText] = useState('Welcome to Golden Wizard Professional Salon. Experience world-class hair and beauty care in Gandi Maisamma.');
  const [showAnnouncementBanner, setShowAnnouncementBanner] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Answer drafting & action states
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState<Record<string, boolean>>({});
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);

  // In-app Modals (replacing window.confirm)
  const [questionToDelete, setQuestionToDelete] = useState<QuestionItem | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);
  const [questionToUnpublish, setQuestionToUnpublish] = useState<QuestionItem | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingItem | null>(null);

  // Brand primary color customization
  const [brandPrimaryColor, setBrandPrimaryColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gw_custom_brand_color') || '#C9A45C';
    }
    return '#C9A45C';
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Fetch all questions from admin endpoint
  const fetchAdminQuestions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch('/api/admin/questions', {
        headers: {
          Authorization: `Bearer ${activeAuthToken}`,
        },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load questions from server.');
      }
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not fetch admin questions.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch bookings from admin endpoint
  const fetchAdminBookings = async () => {
    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch('/api/admin/bookings', {
        headers: {
          Authorization: `Bearer ${activeAuthToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  // Fetch settings from admin endpoint
  const fetchAdminSettings = async () => {
    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${activeAuthToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.businessName) setBusinessName(data.businessName);
        if (data.phone) setSalonPhone(data.phone);
        if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
        if (data.address) setSalonAddress(data.address);
        if (data.hours) setOpeningHours(data.hours);
        if (data.googleMapsLink) setGoogleMapsLink(data.googleMapsLink);
        if (data.announcement) setAnnouncementText(data.announcement);
        if (data.showAnnouncement !== undefined) setShowAnnouncementBanner(data.showAnnouncement);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchAdminQuestions();
    fetchAdminBookings();
    fetchAdminSettings();
  }, []);

  const pendingQuestions = questions.filter((q) => q.status === 'pending');
  const answeredQuestions = questions.filter((q) => q.status === 'answered');
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');

  // Publish Answer
  const handlePublishAnswer = async (questionId: string) => {
    const draft = answerDrafts[questionId]?.trim();
    if (!draft || draft.length < 5) {
      showToast('Answer must be at least 5 characters long.');
      return;
    }

    setIsPublishing((prev) => ({ ...prev, [questionId]: true }));
    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch(`/api/admin/questions/${questionId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeAuthToken}`,
        },
        body: JSON.stringify({ answer: draft }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish answer.');
      }

      showToast('Answer published! The question is now visible on the public website.');
      
      // Update local state immediately
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answer: draft, status: 'answered', answered_at: new Date().toISOString() }
            : q
        )
      );

      setAnswerDrafts((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });

      fetchAdminQuestions();
    } catch (err: any) {
      showToast(err.message || 'Error publishing answer');
    } finally {
      setIsPublishing((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // Save Edited Answer
  const handleSaveEditedAnswer = async (questionId: string) => {
    const draft = answerDrafts[questionId]?.trim();
    if (!draft || draft.length < 5) {
      showToast('Answer must be at least 5 characters long.');
      return;
    }

    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeAuthToken}`,
        },
        body: JSON.stringify({ answer: draft }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update answer.');
      }

      showToast('Answer updated successfully.');
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, answer: draft } : q))
      );
      setEditingAnswerId(null);
      fetchAdminQuestions();
    } catch (err: any) {
      showToast(err.message || 'Error updating answer');
    }
  };

  // Unpublish Answer
  const handleConfirmUnpublish = async () => {
    if (!questionToUnpublish) return;
    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch(`/api/admin/questions/${questionToUnpublish.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeAuthToken}`,
        },
        body: JSON.stringify({ unpublish: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unpublish.');
      }

      showToast('Answer unpublished and returned to Pending.');
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionToUnpublish.id ? { ...q, status: 'pending', answered_at: null } : q
        )
      );
      setQuestionToUnpublish(null);
      fetchAdminQuestions();
    } catch (err: any) {
      showToast(err.message || 'Error unpublishing answer');
    }
  };

  // Delete Question
  const handleConfirmDelete = async () => {
    if (!questionToDelete || isDeletingQuestion) return;
    setIsDeletingQuestion(true);
    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch(`/api/admin/questions/${questionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${activeAuthToken}`,
        },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete question.');
      }

      const wasPublished = questionToDelete.status === 'answered';
      showToast(
        wasPublished
          ? 'Published Q&A deleted and removed from the public website.'
          : 'Question deleted permanently.'
      );
      setQuestions((prev) => prev.filter((q) => q.id !== questionToDelete.id));
      setQuestionToDelete(null);
      fetchAdminQuestions();
    } catch (err: any) {
      showToast(err.message || 'Error deleting question');
    } finally {
      setIsDeletingQuestion(false);
    }
  };

  // Update Booking Status
  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  ) => {
    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeAuthToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update booking status.');
      showToast(`Booking marked as ${newStatus}`);
      fetchAdminBookings();
    } catch (err: any) {
      showToast(err.message || 'Error updating booking status');
    }
  };

  // Delete Booking
  const handleConfirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch(`/api/admin/bookings/${bookingToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${activeAuthToken}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete booking.');
      showToast('Booking deleted.');
      setBookings((prev) => prev.filter((b) => b.id !== bookingToDelete.id));
      setBookingToDelete(null);
      fetchAdminBookings();
    } catch (err: any) {
      showToast(err.message || 'Error deleting booking');
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const activeAuthToken = getAuthToken();
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeAuthToken}`,
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          phone: salonPhone.trim(),
          whatsappNumber: whatsappNumber.trim(),
          address: salonAddress.trim(),
          hours: openingHours.trim(),
          googleMapsLink: googleMapsLink.trim(),
          announcement: announcementText.trim(),
          showAnnouncement: showAnnouncementBanner,
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings.');
      showToast('Website and salon business settings saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Error saving settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${
        isLight ? 'bg-[#FAF9F6] text-[#24211C]' : 'bg-[#0D0D0D] text-[#F5F1E8]'
      }`}
    >
      {/* Toast Alert */}
      {successToast && (
        <div
          className={`fixed top-5 right-5 z-50 text-xs px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 border animate-fade-in ${
            isLight
              ? 'bg-white border-[#A9823D] text-[#24211C]'
              : 'bg-[#1C1C1C] border-[#C9A45C] text-[#F5F1E8]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#C9A45C]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Mobile Top Navbar */}
      <div
        className={`md:hidden p-4 flex items-center justify-between sticky top-0 z-40 border-b transition-colors ${
          isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#141414] border-[#C9A45C]/25'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="font-serif-elegant font-bold text-base tracking-wide">
            Golden Wizard
          </span>
          <span className="text-[10px] uppercase tracking-widest text-[#C9A45C] font-semibold">
            Owner Board
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateHome}
            className="p-1.5 text-xs border rounded-lg transition-colors border-white/10 text-[#C9A45C] hover:bg-white/5 cursor-pointer"
            title="View Live Public Site"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 opacity-80 hover:opacity-100 cursor-pointer text-[#F5F1E8]"
            aria-label="Toggle menu"
          >
            {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-30 h-screen w-64 border-r flex flex-col justify-between transition-all duration-300 bg-[#121212] border-white/10 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="font-serif-elegant font-bold text-base tracking-wider uppercase text-[#F5F1E8]">
                Golden Wizard
              </h2>
              <span className="text-[10px] tracking-[0.2em] text-[#C9A45C] uppercase font-semibold block">
                Owner Dashboard
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5">
            <button
              onClick={() => handleSwitchTab('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? isLight
                    ? 'bg-[#F3EFE6] text-[#A9823D] font-bold border-l-2 border-[#A9823D]'
                    : 'bg-[#C9A45C]/15 text-[#E3C78D] font-semibold border-l-2 border-[#C9A45C]'
                  : isLight
                  ? 'text-[#716B61] hover:text-[#24211C] hover:bg-black/5'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-[#C9A45C]" />
                <span>Overview</span>
              </div>
            </button>

            <button
              onClick={() => handleSwitchTab('pending')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? isLight
                    ? 'bg-[#F3EFE6] text-[#A9823D] font-bold border-l-2 border-[#A9823D]'
                    : 'bg-[#C9A45C]/15 text-[#E3C78D] font-semibold border-l-2 border-[#C9A45C]'
                  : isLight
                  ? 'text-[#716B61] hover:text-[#24211C] hover:bg-black/5'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Pending Questions</span>
              </div>
              {pendingQuestions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold font-mono">
                  {pendingQuestions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSwitchTab('answered')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                activeTab === 'answered'
                  ? isLight
                    ? 'bg-[#F3EFE6] text-[#A9823D] font-bold border-l-2 border-[#A9823D]'
                    : 'bg-[#C9A45C]/15 text-[#E3C78D] font-semibold border-l-2 border-[#C9A45C]'
                  : isLight
                  ? 'text-[#716B61] hover:text-[#24211C] hover:bg-black/5'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Published Answers</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] opacity-60 font-mono">
                {answeredQuestions.length}
              </span>
            </button>

            <button
              onClick={() => handleSwitchTab('bookings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                activeTab === 'bookings'
                  ? isLight
                    ? 'bg-[#F3EFE6] text-[#A9823D] font-bold border-l-2 border-[#A9823D]'
                    : 'bg-[#C9A45C]/15 text-[#E3C78D] font-semibold border-l-2 border-[#C9A45C]'
                  : isLight
                  ? 'text-[#716B61] hover:text-[#24211C] hover:bg-black/5'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#C9A45C]" />
                <span>Appointments</span>
              </div>
              {pendingBookings.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold font-mono">
                  {pendingBookings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSwitchTab('menu')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-[#C9A45C]/15 text-[#E3C78D] font-semibold border-l-2 border-[#C9A45C]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Scissors className="w-4 h-4 text-[#C9A45C]" />
                <span>Menu &amp; Prices</span>
              </div>
            </button>

            <button
              onClick={() => handleSwitchTab('certificates')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                activeTab === 'certificates'
                  ? 'bg-[#C9A45C]/15 text-[#E3C78D] font-semibold border-l-2 border-[#C9A45C]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-[#C9A45C]" />
                <span>Certificates</span>
              </div>
            </button>

            <button
              onClick={() => handleSwitchTab('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? isLight
                    ? 'bg-[#F3EFE6] text-[#A9823D] font-bold border-l-2 border-[#A9823D]'
                    : 'bg-[#C9A45C]/15 text-[#E3C78D] font-semibold border-l-2 border-[#C9A45C]'
                  : isLight
                  ? 'text-[#716B61] hover:text-[#24211C] hover:bg-black/5'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-[#C9A45C]" />
                <span>Website Settings</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-black/5 dark:border-white/10 space-y-2">
          {onSwitchToSalonOperations && (
            <button
              onClick={onSwitchToSalonOperations}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 border text-xs font-semibold rounded-lg transition-colors cursor-pointer mb-1 shadow-sm ${
                isLight
                  ? 'bg-[#F5F2EB] border-[#A9823D]/30 text-[#A9823D] hover:bg-[#EFEAE0]'
                  : 'bg-[#1C1C1C] border-[#C9A45C]/40 text-[#E3C78D] hover:bg-[#252525]'
              }`}
            >
              <span>Salon Register & Customers</span>
            </button>
          )}

          <button
            onClick={onNavigateHome}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 border text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C]'
                : 'bg-[#1A1A1A] hover:bg-[#242424] border-white/10 text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#C9A45C]" />
            <span>View Public Website</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full overflow-x-hidden">
        {/* ========================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/10 dark:border-white/10">
              <div>
                <h1 className="font-serif-elegant text-2xl sm:text-3xl font-bold">
                  Owner Dashboard Overview
                </h1>
                <p className={`text-xs mt-1 ${isLight ? 'text-[#716B61]' : 'text-[#A5A5A5]'}`}>
                  Logged in as <strong className="text-[#C9A45C]">{username}</strong>. Manage questions, publish verified answers, and confirm appointments.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleSwitchTab('menu')}
                  className="px-3.5 py-2 font-semibold text-xs rounded-lg border border-[#C9A45C]/40 bg-[#1B1B1B] hover:bg-[#252525] text-[#E3C78D] cursor-pointer"
                >
                  Menu &amp; Prices
                </button>
                <button
                  onClick={() => handleSwitchTab('certificates')}
                  className="px-3.5 py-2 font-semibold text-xs rounded-lg border border-[#C9A45C]/40 bg-[#1B1B1B] hover:bg-[#252525] text-[#E3C78D] cursor-pointer"
                >
                  Certificates
                </button>
                <button
                  onClick={() => handleSwitchTab('pending')}
                  className={`px-4 py-2 font-semibold text-xs rounded-lg uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                    isLight
                      ? 'bg-[#A9823D] hover:bg-[#967232] text-white'
                      : 'bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]'
                  }`}
                >
                  Pending Questions ({pendingQuestions.length})
                </button>
              </div>
            </div>

            {/* Real Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
                isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#171717] border-white/10'
              }`}>
                <div className="flex items-center justify-between opacity-60 text-xs mb-1">
                  <span className="uppercase tracking-wider">Total Questions</span>
                  <HelpCircle className="w-4 h-4 text-[#C9A45C]" />
                </div>
                <div className="text-3xl font-bold font-serif-elegant mt-2">{questions.length}</div>
                <div className="text-[11px] opacity-60 mt-1">Real database records</div>
              </div>

              <div className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
                isLight ? 'bg-white border-amber-300' : 'bg-[#171717] border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs mb-1">
                  <span className="uppercase tracking-wider font-semibold">Pending Questions</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-3xl font-bold font-serif-elegant text-amber-600 dark:text-amber-400 mt-2">
                  {pendingQuestions.length}
                </div>
                <div className="text-[11px] opacity-60 mt-1">Awaiting owner answer</div>
              </div>

              <div className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
                isLight ? 'bg-white border-emerald-300' : 'bg-[#171717] border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs mb-1">
                  <span className="uppercase tracking-wider font-semibold">Published FAQs</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-3xl font-bold font-serif-elegant text-emerald-600 dark:text-emerald-400 mt-2">
                  {answeredQuestions.length}
                </div>
                <div className="text-[11px] opacity-60 mt-1">Live on public FAQ</div>
              </div>

              <div className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
                isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#171717] border-white/10'
              }`}>
                <div className="flex items-center justify-between opacity-60 text-xs mb-1">
                  <span className="uppercase tracking-wider">Appointments</span>
                  <Calendar className="w-4 h-4 text-[#C9A45C]" />
                </div>
                <div className="text-3xl font-bold font-serif-elegant mt-2">{bookings.length}</div>
                <div className="text-[11px] opacity-60 mt-1">
                  {pendingBookings.length} pending confirmation
                </div>
              </div>
            </div>

            {/* Split Grid: Recent Submissions & Recent Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Questions */}
              <div className={`border rounded-xl p-6 transition-colors ${
                isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#161616] border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/5 dark:border-white/10">
                  <h3 className="font-serif-elegant text-lg font-bold">
                    Recent Customer Questions
                  </h3>
                  <button
                    onClick={() => handleSwitchTab('pending')}
                    className="text-xs text-[#C9A45C] hover:underline cursor-pointer"
                  >
                    View All ({questions.length})
                  </button>
                </div>

                {questions.length === 0 ? (
                  <div className="py-10 text-center text-xs opacity-50">
                    No customer questions have been submitted yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.slice(0, 4).map((q) => (
                      <div
                        key={q.id}
                        className={`p-3.5 rounded-lg border text-xs space-y-1.5 transition-colors ${
                          isLight ? 'bg-[#F9F7F2] border-[#E8E1D5]' : 'bg-[#1C1C1C] border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {q.asker_name ? q.asker_name : 'Anonymous Visitor'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              q.status === 'answered'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {q.status}
                          </span>
                        </div>
                        <p className="opacity-80 italic line-clamp-1">"{q.question}"</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] opacity-50">{formatDate(q.created_at)}</span>
                          <button
                            onClick={() => handleSwitchTab(q.status === 'pending' ? 'pending' : 'answered')}
                            className="text-[#C9A45C] hover:underline font-semibold text-[11px] cursor-pointer"
                          >
                            {q.status === 'pending' ? 'Write Answer' : 'View Answer'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Bookings */}
              <div className={`border rounded-xl p-6 transition-colors ${
                isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#161616] border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/5 dark:border-white/10">
                  <h3 className="font-serif-elegant text-lg font-bold">
                    Recent Appointment Requests
                  </h3>
                  <button
                    onClick={() => handleSwitchTab('bookings')}
                    className="text-xs text-[#C9A45C] hover:underline cursor-pointer"
                  >
                    View All ({bookings.length})
                  </button>
                </div>

                {bookings.length === 0 ? (
                  <div className="py-10 text-center text-xs opacity-50">
                    No appointments available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.slice(0, 4).map((b) => (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-lg border text-xs space-y-1.5 transition-colors ${
                          isLight ? 'bg-[#F9F7F2] border-[#E8E1D5]' : 'bg-[#1C1C1C] border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{b.customer_name}</span>
                          <span className="font-mono text-[#C9A45C]">{b.customer_phone}</span>
                        </div>
                        <div className="flex items-center justify-between opacity-80">
                          <span>{b.service_name}</span>
                          <span className="text-[10px]">
                            {b.preferred_date} at {b.preferred_time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: PENDING QUESTIONS */}
        {/* ========================================================== */}
        {activeTab === 'pending' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-4 border-b border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif-elegant text-2xl font-bold flex items-center gap-2">
                  <span>Pending Questions</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {pendingQuestions.length}
                  </span>
                </h1>
                <p className={`text-xs mt-1 ${isLight ? 'text-[#716B61]' : 'text-[#A5A5A5]'}`}>
                  Submitted questions are private until you publish an official salon answer.
                </p>
              </div>
              <button
                onClick={fetchAdminQuestions}
                className="text-xs flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {pendingQuestions.length === 0 ? (
              <div className="py-16 text-center border rounded-xl bg-[#161616] border-white/10">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-serif-elegant text-lg font-bold">No pending questions.</h3>
                <p className="text-xs opacity-60 mt-1 max-w-sm mx-auto">
                  All customer queries have been answered. New questions submitted on the website will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`p-6 border rounded-xl space-y-4 shadow-sm transition-colors ${
                      isLight
                        ? 'bg-white border-[#E8E1D5]'
                        : 'bg-[#171717] border-[#C9A45C]/30'
                    }`}
                  >
                    {/* Header: Asker & Date */}
                    <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 text-xs">
                      <div>
                        <span className="opacity-60">Submitted by: </span>
                        <strong className="font-semibold">
                          {q.asker_name ? q.asker_name : 'Anonymous Visitor'}
                        </strong>
                      </div>
                      <div className="opacity-60 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#C9A45C]" />
                        <span>{formatDate(q.created_at)}</span>
                      </div>
                    </div>

                    {/* Question text */}
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[#C9A45C] font-bold mb-1">
                        Customer Question:
                      </div>
                      <div
                        className={`p-4 rounded-lg border text-sm leading-relaxed ${
                          isLight
                            ? 'bg-[#F9F7F2] border-[#E8E1D5] text-[#24211C]'
                            : 'bg-[#111111] border-white/5 text-[#F5F1E8]'
                        }`}
                      >
                        {q.question}
                      </div>
                    </div>

                    {/* Answer Textarea */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                        Verified Salon Answer <span className="text-[#C9A45C]">*</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Type your official answer here (minimum 5 characters)... When you click 'Publish Answer', it will immediately be live on the public FAQ page."
                        value={answerDrafts[q.id] || ''}
                        onChange={(e) =>
                          setAnswerDrafts({
                            ...answerDrafts,
                            [q.id]: e.target.value,
                          })
                        }
                        className={`w-full p-3.5 rounded-lg text-sm border focus:outline-none transition-colors ${
                          isLight
                            ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C] focus:border-[#A9823D]'
                            : 'bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C]'
                        }`}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setQuestionToDelete(q)}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Submission</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePublishAnswer(q.id)}
                        disabled={
                          isPublishing[q.id] ||
                          !answerDrafts[q.id] ||
                          answerDrafts[q.id].trim().length < 5
                        }
                        className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
                          isLight
                            ? 'bg-[#A9823D] hover:bg-[#967232] text-white'
                            : 'bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isPublishing[q.id] ? 'Publishing...' : 'Publish Answer'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: PUBLISHED ANSWERS */}
        {/* ========================================================== */}
        {activeTab === 'answered' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-4 border-b border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif-elegant text-2xl font-bold flex items-center gap-2">
                  <span>Published Questions and Answers</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    {answeredQuestions.length}
                  </span>
                </h1>
                <p className={`text-xs mt-1 ${isLight ? 'text-[#716B61]' : 'text-[#A5A5A5]'}`}>
                  These questions and answers are live on the public FAQ page. You can edit answers, unpublish back to pending, or delete.
                </p>
              </div>
              <button
                onClick={fetchAdminQuestions}
                className="text-xs flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {answeredQuestions.length === 0 ? (
              <div className="py-16 text-center border rounded-xl bg-[#161616] border-white/10">
                <HelpCircle className="w-10 h-10 opacity-30 mx-auto mb-2" />
                <h3 className="font-serif-elegant text-lg font-bold">No published answers yet.</h3>
                <p className="text-xs opacity-60 mt-1">
                  Go to the Pending Questions tab to answer questions and publish them to the public FAQ page.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {answeredQuestions.map((q) => {
                  const isEditing = editingAnswerId === q.id;
                  return (
                    <div
                      key={q.id}
                      className={`p-6 border rounded-xl space-y-4 shadow-sm transition-colors ${
                        isLight
                          ? 'bg-white border-[#E8E1D5]'
                          : 'bg-[#171717] border-emerald-500/20'
                      }`}
                    >
                      {/* Meta header */}
                      <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 text-xs">
                        <div>
                          <span className="opacity-60">Customer: </span>
                          <strong className="font-semibold">
                            {q.asker_name ? q.asker_name : 'Anonymous Visitor'}
                          </strong>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Live on Public Site
                          </span>
                          <span className="opacity-50 text-[11px]">
                            Answered: {formatDate(q.answered_at)}
                          </span>
                        </div>
                      </div>

                      {/* Question */}
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[#C9A45C] font-bold mb-1">
                          Question:
                        </div>
                        <div
                          className={`p-3.5 rounded-lg border text-sm font-medium ${
                            isLight
                              ? 'bg-[#F9F7F2] border-[#E8E1D5] text-[#24211C]'
                              : 'bg-[#111111] border-white/5 text-[#F5F1E8]'
                          }`}
                        >
                          {q.question}
                        </div>
                      </div>

                      {/* Answer / Edit Answer */}
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                          Published Answer:
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              rows={4}
                              value={
                                answerDrafts[q.id] !== undefined ? answerDrafts[q.id] : q.answer || ''
                              }
                              onChange={(e) =>
                                setAnswerDrafts({
                                  ...answerDrafts,
                                  [q.id]: e.target.value,
                                })
                              }
                              className={`w-full p-3.5 rounded-lg text-sm border focus:outline-none ${
                                isLight
                                  ? 'bg-[#F5F2EB] border-[#A9823D] text-[#24211C]'
                                  : 'bg-[#111111] border-[#C9A45C] text-[#F5F1E8]'
                              }`}
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingAnswerId(null)}
                                className="px-3 py-1.5 bg-neutral-200 dark:bg-[#252525] text-xs rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEditedAnswer(q.id)}
                                className={`px-4 py-1.5 font-bold text-xs rounded-lg uppercase cursor-pointer ${
                                  isLight
                                    ? 'bg-[#A9823D] hover:bg-[#967232] text-white'
                                    : 'bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]'
                                }`}
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`p-4 rounded-lg border text-sm leading-relaxed ${
                              isLight
                                ? 'bg-emerald-50 border-emerald-200 text-[#24211C]'
                                : 'bg-[#131A15] border-emerald-500/20 text-[#F5F1E8]'
                            }`}
                          >
                            {q.answer}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!isEditing && (
                        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                          <button
                            onClick={() => setQuestionToDelete(q)}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingAnswerId(q.id);
                                setAnswerDrafts({ ...answerDrafts, [q.id]: q.answer || '' });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                                isLight
                                  ? 'bg-[#F3EFE6] text-[#A9823D] hover:bg-[#EAE4D7]'
                                  : 'bg-[#252525] hover:bg-[#303030] text-[#E3C78D]'
                              }`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit Answer</span>
                            </button>
                            <button
                              onClick={() => setQuestionToUnpublish(q)}
                              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                              title="Revert to private pending status and remove from public website"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Unpublish</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: APPOINTMENTS */}
        {/* ========================================================== */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-4 border-b border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif-elegant text-2xl font-bold flex items-center gap-2">
                  <span>Customer Appointment Requests</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C9A45C]/20 text-[#C9A45C] font-mono font-bold">
                    {bookings.length}
                  </span>
                </h1>
                <p className={`text-xs mt-1 ${isLight ? 'text-[#716B61]' : 'text-[#A5A5A5]'}`}>
                  Online booking enquiries submitted by visitors on the public website.
                </p>
              </div>

              {/* Status filter tabs */}
              <div
                className={`flex flex-wrap items-center gap-1 p-1 rounded-lg border text-xs ${
                  isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#141414] border-white/10'
                }`}
              >
                {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((filter) => {
                  const count =
                    filter === 'all'
                      ? bookings.length
                      : bookings.filter((b) => b.status === filter).length;
                  return (
                    <button
                      key={filter}
                      onClick={() => setBookingFilter(filter)}
                      className={`px-3 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        bookingFilter === filter
                          ? isLight
                            ? 'bg-[#A9823D] text-white font-bold shadow-sm'
                            : 'bg-[#C9A45C] text-[#0D0D0D] font-bold shadow-sm'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span>{filter}</span>
                      <span className="text-[10px] opacity-80 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bookings List */}
            {(() => {
              const filteredList = bookings.filter((b) => {
                if (bookingFilter === 'all') return true;
                return b.status === bookingFilter;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="py-16 text-center border rounded-xl bg-[#161616] border-white/10">
                    <Calendar className="w-10 h-10 opacity-30 mx-auto mb-2" />
                    <h3 className="font-serif-elegant text-lg font-bold">
                      No appointments available.
                    </h3>
                    <p className="text-xs opacity-60 mt-1 max-w-sm mx-auto">
                      Appointments submitted by clients via the website booking form will be recorded here in real-time.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filteredList.map((booking) => {
                    const cleanPhone = booking.customer_phone.replace(/\D/g, '');
                    return (
                      <div
                        key={booking.id}
                        className={`p-5 border rounded-xl space-y-4 shadow-sm transition-colors ${
                          isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#171717] border-white/10'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/5 dark:border-white/5 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-serif-elegant font-bold text-base">
                              {booking.customer_name}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                booking.status === 'confirmed'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : booking.status === 'completed'
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                  : booking.status === 'cancelled'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>
                          <span className="opacity-50 text-[11px]">
                            Received: {formatDate(booking.created_at)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className={`p-3 rounded-lg border ${
                            isLight ? 'bg-[#F9F7F2] border-[#E8E1D5]' : 'bg-[#111111] border-white/5'
                          }`}>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#C9A45C] block mb-1">
                              Requested Service
                            </span>
                            <span className="font-medium text-sm">{booking.service_name}</span>
                          </div>

                          <div className={`p-3 rounded-lg border ${
                            isLight ? 'bg-[#F9F7F2] border-[#E8E1D5]' : 'bg-[#111111] border-white/5'
                          }`}>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#C9A45C] block mb-1">
                              Preferred Schedule
                            </span>
                            <span className="font-medium">
                              Date: {booking.preferred_date || 'Flexible'} <br />
                              Time: {booking.preferred_time || 'Flexible'}
                            </span>
                          </div>

                          <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                            isLight ? 'bg-[#F9F7F2] border-[#E8E1D5]' : 'bg-[#111111] border-white/5'
                          }`}>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#C9A45C] block mb-1">
                              Contact Client
                            </span>
                            <div className="flex items-center gap-2 pt-1">
                              <a
                                href={`tel:${booking.customer_phone}`}
                                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 border transition-colors ${
                                  isLight
                                    ? 'bg-white border-[#E8E1D5] text-[#24211C]'
                                    : 'bg-white/5 border-white/10 text-white'
                                }`}
                              >
                                <Phone className="w-3 h-3 text-[#C9A45C]" />
                                <span>{booking.customer_phone}</span>
                              </a>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}?text=${encodeURIComponent(
                                    `Hello ${booking.customer_name}, this is Golden Wizard Professional Salon regarding your appointment request for ${booking.service_name}:`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {booking.notes && (
                          <div className={`p-3 rounded-lg border text-xs ${
                            isLight ? 'bg-[#F9F7F2] border-[#E8E1D5]' : 'bg-[#121212] border-white/5'
                          }`}>
                            <span className="text-[10px] uppercase font-bold opacity-60 block mb-0.5">
                              Client Notes:
                            </span>
                            <p className="italic">"{booking.notes}"</p>
                          </div>
                        )}

                        {/* Status Change & Delete */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-black/5 dark:border-white/5 text-xs">
                          <button
                            onClick={() => setBookingToDelete(booking)}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Record</span>
                          </button>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {booking.status !== 'confirmed' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                <span>Confirm</span>
                              </button>
                            )}
                            {booking.status !== 'completed' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>Complete</span>
                              </button>
                            )}
                            {booking.status !== 'cancelled' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                className="px-3 py-1.5 bg-neutral-600 hover:bg-neutral-500 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
                            )}
                            {booking.status !== 'pending' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, 'pending')}
                                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                              >
                                <span>Set to Pending</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 5: WEBSITE SETTINGS */}
        {/* ========================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-3xl">
            <div className="pb-4 border-b border-black/10 dark:border-white/10">
              <h1 className="font-serif-elegant text-2xl font-bold">Salon and Website Settings</h1>
              <p className={`text-xs mt-1 ${isLight ? 'text-[#716B61]' : 'text-[#A5A5A5]'}`}>
                Manage owner login security, official business identity, contact details, operating hours, and top announcement banner.
              </p>
            </div>

            <OwnerSecuritySettingsPanel
              authToken={token}
              currentUsername={username}
              onUsernameUpdated={onUsernameUpdated}
              onToast={showToast}
              onAuthError={onLogout}
            />

            {/* Business Contact & Profile Settings Card */}
            <div className={`p-6 border rounded-xl space-y-4 shadow-sm transition-colors ${
              isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#161616] border-white/10'
            }`}>
              <div className="flex items-center gap-2 text-[#C9A45C] pb-2 border-b border-black/5 dark:border-white/5">
                <Store className="w-4 h-4" />
                <h3 className="font-serif-elegant font-bold text-base">Business Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border focus:outline-none ${
                      isLight
                        ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C]'
                        : 'bg-[#111111] border-white/15 text-[#F5F1E8]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Direct Phone Number
                  </label>
                  <input
                    type="text"
                    value={salonPhone}
                    onChange={(e) => setSalonPhone(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border focus:outline-none ${
                      isLight
                        ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C]'
                        : 'bg-[#111111] border-white/15 text-[#F5F1E8]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 918686385552"
                    className={`w-full p-2.5 rounded-lg border focus:outline-none font-mono ${
                      isLight
                        ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C]'
                        : 'bg-[#111111] border-white/15 text-[#F5F1E8]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border focus:outline-none ${
                      isLight
                        ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C]'
                        : 'bg-[#111111] border-white/15 text-[#F5F1E8]'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Salon Physical Address
                  </label>
                  <input
                    type="text"
                    value={salonAddress}
                    onChange={(e) => setSalonAddress(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border focus:outline-none ${
                      isLight
                        ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C]'
                        : 'bg-[#111111] border-white/15 text-[#F5F1E8]'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold uppercase tracking-wider mb-1">
                    Google Maps Direction Link
                  </label>
                  <input
                    type="text"
                    value={googleMapsLink}
                    onChange={(e) => setGoogleMapsLink(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border focus:outline-none text-xs font-mono ${
                      isLight
                        ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C]'
                        : 'bg-[#111111] border-white/15 text-[#F5F1E8]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Announcement Banner Editor */}
            <div className={`p-6 border rounded-xl space-y-4 shadow-sm transition-colors ${
              isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#161616] border-white/10'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2 text-[#C9A45C]">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="font-serif-elegant font-bold text-base">Top Announcement Banner</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={showAnnouncementBanner}
                    onChange={(e) => setShowAnnouncementBanner(e.target.checked)}
                    className="rounded accent-[#C9A45C] cursor-pointer"
                  />
                  <span className="font-medium">Display on live website</span>
                </label>
              </div>

              <div className="space-y-2 text-xs">
                <label className="block font-semibold">Announcement Message:</label>
                <textarea
                  rows={2}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Welcome to Golden Wizard Professional Salon. Experience world-class hair and beauty care in Gandi Maisamma."
                  className={`w-full p-3 rounded-lg border focus:outline-none transition-colors ${
                    isLight
                      ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C] focus:border-[#A9823D]'
                      : 'bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C]'
                  }`}
                />
                <p className="text-[11px] opacity-60">
                  Displayed at the very top of the website for visitors.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                    isLight
                      ? 'bg-[#A9823D] hover:bg-[#967232] text-white'
                      : 'bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]'
                  }`}
                >
                  {isSavingSettings ? 'Saving...' : 'Save All Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 6: MENU MANAGEMENT & VERSION HISTORY */}
        {/* ========================================================== */}
        {activeTab === 'menu' && (
          <MenuManagerPanel
            authToken={getAuthToken()}
            onToast={showToast}
            onAuthError={onLogout}
          />
        )}

        {/* ========================================================== */}
        {/* TAB 7: CERTIFICATES MANAGEMENT */}
        {/* ========================================================== */}
        {activeTab === 'certificates' && (
          <CertificateManagerPanel
            authToken={getAuthToken()}
            onToast={showToast}
            onAuthError={onLogout}
          />
        )}
      </main>

      {/* Confirmation Modal: Delete Question */}
      {questionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`border rounded-xl p-6 max-w-md w-full shadow-2xl relative text-xs ${
              isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#181818] border-rose-500/50'
            }`}
          >
            <h3 className="font-serif-elegant text-lg font-bold mb-2 flex items-center gap-2 text-rose-500">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>
                {questionToDelete.status === 'answered'
                  ? 'Confirm Published Q&A Deletion'
                  : 'Confirm Question Deletion'}
              </span>
            </h3>
            <p className="opacity-80 mb-3">
              {questionToDelete.status === 'answered'
                ? 'This question and its official answer are currently published on the public website. Deleting this record removes it from both the Owner Dashboard and the Public FAQ.'
                : 'Are you sure you want to permanently delete this customer question? This action cannot be undone.'}
            </p>
            <div
              className={`p-3 rounded-lg border mb-3 space-y-1.5 ${
                isLight ? 'bg-[#F5F2EB] border-[#E8E1D5]' : 'bg-[#111111] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <span>From: {questionToDelete.asker_name || 'Anonymous Visitor'}</span>
                <span
                  className={`px-1.5 py-0.5 rounded uppercase font-semibold text-[10px] ${
                    questionToDelete.status === 'answered'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {questionToDelete.status === 'answered' ? 'Live on Public FAQ' : 'Pending'}
                </span>
              </div>
              <p className="italic">"{questionToDelete.question}"</p>
            </div>
            {questionToDelete.status === 'answered' && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] mb-4">
                Removing this published Q&amp;A immediately deletes it from the public Frequently Asked Questions section.
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingQuestion}
                onClick={() => setQuestionToDelete(null)}
                className="py-1.5 px-3 rounded-lg border opacity-75 hover:opacity-100 cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingQuestion}
                onClick={handleConfirmDelete}
                className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg uppercase cursor-pointer disabled:opacity-40"
              >
                {isDeletingQuestion ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Unpublish Answer */}
      {questionToUnpublish && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`border rounded-xl p-6 max-w-md w-full shadow-2xl relative text-xs ${
              isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#181818] border-amber-500/50'
            }`}
          >
            <h3 className="font-serif-elegant text-lg font-bold mb-2 flex items-center gap-2 text-amber-500">
              <RotateCcw className="w-5 h-5 shrink-0" />
              <span>Unpublish Question</span>
            </h3>
            <p className="opacity-80 mb-3">
              Are you sure you want to unpublish this answer? It will be immediately removed from the public website and returned to Pending.
            </p>
            <div
              className={`p-3 rounded-lg border mb-4 italic ${
                isLight ? 'bg-[#F5F2EB] border-[#E8E1D5]' : 'bg-[#111111] border-white/10'
              }`}
            >
              "{questionToUnpublish.question}"
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuestionToUnpublish(null)}
                className="py-1.5 px-3 rounded-lg border opacity-75 hover:opacity-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnpublish}
                className="py-1.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg uppercase cursor-pointer"
              >
                Unpublish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Booking */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`border rounded-xl p-6 max-w-md w-full shadow-2xl relative text-xs ${
              isLight ? 'bg-white border-[#E8E1D5]' : 'bg-[#181818] border-rose-500/50'
            }`}
          >
            <h3 className="font-serif-elegant text-lg font-bold mb-2 flex items-center gap-2 text-rose-500">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Confirm Booking Deletion</span>
            </h3>
            <p className="opacity-80 mb-3">
              Are you sure you want to delete the appointment request for{' '}
              <strong>{bookingToDelete.customer_name}</strong> ({bookingToDelete.service_name})?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBookingToDelete(null)}
                className="py-1.5 px-3 rounded-lg border opacity-75 hover:opacity-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBooking}
                className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg uppercase cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
