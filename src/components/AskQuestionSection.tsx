import React, { useState } from 'react';
import { salonDb, CustomerQuestion } from '../services/db';
import { CrownIcon } from './CrownIcon';
import { useTheme } from '../context/ThemeContext';
import { HelpCircle, Send, CheckCircle2, Search, MessageSquare, Phone, Mail, Sparkles, Clock, AlertCircle } from 'lucide-react';

export const AskQuestionSection: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Haircut');
  const [question, setQuestion] = useState('');
  const [preferredContact, setPreferredContact] = useState<'WhatsApp' | 'Phone Call' | 'Email'>('WhatsApp');
  const [formError, setFormError] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState<CustomerQuestion | null>(null);

  // Status Checker State
  const [activeTab, setActiveTab] = useState<'ask' | 'check'>('ask');
  const [searchEnquiryId, setSearchEnquiryId] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [searchResult, setSearchResult] = useState<CustomerQuestion | null | 'not-found'>(null);
  const [searchError, setSearchError] = useState('');

  const categories = [
    'Haircut',
    'Hair Colouring',
    'Hair Treatments',
    'Keratin',
    'Bridal Services',
    'Makeup',
    'Facial',
    'Manicure & Pedicure',
    'Pricing Enquiry',
    'Appointment Enquiry',
    'Other',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    const cleanPhone = mobile.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!question.trim()) {
      setFormError('Please type your question.');
      return;
    }

    const created = salonDb.createQuestion({
      customerName: name.trim(),
      mobile: cleanPhone,
      email: email.trim(),
      category,
      question: question.trim(),
      preferredContact,
    });

    setSubmittedQuestion(created);
    setName('');
    setMobile('');
    setEmail('');
    setQuestion('');
  };

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);

    if (!searchEnquiryId.trim() || !searchMobile.trim()) {
      setSearchError('Please provide both Enquiry ID and your registered mobile number.');
      return;
    }

    const found = salonDb.getQuestionStatusForCustomer(searchEnquiryId, searchMobile);
    if (found) {
      setSearchResult(found);
    } else {
      setSearchResult('not-found');
    }
  };

  return (
    <section id="ask-question" className={`py-20 md:py-28 relative border-t border-b transition-colors ${
      isLight ? 'bg-[#F8F5EF] border-black/5' : 'bg-[#141414] border-white/5'
    }`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 mb-3">
            <CrownIcon className="w-4 h-4 text-[#C6A15B]" />
            <span className="text-xs font-semibold tracking-[0.25em] text-[#C6A15B] uppercase">
              Customer Q&A
            </span>
            <CrownIcon className="w-4 h-4 text-[#C6A15B]" />
          </div>

          <h2 className="font-serif-elegant text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Ask Us <span className="gold-gradient-text italic font-normal">Anything</span>
          </h2>

          <div className="flex items-center justify-center gap-3 my-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#C6A15B]" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#C6A15B]" />
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#C6A15B]" />
          </div>

          <p className={`text-sm sm:text-base font-light max-w-xl mx-auto ${
            isLight ? 'text-[#4A453F]' : 'text-[#EAE2D5]/80'
          }`}>
            Have a question regarding hair color choices, balayage maintenance, keratin benefits, or bridal timelines? Send your question directly to our styling experts.
          </p>

          {/* Toggle between Ask & Check Status */}
          <div className="mt-8 inline-flex p-1 rounded-full bg-[#1F1F1F] border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('ask')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'ask'
                  ? 'bg-gradient-to-r from-[#D6B979] to-[#C6A15B] text-[#111111] shadow-md'
                  : 'text-[#EAE2D5]/70 hover:text-white'
              }`}
            >
              Ask a Question
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('check')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'check'
                  ? 'bg-gradient-to-r from-[#D6B979] to-[#C6A15B] text-[#111111] shadow-md'
                  : 'text-[#EAE2D5]/70 hover:text-white'
              }`}
            >
              Check Answer Status
            </button>
          </div>
        </div>

        {/* Tab 1: Submit Question */}
        {activeTab === 'ask' && (
          <div className={`p-6 sm:p-10 rounded-sm border shadow-2xl transition-all ${
            isLight
              ? 'bg-[#FFFFFF] border-[#C6A15B]/30 shadow-[#C6A15B]/5'
              : 'bg-[#1A1A1A] border-[#C6A15B]/30'
          }`}>
            {submittedQuestion ? (
              <div className="p-8 text-center max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-full bg-[#C6A15B]/20 border border-[#C6A15B] flex items-center justify-center text-[#C6A15B] mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif-elegant text-2xl font-bold mb-2">Question Submitted Successfully!</h3>
                <p className={`text-xs sm:text-sm mb-4 ${isLight ? 'text-[#4A453F]' : 'text-[#EAE2D5]/80'}`}>
                  Thank you! Your enquiry has been securely logged. Our salon team will review your query and reply via your preferred contact channel.
                </p>
                <div className="p-4 bg-[#111111] rounded-sm border border-[#C6A15B]/40 inline-block mb-6 text-left">
                  <div className="text-[10px] text-[#C6A15B] uppercase tracking-wider font-semibold">Your Unique Enquiry ID</div>
                  <div className="text-xl font-mono font-bold text-white tracking-widest mt-0.5">{submittedQuestion.id}</div>
                  <div className="text-[11px] text-white/50 mt-1">Keep this ID to track your answer status anytime.</div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setSubmittedQuestion(null)}
                    className="text-xs font-semibold text-[#C6A15B] underline hover:text-[#D6B979] cursor-pointer"
                  >
                    Submit another question
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {formError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-sm text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                      isLight ? 'text-[#1B1B1B]' : 'text-[#EAE2D5]'
                    }`}>
                      Full Name <span className="text-[#C6A15B]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className={`w-full px-4 py-3 rounded-sm text-sm border focus:outline-none transition-colors ${
                        isLight
                          ? 'bg-[#F9F7F2] border-black/10 focus:border-[#C6A15B] text-black'
                          : 'bg-[#111111] border-white/10 focus:border-[#C6A15B] text-white'
                      }`}
                    />
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                      isLight ? 'text-[#1B1B1B]' : 'text-[#EAE2D5]'
                    }`}>
                      Mobile Number <span className="text-[#C6A15B]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 98490 12345"
                      className={`w-full px-4 py-3 rounded-sm text-sm border focus:outline-none transition-colors ${
                        isLight
                          ? 'bg-[#F9F7F2] border-black/10 focus:border-[#C6A15B] text-black'
                          : 'bg-[#111111] border-white/10 focus:border-[#C6A15B] text-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                      isLight ? 'text-[#1B1B1B]' : 'text-[#EAE2D5]'
                    }`}>
                      Question Category <span className="text-[#C6A15B]">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={`w-full px-4 py-3 rounded-sm text-sm border focus:outline-none transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-[#F9F7F2] border-black/10 focus:border-[#C6A15B] text-black'
                          : 'bg-[#111111] border-white/10 focus:border-[#C6A15B] text-white'
                      }`}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preferred Contact Method */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                      isLight ? 'text-[#1B1B1B]' : 'text-[#EAE2D5]'
                    }`}>
                      Preferred Reply Channel
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['WhatsApp', 'Phone Call', 'Email'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPreferredContact(method)}
                          className={`py-3 px-2 text-xs font-medium rounded-sm border transition-all cursor-pointer ${
                            preferredContact === method
                              ? 'bg-[#C6A15B] text-[#111111] font-semibold border-[#C6A15B]'
                              : isLight
                              ? 'bg-[#F9F7F2] text-[#4A453F] border-black/10 hover:border-[#C6A15B]'
                              : 'bg-[#111111] text-[#EAE2D5]/70 border-white/10 hover:border-[#C6A15B]'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isLight ? 'text-[#1B1B1B]' : 'text-[#EAE2D5]'
                  }`}>
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className={`w-full px-4 py-3 rounded-sm text-sm border focus:outline-none transition-colors ${
                      isLight
                        ? 'bg-[#F9F7F2] border-black/10 focus:border-[#C6A15B] text-black'
                        : 'bg-[#111111] border-white/10 focus:border-[#C6A15B] text-white'
                    }`}
                  />
                </div>

                {/* Question */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isLight ? 'text-[#1B1B1B]' : 'text-[#EAE2D5]'
                  }`}>
                    Write Your Question <span className="text-[#C6A15B]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. Which hair treatment is best recommended for post-color dryness? Can I book a consultation beforehand?"
                    className={`w-full px-4 py-3 rounded-sm text-sm border focus:outline-none transition-colors ${
                      isLight
                        ? 'bg-[#F9F7F2] border-black/10 focus:border-[#C6A15B] text-black'
                        : 'bg-[#111111] border-white/10 focus:border-[#C6A15B] text-white'
                    }`}
                  />
                </div>

                {/* Privacy note */}
                <p className="text-[11px] text-white/50">
                  We respect your privacy. Your contact details are stored securely for responding to your enquiry and are never displayed publicly.
                </p>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-gradient-to-r from-[#D6B979] via-[#C6A15B] to-[#B38D43] text-[#111111] font-semibold text-xs sm:text-sm tracking-wider uppercase rounded-sm shadow-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send My Question</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Check Question Status */}
        {activeTab === 'check' && (
          <div className={`p-6 sm:p-10 rounded-sm border shadow-2xl transition-all max-w-2xl mx-auto ${
            isLight
              ? 'bg-[#FFFFFF] border-[#C6A15B]/30'
              : 'bg-[#1A1A1A] border-[#C6A15B]/30'
          }`}>
            <h3 className="font-serif-elegant text-2xl font-bold mb-2">Track Your Enquiry Status</h3>
            <p className={`text-xs sm:text-sm mb-6 ${isLight ? 'text-[#4A453F]' : 'text-[#EAE2D5]/75'}`}>
              Enter the unique Enquiry ID provided when you submitted your question along with your registered mobile number.
            </p>

            <form onSubmit={handleCheckStatus} className="space-y-4 mb-6">
              {searchError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-sm text-xs text-rose-300">
                  {searchError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Enquiry ID
                  </label>
                  <input
                    type="text"
                    value={searchEnquiryId}
                    onChange={(e) => setSearchEnquiryId(e.target.value)}
                    placeholder="e.g. GW-Q5001"
                    className={`w-full px-3.5 py-2.5 rounded-sm text-sm border focus:outline-none ${
                      isLight
                        ? 'bg-[#F9F7F2] border-black/10 text-black'
                        : 'bg-[#111111] border-white/10 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={searchMobile}
                    onChange={(e) => setSearchMobile(e.target.value)}
                    placeholder="e.g. 9885512345"
                    className={`w-full px-3.5 py-2.5 rounded-sm text-sm border focus:outline-none ${
                      isLight
                        ? 'bg-[#F9F7F2] border-black/10 text-black'
                        : 'bg-[#111111] border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#C6A15B] text-[#111111] font-semibold text-xs tracking-wider uppercase rounded-sm hover:bg-[#D6B979] flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Verify & Check Answer</span>
              </button>
            </form>

            {/* Results display */}
            {searchResult === 'not-found' && (
              <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-sm text-xs text-amber-200">
                No matching enquiry was found for Enquiry ID "{searchEnquiryId}" and mobile number ending in ...
                {searchMobile.slice(-4)}. Please verify your credentials or contact the salon directly.
              </div>
            )}

            {searchResult && searchResult !== 'not-found' && (
              <div className="p-6 bg-[#111111] border border-[#C6A15B]/40 rounded-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] text-[#C6A15B] uppercase font-bold tracking-widest">
                      {searchResult.id} • {searchResult.category}
                    </span>
                    <h4 className="text-base font-serif-elegant font-semibold text-white">
                      {searchResult.customerName}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full ${
                      searchResult.status === 'answered'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {searchResult.status === 'answered' ? 'Answered' : 'Pending Review'}
                  </span>
                </div>

                <div>
                  <div className="text-xs text-white/50 mb-1">Your Question:</div>
                  <p className="text-sm text-white/90 italic bg-[#181818] p-3 rounded border border-white/5">
                    "{searchResult.question}"
                  </p>
                </div>

                {searchResult.status === 'answered' && searchResult.answer ? (
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-[#C6A15B] mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Official Response from Golden Wizard Stylist:
                    </div>
                    <div className="p-4 bg-[#1E1C16] border border-[#C6A15B]/40 rounded text-sm text-[#F8F5EF] leading-relaxed">
                      {searchResult.answer}
                    </div>
                    {searchResult.answeredAt && (
                      <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Answered on {new Date(searchResult.answeredAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-[#181818] rounded text-xs text-[#EAE2D5]/70 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#C6A15B]" />
                    <span>Our salon management has received this question and will answer shortly.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
