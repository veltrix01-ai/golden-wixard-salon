import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  SALON_BRANCHES,
  BranchId,
  getBranchWhatsAppBookingUrl,
} from '../data/salonData';
import { acquireBodyScrollLock } from '../utils/scrollLock';
import {
  X,
  MapPin,
  Navigation,
  Calendar,
  Phone,
  ClipboardList,
} from 'lucide-react';
import { CrownIcon } from './CrownIcon';

interface BranchBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseFormForBranch: (branchId: BranchId) => void;
  whatsappNumber?: string;
}

export const BranchBookingModal: React.FC<BranchBookingModalProps> = ({
  isOpen,
  onClose,
  onChooseFormForBranch,
  whatsappNumber,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    return acquireBodyScrollLock();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="branch-booking-modal-title"
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#141414] border border-[#C9A45C]/40 rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black text-[#F5F1E8] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.92), 0 0 40px rgba(201, 164, 92, 0.16)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close branch selection modal"
          className="absolute top-3.5 right-3.5 p-2 text-[#A5A5A5] hover:text-[#F5F1E8] hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center max-w-lg mx-auto mb-5 sm:mb-6">
          <div className="mx-auto w-11 h-11 rounded-xl bg-[#1C1C1C] border border-[#C9A45C]/50 flex items-center justify-center mb-3">
            <CrownIcon className="w-6 h-6 text-[#C9A45C]" />
          </div>
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C] block mb-1">
            Golden Wizard Professional Hair &amp; Beauty Salon
          </span>
          <h2
            id="branch-booking-modal-title"
            className="font-serif-elegant text-xl sm:text-2xl font-bold text-[#F5F1E8] mb-1.5"
          >
            Select Your Preferred Branch
          </h2>
          <p className="text-xs sm:text-sm text-[#A5A5A5]">
            Choose the branch where you would like to book your appointment.
          </p>
        </div>

        {/* Two Branch Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SALON_BRANCHES.map((branch) => {
            const whatsappUrl = getBranchWhatsAppBookingUrl(
              branch.id,
              whatsappNumber
            );

            return (
              <div
                key={branch.id}
                className="border border-[#C9A45C]/30 bg-[#191919] rounded-xl p-4 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#C9A45C]/15 border border-[#C9A45C]/40 text-[#E3C78D] text-[10px] font-bold uppercase tracking-wider">
                      <MapPin className="w-3 h-3 text-[#C9A45C]" />
                      {branch.branchLabel}
                    </span>
                    {branch.phoneDisplay ? (
                      <a
                        href={`tel:${branch.phoneRaw}`}
                        className="text-[11px] text-[#C9A45C] hover:underline flex items-center gap-1 font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{branch.phoneDisplay}</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-[#A5A5A5]">
                        Contact Pending
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif-elegant text-base sm:text-lg font-bold text-[#F5F1E8] mb-1">
                    {branch.name}
                  </h3>
                  <p className="text-xs text-[#A5A5A5] leading-relaxed mb-2">
                    {branch.addressLines.join(' ')}
                  </p>
                  <p className="text-[11px] text-[#E3C78D] font-medium flex items-start gap-1.5 mb-2">
                    <Navigation className="w-3 h-3 text-[#C9A45C] shrink-0 mt-0.5" />
                    <span>{branch.landmark}</span>
                  </p>
                  <a
                    href={branch.googleMapsSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#C9A45C] hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>View on Google Maps</span>
                  </a>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/10">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book {branch.branchNumber} (WhatsApp)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      onChooseFormForBranch(branch.id);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-white/10 hover:border-[#C9A45C]/50 bg-[#121212] text-[#F5F1E8] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-[#C9A45C]" />
                    <span>Use Time-Slot Form</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
