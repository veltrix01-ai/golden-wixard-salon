import React, { useState, useEffect } from 'react';
import {
  salonDb,
  Customer,
  CustomerVisit,
  Appointment,
  CustomerQuestion,
  Certificate,
  ServiceRecord,
  GalleryRecord,
  BusinessSettings,
} from '../../services/db';
import { CrownIcon } from '../CrownIcon';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarCheck,
  HelpCircle,
  Scissors,
  Image as ImageIcon,
  Award,
  Globe,
  Store,
  FileSpreadsheet,
  Settings,
  LogOut,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  Trash2,
  Edit,
  Download,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  AlertTriangle,
  RefreshCw,
  Eye,
  KeyRound,
  Database,
  ArrowUpRight,
  DollarSign,
  UserCheck,
  Upload,
} from 'lucide-react';
import { OwnerSecuritySettingsPanel } from './OwnerSecuritySettingsPanel';

interface AdminDashboardProps {
  token: string;
  username: string;
  onUsernameUpdated?: (newUsername: string) => void;
  onLogout: () => void;
  onViewPublicSite: () => void;
  onSwitchToQA?: () => void;
}

type TabType =
  | 'overview'
  | 'customers'
  | 'register'
  | 'appointments'
  | 'questions'
  | 'services'
  | 'gallery'
  | 'certificates'
  | 'content'
  | 'business'
  | 'reports'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  username,
  onUsernameUpdated,
  onLogout,
  onViewPublicSite,
  onSwitchToQA,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Database reactive state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [questions, setQuestions] = useState<CustomerQuestion[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [gallery, setGallery] = useState<GalleryRecord[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(salonDb.getSettings());

  // Modals & form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [showAddVisitModal, setShowAddVisitModal] = useState(false);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [customerToVisit, setCustomerToVisit] = useState<Customer | null>(null);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [showAddGalleryModal, setShowAddGalleryModal] = useState(false);
  const [answeringQuestion, setAnsweringQuestion] = useState<CustomerQuestion | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');

  // In-app delete & restore confirmation states
  const [visitToDelete, setVisitToDelete] = useState<CustomerVisit | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<CustomerQuestion | null>(null);
  const [galleryToDelete, setGalleryToDelete] = useState<GalleryRecord | null>(null);
  const [certificateToDelete, setCertificateToDelete] = useState<Certificate | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    customers: Customer[];
    visits: CustomerVisit[];
    appointments?: Appointment[];
    questions?: CustomerQuestion[];
    services?: ServiceRecord[];
    gallery?: GalleryRecord[];
    certificates?: Certificate[];
    settings?: Partial<BusinessSettings> & Record<string, unknown>;
    exportDate?: string;
  } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  // Daily register filter
  const todayStr = new Date().toISOString().split('T')[0];
  const [registerDate, setRegisterDate] = useState<string>(todayStr);
  const [registerStatusFilter, setRegisterStatusFilter] = useState<string>('all');
  const [registerSearch, setRegisterSearch] = useState<string>('');

  // Customer search & filter
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customerServiceFilter, setCustomerServiceFilter] = useState<string>('all');

  // Appointment filter
  const [aptStatusFilter, setAptStatusFilter] = useState<string>('all');
  const [aptDateFilter, setAptDateFilter] = useState<string>('');

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = () => {
    setCustomers(salonDb.getCustomers(false));
    setVisits(salonDb.getVisits());
    setAppointments(salonDb.getAppointments());
    setQuestions(salonDb.getQuestions());
    setServices(salonDb.getServices());
    setGallery(salonDb.getGallery());
    setCertificates(salonDb.getCertificates());
    setSettings(salonDb.getSettings());
  };

  const syncWithServerSalonOps = async () => {
    try {
      const res = await fetch('/api/admin/salon-ops', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const serverCustomers: Customer[] = Array.isArray(data.customers) ? data.customers : [];
      const serverVisits: CustomerVisit[] = Array.isArray(data.visits) ? data.visits : [];

      const localAllCustomers = salonDb.getCustomers(true);
      const localVisits = salonDb.getVisits();

      if (
        serverCustomers.length === 0 &&
        serverVisits.length === 0 &&
        (localAllCustomers.length > 0 || localVisits.length > 0)
      ) {
        const syncRes = await fetch('/api/admin/salon-ops/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ customers: localAllCustomers, visits: localVisits }),
        });
        if (syncRes.ok) {
          const synced = await syncRes.json();
          salonDb.syncCustomersAndVisits(synced.customers || [], synced.visits || []);
        }
      } else {
        salonDb.syncCustomersAndVisits(serverCustomers, serverVisits);
      }
    } catch {
      // keep existing local state if network hiccups
    }
  };

  useEffect(() => {
    loadData();
    syncWithServerSalonOps();
    return salonDb.subscribe(() => {
      loadData();
    });
  }, [token]);

  const handleConfirmDeleteVisit = async () => {
    if (!visitToDelete || isDeletingRecord) return;
    setIsDeletingRecord(true);
    try {
      const res = await fetch(`/api/admin/salon-ops/visits/${visitToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete Daily Register entry.');
      }

      salonDb.deleteVisit(visitToDelete.id);
      showToast(`Deleted Daily Register entry ${visitToDelete.id} for ${visitToDelete.customerName}`);
      setVisitToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Could not delete Daily Register entry.');
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete || isDeletingRecord) return;
    setIsDeletingRecord(true);
    try {
      const res = await fetch(`/api/admin/salon-ops/customers/${customerToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete customer record.');
      }

      const localResult = salonDb.deleteCustomer(customerToDelete.id);
      if (selectedCustomer?.id === customerToDelete.id) {
        setSelectedCustomer(null);
      }
      showToast(
        localResult.action === 'archived'
          ? `Archived ${customerToDelete.fullName} from active customers while preserving ${localResult.linkedVisitsCount} historical visit record(s).`
          : `Deleted customer ${customerToDelete.fullName} (${customerToDelete.id})`
      );
      setCustomerToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Could not delete customer.');
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!questionToDelete || isDeletingRecord) return;
    setIsDeletingRecord(true);
    try {
      const wasPublished = questionToDelete.status === 'answered';
      salonDb.deleteQuestion(questionToDelete.id);
      showToast(
        wasPublished
          ? 'Deleted published salon Q&A record.'
          : 'Deleted customer question.'
      );
      setQuestionToDelete(null);
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const handleConfirmRestoreBackup = async () => {
    if (!restorePreview || isRestoringBackup) return;
    setIsRestoringBackup(true);
    setRestoreError(null);
    try {
      const res = await fetch('/api/admin/salon-ops/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customers: restorePreview.customers,
          visits: restorePreview.visits,
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to restore backup on server.');
      }

      salonDb.restoreBackupSnapshot(restorePreview);
      showToast('Backup data restored safely without modifying login credentials.');
      setRestorePreview(null);
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to restore backup file.');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // Compute actual metrics from database
  const totalCustomers = customers.length;
  const todayVisitsCount = visits.filter((v) => v.visitDate === todayStr).length;
  const pendingAppointments = appointments.filter((a) => a.status === 'pending').length;
  const confirmedAppointments = appointments.filter((a) => a.status === 'confirmed').length;
  const pendingQuestions = questions.filter((q) => q.status === 'pending').length;
  const completedVisits = visits.filter((v) => v.status === 'Completed').length;

  // Navigation Links
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users, badge: totalCustomers },
    { id: 'register', label: 'Daily Register', icon: ClipboardList, badge: todayVisitsCount },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck, badge: pendingAppointments },
    { id: 'questions', label: 'Customer Questions', icon: HelpCircle, badge: pendingQuestions },
    { id: 'services', label: 'Services Manager', icon: Scissors },
    { id: 'gallery', label: 'Gallery Manager', icon: ImageIcon },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'content', label: 'Website Content', icon: Globe },
    { id: 'business', label: 'Business Info', icon: Store },
    { id: 'reports', label: 'Reports & CSV', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // CSV download helper
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Downloaded ${filename}`);
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-[#F8F5EF] flex flex-col md:flex-row">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1F1F1F] border border-[#C6A15B] text-white text-xs px-4 py-2.5 rounded shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#C6A15B]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-[#141414] border-b border-[#C6A15B]/25 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1F1F1F] border border-[#C6A15B]/50 flex items-center justify-center text-[#C6A15B]">
            <CrownIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif-elegant font-bold text-sm tracking-wide block">Golden Wizard</span>
            <span className="text-[9px] uppercase tracking-widest text-[#C6A15B] -mt-0.5 block">Admin Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewPublicSite}
            className="p-1.5 text-xs bg-[#1E1E1E] border border-white/10 rounded text-[#C6A15B]"
            title="View Live Site"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-white/80 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-30 h-screen w-64 bg-[#121212] border-r border-[#C6A15B]/20 flex flex-col justify-between transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Brand */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#1B1B1B] border border-[#C6A15B]/60 flex items-center justify-center text-[#C6A15B] shadow-md">
                <CrownIcon className="w-5 h-5 text-[#C6A15B]" />
              </div>
              <div>
                <h2 className="font-serif-elegant font-bold text-base tracking-wider text-[#F8F5EF] uppercase">
                  Golden Wizard
                </h2>
                <span className="text-[9px] tracking-[0.25em] text-[#C6A15B] uppercase font-semibold block -mt-0.5">
                  Admin Dashboard
                </span>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as TabType);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-sm text-xs font-medium tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#C6A15B]/20 to-transparent border-l-2 border-[#C6A15B] text-[#D6B979] font-semibold'
                      : 'text-[#EAE2D5]/75 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#C6A15B]' : 'text-white/40'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] rounded font-mono ${
                        isActive ? 'bg-[#C6A15B] text-[#111111] font-bold' : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: View Live Site & Logout */}
        <div className="p-4 border-t border-white/10 space-y-2 bg-[#0E0E0E]">
          {onSwitchToQA && (
            <button
              onClick={onSwitchToQA}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#1F1C14] hover:bg-[#2B2618] border border-[#C6A15B] text-[#D6B979] text-xs font-semibold rounded-sm transition-colors cursor-pointer mb-1 shadow-sm"
            >
              <span>Public Q&A & Answers Hub</span>
            </button>
          )}
          <button
            onClick={onViewPublicSite}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#1A1A1A] hover:bg-[#242424] border border-[#C6A15B]/30 text-[#C6A15B] text-xs font-medium rounded-sm transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Public Website</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Secure Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {/* ========================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <h1 className="font-serif-elegant text-2xl sm:text-3xl font-bold text-white">
                  Executive Dashboard
                </h1>
                <p className="text-xs text-[#EAE2D5]/70 mt-1">
                  Daily snapshot of Golden Wizard Professional Salon • Gandi Maisamma, Hyderabad
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#D6B979] to-[#C6A15B] text-[#111111] font-semibold text-xs rounded-sm hover:brightness-110 cursor-pointer shadow-md uppercase"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Customer</span>
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B1B1B] border border-[#C6A15B]/40 text-[#D6B979] text-xs font-medium rounded-sm hover:bg-[#252525] cursor-pointer"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Daily Register</span>
                </button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-[#171717] border border-[#C6A15B]/20 p-4 rounded-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/50 mb-2">
                  <span className="text-[11px] uppercase tracking-wider">Total Customers</span>
                  <Users className="w-4 h-4 text-[#C6A15B]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif-elegant text-white">{totalCustomers}</div>
                <div className="text-[10px] text-white/40 mt-1">Registered clients</div>
              </div>

              <div className="bg-[#171717] border border-[#C6A15B]/20 p-4 rounded-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/50 mb-2">
                  <span className="text-[11px] uppercase tracking-wider">Today's Visits</span>
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif-elegant text-white">{todayVisitsCount}</div>
                <div className="text-[10px] text-emerald-400/80 mt-1">Salon floor today</div>
              </div>

              <div className="bg-[#171717] border border-[#C6A15B]/20 p-4 rounded-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/50 mb-2">
                  <span className="text-[11px] uppercase tracking-wider">Pending Bookings</span>
                  <CalendarCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif-elegant text-amber-300">{pendingAppointments}</div>
                <div className="text-[10px] text-white/40 mt-1">Requires confirmation</div>
              </div>

              <div className="bg-[#171717] border border-[#C6A15B]/20 p-4 rounded-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/50 mb-2">
                  <span className="text-[11px] uppercase tracking-wider">Confirmed</span>
                  <CheckCircle2 className="w-4 h-4 text-[#C6A15B]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif-elegant text-white">{confirmedAppointments}</div>
                <div className="text-[10px] text-white/40 mt-1">Scheduled appointments</div>
              </div>

              <div className="bg-[#171717] border border-[#C6A15B]/20 p-4 rounded-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/50 mb-2">
                  <span className="text-[11px] uppercase tracking-wider">Pending Q&A</span>
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif-elegant text-sky-300">{pendingQuestions}</div>
                <div className="text-[10px] text-white/40 mt-1">Customer enquiries</div>
              </div>

              <div className="bg-[#171717] border border-[#C6A15B]/20 p-4 rounded-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/50 mb-2">
                  <span className="text-[11px] uppercase tracking-wider">Completed</span>
                  <UserCheck className="w-4 h-4 text-[#C6A15B]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif-elegant text-white">{completedVisits}</div>
                <div className="text-[10px] text-white/40 mt-1">Recorded services</div>
              </div>
            </div>

            {/* Quick overview grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Salon Activity */}
              <div className="bg-[#161616] border border-white/10 rounded-sm p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#C6A15B]" />
                    <h3 className="font-serif-elegant text-lg font-semibold text-white">
                      Today's Customer Register ({todayStr})
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('register')}
                    className="text-xs text-[#C6A15B] hover:underline"
                  >
                    View All →
                  </button>
                </div>

                {visits.filter((v) => v.visitDate === todayStr).length === 0 ? (
                  <div className="py-8 text-center text-xs text-white/40">
                    No customers registered yet for today. Use the "Daily Register" to log walk-ins.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {visits
                      .filter((v) => v.visitDate === todayStr)
                      .slice(0, 4)
                      .map((visit) => (
                        <div
                          key={visit.id}
                          className="p-3 bg-[#1B1B1B] border border-white/5 rounded-sm flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-white">{visit.customerName}</div>
                            <div className="text-white/50 text-[11px]">
                              {visit.serviceName} • {visit.visitTime}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                visit.status === 'Completed'
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : visit.status === 'In Progress'
                                  ? 'bg-sky-950 text-sky-300'
                                  : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              {visit.status}
                            </span>
                            <span className="text-[10px] text-white/40">{visit.paymentStatus}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Latest Online Enquiries & Questions */}
              <div className="bg-[#161616] border border-white/10 rounded-sm p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#C6A15B]" />
                    <h3 className="font-serif-elegant text-lg font-semibold text-white">
                      Incoming Customer Questions
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('questions')}
                    className="text-xs text-[#C6A15B] hover:underline"
                  >
                    Manage All →
                  </button>
                </div>

                {questions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-white/40">No customer questions submitted yet.</div>
                ) : (
                  <div className="space-y-2.5">
                    {questions.slice(0, 3).map((q) => (
                      <div
                        key={q.id}
                        className="p-3 bg-[#1B1B1B] border border-white/5 rounded-sm text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{q.customerName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                              q.status === 'answered'
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-amber-950 text-amber-300'
                            }`}
                          >
                            {q.status}
                          </span>
                        </div>
                        <p className="text-white/70 italic line-clamp-1">"{q.question}"</p>
                        <div className="text-[10px] text-[#C6A15B] flex items-center justify-between">
                          <span>{q.category}</span>
                          <button
                            onClick={() => {
                              setAnsweringQuestion(q);
                              setAnswerDraft(q.answer || '');
                              setActiveTab('questions');
                            }}
                            className="underline hover:text-white"
                          >
                            Reply Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Popular Services Quick Visual Bar */}
            <div className="bg-[#161616] border border-white/10 rounded-sm p-5">
              <h3 className="font-serif-elegant text-lg font-semibold text-white mb-3">
                Top Service Distribution (Gandi Maisamma Salon)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#1B1B1B] rounded border border-white/5">
                  <div className="text-white/50 text-[10px] uppercase">Haircuts & Styling</div>
                  <div className="text-lg font-bold text-[#C6A15B] mt-1">38%</div>
                  <div className="text-[10px] text-white/40">High daily volume</div>
                </div>
                <div className="p-3 bg-[#1B1B1B] rounded border border-white/5">
                  <div className="text-white/50 text-[10px] uppercase">Balayage & Colour</div>
                  <div className="text-lg font-bold text-[#C6A15B] mt-1">26%</div>
                  <div className="text-[10px] text-white/40">High ticket service</div>
                </div>
                <div className="p-3 bg-[#1B1B1B] rounded border border-white/5">
                  <div className="text-white/50 text-[10px] uppercase">Keratin Treatments</div>
                  <div className="text-lg font-bold text-[#C6A15B] mt-1">21%</div>
                  <div className="text-[10px] text-white/40">Smooth & frizz-free</div>
                </div>
                <div className="p-3 bg-[#1B1B1B] rounded border border-white/5">
                  <div className="text-white/50 text-[10px] uppercase">Bridal & Facials</div>
                  <div className="text-lg font-bold text-[#C6A15B] mt-1">15%</div>
                  <div className="text-[10px] text-white/40">Special occasions</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: CUSTOMERS */}
        {/* ========================================================== */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header with Search and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h1 className="font-serif-elegant text-2xl font-bold text-white">Customer Management</h1>
                <p className="text-xs text-[#EAE2D5]/70">
                  Manage registered salon customers, view profile histories, and avoid duplicate records.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadCSV(salonDb.exportCustomersToCSV(), 'Golden_Wizard_Customers.csv')}
                  className="px-3 py-2 bg-[#1B1B1B] border border-white/15 text-xs text-[#EAE2D5] rounded-sm hover:border-[#C6A15B] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="px-4 py-2 bg-[#C6A15B] hover:bg-[#D6B979] text-[#111111] text-xs font-semibold rounded-sm flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Customer</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer by name or mobile number..."
                  className="w-full pl-9 pr-4 py-2 bg-[#171717] border border-white/10 rounded-sm text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#C6A15B]"
                />
              </div>
              <div className="w-full sm:w-60">
                <select
                  value={customerServiceFilter}
                  onChange={(e) => setCustomerServiceFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-[#171717] border border-white/10 rounded-sm text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">All Services</option>
                  <option value="Haircut">Haircut</option>
                  <option value="Balayage">Balayage</option>
                  <option value="Keratin Treatments">Keratin Treatments</option>
                  <option value="Bridal Services">Bridal Services</option>
                  <option value="De-tan and Facial">De-tan and Facial</option>
                </select>
              </div>
            </div>

            {/* Customer List Table */}
            <div className="bg-[#151515] border border-white/10 rounded-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1B1B1B] text-[#C6A15B] uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Customer ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4">Selected Service</th>
                      <th className="py-3 px-4">Visits</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {customers
                      .filter((c) => {
                        const matchSearch =
                          customerSearch === '' ||
                          c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.mobile.includes(customerSearch);
                        const matchService =
                          customerServiceFilter === 'all' ||
                          c.selectedService.toLowerCase().includes(customerServiceFilter.toLowerCase());
                        return matchSearch && matchService;
                      })
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#C6A15B]">{c.id}</td>
                          <td className="py-3.5 px-4 font-medium text-white">
                            <div>{c.fullName}</div>
                            {c.email && <div className="text-[10px] text-white/40">{c.email}</div>}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-white/80">
                            <a
                              href={`https://wa.me/91${c.mobile}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#D6B979] hover:underline flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" />
                              {c.mobile}
                            </a>
                          </td>
                          <td className="py-3.5 px-4 text-white/60">{c.registeredDate}</td>
                          <td className="py-3.5 px-4 text-white/90">
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">
                              {c.selectedService}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#C6A15B]">{c.totalVisits || 1}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedCustomer(c)}
                                className="p-1.5 bg-[#222222] hover:bg-[#2c2c2c] text-white rounded text-[11px] flex items-center gap-1"
                                title="View Customer Profile"
                              >
                                <Eye className="w-3 h-3 text-[#C6A15B]" />
                                <span>Profile</span>
                              </button>
                              <button
                                onClick={() => {
                                  setCustomerToVisit(c);
                                  setShowAddVisitModal(true);
                                }}
                                className="p-1.5 bg-[#C6A15B]/20 hover:bg-[#C6A15B] text-[#C6A15B] hover:text-[#111111] rounded text-[11px] font-semibold"
                                title="Add visit for existing customer"
                              >
                                + Visit
                              </button>
                              <button
                                onClick={() => setCustomerToDelete(c)}
                                className="p-1.5 text-white/40 hover:text-rose-400 cursor-pointer"
                                title="Delete Customer"
                                aria-label={`Delete customer ${c.fullName}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: DAILY CUSTOMER REGISTER */}
        {/* ========================================================== */}
        {activeTab === 'register' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h1 className="font-serif-elegant text-2xl font-bold text-white">Daily Customer Register</h1>
                <p className="text-xs text-[#EAE2D5]/70">
                  Floor check-in record for salon walk-ins and appointments for {registerDate}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadCSV(salonDb.exportVisitsToCSV(), `GoldenWizard_Visits_${registerDate}.csv`)}
                  className="px-3 py-2 bg-[#1B1B1B] border border-white/15 text-xs text-[#EAE2D5] rounded-sm hover:border-[#C6A15B] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>Export Register</span>
                </button>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="px-4 py-2 bg-[#C6A15B] hover:bg-[#D6B979] text-[#111111] text-xs font-semibold rounded-sm flex items-center gap-1.5 cursor-pointer uppercase"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Walk-in Customer</span>
                </button>
              </div>
            </div>

            {/* Date and Status Filters */}
            <div className="p-4 bg-[#161616] border border-white/10 rounded-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Date:</span>
                <input
                  type="date"
                  value={registerDate}
                  onChange={(e) => setRegisterDate(e.target.value)}
                  className="py-1.5 px-3 bg-[#111111] border border-white/15 rounded text-xs text-white focus:outline-none focus:border-[#C6A15B]"
                />
                <button
                  onClick={() => setRegisterDate(todayStr)}
                  className="text-xs text-[#C6A15B] underline ml-1"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Status:</span>
                <select
                  value={registerStatusFilter}
                  onChange={(e) => setRegisterStatusFilter(e.target.value)}
                  className="py-1.5 px-3 bg-[#111111] border border-white/15 rounded text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Arrived">Arrived</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="No Show">No Show</option>
                </select>
              </div>
            </div>

            {/* Visits List */}
            {visits.filter((v) => {
              const matchesDate = v.visitDate === registerDate;
              const matchesStatus = registerStatusFilter === 'all' || v.status === registerStatusFilter;
              return matchesDate && matchesStatus;
            }).length === 0 ? (
              <div className="py-16 text-center bg-[#151515] border border-white/10 rounded-sm">
                <ClipboardList className="w-10 h-10 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/80">No customer visits registered for {registerDate}.</p>
                <p className="text-xs text-white/40 mt-1">Use the "+ Walk-in Customer" button to check in a client.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visits
                  .filter((v) => {
                    const matchesDate = v.visitDate === registerDate;
                    const matchesStatus = registerStatusFilter === 'all' || v.status === registerStatusFilter;
                    return matchesDate && matchesStatus;
                  })
                  .map((visit) => (
                    <div
                      key={visit.id}
                      className="p-4 bg-[#171717] border border-[#C6A15B]/20 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#C6A15B]">{visit.id}</span>
                          <span className="font-serif-elegant font-semibold text-base text-white">
                            {visit.customerName}
                          </span>
                          <a
                            href={`tel:+91${visit.mobile}`}
                            className="text-xs text-white/50 hover:text-[#C6A15B] font-mono flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-[#C6A15B]" />
                            {visit.mobile}
                          </a>
                        </div>
                        <div className="text-xs text-white/70 flex flex-wrap items-center gap-3">
                          <span>
                            Service: <strong className="text-white">{visit.serviceName}</strong>
                          </span>
                          <span>•</span>
                          <span>Time: {visit.visitTime}</span>
                          <span>•</span>
                          <span>Stylist: {visit.assignedStaff}</span>
                          {visit.staffNotes && (
                            <>
                              <span>•</span>
                              <span className="text-white/50 italic">"{visit.staffNotes}"</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status selectors & Delete action */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40 uppercase">Visit Status</span>
                          <select
                            value={visit.status}
                            onChange={async (e) => {
                              const nextStatus = e.target.value as CustomerVisit['status'];
                              try {
                                const res = await fetch(`/api/admin/salon-ops/visits/${visit.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ status: nextStatus }),
                                });
                                if (res.status === 401) {
                                  onLogout();
                                  return;
                                }
                                if (res.ok) {
                                  salonDb.updateVisitStatus(visit.id, nextStatus);
                                  showToast(`Status updated to ${nextStatus}`);
                                }
                              } catch {
                                showToast('Could not update visit status.');
                              }
                            }}
                            className={`py-1 px-2.5 rounded text-xs font-semibold focus:outline-none cursor-pointer border ${
                              visit.status === 'Completed'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                : visit.status === 'In Progress'
                                ? 'bg-sky-950 text-sky-300 border-sky-500/40'
                                : visit.status === 'Arrived'
                                ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                                : 'bg-amber-950 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            <option value="New">New</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Arrived">Arrived</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="No Show">No Show</option>
                          </select>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40 uppercase">Payment</span>
                          <select
                            value={visit.paymentStatus}
                            onChange={async (e) => {
                              const nextPay = e.target.value as CustomerVisit['paymentStatus'];
                              try {
                                const res = await fetch(`/api/admin/salon-ops/visits/${visit.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ paymentStatus: nextPay }),
                                });
                                if (res.status === 401) {
                                  onLogout();
                                  return;
                                }
                                if (res.ok) {
                                  salonDb.updateVisitStatus(visit.id, visit.status, nextPay);
                                  showToast(`Payment marked as ${nextPay}`);
                                }
                              } catch {
                                showToast('Could not update payment status.');
                              }
                            }}
                            className={`py-1 px-2 rounded text-xs border focus:outline-none cursor-pointer ${
                              visit.paymentStatus === 'Paid'
                                ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30'
                                : 'bg-[#1F1F1F] text-amber-300 border-white/10'
                            }`}
                          >
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Partial">Partial</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => setVisitToDelete(visit)}
                          className="mt-3.5 p-2 rounded border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                          title={`Delete register entry ${visit.id}`}
                          aria-label={`Delete visit ${visit.id} for ${visit.customerName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: APPOINTMENTS */}
        {/* ========================================================== */}
        {activeTab === 'appointments' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h1 className="font-serif-elegant text-2xl font-bold text-white">Appointment Schedule</h1>
                <p className="text-xs text-[#EAE2D5]/70">
                  Manage online appointment requests, confirm times, and prevent conflicting bookings.
                </p>
              </div>
              <button
                onClick={() => downloadCSV(salonDb.exportAppointmentsToCSV(), 'Golden_Wizard_Appointments.csv')}
                className="px-3 py-2 bg-[#1B1B1B] border border-white/15 text-xs text-[#EAE2D5] rounded-sm hover:border-[#C6A15B] flex items-center gap-1.5 cursor-pointer self-start"
              >
                <Download className="w-3.5 h-3.5 text-[#C6A15B]" />
                <span>Export Appointments CSV</span>
              </button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/60">Filter Status:</span>
              <select
                value={aptStatusFilter}
                onChange={(e) => setAptStatusFilter(e.target.value)}
                className="py-1.5 px-3 bg-[#171717] border border-white/10 rounded-sm text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Appointments</option>
                <option value="pending">Pending Confirmation</option>
                <option value="confirmed">Confirmed</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Appointment Cards */}
            <div className="space-y-3">
              {appointments
                .filter((a) => aptStatusFilter === 'all' || a.status === aptStatusFilter)
                .map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 bg-[#161616] border border-[#C6A15B]/20 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-[#C6A15B]">{apt.id}</span>
                        <h4 className="font-serif-elegant font-semibold text-base text-white">
                          {apt.customerName}
                        </h4>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                            apt.status === 'confirmed'
                              ? 'bg-emerald-950 text-emerald-300'
                              : apt.status === 'pending'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>

                      <div className="text-xs text-white/70 flex flex-wrap items-center gap-3">
                        <span>Service: <strong className="text-white">{apt.service}</strong></span>
                        <span>•</span>
                        <span>Date: <strong className="text-[#D6B979]">{apt.date}</strong></span>
                        <span>•</span>
                        <span>Time Slot: <strong className="text-[#D6B979]">{apt.timeSlot}</strong></span>
                        <span>•</span>
                        <span>Mobile: {apt.mobile}</span>
                      </div>

                      {apt.notes && (
                        <p className="text-xs text-white/50 italic mt-1.5">"{apt.notes}"</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* WhatsApp confirmation prefill */}
                      <a
                        href={`https://wa.me/91${apt.mobile}?text=${encodeURIComponent(
                          `Hello ${apt.customerName}! This is Golden Wizard Professional Salon in Gandi Maisamma. We have confirmed your appointment for "${apt.service}" on ${apt.date} at ${apt.timeSlot}. We look forward to creating your perfect look! Contact: +91 86863 85552.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#C6A15B]/40 text-[#D6B979] rounded text-xs flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#C6A15B]" />
                        <span>Confirm via WhatsApp</span>
                      </a>

                      <select
                        value={apt.status}
                        onChange={(e) => {
                          salonDb.updateAppointment(apt.id, { status: e.target.value as Appointment['status'] });
                          showToast(`Appointment status updated to ${e.target.value}`);
                        }}
                        className="py-1.5 px-2.5 bg-[#1F1F1F] border border-white/20 rounded text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 5: CUSTOMER QUESTIONS */}
        {/* ========================================================== */}
        {activeTab === 'questions' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-4 border-b border-white/10">
              <h1 className="font-serif-elegant text-2xl font-bold text-white">Customer Questions & Answers</h1>
              <p className="text-xs text-[#EAE2D5]/70">
                Review inquiries from the public "Ask Us Anything" section, draft answers, and reply directly on WhatsApp.
              </p>
            </div>

            <div className="space-y-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-5 bg-[#171717] border border-[#C6A15B]/20 rounded-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#C6A15B]">{q.id}</span>
                        <h4 className="font-serif-elegant font-semibold text-base text-white">
                          {q.customerName}
                        </h4>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white/5 text-[#C6A15B]">
                          {q.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Mobile: {q.mobile} • Preferred Channel: {q.preferredContact}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                          q.status === 'answered'
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {q.status}
                      </span>
                      <button
                        onClick={() => {
                          salonDb.updateQuestionStatus(q.id, q.status === 'archived' ? 'pending' : 'archived');
                          showToast(`Updated question status`);
                        }}
                        className="text-xs text-white/40 hover:text-white"
                      >
                        {q.status === 'archived' ? 'Unarchive' : 'Archive'}
                      </button>
                    </div>
                  </div>

                  {/* Question body */}
                  <div className="text-xs text-white/90 italic bg-[#121212] p-3 rounded border border-white/5">
                    "{q.question}"
                  </div>

                  {/* Current answer if present */}
                  {q.answer && (
                    <div className="p-3 bg-[#1C1A14] border border-[#C6A15B]/30 rounded text-xs space-y-1">
                      <div className="text-[10px] font-semibold text-[#C6A15B] uppercase">Saved Salon Answer:</div>
                      <p className="text-white/90">{q.answer}</p>
                    </div>
                  )}

                  {/* Answer or Reply Controls */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setAnsweringQuestion(q);
                          setAnswerDraft(q.answer || '');
                        }}
                        className="px-3 py-1.5 bg-[#C6A15B] hover:bg-[#D6B979] text-[#111111] text-xs font-semibold rounded cursor-pointer"
                      >
                        {q.answer ? 'Edit Answer' : 'Write Answer'}
                      </button>

                      {q.answer && (
                        <a
                          href={`https://wa.me/91${q.mobile}?text=${encodeURIComponent(
                            `Hello ${q.customerName}! Regarding your question to Golden Wizard Professional Salon about "${q.category}":\n\n"${q.question}"\n\nStylist Response: ${q.answer}\n\nFeel free to visit us at Gandi Maisamma or call +91 86863 85552.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#282828] border border-[#C6A15B]/40 text-[#D6B979] text-xs font-medium rounded flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#C6A15B]" />
                          <span>Send Answer on WhatsApp</span>
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuestionToDelete(q)}
                      className="px-2.5 py-1.5 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-xs rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 6: SERVICES MANAGEMENT */}
        {/* ========================================================== */}
        {activeTab === 'services' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif-elegant text-2xl font-bold text-white">Services Management</h1>
                <p className="text-xs text-[#EAE2D5]/70">
                  Manage all 21 salon services, edit descriptions, and replace sample images with actual salon photography.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-[#171717] border border-white/10 rounded-sm overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-36 bg-black">
                      <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 text-[10px] font-bold uppercase px-2 py-0.5 bg-black/80 text-[#D6B979] rounded">
                        {svc.categoryLabel}
                      </span>
                    </div>
                    <div className="p-4">
                      <h4 className="font-serif-elegant font-semibold text-base text-white">{svc.name}</h4>
                      <p className="text-xs text-white/60 mt-1 line-clamp-2">{svc.description}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => setEditingService(svc)}
                      className="w-full py-2 bg-[#222222] hover:bg-[#2a2a2a] border border-[#C6A15B]/30 text-xs text-[#D6B979] font-medium rounded flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit & Replace Image</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 7: GALLERY MANAGEMENT */}
        {/* ========================================================== */}
        {activeTab === 'gallery' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h1 className="font-serif-elegant text-2xl font-bold text-white">Gallery Management</h1>
                <p className="text-xs text-[#EAE2D5]/70">
                  Replace sample gallery photographs with actual client styling photographs from the salon.
                </p>
              </div>
              <button
                onClick={() => setShowAddGalleryModal(true)}
                className="px-4 py-2 bg-[#C6A15B] text-[#111111] font-semibold text-xs rounded uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Portfolio Photo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#171717] border border-white/10 rounded-sm overflow-hidden flex flex-col justify-between"
                >
                  <div className="relative h-44 bg-black">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase px-2 py-0.5 bg-black/80 text-[#D6B979] rounded">
                      {item.categoryLabel}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGalleryToDelete(item)}
                      className="p-1 text-white/40 hover:text-rose-400 cursor-pointer"
                      aria-label={`Delete gallery item ${item.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 8: CERTIFICATES MANAGEMENT */}
        {/* ========================================================== */}
        {activeTab === 'certificates' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h1 className="font-serif-elegant text-2xl font-bold text-white">Certificate Management</h1>
                <p className="text-xs text-[#EAE2D5]/70">
                  Manage professional credentials. Previews on public site are automatically watermarked for document protection.
                </p>
              </div>
              <button
                onClick={() => setShowAddCertModal(true)}
                className="px-4 py-2 bg-[#C6A15B] text-[#111111] font-semibold text-xs rounded uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload New Certificate</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 bg-[#171717] border border-[#C6A15B]/30 rounded-sm flex gap-4 items-start"
                >
                  <div className="relative w-28 h-28 shrink-0 bg-black rounded overflow-hidden border border-white/10">
                    <img src={cert.imageUrl} alt={cert.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white/70 uppercase rotate-[-20deg]">
                        WATERMARK
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="text-[10px] text-[#C6A15B] font-bold uppercase">{cert.issuingOrganization}</div>
                    <h4 className="font-serif-elegant font-bold text-sm text-white">{cert.title}</h4>
                    <p className="text-xs text-white/60 line-clamp-2">{cert.description}</p>
                    <div className="text-[10px] text-white/40 pt-1">
                      Category: {cert.category} • Date: {cert.issueDate}
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={() => {
                          setEditingCert(cert);
                          setShowAddCertModal(true);
                        }}
                        className="text-xs text-[#D6B979] hover:underline"
                      >
                        Edit Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setCertificateToDelete(cert)}
                        className="text-xs text-rose-400 hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 9: WEBSITE CONTENT */}
        {/* ========================================================== */}
        {activeTab === 'content' && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <div className="pb-4 border-b border-white/10">
              <h1 className="font-serif-elegant text-2xl font-bold text-white">Website Announcements</h1>
              <p className="text-xs text-[#EAE2D5]/70">
                Manage the live top banner announcement and custom notices.
              </p>
            </div>

            <div className="p-6 bg-[#161616] border border-white/10 rounded-sm space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
                  Top Announcement Message
                </label>
                <textarea
                  rows={3}
                  value={settings.announcement}
                  onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                  className="w-full p-3 bg-[#111111] border border-white/15 rounded text-xs text-white focus:outline-none focus:border-[#C6A15B]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showAnnouncement"
                  checked={settings.showAnnouncement}
                  onChange={(e) => setSettings({ ...settings, showAnnouncement: e.target.checked })}
                  className="rounded text-[#C6A15B] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="showAnnouncement" className="text-xs text-white cursor-pointer">
                  Display announcement bar on live website
                </label>
              </div>

              <button
                onClick={() => {
                  salonDb.updateSettings({
                    announcement: settings.announcement,
                    showAnnouncement: settings.showAnnouncement,
                  });
                  showToast('Updated website announcement');
                }}
                className="py-2.5 px-5 bg-[#C6A15B] text-[#111111] text-xs font-semibold uppercase rounded hover:bg-[#D6B979] cursor-pointer"
              >
                Save Announcement
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 10: BUSINESS INFORMATION */}
        {/* ========================================================== */}
        {activeTab === 'business' && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <div className="pb-4 border-b border-white/10">
              <h1 className="font-serif-elegant text-2xl font-bold text-white">Verified Business Information</h1>
              <p className="text-xs text-[#EAE2D5]/70">
                Official business data for Golden Wizard Professional Salon in Gandi Maisamma.
              </p>
            </div>

            <div className="p-6 bg-[#161616] border border-white/10 rounded-sm space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                  Verified Address & Landmark
                </label>
                <textarea
                  rows={2}
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={settings.hours}
                  onChange={(e) => setSettings({ ...settings, hours: e.target.value })}
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                    Google Rating
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.rating}
                    onChange={(e) => setSettings({ ...settings, rating: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">
                    Total Google Reviews
                  </label>
                  <input
                    type="number"
                    value={settings.reviewCount}
                    onChange={(e) => setSettings({ ...settings, reviewCount: parseInt(e.target.value) })}
                    className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-xs text-white"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  salonDb.updateSettings(settings);
                  showToast('Updated business information');
                }}
                className="py-2.5 px-5 bg-[#C6A15B] text-[#111111] text-xs font-semibold uppercase rounded hover:bg-[#D6B979] cursor-pointer"
              >
                Save Business Info
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 11: REPORTS & CSV */}
        {/* ========================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in max-w-3xl">
            <div className="pb-4 border-b border-white/10">
              <h1 className="font-serif-elegant text-2xl font-bold text-white">Reports & Data Exports</h1>
              <p className="text-xs text-[#EAE2D5]/70">
                Download structured CSV files for accounting, tax auditing, client marketing, and staff performance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-[#161616] border border-white/10 rounded-sm flex flex-col justify-between">
                <div>
                  <Users className="w-6 h-6 text-[#C6A15B] mb-2" />
                  <h4 className="font-serif-elegant font-semibold text-base text-white">Customers Database</h4>
                  <p className="text-xs text-white/60 mt-1">
                    Export all {totalCustomers} registered customer contacts, notes, and visit counts.
                  </p>
                </div>
                <button
                  onClick={() => downloadCSV(salonDb.exportCustomersToCSV(), 'Golden_Wizard_Customers.csv')}
                  className="mt-4 w-full py-2 bg-[#222222] hover:bg-[#2c2c2c] border border-white/15 text-xs text-[#D6B979] font-medium rounded flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Customers CSV</span>
                </button>
              </div>

              <div className="p-5 bg-[#161616] border border-white/10 rounded-sm flex flex-col justify-between">
                <div>
                  <ClipboardList className="w-6 h-6 text-emerald-400 mb-2" />
                  <h4 className="font-serif-elegant font-semibold text-base text-white">Daily Visits Register</h4>
                  <p className="text-xs text-white/60 mt-1">
                    Export {visits.length} customer visits with services, staff, and payment status.
                  </p>
                </div>
                <button
                  onClick={() => downloadCSV(salonDb.exportVisitsToCSV(), 'Golden_Wizard_Visits_Register.csv')}
                  className="mt-4 w-full py-2 bg-[#222222] hover:bg-[#2c2c2c] border border-white/15 text-xs text-emerald-300 font-medium rounded flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Visits CSV</span>
                </button>
              </div>

              <div className="p-5 bg-[#161616] border border-white/10 rounded-sm flex flex-col justify-between">
                <div>
                  <CalendarCheck className="w-6 h-6 text-amber-400 mb-2" />
                  <h4 className="font-serif-elegant font-semibold text-base text-white">Appointments Record</h4>
                  <p className="text-xs text-white/60 mt-1">
                    Export {appointments.length} online bookings and scheduled time slots.
                  </p>
                </div>
                <button
                  onClick={() => downloadCSV(salonDb.exportAppointmentsToCSV(), 'Golden_Wizard_Appointments.csv')}
                  className="mt-4 w-full py-2 bg-[#222222] hover:bg-[#2c2c2c] border border-white/15 text-xs text-amber-300 font-medium rounded flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Bookings CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 12: SETTINGS & SECURITY ARCHITECTURE */}
        {/* ========================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-3xl">
            <div className="pb-4 border-b border-white/10">
              <h1 className="font-serif-elegant text-2xl font-bold text-white">Security &amp; Database Settings</h1>
              <p className="text-xs text-[#EAE2D5]/70">
                Manage owner login credentials (username, password, PIN), database backup, and restore snapshots.
              </p>
            </div>

            <OwnerSecuritySettingsPanel
              authToken={token}
              currentUsername={username}
              onUsernameUpdated={onUsernameUpdated}
              onToast={showToast}
              onAuthError={onLogout}
            />

            {/* Cloud & Server Architecture Info */}
            <div className="p-5 bg-[#161616] border border-[#C6A15B]/30 rounded-sm space-y-3">
              <div className="flex items-center gap-2 text-[#C6A15B]">
                <Database className="w-4 h-4" />
                <h4 className="font-serif-elegant font-semibold text-base text-white">
                  Database &amp; Security Persistence Status
                </h4>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Owner login credentials (username, password hash, and PIN hash) are stored exclusively on the backend server using cryptographic scrypt hashing. Salon records for <code className="text-[#D6B979]">customers</code>, <code className="text-[#D6B979]">customer_visits</code>, <code className="text-[#D6B979]">appointments</code>, and <code className="text-[#D6B979]">enquiries</code> are safeguarded behind authenticated owner requests.
              </p>
              <div className="p-3 bg-[#111111] rounded text-[11px] text-white/50 space-y-1">
                <div>• Credential Security: Server-side scrypt password &amp; PIN verification</div>
                <div>• Session Protection: In-memory Bearer session tokens</div>
                <div>• Backup Safety: Login secrets and PINs are excluded from JSON exports</div>
              </div>
            </div>

            {/* Backup & Restore */}
            <div className="p-5 bg-[#161616] border border-white/10 rounded-sm space-y-4">
              <div>
                <h4 className="font-serif-elegant font-semibold text-base text-white">
                  Backup &amp; Restore
                </h4>
                <p className="text-xs text-white/60 mt-1">
                  Download a complete JSON snapshot of your salon database (customers, Daily Register visits, appointments, Q&amp;A, website settings — excluding login passwords/PINs), or restore from a saved backup file.
                </p>
              </div>

              {restoreError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded text-xs text-rose-300">
                  {restoreError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const safeSettings = { ...salonDb.getSettings() } as Record<string, unknown>;
                    delete safeSettings.adminPin;
                    delete safeSettings.password;
                    delete safeSettings.passwordHash;
                    delete safeSettings.pinHash;

                    const fullDb = {
                      customers: salonDb.getCustomers(true),
                      visits: salonDb.getVisits(),
                      appointments: salonDb.getAppointments(),
                      questions: salonDb.getQuestions(),
                      services: salonDb.getServices(),
                      gallery: salonDb.getGallery(),
                      certificates: salonDb.getCertificates(),
                      settings: safeSettings,
                      exportDate: new Date().toISOString(),
                    };
                    const json = JSON.stringify(fullDb, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `GoldenWizard_Backup_${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                    showToast('Downloaded full database backup JSON (without login secrets)');
                  }}
                  className="py-2 px-4 bg-[#222222] hover:bg-[#2c2c2c] border border-white/15 text-xs text-[#D6B979] rounded flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup JSON</span>
                </button>

                <label className="py-2 px-4 bg-[#1C1A14] hover:bg-[#282419] border border-[#C6A15B]/40 text-xs text-[#E3C78D] rounded flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>Restore from Backup JSON</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      setRestoreError(null);
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const parsed = JSON.parse(String(reader.result || '{}'));
                          if (!parsed || !Array.isArray(parsed.customers) || !Array.isArray(parsed.visits)) {
                            throw new Error('Invalid backup file: expected customers and visits arrays.');
                          }
                          setRestorePreview(parsed);
                        } catch (err: any) {
                          setRestoreError(err.message || 'Unable to parse backup JSON file.');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================== */}
      {/* MODAL 1: ADD / REGISTER CUSTOMER */}
      {/* ========================================================== */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#C6A15B]/50 rounded-sm p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setShowAddCustomerModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif-elegant text-xl font-bold text-white mb-1">
              Register New Customer
            </h3>
            <p className="text-xs text-white/60 mb-5">
              Enter customer details. Duplicate mobile numbers are automatically detected to prevent accidental multiple profiles.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmittingCustomer) return;
                setAddCustomerError(null);
                const form = e.currentTarget;
                const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value;
                const mobile = (form.elements.namedItem('mobile') as HTMLInputElement).value;
                const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                const service = (form.elements.namedItem('service') as HTMLSelectElement).value;
                const staff = (form.elements.namedItem('staff') as HTMLInputElement).value;
                const appointmentType = (form.elements.namedItem('appointmentType') as HTMLSelectElement).value as Customer['appointmentType'];
                const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
                const consent = (form.elements.namedItem('consent') as HTMLInputElement).checked;

                setIsSubmittingCustomer(true);
                try {
                  const res = await fetch('/api/admin/salon-ops/customers', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      fullName,
                      mobile,
                      email,
                      selectedService: service,
                      assignedStaff: staff,
                      appointmentType,
                      notes,
                      consentMarketing: consent,
                    }),
                  });
                  if (res.status === 401) {
                    onLogout();
                    return;
                  }
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    throw new Error(data.error || 'Could not register customer.');
                  }

                  if (data.customer && data.visit) {
                    const updatedCustomers = [data.customer, ...salonDb.getCustomers(true)];
                    const updatedVisits = [data.visit, ...salonDb.getVisits()];
                    salonDb.syncCustomersAndVisits(updatedCustomers, updatedVisits);
                    showToast(`Registered customer ${data.customer.fullName} (${data.customer.id})`);
                  }
                  setShowAddCustomerModal(false);
                } catch (err: any) {
                  setAddCustomerError(err.message || 'Failed to register customer.');
                } finally {
                  setIsSubmittingCustomer(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              {addCustomerError && (
                <div className="p-2.5 bg-rose-950/50 border border-rose-500/40 rounded text-rose-300">
                  {addCustomerError}
                </div>
              )}
              <div>
                <label className="block text-white/70 uppercase mb-1">Full Name *</label>
                <input
                  required
                  name="fullName"
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 uppercase mb-1">Mobile Number *</label>
                  <input
                    required
                    name="mobile"
                    placeholder="10-digit number"
                    className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/70 uppercase mb-1">Email (Optional)</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="name@gmail.com"
                    className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 uppercase mb-1">Selected Service</label>
                  <select
                    name="service"
                    className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white cursor-pointer"
                  >
                    <option value="Haircut">Haircut</option>
                    <option value="Hairstyling">Hairstyling</option>
                    <option value="Balayage">Balayage</option>
                    <option value="Hair Colouring">Hair Colouring</option>
                    <option value="Keratin Treatments">Keratin Treatments</option>
                    <option value="Bridal Services">Bridal Services</option>
                    <option value="De-tan and Facial">De-tan and Facial</option>
                    <option value="Shaving & Beard Grooming">Shaving & Beard Grooming</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 uppercase mb-1">Appointment Type</label>
                  <select
                    name="appointmentType"
                    className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white cursor-pointer"
                  >
                    <option value="walk-in">Walk-in</option>
                    <option value="phone-booking">Phone Booking</option>
                    <option value="online-enquiry">Online Enquiry</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Assigned Staff Stylist (Optional)</label>
                <input
                  name="staff"
                  placeholder="e.g. Raju, Kavitha, Sunil"
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Customer Preferences / Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="e.g. Scalp sensitivity, preferred hair length, beverage preference..."
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="consent"
                  defaultChecked
                  id="consentCheck"
                  className="rounded text-[#C6A15B]"
                />
                <label htmlFor="consentCheck" className="text-[11px] text-white/70 cursor-pointer">
                  Customer consents to receive appointment confirmation & updates on WhatsApp
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="py-2 px-4 bg-[#222222] text-white rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomer}
                  className="py-2 px-5 bg-[#C6A15B] text-[#111111] font-semibold uppercase rounded hover:bg-[#D6B979] cursor-pointer disabled:opacity-40"
                >
                  {isSubmittingCustomer ? 'Saving...' : 'Save & Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 2: ADD VISIT FOR EXISTING CUSTOMER */}
      {/* ========================================================== */}
      {showAddVisitModal && customerToVisit && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#C6A15B]/50 rounded-sm p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => {
                setShowAddVisitModal(false);
                setCustomerToVisit(null);
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif-elegant text-xl font-bold text-white mb-1">
              Record New Visit
            </h3>
            <p className="text-xs text-[#D6B979] mb-4">
              Customer: {customerToVisit.fullName} ({customerToVisit.id}) • Mobile: {customerToVisit.mobile}
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmittingVisit) return;
                const form = e.currentTarget;
                const serviceName = (form.elements.namedItem('serviceName') as HTMLSelectElement).value;
                const assignedStaff = (form.elements.namedItem('assignedStaff') as HTMLInputElement).value;
                const visitTime = (form.elements.namedItem('visitTime') as HTMLInputElement).value;
                const staffNotes = (form.elements.namedItem('staffNotes') as HTMLTextAreaElement).value;

                setIsSubmittingVisit(true);
                try {
                  const res = await fetch('/api/admin/salon-ops/visits', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      customerId: customerToVisit.id,
                      customerName: customerToVisit.fullName,
                      mobile: customerToVisit.mobile,
                      visitDate: todayStr,
                      visitTime: visitTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      serviceName,
                      assignedStaff: assignedStaff || 'Floor Stylist',
                      status: 'In Progress',
                      paymentStatus: 'Pending',
                      staffNotes,
                    }),
                  });
                  if (res.status === 401) {
                    onLogout();
                    return;
                  }
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    throw new Error(data.error || 'Could not record visit.');
                  }
                  if (data.visit) {
                    salonDb.recordVisit(data.visit);
                  }
                  showToast(`Recorded new visit for ${customerToVisit.fullName}`);
                  setShowAddVisitModal(false);
                  setCustomerToVisit(null);
                } catch (err: any) {
                  showToast(err.message || 'Could not record visit.');
                } finally {
                  setIsSubmittingVisit(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-white/70 uppercase mb-1">Service Performed *</label>
                <select
                  name="serviceName"
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white"
                >
                  <option value="Haircut">Haircut</option>
                  <option value="Hairstyling">Hairstyling</option>
                  <option value="Balayage">Balayage</option>
                  <option value="Keratin Treatments">Keratin Treatments</option>
                  <option value="Hair Colouring">Hair Colouring</option>
                  <option value="De-tan and Facial">De-tan and Facial</option>
                  <option value="Manicure and Pedicure">Manicure and Pedicure</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Stylist / Staff Member</label>
                <input
                  name="assignedStaff"
                  defaultValue={customerToVisit.assignedStaff || 'Raju'}
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Time of Visit</label>
                <input
                  name="visitTime"
                  defaultValue={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Stylist Notes</label>
                <textarea
                  name="staffNotes"
                  rows={2}
                  placeholder="Hair condition, formula used, haircut specs..."
                  className="w-full p-2.5 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddVisitModal(false);
                    setCustomerToVisit(null);
                  }}
                  className="py-2 px-4 bg-[#222222] text-white rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVisit}
                  className="py-2 px-5 bg-[#C6A15B] text-[#111111] font-semibold uppercase rounded hover:bg-[#D6B979] cursor-pointer disabled:opacity-40"
                >
                  {isSubmittingVisit ? 'Saving...' : 'Record Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 3: VIEW CUSTOMER PROFILE */}
      {/* ========================================================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#C6A15B]/50 rounded-sm p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#111111] border border-[#C6A15B] flex items-center justify-center text-[#C6A15B] font-bold text-lg">
                {selectedCustomer.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="font-serif-elegant text-xl font-bold text-white">
                  {selectedCustomer.fullName}
                </h3>
                <span className="font-mono text-xs text-[#C6A15B] font-semibold">
                  {selectedCustomer.id} • Registered {selectedCustomer.registeredDate}
                </span>
              </div>
            </div>

            {/* Profile fields */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#121212] rounded border border-white/5 text-xs mb-6">
              <div>
                <span className="text-white/40 block">Mobile:</span>
                <span className="font-mono text-white font-medium">{selectedCustomer.mobile}</span>
              </div>
              <div>
                <span className="text-white/40 block">Email:</span>
                <span className="text-white font-medium">{selectedCustomer.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-white/40 block">Appointment Type:</span>
                <span className="text-white font-medium uppercase">{selectedCustomer.appointmentType}</span>
              </div>
              <div>
                <span className="text-white/40 block">Total Visits:</span>
                <span className="text-[#C6A15B] font-bold text-sm">{selectedCustomer.totalVisits || 1}</span>
              </div>
              <div className="col-span-2">
                <span className="text-white/40 block">Notes & Preferences:</span>
                <span className="text-white/80">{selectedCustomer.notes || 'None recorded'}</span>
              </div>
            </div>

            {/* Visit History */}
            <h4 className="font-serif-elegant font-semibold text-sm text-white mb-2">
              Visit History ({salonDb.getVisitsByCustomer(selectedCustomer.id).length} recorded visits)
            </h4>
            <div className="space-y-2 mb-6">
              {salonDb.getVisitsByCustomer(selectedCustomer.id).length === 0 ? (
                <div className="text-xs text-white/40 italic">No visit history found.</div>
              ) : (
                salonDb.getVisitsByCustomer(selectedCustomer.id).map((v) => (
                  <div key={v.id} className="p-3 bg-[#131313] rounded border border-white/5 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">{v.serviceName}</div>
                      <div className="text-[10px] text-white/50">{v.visitDate} at {v.visitTime} • Stylist: {v.assignedStaff}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-[#C6A15B]">
                      {v.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCustomerToVisit(selectedCustomer);
                  setShowAddVisitModal(true);
                  setSelectedCustomer(null);
                }}
                className="py-2 px-4 bg-[#C6A15B] text-[#111111] text-xs font-semibold rounded uppercase hover:bg-[#D6B979]"
              >
                + Record New Visit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 4: EDIT SERVICE / REPLACE PHOTOGRAPHY */}
      {/* ========================================================== */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#C6A15B]/50 rounded-sm p-6 max-w-md w-full shadow-2xl relative text-xs">
            <button
              onClick={() => setEditingService(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif-elegant text-lg font-bold text-white mb-1">
              Edit Service & Photography
            </h3>
            <p className="text-white/60 mb-4">
              Replace sample photograph with an actual salon photo URL or edit service details.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                salonDb.updateService(editingService.id, editingService);
                showToast(`Updated service ${editingService.name}`);
                setEditingService(null);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-white/70 uppercase mb-1">Service Name</label>
                <input
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Photograph Image URL</label>
                <input
                  value={editingService.image}
                  onChange={(e) => setEditingService({ ...editingService, image: e.target.value })}
                  placeholder="/assets/salon/... or uploaded photo URL"
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white font-mono text-[11px]"
                />
                <div className="mt-2 h-28 rounded overflow-hidden bg-black border border-white/10">
                  <img src={editingService.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingService.description}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="py-1.5 px-3 bg-[#222222] text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-[#C6A15B] text-[#111111] font-semibold uppercase rounded"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 5: ANSWER CUSTOMER QUESTION */}
      {/* ========================================================== */}
      {answeringQuestion && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#C6A15B]/50 rounded-sm p-6 max-w-lg w-full shadow-2xl relative text-xs">
            <button
              onClick={() => setAnsweringQuestion(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif-elegant text-lg font-bold text-white mb-1">
              Answer Customer Question
            </h3>
            <p className="text-white/60 mb-4">
              Replying to {answeringQuestion.customerName} ({answeringQuestion.id})
            </p>

            <div className="p-3 bg-[#121212] rounded border border-white/5 mb-4 text-white/80 italic">
              "{answeringQuestion.question}"
            </div>

            <div>
              <label className="block text-white/70 uppercase mb-1">Stylist / Salon Answer</label>
              <textarea
                rows={4}
                value={answerDraft}
                onChange={(e) => setAnswerDraft(e.target.value)}
                placeholder="Type your official answer here..."
                className="w-full p-3 bg-[#111111] border border-white/15 rounded text-white focus:outline-none focus:border-[#C6A15B]"
              />
            </div>

            <div className="pt-3 flex justify-between items-center">
              <span className="text-[10px] text-white/40">
                Customer can view this verified answer using Enquiry ID {answeringQuestion.id}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAnsweringQuestion(null)}
                  className="py-1.5 px-3 bg-[#222222] text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    salonDb.answerQuestion(answeringQuestion.id, answerDraft);
                    showToast('Saved answer for customer question');
                    setAnsweringQuestion(null);
                  }}
                  className="py-1.5 px-4 bg-[#C6A15B] text-[#111111] font-semibold uppercase rounded hover:bg-[#D6B979]"
                >
                  Save Answer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 6: ADD / EDIT CERTIFICATE */}
      {/* ========================================================== */}
      {showAddCertModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#C6A15B]/50 rounded-sm p-6 max-w-md w-full shadow-2xl relative text-xs">
            <button
              onClick={() => {
                setShowAddCertModal(false);
                setEditingCert(null);
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif-elegant text-lg font-bold text-white mb-1">
              {editingCert ? 'Edit Certificate' : 'Upload Professional Certificate'}
            </h3>
            <p className="text-white/60 mb-4">
              Add genuine credentials. Public visitors see a watermarked preview.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const org = (form.elements.namedItem('org') as HTMLInputElement).value;
                const desc = (form.elements.namedItem('desc') as HTMLTextAreaElement).value;
                const category = (form.elements.namedItem('category') as HTMLSelectElement).value as Certificate['category'];
                const img = (form.elements.namedItem('img') as HTMLInputElement).value;
                const date = (form.elements.namedItem('date') as HTMLInputElement).value;

                salonDb.saveCertificate({
                  id: editingCert?.id,
                  title,
                  issuingOrganization: org,
                  description: desc,
                  category,
                  imageUrl: img,
                  issueDate: date,
                });

                showToast('Certificate saved successfully');
                setShowAddCertModal(false);
                setEditingCert(null);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-white/70 uppercase mb-1">Certificate Title *</label>
                <input
                  required
                  name="title"
                  defaultValue={editingCert?.title || ''}
                  placeholder="e.g. Master Balayage Craft"
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Issuing Organization *</label>
                <input
                  required
                  name="org"
                  defaultValue={editingCert?.issuingOrganization || ''}
                  placeholder="e.g. L'Oreal Academy India"
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Image URL *</label>
                <input
                  required
                  name="img"
                  defaultValue={editingCert?.imageUrl || '/assets/certificates/cert-page-1.jpg'}
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 uppercase mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editingCert?.category || 'Styling'}
                    className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white"
                  >
                    <option value="Styling">Styling</option>
                    <option value="Colour & Chemical">Colour & Chemical</option>
                    <option value="Bridal">Bridal</option>
                    <option value="Hygiene & Safety">Hygiene & Safety</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 uppercase mb-1">Issue Date</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={editingCert?.issueDate || todayStr}
                    className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Description</label>
                <textarea
                  name="desc"
                  rows={2}
                  defaultValue={editingCert?.description || ''}
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCertModal(false);
                    setEditingCert(null);
                  }}
                  className="py-1.5 px-3 bg-[#222222] text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-[#C6A15B] text-[#111111] font-semibold uppercase rounded hover:bg-[#D6B979]"
                >
                  Save Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 7: ADD GALLERY PHOTO */}
      {/* ========================================================== */}
      {showAddGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#C6A15B]/50 rounded-sm p-6 max-w-md w-full shadow-2xl relative text-xs">
            <button
              onClick={() => setShowAddGalleryModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif-elegant text-lg font-bold text-white mb-1">
              Add Gallery Photo
            </h3>
            <p className="text-white/60 mb-4">
              Add a new style inspiration or salon interior photograph.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const category = (form.elements.namedItem('category') as HTMLSelectElement).value as GalleryRecord['category'];
                const img = (form.elements.namedItem('img') as HTMLInputElement).value;

                salonDb.saveGalleryItem({
                  title,
                  category,
                  categoryLabel: category.toUpperCase(),
                  image: img,
                });

                showToast('Added photo to gallery');
                setShowAddGalleryModal(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-white/70 uppercase mb-1">Photo Title *</label>
                <input
                  required
                  name="title"
                  placeholder="e.g. Sleek Bob Cut"
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Photo URL *</label>
                <input
                  required
                  name="img"
                  placeholder="https://..."
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-white/70 uppercase mb-1">Category</label>
                <select
                  name="category"
                  className="w-full p-2 bg-[#111111] border border-white/15 rounded text-white"
                >
                  <option value="haircuts">Haircuts</option>
                  <option value="colour">Colouring</option>
                  <option value="bridal">Bridal</option>
                  <option value="treatments">Treatments</option>
                  <option value="salon">Salon Ambience</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGalleryModal(false)}
                  className="py-1.5 px-3 bg-[#222222] text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-[#C6A15B] text-[#111111] font-semibold uppercase rounded hover:bg-[#D6B979]"
                >
                  Add Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CONFIRMATION MODAL: DELETE DAILY REGISTER ENTRY */}
      {/* ========================================================== */}
      {visitToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-rose-500/50 rounded-sm p-6 max-w-md w-full shadow-2xl relative text-xs">
            <h3 className="font-serif-elegant text-lg font-bold text-rose-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Delete Daily Register Entry</span>
            </h3>
            <p className="text-white/80 mb-3">
              Are you sure you want to permanently remove this Daily Register visit entry? Only this visit record will be removed — the customer profile itself will stay intact.
            </p>
            <div className="p-3 bg-[#111111] border border-white/10 rounded space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-white/50">Visit ID:</span>
                <span className="font-mono text-[#C6A15B] font-bold">{visitToDelete.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Customer:</span>
                <span className="text-white font-semibold">{visitToDelete.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Service:</span>
                <span className="text-white">{visitToDelete.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Date &amp; Time:</span>
                <span className="text-white/80">{visitToDelete.visitDate} • {visitToDelete.visitTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Stylist / Payment:</span>
                <span className="text-white/80">{visitToDelete.assignedStaff} ({visitToDelete.paymentStatus})</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => setVisitToDelete(null)}
                className="py-1.5 px-3 bg-[#222222] text-white rounded cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={handleConfirmDeleteVisit}
                className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold uppercase rounded cursor-pointer disabled:opacity-40"
              >
                {isDeletingRecord ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CONFIRMATION MODAL: DELETE / ARCHIVE CUSTOMER */}
      {/* ========================================================== */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-rose-500/50 rounded-sm p-6 max-w-md w-full shadow-2xl relative text-xs">
            {(() => {
              const linkedVisits = visits.filter((v) => v.customerId === customerToDelete.id).length;
              return (
                <>
                  <h3 className="font-serif-elegant text-lg font-bold text-rose-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{linkedVisits > 0 ? 'Archive Customer Record' : 'Delete Customer Record'}</span>
                  </h3>
                  <p className="text-white/80 mb-3">
                    {linkedVisits > 0
                      ? `This customer has ${linkedVisits} historical Daily Register visit record(s). Confirming will archive them from your active Customers list & active CSV exports while safely keeping Daily Register & historical reports intact.`
                      : 'This customer has no Daily Register visit records. Confirming will permanently remove this customer profile.'}
                  </p>
                  <div className="p-3 bg-[#111111] border border-white/10 rounded space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span className="text-white/50">Customer ID:</span>
                      <span className="font-mono text-[#C6A15B] font-bold">{customerToDelete.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Full Name:</span>
                      <span className="text-white font-semibold">{customerToDelete.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Mobile:</span>
                      <span className="font-mono text-white/80">{customerToDelete.mobile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Recorded Visits:</span>
                      <span className="text-[#C6A15B] font-bold">{linkedVisits}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isDeletingRecord}
                      onClick={() => setCustomerToDelete(null)}
                      className="py-1.5 px-3 bg-[#222222] text-white rounded cursor-pointer disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingRecord}
                      onClick={handleConfirmDeleteCustomer}
                      className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold uppercase rounded cursor-pointer disabled:opacity-40"
                    >
                      {isDeletingRecord
                        ? 'Processing...'
                        : linkedVisits > 0
                        ? 'Confirm Archive'
                        : 'Confirm Delete'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CONFIRMATION MODAL: DELETE QUESTION */}
      {/* ========================================================== */}
      {questionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-rose-500/50 rounded-sm p-6 max-w-md w-full shadow-2xl relative text-xs">
            <h3 className="font-serif-elegant text-lg font-bold text-rose-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Delete Customer Question</span>
            </h3>
            <p className="text-white/80 mb-3">
              {questionToDelete.status === 'answered'
                ? 'Warning: This question already has an answered/published Q&A record. Deleting it will permanently remove both the question and its saved answer.'
                : 'Are you sure you want to permanently delete this customer question?'}
            </p>
            <div className="p-3 bg-[#111111] border border-white/10 rounded mb-4 space-y-1">
              <div className="text-white/60">
                Customer: <strong className="text-white">{questionToDelete.customerName}</strong> ({questionToDelete.id})
              </div>
              <p className="italic text-white/90">"{questionToDelete.question}"</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => setQuestionToDelete(null)}
                className="py-1.5 px-3 bg-[#222222] text-white rounded cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={handleConfirmDeleteQuestion}
                className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold uppercase rounded cursor-pointer disabled:opacity-40"
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CONFIRMATION MODAL: DELETE GALLERY / CERTIFICATE */}
      {/* ========================================================== */}
      {galleryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-rose-500/50 rounded-sm p-6 max-w-md w-full shadow-2xl relative text-xs">
            <h3 className="font-serif-elegant text-lg font-bold text-rose-400 mb-2">Remove Gallery Item</h3>
            <p className="text-white/80 mb-4">
              Remove gallery item <strong>"{galleryToDelete.title}"</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGalleryToDelete(null)}
                className="py-1.5 px-3 bg-[#222222] text-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  salonDb.deleteGalleryItem(galleryToDelete.id);
                  showToast('Deleted gallery image');
                  setGalleryToDelete(null);
                }}
                className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold uppercase rounded cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {certificateToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-rose-500/50 rounded-sm p-6 max-w-md w-full shadow-2xl relative text-xs">
            <h3 className="font-serif-elegant text-lg font-bold text-rose-400 mb-2">Delete Certificate</h3>
            <p className="text-white/80 mb-4">
              Delete certificate <strong>"{certificateToDelete.title}"</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCertificateToDelete(null)}
                className="py-1.5 px-3 bg-[#222222] text-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  salonDb.deleteCertificate(certificateToDelete.id);
                  showToast('Deleted certificate');
                  setCertificateToDelete(null);
                }}
                className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold uppercase rounded cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CONFIRMATION MODAL: RESTORE BACKUP JSON */}
      {/* ========================================================== */}
      {restorePreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#C6A15B]/50 rounded-sm p-6 max-w-md w-full shadow-2xl relative text-xs">
            <h3 className="font-serif-elegant text-lg font-bold text-[#D6B979] mb-2">
              Confirm Backup Restore
            </h3>
            <p className="text-white/80 mb-3">
              Restoring this snapshot will replace your current Customers, Daily Register visits, Appointments, and Salon Q&amp;A records with the backup data below. Your server-side owner username, password, and PIN will remain unchanged.
            </p>
            <div className="p-3 bg-[#111111] border border-white/10 rounded space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-white/50">Customers in Backup:</span>
                <span className="text-white font-bold">{restorePreview.customers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Daily Register Visits:</span>
                <span className="text-white font-bold">{restorePreview.visits.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Appointments:</span>
                <span className="text-white font-bold">{restorePreview.appointments?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Salon Questions:</span>
                <span className="text-white font-bold">{restorePreview.questions?.length || 0}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isRestoringBackup}
                onClick={() => setRestorePreview(null)}
                className="py-1.5 px-3 bg-[#222222] text-white rounded cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoringBackup}
                onClick={handleConfirmRestoreBackup}
                className="py-1.5 px-4 bg-[#C6A15B] hover:bg-[#D6B979] text-[#111111] font-semibold uppercase rounded cursor-pointer disabled:opacity-40"
              >
                {isRestoringBackup ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
