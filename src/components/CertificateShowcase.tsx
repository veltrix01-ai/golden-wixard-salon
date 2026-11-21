import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { INITIAL_REAL_CERTIFICATES, CertificateItem } from '../data/menuData';
import { acquireBodyScrollLock } from '../utils/scrollLock';
import {
  Award,
  ShieldCheck,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
  Calendar,
  MapPin,
} from 'lucide-react';

export const CertificateShowcase: React.FC = () => {
  const [certificates, setCertificates] = useState<CertificateItem[]>(INITIAL_REAL_CERTIFICATES);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const fetchCertificates = async () => {
    try {
      const res = await fetch('/api/certificates');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.certificates)) {
          setCertificates(data.certificates);
        }
      }
    } catch {
      // Keep canonical initial certificates fallback
    }
  };

  useEffect(() => {
    fetchCertificates();
    const onRefresh = () => fetchCertificates();
    window.addEventListener('focus', onRefresh);
    window.addEventListener('gw-certificates-updated', onRefresh);
    return () => {
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('gw-certificates-updated', onRefresh);
    };
  }, []);

  const closeModal = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const showPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedIndex((prev) =>
        prev === null || certificates.length === 0
          ? null
          : (prev - 1 + certificates.length) % certificates.length
      );
    },
    [certificates.length]
  );

  const showNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedIndex((prev) =>
        prev === null || certificates.length === 0 ? null : (prev + 1) % certificates.length
      );
    },
    [certificates.length]
  );

  useEffect(() => {
    if (selectedIndex === null) return;
    const releaseLock = acquireBodyScrollLock();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      releaseLock();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedIndex, closeModal, showPrev, showNext]);

  const activeCert = selectedIndex !== null ? certificates[selectedIndex] : null;

  return (
    <section
      id="certificates"
      className="py-10 md:py-16 relative border-t border-b border-white/5 bg-[#0D0D0D]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#C9A45C] uppercase block mb-1">
            Official Training &amp; Accreditations
          </span>
          <h2 className="font-serif-elegant text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F5F1E8] mb-2">
            Verified <span className="gold-gradient-text italic font-normal">Certificates</span>
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#A5A5A5]">
            Authentic training credentials awarded to Creative Director M. Ravikanth at Jawed Habib Academy &amp; ni-msme.
          </p>
        </div>

        {/* Real Scanned Certificates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {certificates.map((cert, index) => (
            <button
              key={cert.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className="group text-left rounded-xl border border-[#C9A45C]/25 hover:border-[#C9A45C]/75 bg-[#151515] transition-all flex flex-col justify-between overflow-hidden cursor-pointer shadow-md"
            >
              {/* Authentic Certificate Document Container (preserves original seals, borders & proportions) */}
              <div className="relative h-56 sm:h-64 bg-[#0B0B0B] flex items-center justify-center p-3 border-b border-white/5 overflow-hidden">
                {cert.fileType === 'pdf' ? (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <FileText className="w-12 h-12 text-[#C9A45C] mb-2" />
                    <span className="text-xs font-semibold text-[#F5F1E8]">
                      Official PDF Certificate
                    </span>
                    <span className="text-[11px] text-[#A5A5A5] mt-1">
                      Tap to open document
                    </span>
                  </div>
                ) : (
                  <img
                    src={cert.fileUrl}
                    alt={cert.title}
                    className="max-h-full w-auto object-contain rounded shadow-md group-hover:scale-[1.03] transition-transform duration-300"
                    loading="lazy"
                  />
                )}

                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111]/95 border border-[#C9A45C] text-xs font-semibold text-[#E3C78D]">
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full Certificate</span>
                  </span>
                </div>

                <div className="absolute top-2.5 left-2.5">
                  <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#111111]/90 text-[#E3C78D] border border-[#C9A45C]/35">
                    {cert.category}
                  </span>
                </div>
              </div>

              {/* Certificate Info (Strictly real metadata only) */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-1.5 text-[11px] text-[#C9A45C] font-semibold mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{cert.issuingOrganization}</span>
                  </div>
                  <h3 className="font-serif-elegant text-base sm:text-lg font-bold text-[#F5F1E8] group-hover:text-[#E3C78D] transition-colors leading-snug mb-2">
                    {cert.title}
                  </h3>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A5A5A5]">
                  <span className="flex items-center gap-1">
                    {cert.issueDate ? (
                      <>
                        <Calendar className="w-3 h-3 text-[#C9A45C]" />
                        <span>{cert.issueDate}</span>
                      </>
                    ) : cert.centre ? (
                      <>
                        <MapPin className="w-3 h-3 text-[#C9A45C]" />
                        <span>{cert.centre}</span>
                      </>
                    ) : (
                      <span>Recipient: {cert.recipient || 'M. Ravikanth'}</span>
                    )}
                  </span>

                  <span className="flex items-center gap-1 font-semibold text-[#C9A45C]">
                    <span>Inspect</span>
                    <Award className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal with Prev / Next Navigation */}
      {activeCert &&
        selectedIndex !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={closeModal}
            className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          >
          {/* Previous Button */}
          {certificates.length > 1 && (
            <button
              type="button"
              onClick={showPrev}
              aria-label="Previous certificate"
              className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-[#1A1A1A]/90 hover:bg-[#252525] border border-[#C9A45C]/40 text-white flex items-center justify-center cursor-pointer z-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next Button */}
          {certificates.length > 1 && (
            <button
              type="button"
              onClick={showNext}
              aria-label="Next certificate"
              className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-[#1A1A1A]/90 hover:bg-[#252525] border border-[#C9A45C]/40 text-white flex items-center justify-center cursor-pointer z-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[90vh] bg-[#161616] border border-[#C9A45C]/50 rounded-xl p-4 sm:p-6 shadow-2xl flex flex-col overflow-y-auto"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close certificate preview"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 rounded-lg bg-black/50 hover:bg-black/80 border border-white/20 flex items-center justify-center cursor-pointer transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="bg-[#0B0B0B] rounded-lg border border-white/10 p-2 sm:p-4 flex items-center justify-center min-h-[280px] sm:min-h-[380px]">
              {activeCert.fileType === 'pdf' ? (
                <iframe
                  src={activeCert.fileUrl}
                  title={activeCert.title}
                  className="w-full h-[55vh] rounded border-0"
                />
              ) : (
                <img
                  src={activeCert.fileUrl}
                  alt={activeCert.title}
                  className="max-h-[60vh] w-auto object-contain rounded"
                />
              )}
            </div>

            <div className="mt-4 text-left space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider text-[#C9A45C] font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{activeCert.issuingOrganization}</span>
                </span>
                <span className="text-[11px] font-mono text-[#A5A5A5]">
                  {selectedIndex + 1} / {certificates.length}
                </span>
              </div>

              <h3 className="font-serif-elegant text-lg sm:text-2xl font-bold text-[#F5F1E8]">
                {activeCert.title}
              </h3>

              {activeCert.description && (
                <p className="text-xs sm:text-sm text-[#A5A5A5] leading-relaxed">
                  {activeCert.description}
                </p>
              )}

              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#A5A5A5]">
                <div className="flex flex-wrap items-center gap-4">
                  {activeCert.recipient && (
                    <span>
                      Recipient: <strong className="text-[#F5F1E8]">{activeCert.recipient}</strong>
                    </span>
                  )}
                  {activeCert.centre && (
                    <span>
                      Centre: <strong className="text-[#F5F1E8]">{activeCert.centre}</strong>
                    </span>
                  )}
                  {activeCert.issueDate && (
                    <span>
                      Date: <strong className="text-[#F5F1E8]">{activeCert.issueDate}</strong>
                    </span>
                  )}
                  {activeCert.certificateRef && (
                    <span>
                      Ref: <strong className="font-mono text-[#E3C78D]">{activeCert.certificateRef}</strong>
                    </span>
                  )}
                </div>

                {activeCert.fileType === 'pdf' && (
                  <a
                    href={activeCert.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#C9A45C] hover:underline font-semibold"
                  >
                    <span>Open PDF</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
