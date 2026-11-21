import React, { useState, useEffect, useMemo } from 'react';
import { salonDb } from '../services/db';
import {
  SALON_INFO,
  SALON_BRANCHES,
  BranchId,
  getBranchById,
  getBranchWhatsAppBookingUrl,
  getBranchWhatsAppEnquiryUrl,
  getWhatsAppUrl,
} from '../data/salonData';
import {
  INITIAL_MENU_SNAPSHOT,
  MenuCategory,
  MenuService,
  formatRsPrice,
} from '../data/menuData';
import {
  Calendar,
  Clock,
  User,
  Phone,
  MessageSquare,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Send,
  MapPin,
} from 'lucide-react';

interface BookingSectionProps {
  preselectedService?: string;
  onClearPreselectedService?: () => void;
  selectedBranchId?: BranchId;
  onSelectBranchId?: (branchId: BranchId) => void;
  whatsappNumber?: string;
}

export const BookingSection: React.FC<BookingSectionProps> = ({
  preselectedService,
  onClearPreselectedService,
  selectedBranchId,
  onSelectBranchId,
  whatsappNumber,
}) => {
  const [internalBranchId, setInternalBranchId] = useState<BranchId>(
    selectedBranchId || 'branch-1'
  );
  useEffect(() => {
    if (selectedBranchId) {
      setInternalBranchId(selectedBranchId);
    }
  }, [selectedBranchId]);

  const activeBranchId = selectedBranchId || internalBranchId;
  const activeBranch = useMemo(
    () => getBranchById(activeBranchId),
    [activeBranchId]
  );

  const handleBranchChange = (branchId: BranchId) => {
    setInternalBranchId(branchId);
    onSelectBranchId?.(branchId);
  };

  const effectiveWhatsAppNumber = whatsappNumber || SALON_INFO.whatsappNumber;
  const directWhatsAppBookingUrl = getBranchWhatsAppBookingUrl(
    activeBranchId,
    effectiveWhatsAppNumber
  );
  const directWhatsAppEnquiryUrl = getBranchWhatsAppEnquiryUrl(
    activeBranchId,
    effectiveWhatsAppNumber
  );
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>(
    INITIAL_MENU_SNAPSHOT.categories
  );
  const [menuServices, setMenuServices] = useState<MenuService[]>(
    INITIAL_MENU_SNAPSHOT.services
  );

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappShareUrl, setWhatsappShareUrl] = useState<string | null>(null);

  const todayString = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetch('/api/menu')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories && data?.services) {
          setMenuCategories(data.categories);
          setMenuServices(data.services);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (preselectedService) {
      setService(preselectedService);
    }
  }, [preselectedService]);

  const groupedOptions = useMemo(() => {
    return menuCategories.map((cat) => {
      const items = menuServices.filter((s) => s.categoryId === cat.id);
      return { category: cat, items };
    });
  }, [menuCategories, menuServices]);

  const timeSlots = [
    '09:30 AM',
    '10:30 AM',
    '11:30 AM',
    '12:30 PM',
    '02:00 PM',
    '03:30 PM',
    '04:30 PM',
    '05:30 PM',
    '06:30 PM',
    '07:30 PM',
    '08:00 PM',
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Please provide your full name.';
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!phone.trim()) {
      newErrors.phone = 'Please provide your mobile number.';
    } else if (cleanPhone.length < 10) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number.';
    }
    if (!service) {
      newErrors.service = 'Please select a salon service.';
    }
    if (!date) {
      newErrors.date = 'Please pick a preferred date.';
    }
    if (!time) {
      newErrors.time = 'Please select a preferred time.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    const cleanMobile = phone.replace(/[^0-9]/g, '');
    const branchLabel = `${activeBranch.branchNumber} — ${activeBranch.shortArea}`;
    const trimmedNotes = notes.trim();
    const combinedNotes = trimmedNotes
      ? `[${branchLabel}] ${trimmedNotes}`
      : `[${branchLabel}]`;

    const buildWhatsappShareUrl = (aptId: string) => {
      const message =
        `*APPOINTMENT ENQUIRY [${aptId}] - GOLDEN WIZARD SALON*\n\n` +
        `*Salon Branch:* ${activeBranch.name}\n` +
        `*Client Name:* ${name.trim()}\n` +
        `*Phone:* ${cleanMobile}\n` +
        `*Service Requested:* ${service}\n` +
        `*Preferred Date:* ${date}\n` +
        `*Preferred Time Slot:* ${time}\n` +
        (trimmedNotes ? `*Notes/Requests:* ${trimmedNotes}\n` : '') +
        `\n_Submitted via Golden Wizard website form._`;
      return getWhatsAppUrl(message, effectiveWhatsAppNumber);
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: cleanMobile,
          service_name: service,
          preferred_date: date,
          preferred_time: time,
          notes: combinedNotes,
        }),
      });

      const serverData = await response.json().catch(() => ({}));

      if (response.status >= 400 && response.status < 500) {
        setSubmitError(serverData.error || 'Please check your booking details and try again.');
        return;
      }

      if (!response.ok) {
        throw new Error(serverData.error || `Booking API error (${response.status})`);
      }

      salonDb.createAppointment({
        customerName: name.trim(),
        mobile: cleanMobile,
        service,
        date,
        timeSlot: time,
        notes: combinedNotes,
      });

      const aptId = serverData.booking?.id || 'GW-APT';
      setSubmissionSuccess(aptId);
      setWhatsappShareUrl(buildWhatsappShareUrl(aptId));
    } catch (err) {
      console.error('Booking submission error', err);
      salonDb.createAppointment({
        customerName: name.trim(),
        mobile: cleanMobile,
        service,
        date,
        timeSlot: time,
        notes: combinedNotes,
      });
      setSubmissionSuccess('GW-REQ');
      setWhatsappShareUrl(buildWhatsappShareUrl('GW-REQ'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="booking" className="py-10 md:py-16 relative overflow-hidden bg-[#0D0D0D]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#C9A45C] uppercase block mb-1">
            Schedule Your Visit
          </span>
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-2">
            Book an <span className="gold-gradient-text italic font-normal">Appointment</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5] mb-4">
            Select your preferred Golden Wizard branch and book via WhatsApp or submit your time slot below.
          </p>

          {/* Branch Quick Switcher */}
          <div
            role="group"
            aria-label="Choose Salon Branch"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left mb-4"
          >
            {SALON_BRANCHES.map((branch) => {
              const isSelected = branch.id === activeBranchId;
              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => handleBranchChange(branch.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1D1A13] border-[#C9A45C] shadow-md shadow-[#C9A45C]/10'
                      : 'bg-[#151515] border-white/10 hover:border-[#C9A45C]/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#C9A45C]">
                      <MapPin className="w-3 h-3" />
                      {branch.branchNumber}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#C9A45C] text-[#0D0D0D]">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#F5F1E8] truncate">
                    {branch.shortArea}
                  </p>
                  <p className="text-[11px] text-[#A5A5A5] truncate">
                    {branch.landmark}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <a
              href={directWhatsAppBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] text-xs font-bold uppercase tracking-wider shadow-md transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book {activeBranch.branchNumber} on WhatsApp</span>
            </a>
            <a
              href={directWhatsAppEnquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#25D366]/45 bg-[#181818] hover:bg-[#202020] text-[#25D366] text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Enquire ({activeBranch.branchNumber})</span>
            </a>
          </div>
        </div>

        <div className="border border-[#C9A45C]/30 bg-[#161616] rounded-xl p-4 sm:p-7 shadow-xl relative text-[#F5F1E8]">
          {submitError && (
            <div className="mb-6 p-4 rounded-lg border text-xs sm:text-sm bg-rose-950/60 border-rose-500/50 text-rose-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="opacity-70 hover:opacity-100 text-xs underline cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {submissionSuccess && (
            <div className="mb-6 p-5 rounded-lg border text-xs sm:text-sm bg-emerald-950/60 border-emerald-500/50 text-emerald-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">
                      Appointment Enquiry Received! (Ref: <span className="font-mono">{submissionSuccess}</span>)
                    </h4>
                    <p className="text-xs opacity-80 mt-1 leading-relaxed">
                      Thank you! Your appointment request has been recorded in our system. Our team will verify stylist availability and contact you.
                    </p>
                    {whatsappShareUrl && (
                      <div className="mt-3">
                        <a
                          href={whatsappShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] text-[#0D0D0D] font-bold text-xs rounded-lg hover:brightness-110 transition-all shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Fast-Track Confirmation on WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmissionSuccess(null)}
                  className="opacity-60 hover:opacity-100 text-xs underline cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#121212] border border-[#C9A45C]/30 text-xs">
              <span className="text-[#A5A5A5] flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-[#C9A45C] shrink-0" />
                <span className="truncate">
                  Booking for:{' '}
                  <strong className="text-[#E3C78D]">{activeBranch.branchNumber}</strong> ({activeBranch.shortArea})
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  handleBranchChange(
                    activeBranchId === 'branch-1' ? 'branch-2' : 'branch-1'
                  )
                }
                className="text-[11px] font-semibold text-[#C9A45C] hover:underline shrink-0 cursor-pointer"
              >
                Switch Branch
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase mb-2 opacity-80">
                  Customer Name <span className="text-[#C9A45C]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    placeholder="e.g. Ananya Reddy"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none transition-colors ${
                      errors.name
                        ? 'border-rose-500 bg-[#121212] text-[#F5F1E8]'
                        : 'bg-[#121212] border-white/10 text-[#F5F1E8] placeholder-white/30 focus:border-[#C9A45C]'
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase mb-2 opacity-80">
                  Phone Number <span className="text-[#C9A45C]">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors({ ...errors, phone: '' });
                    }}
                    placeholder="e.g. 98765 43210"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none transition-colors ${
                      errors.phone
                        ? 'border-rose-500 bg-[#121212] text-[#F5F1E8]'
                        : 'bg-[#121212] border-white/10 text-[#F5F1E8] placeholder-white/30 focus:border-[#C9A45C]'
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold tracking-wider uppercase opacity-80">
                  Select Service <span className="text-[#C9A45C]">*</span>
                </label>
                {service && onClearPreselectedService && (
                  <button
                    type="button"
                    onClick={() => {
                      setService('');
                      onClearPreselectedService();
                    }}
                    className="text-[11px] text-[#C9A45C] hover:underline cursor-pointer"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={service}
                  onChange={(e) => {
                    setService(e.target.value);
                    if (errors.service) setErrors({ ...errors, service: '' });
                  }}
                  className={`w-full pl-10 pr-8 py-3 border rounded-lg text-sm focus:outline-none transition-colors appearance-none cursor-pointer ${
                    errors.service
                      ? 'border-rose-500 bg-[#121212] text-[#F5F1E8]'
                      : 'bg-[#121212] border-white/10 text-[#F5F1E8] focus:border-[#C9A45C]'
                  }`}
                >
                  <option value="" disabled>
                    -- Choose a service from our salon menu --
                  </option>
                  {groupedOptions.map(({ category, items }) => (
                    <optgroup key={category.id} label={category.name}>
                      {items.length === 0 ? (
                        <option value={category.name}>
                          {category.name} (Consultation)
                        </option>
                      ) : (
                        items.map((item) => (
                          <option
                            key={item.id}
                            value={`${item.name} (${category.name})`}
                          >
                            {item.name} — {formatRsPrice(item.price)}
                          </option>
                        ))
                      )}
                    </optgroup>
                  ))}
                </select>
              </div>
              {errors.service && (
                <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.service}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase mb-2 opacity-80">
                  Preferred Date <span className="text-[#C9A45C]">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    min={todayString}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (errors.date) setErrors({ ...errors, date: '' });
                    }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none transition-colors cursor-pointer ${
                      errors.date
                        ? 'border-rose-500 bg-[#121212] text-[#F5F1E8]'
                        : 'bg-[#121212] border-white/10 text-[#F5F1E8] focus:border-[#C9A45C]'
                    }`}
                  />
                </div>
                {errors.date && (
                  <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.date}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase mb-2 opacity-80">
                  Preferred Time Slot <span className="text-[#C9A45C]">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      if (errors.time) setErrors({ ...errors, time: '' });
                    }}
                    className={`w-full pl-10 pr-8 py-3 border rounded-lg text-sm focus:outline-none transition-colors appearance-none cursor-pointer ${
                      errors.time
                        ? 'border-rose-500 bg-[#121212] text-[#F5F1E8]'
                        : 'bg-[#121212] border-white/10 text-[#F5F1E8] focus:border-[#C9A45C]'
                    }`}
                  >
                    <option value="" disabled>
                      -- Choose a time slot --
                    </option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.time && (
                  <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.time}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase mb-2 opacity-80">
                Additional Message / Requests (Optional)
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-3.5 pointer-events-none" />
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any hair color history, bridal event timings, or specific preferences..."
                  className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none transition-colors bg-[#121212] border-white/10 text-[#F5F1E8] placeholder-white/30 focus:border-[#C9A45C]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 font-bold text-xs sm:text-sm tracking-wider uppercase rounded-lg shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Recording Enquiry...' : 'Request Appointment'}</span>
              </button>
              <p className="text-center text-[11px] mt-2.5 text-[#A5A5A5]">
                Records your booking request and lets you share directly on WhatsApp (<strong>+91 86863 85552</strong>).
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
