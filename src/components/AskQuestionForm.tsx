import React, { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Send, CheckCircle2, AlertCircle, Shield, HelpCircle } from 'lucide-react';
import { HumanVerification } from './HumanVerification';
import {
  ASKER_NAME_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  QUESTION_MIN_LENGTH,
  validateQuestionSubmission,
} from '../validation/questionValidation';
import { submitCustomerQuestion } from '../services/questionApi';

export const AskQuestionForm: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [askerName, setAskerName] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [humanVerified, setHumanVerified] = useState(false);
  const [honeypotWebsite, setHoneypotWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const submittingRef = useRef(false);

  const charCount = questionText.length;
  const isTooShort = charCount > 0 && charCount < QUESTION_MIN_LENGTH;
  const isTooLong = charCount > QUESTION_MAX_LENGTH;

  const handleHumanVerificationChange = (checked: boolean) => {
    setHumanVerified(checked);
    if (checked && errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const validation = validateQuestionSubmission({
      askerName,
      questionText,
      humanVerified,
    });

    if (validation.valid === false) {
      setErrorMessage(validation.error);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await submitCustomerQuestion({
        question: validation.question,
        asker_name: validation.askerName,
        human_verified: humanVerified,
        website: honeypotWebsite,
      });

      if (!result.ok) {
        setErrorMessage(
          result.error ||
            'Unable to save your question right now. Please try again in a moment.'
        );
        return;
      }

      setSuccessMessage(
        result.message ||
          'Thank you! Your question has been submitted. The salon owner will review and answer it soon.'
      );
      setQuestionText('');
      setAskerName('');
      setHoneypotWebsite('');
      setHumanVerified(false);
    } catch {
      setErrorMessage(
        'Network error while submitting your question. Please check your connection and try again.'
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
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
              Submit your question without an account. Verified answers are published in our FAQ.
            </p>
          </div>

          {/* Success Notification */}
          {successMessage && (
            <div
              role="status"
              className={`mb-6 p-4 rounded-lg border text-xs sm:text-sm flex items-start gap-3 ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{successMessage}</p>
                <p className="text-xs opacity-80 mt-1">
                  Once answered by the salon owner, your question and its official advice will appear in Frequently Asked Questions.
                </p>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div
              role="alert"
              className={`mb-6 p-4 rounded-lg border text-xs flex items-center gap-2.5 ${
                isLight
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Honeypot — hidden from humans, traps bots that fill every field */}
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="gw-contact-website">Leave this field empty</label>
              <input
                id="gw-contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypotWebsite}
                onChange={(e) => setHoneypotWebsite(e.target.value)}
              />
            </div>

            {/* 1. Customer Name (Optional) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                Customer Name <span className="opacity-60 text-[10px] font-normal lowercase">(optional)</span>
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

            {/* 3. Human verification checkbox */}
            <HumanVerification
              checked={humanVerified}
              onChange={handleHumanVerificationChange}
              disabled={isSubmitting}
              isLight={isLight}
            />

            {/* Rate limit advisory */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] opacity-60 text-center">
              <Shield className="w-3.5 h-3.5 text-[#C9A45C] shrink-0" />
              <span>Maximum 5 questions per hour per IP. Submitted questions are stored privately until verified by the salon owner.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className={`w-full py-3.5 px-6 font-bold text-xs sm:text-sm tracking-wider uppercase rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isLight
                  ? 'bg-[#A9823D] hover:bg-[#967232] text-white'
                  : 'bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Question...' : 'Submit Question'}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
