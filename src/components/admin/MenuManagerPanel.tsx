import React, { useEffect, useMemo, useState } from 'react';
import {
  MenuCategory,
  MenuService,
  MenuSnapshot,
  MenuVersion,
  PDF_VERIFICATION_NOTES,
  formatRsPrice,
} from '../../data/menuData';
import {
  Plus,
  Save,
  Upload,
  Eye,
  Trash2,
  ArrowUp,
  ArrowDown,
  History,
  RotateCcw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
  Layers,
  ExternalLink,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MenuManagerPanelProps {
  authToken: string;
  onToast: (msg: string) => void;
  onAuthError: () => void;
}

export const MenuManagerPanel: React.FC<MenuManagerPanelProps> = ({
  authToken,
  onToast,
  onAuthError,
}) => {
  const [draft, setDraft] = useState<MenuSnapshot | null>(null);
  const [published, setPublished] = useState<MenuSnapshot | null>(null);
  const [versions, setVersions] = useState<MenuVersion[]>([]);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(1);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [uploadingPdf, setUploadingPdf] = useState<boolean>(false);

  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [changeSummary, setChangeSummary] = useState<string>('');
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState<boolean>(false);
  const [showVersionHistory, setShowVersionHistory] = useState<boolean>(false);
  const [showVerificationNotes, setShowVerificationNotes] = useState<boolean>(true);

  // Add Category state
  const [showAddCategory, setShowAddCategory] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatGroup, setNewCatGroup] = useState<'hair' | 'skin' | 'nails-bridal'>('skin');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  // Edit Category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState<string>('');
  const [editCatDesc, setEditCatDesc] = useState<string>('');

  // Add Service state
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [newServiceConsultOnly, setNewServiceConsultOnly] = useState<boolean>(false);

  // Inline Edit Service state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState<string>('');
  const [editServicePrice, setEditServicePrice] = useState<string>('');
  const [editServiceConsultOnly, setEditServiceConsultOnly] = useState<boolean>(false);

  // In-app delete confirmation
  const [catToDelete, setCatToDelete] = useState<MenuCategory | null>(null);
  const [svcToDelete, setSvcToDelete] = useState<MenuService | null>(null);

  const fetchAdminMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/menu', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        onAuthError();
        return;
      }
      if (!res.ok) throw new Error('Failed to load menu manager');
      const data = await res.json();
      setDraft(data.draft);
      setPublished(data.published);
      setVersions(data.versions || []);
      setCurrentVersionNumber(data.currentVersionNumber || 1);
      setHasUnpublishedChanges(Boolean(data.hasUnpublishedChanges));
      if (!selectedCatId && data.draft?.categories?.length > 0) {
        setSelectedCatId(data.draft.categories[0].id);
      }
    } catch (err: any) {
      onToast(err.message || 'Could not load menu configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminMenu();
  }, []);

  const selectedCategory = useMemo(
    () => draft?.categories.find((c) => c.id === selectedCatId) || null,
    [draft, selectedCatId]
  );

  const categoryServices = useMemo(() => {
    if (!draft || !selectedCatId) return [];
    return draft.services
      .filter((s) => s.categoryId === selectedCatId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [draft, selectedCatId]);

  const persistDraft = async (updatedSnapshot: MenuSnapshot, quiet = false) => {
    setSavingDraft(true);
    try {
      const res = await fetch('/api/admin/menu/draft', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updatedSnapshot),
      });
      if (res.status === 401) {
        onAuthError();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save draft.');
      setDraft(data.draft);
      setHasUnpublishedChanges(Boolean(data.hasUnpublishedChanges));
      if (!quiet) {
        onToast('Draft saved privately. Visitors still see the published menu until you publish.');
      }
    } catch (err: any) {
      onToast(err.message || 'Error saving draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      // Ensure latest draft state is persisted first
      await fetch('/api/admin/menu/draft', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(draft),
      });

      const res = await fetch('/api/admin/menu/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ changeSummary: changeSummary.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish menu.');

      setPublished(data.published);
      setDraft(data.draft);
      setVersions(data.versions || []);
      setCurrentVersionNumber(data.currentVersionNumber);
      setHasUnpublishedChanges(false);
      setChangeSummary('');
      window.dispatchEvent(new Event('gw-menu-updated'));
      onToast(data.message || 'Published menu live to public website!');
    } catch (err: any) {
      onToast(err.message || 'Error publishing menu');
    } finally {
      setPublishing(false);
    }
  };

  const handleDiscardDraft = async () => {
    try {
      const res = await fetch('/api/admin/menu/discard-draft', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to discard draft.');
      setDraft(data.draft);
      setHasUnpublishedChanges(false);
      onToast('Reverted draft back to currently published menu.');
    } catch (err: any) {
      onToast(err.message || 'Error discarding draft');
    }
  };

  const handleRestoreVersion = async (versionId: string, publishImmediately: boolean) => {
    try {
      const res = await fetch(`/api/admin/menu/versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ publishImmediately }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore version.');
      setDraft(data.draft);
      if (data.published) setPublished(data.published);
      if (data.versions) setVersions(data.versions);
      if (data.currentVersionNumber) setCurrentVersionNumber(data.currentVersionNumber);
      setHasUnpublishedChanges(Boolean(data.hasUnpublishedChanges));
      if (publishImmediately) window.dispatchEvent(new Event('gw-menu-updated'));
      onToast(data.message);
    } catch (err: any) {
      onToast(err.message || 'Failed to restore version');
    }
  };

  const handleUploadReplacementPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      onToast('Please upload a valid .pdf file.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      onToast('PDF file size must be under 15 MB.');
      return;
    }

    setUploadingPdf(true);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected file.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/admin/menu/upload-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ filename: file.name, contentBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PDF upload failed.');

      setDraft(data.draft);
      setHasUnpublishedChanges(true);
      setShowPdfPreviewModal(true);
      onToast(data.message || 'PDF uploaded to Draft. Review & Publish when ready.');
    } catch (err: any) {
      onToast(err.message || 'Error uploading PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  // Category operations
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !newCatName.trim()) return;
    const slug = newCatName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const newCat: MenuCategory = {
      id: `cat-${slug}-${Date.now()}`,
      name: newCatName.trim(),
      group: newCatGroup,
      description: newCatDesc.trim(),
      image: '/assets/salon/golden-wizard-curly-layered-hairstyling.png',
      displayOrder: draft.categories.length,
      visible: true,
    };
    const next: MenuSnapshot = {
      ...draft,
      categories: [...draft.categories, newCat],
    };
    setDraft(next);
    setSelectedCatId(newCat.id);
    setNewCatName('');
    setNewCatDesc('');
    setShowAddCategory(false);
    persistDraft(next, true);
    onToast(`Added category "${newCat.name}" to Draft.`);
  };

  const handleSaveCategoryEdit = (catId: string) => {
    if (!draft || !editCatName.trim()) return;
    const next: MenuSnapshot = {
      ...draft,
      categories: draft.categories.map((c) =>
        c.id === catId ? { ...c, name: editCatName.trim(), description: editCatDesc.trim() } : c
      ),
    };
    setDraft(next);
    setEditingCatId(null);
    persistDraft(next, true);
  };

  const handleMoveCategory = (idx: number, dir: -1 | 1) => {
    if (!draft) return;
    const list = [...draft.categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
    const reindexed = list.map((c, i) => ({ ...c, displayOrder: i }));
    const next = { ...draft, categories: reindexed };
    setDraft(next);
    persistDraft(next, true);
  };

  const handleConfirmDeleteCategory = () => {
    if (!draft || !catToDelete) return;
    const remainingCats = draft.categories
      .filter((c) => c.id !== catToDelete.id)
      .map((c, i) => ({ ...c, displayOrder: i }));
    const remainingSvcs = draft.services.filter((s) => s.categoryId !== catToDelete.id);
    const next: MenuSnapshot = {
      ...draft,
      categories: remainingCats,
      services: remainingSvcs,
    };
    setDraft(next);
    if (selectedCatId === catToDelete.id) {
      setSelectedCatId(remainingCats[0]?.id || '');
    }
    setCatToDelete(null);
    persistDraft(next, true);
    onToast(`Deleted category "${catToDelete.name}" from Draft.`);
  };

  // Service operations
  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !selectedCatId || !newServiceName.trim()) return;
    const parsedPrice = newServiceConsultOnly
      ? null
      : newServicePrice.trim() === ''
      ? null
      : Number(newServicePrice);
    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      onToast('Enter a valid non-negative price or select Consultation pricing.');
      return;
    }
    const newSvc: MenuService = {
      id: `svc-${Date.now()}`,
      categoryId: selectedCatId,
      name: newServiceName.trim(),
      price: parsedPrice,
      priceDisplay: formatRsPrice(parsedPrice),
      displayOrder: categoryServices.length,
      active: true,
    };
    const next: MenuSnapshot = {
      ...draft,
      services: [...draft.services, newSvc],
    };
    setDraft(next);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceConsultOnly(false);
    persistDraft(next, true);
    onToast(`Added "${newSvc.name}" to Draft.`);
  };

  const handleSaveServiceEdit = (svcId: string) => {
    if (!draft || !editServiceName.trim()) return;
    const parsedPrice = editServiceConsultOnly
      ? null
      : editServicePrice.trim() === ''
      ? null
      : Number(editServicePrice);
    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      onToast('Price must be a valid non-negative number.');
      return;
    }
    const next: MenuSnapshot = {
      ...draft,
      services: draft.services.map((s) =>
        s.id === svcId
          ? {
              ...s,
              name: editServiceName.trim(),
              price: parsedPrice,
              priceDisplay: formatRsPrice(parsedPrice),
            }
          : s
      ),
    };
    setDraft(next);
    setEditingServiceId(null);
    persistDraft(next, true);
  };

  const handleMoveService = (svcId: string, dir: -1 | 1) => {
    if (!draft) return;
    const idx = categoryServices.findIndex((s) => s.id === svcId);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= categoryServices.length) return;
    const reorderedCat = [...categoryServices];
    [reorderedCat[idx], reorderedCat[targetIdx]] = [reorderedCat[targetIdx], reorderedCat[idx]];
    const orderMap = new Map(reorderedCat.map((s, i) => [s.id, i]));
    const next: MenuSnapshot = {
      ...draft,
      services: draft.services.map((s) =>
        orderMap.has(s.id) ? { ...s, displayOrder: orderMap.get(s.id)! } : s
      ),
    };
    setDraft(next);
    persistDraft(next, true);
  };

  const handleConfirmDeleteService = () => {
    if (!draft || !svcToDelete) return;
    const next: MenuSnapshot = {
      ...draft,
      services: draft.services.filter((s) => s.id !== svcToDelete.id),
    };
    setDraft(next);
    setSvcToDelete(null);
    persistDraft(next, true);
    onToast(`Removed "${svcToDelete.name}" from Draft.`);
  };

  if (loading || !draft) {
    return (
      <div className="py-16 text-center text-xs text-[#A5A5A5]">
        Loading Menu Management &amp; Version History...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar with Draft / Publish Controls */}
      <div className="pb-5 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif-elegant text-2xl font-bold text-[#F5F1E8]">
              Menu Management &amp; Pricing
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#C9A45C]/20 text-[#E3C78D] border border-[#C9A45C]/30">
              Live: v{currentVersionNumber}
            </span>
            {hasUnpublishedChanges && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35">
                Unpublished Draft Edits
              </span>
            )}
          </div>
          <p className="text-xs text-[#A5A5A5] mt-1">
            Edit categories, services, prices, or upload a replacement Menu PDF. Draft changes stay private until published.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold border border-white/15 bg-[#1B1B1B] hover:border-[#C9A45C] text-[#F5F1E8] flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#C9A45C]" />
            <span>Preview Draft</span>
          </button>

          <button
            type="button"
            onClick={() => persistDraft(draft)}
            disabled={savingDraft}
            className="px-3 py-2 rounded-lg text-xs font-semibold border border-[#C9A45C]/40 bg-[#1B1B1B] hover:bg-[#252525] text-[#E3C78D] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {hasUnpublishedChanges && (
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard Draft</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePublishDraft}
            disabled={publishing}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{publishing ? 'Publishing...' : 'Publish Live'}</span>
          </button>
        </div>
      </div>

      {/* PDF Verification Alert Panel (Unclear PDF Entries for Owner Confirmation) */}
      <div className="rounded-xl border border-amber-500/30 bg-[#18140C] p-4 text-xs">
        <button
          type="button"
          onClick={() => setShowVerificationNotes(!showVerificationNotes)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Original PDF Entries Flagged for Owner Verification ({PDF_VERIFICATION_NOTES.length} notes)
            </span>
          </div>
          {showVerificationNotes ? (
            <ChevronUp className="w-4 h-4 text-amber-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-300" />
          )}
        </button>

        {showVerificationNotes && (
          <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2 text-[11px] text-[#E6DFD1]">
            {PDF_VERIFICATION_NOTES.map((note, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-black/35 border border-white/5">
                <span className="font-bold text-[#E3C78D]">{note.category}</span> —{' '}
                <span className="font-semibold text-white">{note.item}</span> ({note.pdfValue}):{' '}
                <span className="text-[#A5A5A5]">{note.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Replacement PDF Upload + Publish Note + Version History Toggle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-4 rounded-xl border border-white/10 bg-[#151515] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#F5F1E8] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C9A45C]" />
              <span>Attached Menu PDF (Draft):</span>
              <span className="font-mono text-[#E3C78D] truncate">{draft.pdfFilename}</span>
            </div>
            <p className="text-[11px] text-[#A5A5A5] mt-1">
              Upload a replacement PDF to preview it beside the editor before manually updating and publishing prices.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPdfPreviewModal(true)}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-white/15 bg-[#1E1E1E] hover:border-[#C9A45C] text-[#F5F1E8] flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#C9A45C]" />
              <span>View PDF</span>
            </button>

            <label className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#C9A45C]/15 hover:bg-[#C9A45C]/25 border border-[#C9A45C]/40 text-[#E3C78D] flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingPdf ? 'Uploading...' : 'Upload Replacement PDF'}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleUploadReplacementPdf}
                className="hidden"
                disabled={uploadingPdf}
              />
            </label>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-[#151515] flex flex-col justify-between gap-2">
          <input
            type="text"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            placeholder="Optional version summary (e.g. Updated Bridal rates)"
            className="w-full px-3 py-2 rounded-lg text-xs bg-[#0E0E0E] border border-white/10 text-[#F5F1E8] focus:outline-none focus:border-[#C9A45C]"
          />
          <button
            type="button"
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold border border-white/10 bg-[#1B1B1B] hover:border-[#C9A45C] text-[#E3C78D] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>
              {showVersionHistory ? 'Hide' : 'Show'} Version History ({versions.length})
            </span>
          </button>
        </div>
      </div>

      {/* Version History Drawer */}
      {showVersionHistory && (
        <div className="rounded-xl border border-[#C9A45C]/30 bg-[#141414] p-4 space-y-3">
          <h3 className="font-serif-elegant text-base font-bold text-[#F5F1E8] flex items-center gap-2">
            <History className="w-4 h-4 text-[#C9A45C]" />
            <span>Published Menu Version History</span>
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="p-3 rounded-lg bg-[#1B1B1B] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#C9A45C]">v{ver.versionNumber}</span>
                    <span className="font-semibold text-[#F5F1E8]">{ver.changeSummary}</span>
                    {ver.versionNumber === currentVersionNumber && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#A5A5A5] flex flex-wrap items-center gap-3">
                    <span>Published: {new Date(ver.publishedAt).toLocaleString()}</span>
                    <span>•</span>
                    <span>
                      {ver.snapshot.categories.length} categories, {ver.snapshot.services.length}{' '}
                      services
                    </span>
                    {ver.snapshot.pdfUrl && (
                      <a
                        href={ver.snapshot.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#C9A45C] hover:underline inline-flex items-center gap-1"
                      >
                        <span>PDF</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(ver.id, false)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] border border-white/10 text-[#F5F1E8] text-[11px] font-semibold cursor-pointer"
                  >
                    Load to Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(ver.id, true)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] text-[11px] font-bold cursor-pointer"
                  >
                    Restore &amp; Publish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Split Editor: Left Categories List + Right Services & Prices Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Categories */}
        <div className="lg:col-span-5 rounded-xl border border-white/10 bg-[#151515] p-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2 text-sm font-bold text-[#F5F1E8]">
              <Layers className="w-4 h-4 text-[#C9A45C]" />
              <span>Categories ({draft.categories.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#C9A45C] text-[#0D0D0D] hover:bg-[#D6B979] inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          {showAddCategory && (
            <form
              onSubmit={handleAddCategory}
              className="p-3 rounded-lg bg-[#101010] border border-[#C9A45C]/40 space-y-2.5 text-xs"
            >
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name (e.g. Bridal Packages)"
                className="w-full px-3 py-2 rounded bg-[#181818] border border-white/15 text-white focus:outline-none focus:border-[#C9A45C]"
              />
              <select
                value={newCatGroup}
                onChange={(e) => setNewCatGroup(e.target.value as any)}
                className="w-full px-3 py-2 rounded bg-[#181818] border border-white/15 text-white focus:outline-none"
              >
                <option value="hair">Group: Hair &amp; Spa</option>
                <option value="skin">Group: Skin &amp; Waxing</option>
                <option value="nails-bridal">Group: Nails, Piercing &amp; Makeup</option>
              </select>
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Short description (optional)"
                className="w-full px-3 py-2 rounded bg-[#181818] border border-white/15 text-white focus:outline-none focus:border-[#C9A45C]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-3 py-1.5 rounded border border-white/15 text-[#A5A5A5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-[#C9A45C] text-[#0D0D0D] font-bold cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
            {[...draft.categories]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((cat, idx, arr) => {
                const isSelected = selectedCatId === cat.id;
                const svcCount = draft.services.filter((s) => s.categoryId === cat.id).length;
                const isEditing = editingCatId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-[#C9A45C]/15 border-[#C9A45C]'
                        : 'bg-[#1A1A1A] border-white/5 hover:border-white/20'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2 text-xs">
                        <input
                          type="text"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded bg-[#101010] border border-[#C9A45C] text-white"
                        />
                        <input
                          type="text"
                          value={editCatDesc}
                          onChange={(e) => setEditCatDesc(e.target.value)}
                          placeholder="Description"
                          className="w-full px-2.5 py-1.5 rounded bg-[#101010] border border-white/15 text-white"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="px-2 py-1 rounded border border-white/15 text-[#A5A5A5] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryEdit(cat.id)}
                            className="px-2.5 py-1 rounded bg-[#C9A45C] text-[#0D0D0D] font-bold cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCatId(cat.id)}
                          className="flex-1 text-left cursor-pointer min-w-0"
                        >
                          <div className="text-xs font-semibold text-[#F5F1E8] truncate">
                            {cat.name}
                          </div>
                          <div className="text-[10px] text-[#A5A5A5]">
                            {svcCount} items
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveCategory(idx, -1)}
                            title="Move up"
                            className="p-1 text-[#A5A5A5] hover:text-white disabled:opacity-25 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() => handleMoveCategory(idx, 1)}
                            title="Move down"
                            className="p-1 text-[#A5A5A5] hover:text-white disabled:opacity-25 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditCatName(cat.name);
                              setEditCatDesc(cat.description || '');
                            }}
                            title="Edit category"
                            className="p-1 text-[#C9A45C] hover:text-[#E3C78D] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCatToDelete(cat)}
                            title="Delete category"
                            className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right: Services & Exact Prices in Selected Category */}
        <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#151515] p-4 space-y-4">
          {!selectedCategory ? (
            <div className="py-16 text-center text-xs text-[#A5A5A5]">
              Select a category on the left to manage its services and prices.
            </div>
          ) : (
            <>
              <div className="pb-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="font-serif-elegant text-xl font-bold text-[#F5F1E8]">
                    {selectedCategory.name}
                  </h2>
                  <p className="text-[11px] text-[#A5A5A5]">
                    {categoryServices.length} service{categoryServices.length === 1 ? '' : 's'} in Draft
                  </p>
                </div>
              </div>

              {/* Add Service Form */}
              <form
                onSubmit={handleAddService}
                className="p-3 rounded-lg bg-[#111111] border border-white/10 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
              >
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="New service name..."
                  className="sm:col-span-5 px-3 py-2 rounded bg-[#181818] border border-white/15 text-white focus:outline-none focus:border-[#C9A45C]"
                />
                <input
                  type="number"
                  min={0}
                  step="1"
                  disabled={newServiceConsultOnly}
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  placeholder={newServiceConsultOnly ? 'Consultation' : 'Price (Rs.)'}
                  className="sm:col-span-3 px-3 py-2 rounded bg-[#181818] border border-white/15 text-white focus:outline-none focus:border-[#C9A45C] disabled:opacity-40"
                />
                <label className="sm:col-span-2 flex items-center gap-1.5 text-[11px] text-[#A5A5A5] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newServiceConsultOnly}
                    onChange={(e) => setNewServiceConsultOnly(e.target.checked)}
                    className="accent-[#C9A45C]"
                  />
                  <span>Consult</span>
                </label>
                <button
                  type="submit"
                  className="sm:col-span-2 py-2 px-3 rounded bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>

              {/* Services List */}
              {categoryServices.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#A5A5A5] border border-dashed border-white/10 rounded-lg">
                  No priced services in this category yet. Public site displays &ldquo;Pricing on Consultation&rdquo; or add services above.
                </div>
              ) : (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {categoryServices.map((svc, idx) => {
                    const isEditing = editingServiceId === svc.id;
                    return (
                      <div
                        key={svc.id}
                        className="p-3 rounded-lg bg-[#1A1A1A] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        {isEditing ? (
                          <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <input
                              type="text"
                              value={editServiceName}
                              onChange={(e) => setEditServiceName(e.target.value)}
                              className="sm:col-span-5 px-2.5 py-1.5 rounded bg-[#0E0E0E] border border-[#C9A45C] text-white"
                            />
                            <input
                              type="number"
                              min={0}
                              disabled={editServiceConsultOnly}
                              value={editServicePrice}
                              onChange={(e) => setEditServicePrice(e.target.value)}
                              placeholder="Rs."
                              className="sm:col-span-3 px-2.5 py-1.5 rounded bg-[#0E0E0E] border border-white/15 text-white disabled:opacity-40"
                            />
                            <label className="sm:col-span-2 flex items-center gap-1 text-[11px] text-[#A5A5A5]">
                              <input
                                type="checkbox"
                                checked={editServiceConsultOnly}
                                onChange={(e) => setEditServiceConsultOnly(e.target.checked)}
                                className="accent-[#C9A45C]"
                              />
                              <span>Consult</span>
                            </label>
                            <div className="sm:col-span-2 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveServiceEdit(svc.id)}
                                className="p-1.5 rounded bg-[#C9A45C] text-[#0D0D0D] cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingServiceId(null)}
                                className="p-1.5 rounded border border-white/15 text-[#A5A5A5] cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0">
                              <div className="font-medium text-[#F5F1E8]">{svc.name}</div>
                              {svc.note && (
                                <div className="text-[10px] text-amber-300/80 mt-0.5">{svc.note}</div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono tabular-nums font-bold text-[#E3C78D] bg-[#12100B] border border-[#C9A45C]/30 px-2.5 py-1 rounded">
                                {formatRsPrice(svc.price)}
                              </span>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveService(svc.id, -1)}
                                className="p-1 text-[#A5A5A5] hover:text-white disabled:opacity-25 cursor-pointer"
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === categoryServices.length - 1}
                                onClick={() => handleMoveService(svc.id, 1)}
                                className="p-1 text-[#A5A5A5] hover:text-white disabled:opacity-25 cursor-pointer"
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingServiceId(svc.id);
                                  setEditServiceName(svc.name);
                                  setEditServiceConsultOnly(svc.price === null);
                                  setEditServicePrice(svc.price !== null ? String(svc.price) : '');
                                }}
                                className="p-1 text-[#C9A45C] hover:text-[#E3C78D] cursor-pointer"
                                title="Edit service & price"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSvcToDelete(svc)}
                                className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                                title="Delete service"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview Draft Menu Modal */}
      {showPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPreviewModal(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[88vh] bg-[#141414] border border-[#C9A45C]/50 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-[#1B1B1B] border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-serif-elegant text-lg font-bold text-[#F5F1E8]">
                  Draft Menu Preview (Not Yet Published)
                </h3>
                <p className="text-[11px] text-[#A5A5A5]">
                  PDF linked: {draft.pdfFilename}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    handlePublishDraft();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#C9A45C] text-[#0D0D0D] text-xs font-bold uppercase cursor-pointer"
                >
                  Publish Live
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-lg border border-white/15 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {draft.categories.map((cat) => {
                const items = draft.services
                  .filter((s) => s.categoryId === cat.id)
                  .sort((a, b) => a.displayOrder - b.displayOrder);
                return (
                  <div key={cat.id} className="rounded-lg border border-white/10 bg-[#181818] p-4">
                    <h4 className="font-serif-elegant text-base font-bold text-[#E3C78D] mb-2">
                      {cat.name} ({items.length})
                    </h4>
                    {items.length === 0 ? (
                      <p className="text-xs text-[#A5A5A5]">Pricing shared upon consultation</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-1.5 px-2.5 rounded bg-[#121212]"
                          >
                            <span className="text-[#F5F1E8]">{item.name}</span>
                            <span className="font-mono font-bold text-[#E3C78D]">
                              {formatRsPrice(item.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Draft PDF Preview Modal */}
      {showPdfPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPdfPreviewModal(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl h-[85vh] bg-[#141414] border border-[#C9A45C]/50 rounded-xl flex flex-col overflow-hidden"
          >
            <div className="px-5 py-3 bg-[#1B1B1B] border-b border-white/10 flex items-center justify-between">
              <div className="text-xs">
                <strong className="text-[#F5F1E8] text-sm">{draft.pdfFilename}</strong>
                <span className="ml-2 text-amber-300">(Draft Preview — Publish to update public site)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfPreviewModal(false)}
                className="p-1.5 rounded border border-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={draft.pdfUrl}
              title="Draft Menu PDF Preview"
              className="flex-1 w-full bg-[#0D0D0D] border-0"
            />
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Category */}
      {catToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#181818] border border-rose-500/50 rounded-xl p-6 text-xs space-y-3">
            <h3 className="font-serif-elegant text-lg font-bold text-rose-400">
              Delete Category "{catToDelete.name}"?
            </h3>
            <p className="text-[#A5A5A5]">
              This removes the category and its services from your Draft. Public visitors still see the live menu until you Publish.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-white/15 text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Service */}
      {svcToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#181818] border border-rose-500/50 rounded-xl p-6 text-xs space-y-3">
            <h3 className="font-serif-elegant text-lg font-bold text-rose-400">
              Remove "{svcToDelete.name}"?
            </h3>
            <p className="text-[#A5A5A5]">
              Remove this service from your Draft menu?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSvcToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-white/15 text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteService}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
