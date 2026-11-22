import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import { DEFAULT_FAQS, FAQItem, FAQ_CATEGORIES } from '../../data/faqData';

const FAQ_STORAGE_KEY = 'gw_faqs';

function loadFaqs(): FAQItem[] {
  try {
    const stored = localStorage.getItem(FAQ_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FAQItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_FAQS;
}

function saveFaqs(faqs: FAQItem[]) {
  localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(faqs));
  // Notify other tabs
  window.dispatchEvent(new StorageEvent('storage', { key: FAQ_STORAGE_KEY }));
}

function isValidFaqStructure(data: unknown): data is FAQItem[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as FAQItem).id === 'string' &&
      typeof (item as FAQItem).category === 'string' &&
      typeof (item as FAQItem).question === 'string' &&
      typeof (item as FAQItem).answer === 'string' &&
      typeof (item as FAQItem).published === 'boolean'
  );
}

const EMPTY_ITEM: Omit<FAQItem, 'id'> = {
  category: 'General',
  question: '',
  answer: '',
  published: true,
};

export const FAQManagerPanel: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>(() => loadFaqs());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Add/edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<FAQItem, 'id'>>(EMPTY_ITEM);
  const [showAddForm, setShowAddForm] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FAQItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const persist = (updated: FAQItem[]) => {
    setFaqs(updated);
    saveFaqs(updated);
  };

  const filteredFaqs = faqs.filter((f) => {
    const matchCat = filterCategory === 'All' || f.category === filterCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // ── Add FAQ ───────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setFormData(EMPTY_ITEM);
    setEditingId(null);
    setShowAddForm(true);
  };

  // ── Save (add or edit) ────────────────────────────────────────────────────
  const handleSave = () => {
    if (!formData.question.trim()) {
      showToast('Question cannot be empty.', 'error');
      return;
    }
    if (!formData.answer.trim()) {
      showToast('Answer cannot be empty.', 'error');
      return;
    }

    if (editingId) {
      const updated = faqs.map((f) =>
        f.id === editingId ? { ...f, ...formData } : f
      );
      persist(updated);
      showToast('FAQ updated successfully.');
    } else {
      const newItem: FAQItem = {
        id: `faq-custom-${Date.now()}`,
        ...formData,
      };
      persist([...faqs, newItem]);
      showToast('FAQ added successfully.');
    }
    setShowAddForm(false);
    setEditingId(null);
    setFormData(EMPTY_ITEM);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (item: FAQItem) => {
    setFormData({
      category: item.category,
      question: item.question,
      answer: item.answer,
      published: item.published,
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  // ── Toggle published ──────────────────────────────────────────────────────
  const handleTogglePublished = (id: string) => {
    const updated = faqs.map((f) =>
      f.id === id ? { ...f, published: !f.published } : f
    );
    persist(updated);
    const faq = faqs.find((f) => f.id === id);
    showToast(faq?.published ? 'FAQ unpublished.' : 'FAQ published.');
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    persist(faqs.filter((f) => f.id !== deleteTarget.id));
    showToast('FAQ deleted.');
    setDeleteTarget(null);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const json = JSON.stringify(faqs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'golden-wizard-faqs.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('FAQ data exported to golden-wizard-faqs.json');
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!isValidFaqStructure(parsed)) {
          showToast(
            'Invalid FAQ JSON format. Each item must have: id, category, question, answer, published.',
            'error'
          );
          return;
        }
        persist(parsed);
        showToast(`Imported ${parsed.length} FAQ(s) successfully.`);
      } catch {
        showToast('Could not parse the JSON file. Please check the format and try again.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 text-xs px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 border animate-fade-in ${
            toast.type === 'error'
              ? 'bg-rose-950 border-rose-500/40 text-rose-200'
              : 'bg-[#1C1C1C] border-[#C9A45C] text-[#F5F1E8]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#C9A45C] shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Warning Banner */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs leading-relaxed">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            <strong>FAQ changes are saved in this browser only.</strong> To publish them to the live
            website for all visitors, export the FAQ JSON and update the{' '}
            <code className="font-mono bg-amber-900/30 px-1 rounded">src/data/faqData.ts</code> file
            in your project.
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif-elegant text-xl font-bold text-[#F5F1E8]">Manage FAQs</h2>
          <p className="text-xs text-[#A5A5A5] mt-0.5">
            {faqs.length} total · {faqs.filter((f) => f.published).length} published
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-[#1C1C1C] text-xs font-semibold text-[#A5A5A5] hover:text-white hover:border-white/30 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-[#1C1C1C] text-xs font-semibold text-[#A5A5A5] hover:text-white hover:border-white/30 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>

          {/* Add FAQ */}
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add FAQ
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <div className="p-5 rounded-xl border border-[#C9A45C]/30 bg-[#1A1A1A] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[#F5F1E8]">
              {editingId ? 'Edit FAQ' : 'Add New FAQ'}
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setFormData(EMPTY_ITEM);
              }}
              className="text-[#A5A5A5] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#A5A5A5]">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm border bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C] focus:outline-none"
            >
              {FAQ_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Question */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#A5A5A5]">
              Question <span className="text-[#C9A45C]">*</span>
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Enter the customer question..."
              className="w-full px-3 py-2.5 rounded-lg text-sm border bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C] focus:outline-none"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#A5A5A5]">
              Answer <span className="text-[#C9A45C]">*</span>
            </label>
            <textarea
              rows={5}
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="Enter the answer..."
              className="w-full px-3 py-2.5 rounded-lg text-sm border bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C] focus:outline-none resize-y"
            />
          </div>

          {/* Published toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setFormData({ ...formData, published: !formData.published })}
              className={`w-10 h-5 rounded-full border transition-colors ${
                formData.published
                  ? 'bg-[#C9A45C] border-[#C9A45C]'
                  : 'bg-[#333] border-white/20'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${
                  formData.published ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-xs text-[#A5A5A5]">
              {formData.published ? 'Published (visible to customers)' : 'Unpublished (hidden from customers)'}
            </span>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              {editingId ? 'Save Changes' : 'Add FAQ'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setFormData(EMPTY_ITEM);
              }}
              className="px-4 py-2 rounded-lg border border-white/15 text-[#A5A5A5] hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-xs border bg-[#1C1C1C] border-white/10 text-[#F5F1E8] placeholder-white/30 focus:border-[#C9A45C] focus:outline-none"
          />
        </div>
        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-3 pr-8 py-2.5 rounded-lg text-xs border bg-[#1C1C1C] border-white/10 text-[#F5F1E8] focus:border-[#C9A45C] focus:outline-none appearance-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            {FAQ_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#A5A5A5] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* FAQ List */}
      {filteredFaqs.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-white/5 bg-[#181818]">
          <HelpCircle className="w-10 h-10 text-[#C9A45C]/40 mx-auto mb-2" />
          <p className="text-sm text-[#A5A5A5]">No FAQs match your filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFaqs.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-colors ${
                item.published
                  ? 'bg-[#181818] border-white/8'
                  : 'bg-[#141414] border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C9A45C]/70 bg-[#C9A45C]/10 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    {!item.published && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A5A5A5] bg-white/5 px-2 py-0.5 rounded-full">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#F5F1E8] leading-snug mb-1">
                    {item.question}
                  </p>
                  <p className="text-xs text-[#A5A5A5] leading-relaxed line-clamp-2">
                    {item.answer}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleTogglePublished(item.id)}
                    title={item.published ? 'Unpublish' : 'Publish'}
                    className="p-1.5 rounded-lg border border-white/10 text-[#A5A5A5] hover:text-white hover:border-white/25 transition-colors cursor-pointer"
                  >
                    {item.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    title="Edit"
                    className="p-1.5 rounded-lg border border-white/10 text-[#A5A5A5] hover:text-[#C9A45C] hover:border-[#C9A45C]/40 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    title="Delete"
                    className="p-1.5 rounded-lg border border-white/10 text-[#A5A5A5] hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#1A1A1A] border border-rose-500/30 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-[#F5F1E8] mb-1">Delete this FAQ?</h4>
                <p className="text-xs text-[#A5A5A5] leading-relaxed">
                  "{deleteTarget.question.slice(0, 80)}
                  {deleteTarget.question.length > 80 ? '...' : ''}"
                </p>
                <p className="text-xs text-rose-400 mt-2">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-white/15 text-[#A5A5A5] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Delete FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
