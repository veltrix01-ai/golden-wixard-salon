import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { MessageCircle, CheckCircle2, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';
import {
  ASKER_NAME_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  QUESTION_MIN_LENGTH,
  validateQuestionSubmission,
} from '../validation/questionValidation';
import { buildQuestionWhatsAppUrl } from '../config/salonContact';

export const AskQuestionForm: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [askerName, setAskerName] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successWhatsAppUrl, setSuccessWhatsAppUrl] = useState<string | null>(null);

  const charCount = questionText.length;
  const isTooShort = charCount > 0 && charCount < QUESTION_MIN_LENGTH;
  const isTooLong = charCount > QUESTION_MAX_LENGTH;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOpening) return;

    setErrorMessage(null);
    setSuccessWhatsAppUrl(null);

    const validation = validateQuestionSubmission({
      askerName,
      questionText,
    });

    if (validation.valid === false) {
      setErrorMessage(validation.error);
      return;
    }

    const url = buildQuestionWhatsAppUrl(
      validation.askerName || '',
      validation.question
    );

    setIsOpening(true);
    window.open(url, '_blank');

    // Show success state and store URL for the fallback link
    setSuccessWhatsAppUrl(url);
    setAskerName('');
    setQuestionText('');

    // Re-enable button after a brief delay to prevent double-click
    setTimeout(() => setIsOpening(false), 2000);
  };

  return (
    <section
      id="ask-question-form"
      className="py-8 sm:py-12 relative bg-[#0D0D0D]"
    >
      <div className="max-w-xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="border border-[#C9A45C]/30 bg-[#161616] rounded-xl p-4 sm:p-7 shadow-xl relative text-[#F5F1E8]">
          {/* Header */}
          <div className="text-center max-w-lg mx-auto mb-5">
            <div className="inline-flex items-center gap-1.5 mb-1.5 text-[#C9A45C]">
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase">Have a Query?</span>
            </div>
            <h3 className="font-serif-elegant text-xl sm:text-2xl font-bold mb-1.5 text-[#F5F1E8]">
              Ask Our Stylists
            </h3>
            <p className="text-xs font-light text-[#A5A5A5]">
              Type your question below and send it directly to us on WhatsApp. No login needed.
            </p>
          </div>

          {/* Success Notification */}
          {successWhatsAppUrl && (
            <div
              role="status"
              className="mb-6 p-4 rounded-lg border bg-emerald-950/60 border-emerald-500/50 text-emerald-200 text-xs sm:text-sm"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">WhatsApp has opened with your question.</p>
                  <p className="opacity-80 mt-1">
                    Please press <strong>Send</strong> in WhatsApp to deliver your message to the salon.
                  </p>
                  <a
                    href={successWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-[#C9A45C] underline underline-offset-2 hover:text-[#D6B979] text-xs font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open WhatsApp Again
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-lg border bg-rose-950/60 border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* 1. Customer Name (Optional) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                Your Name <span className="opacity-60 text-[10px] font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                value={askerName}
                maxLength={ASKER_NAME_MAX_LENGTH}
                onChange={(e) => setAskerName(e.target.value)}
                placeholder="e.g. Priya Sharma (or leave blank to ask anonymously)"
                className={`w-full px-4 py-3 rounded-lg text-sm border focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C] placeholder-[#8F887D] focus:border-[#A9823D]'
                    : 'bg-[#111111] border-white/10 text-[#F5F1E8] placeholder-white/30 focus:border-[#C9A45C]'
                }`}
              />
            </div>

            {/* 2. Question (Required, 10–500 characters) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-80">
                  Question <span className="text-[#C9A45C]">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    isTooShort
                      ? 'text-amber-500 font-semibold'
                      : isTooLong
                      ? 'text-rose-500 font-bold'
                      : 'opacity-50'
                  }`}
                >
                  {charCount} / {QUESTION_MAX_LENGTH} characters {isTooShort && `(min ${QUESTION_MIN_LENGTH})`}
                </span>
              </div>
              <textarea
                rows={4}
                required
                value={questionText}
                maxLength={QUESTION_MAX_LENGTH}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Write your styling, treatment, or appointment question here (between 10 and 500 characters)..."
                className={`w-full p-4 rounded-lg text-sm border focus:outline-none transition-colors ${
                  isTooLong
                    ? 'border-rose-500 focus:border-rose-500'
                    : isLight
                    ? 'bg-[#F5F2EB] border-[#E8E1D5] text-[#24211C] placeholder-[#8F887D] focus:border-[#A9823D]'
                    : 'bg-[#111111] border-white/10 text-[#F5F1E8] placeholder-white/30 focus:border-[#C9A45C]'
                }`}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isOpening}
              aria-busy={isOpening}
              className={`w-full py-3.5 px-6 font-bold text-xs sm:text-sm tracking-wider uppercase rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isLight
                  ? 'bg-[#A9823D] hover:bg-[#967232] text-white'
                  : 'bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isOpening ? 'Opening WhatsApp...' : 'Ask on WhatsApp'}</span>
            </button>

            <p className="text-[10px] text-center opacity-40">
              Tapping the button opens WhatsApp with your question pre-filled. Press Send inside WhatsApp to deliver it to the salon.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};
