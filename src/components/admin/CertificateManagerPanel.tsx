import React, { useEffect, useState } from 'react';
import { CertificateItem } from '../../data/menuData';
import {
  Plus,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  X,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface CertificateManagerPanelProps {
  authToken: string;
  onToast: (msg: string) => void;
  onAuthError: () => void;
}

export const CertificateManagerPanel: React.FC<CertificateManagerPanelProps> = ({
  authToken,
  onToast,
  onAuthError,
}) => {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingCert, setEditingCert] = useState<CertificateItem | null>(null);
  const [certToDelete, setCertToDelete] = useState<CertificateItem | null>(null);
  const [previewCert, setPreviewCert] = useState<CertificateItem | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [recipient, setRecipient] = useState('');
  const [centre, setCentre] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [certificateRef, setCertificateRef] = useState('');
  const [category, setCategory] = useState('Accreditation');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
  const [published, setPublished] = useState<boolean>(true);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/certificates', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        onAuthError();
        return;
      }
      if (!res.ok) throw new Error('Failed to load certificates.');
      const data = await res.json();
      setCertificates(data.certificates || []);
    } catch (err: any) {
      onToast(err.message || 'Could not load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const openAddModal = () => {
    setEditingCert(null);
    setTitle('');
    setIssuingOrganization('');
    setRecipient('M. Ravikanth');
    setCentre('');
    setIssueDate('');
    setCertificateRef('');
    setCategory('Accreditation');
    setDescription('');
    setFileUrl('');
    setFileType('image');
    setPublished(true);
    setShowFormModal(true);
  };

  const openEditModal = (cert: CertificateItem) => {
    setEditingCert(cert);
    setTitle(cert.title);
    setIssuingOrganization(cert.issuingOrganization);
    setRecipient(cert.recipient || '');
    setCentre(cert.centre || '');
    setIssueDate(cert.issueDate || '');
    setCertificateRef(cert.certificateRef || '');
    setCategory(cert.category || 'Accreditation');
    setDescription(cert.description || '');
    setFileUrl(cert.fileUrl);
    setFileType(cert.fileType);
    setPublished(cert.published);
    setShowFormModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      onToast('Certificate file must be under 12 MB.');
      return;
    }

    setUploadingFile(true);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected file.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/admin/certificates/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ filename: file.name, contentBase64 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      setFileUrl(data.url);
      setFileType(data.fileType);
      onToast('Certificate document uploaded and ready to preview/save.');
    } catch (err: any) {
      onToast(err.message || 'Error uploading certificate file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !issuingOrganization.trim() || !fileUrl.trim()) {
      onToast('Please upload a certificate document and enter both Title and Issuing Organization.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        issuingOrganization: issuingOrganization.trim(),
        recipient: recipient.trim(),
        centre: centre.trim(),
        issueDate: issueDate.trim(),
        certificateRef: certificateRef.trim(),
        category: category.trim() || 'Accreditation',
        description: description.trim(),
        fileUrl: fileUrl.trim(),
        fileType,
        published,
      };

      const url = editingCert
        ? `/api/admin/certificates/${editingCert.id}`
        : '/api/admin/certificates';
      const method = editingCert ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save certificate.');

      setShowFormModal(false);
      await fetchCertificates();
      window.dispatchEvent(new Event('gw-certificates-updated'));
      onToast(editingCert ? 'Certificate updated.' : 'New certificate added.');
    } catch (err: any) {
      onToast(err.message || 'Error saving certificate');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (cert: CertificateItem) => {
    try {
      const res = await fetch(`/api/admin/certificates/${cert.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ published: !cert.published }),
      });
      if (!res.ok) throw new Error('Failed to update status.');
      await fetchCertificates();
      window.dispatchEvent(new Event('gw-certificates-updated'));
      onToast(
        !cert.published
          ? 'Certificate published to live website.'
          : 'Certificate unpublished (hidden from public site).'
      );
    } catch (err: any) {
      onToast(err.message || 'Error toggling publish state');
    }
  };

  const handleReorder = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= certificates.length) return;
    const reordered = [...certificates];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCertificates(reordered);

    try {
      const res = await fetch('/api/admin/certificates/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
      if (!res.ok) throw new Error('Failed to reorder certificates.');
      window.dispatchEvent(new Event('gw-certificates-updated'));
    } catch (err: any) {
      onToast(err.message || 'Error reordering');
      fetchCertificates();
    }
  };

  const handleConfirmDelete = async () => {
    if (!certToDelete) return;
    try {
      const res = await fetch(`/api/admin/certificates/${certToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to delete certificate.');
      setCertToDelete(null);
      await fetchCertificates();
      window.dispatchEvent(new Event('gw-certificates-updated'));
      onToast('Certificate removed.');
    } catch (err: any) {
      onToast(err.message || 'Error removing certificate');
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-[#A5A5A5]">
        Loading verified salon certificates...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-elegant text-2xl font-bold text-[#F5F1E8]">
            Certificate &amp; Credentials Manager
          </h1>
          <p className="text-xs text-[#A5A5A5] mt-1">
            Upload scanned certificates or PDFs, edit details, publish/unpublish, replace files, and control display order.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] inline-flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Certificate</span>
        </button>
      </div>

      {/* Certificates Grid */}
      {certificates.length === 0 ? (
        <div className="py-16 text-center border rounded-xl bg-[#161616] border-white/10">
          <Award className="w-10 h-10 text-[#C9A45C]/40 mx-auto mb-2" />
          <p className="text-sm text-[#F5F1E8] font-semibold">No certificates uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert, idx) => (
            <div
              key={cert.id}
              className={`rounded-xl border overflow-hidden flex flex-col justify-between bg-[#161616] ${
                cert.published ? 'border-[#C9A45C]/30' : 'border-white/10 opacity-75'
              }`}
            >
              {/* Thumbnail */}
              <div
                onClick={() => setPreviewCert(cert)}
                className="relative h-48 bg-[#0B0B0B] flex items-center justify-center p-3 border-b border-white/10 cursor-pointer"
              >
                {cert.fileType === 'pdf' ? (
                  <div className="text-center">
                    <FileText className="w-10 h-10 text-[#C9A45C] mx-auto mb-1" />
                    <span className="text-xs text-[#E3C78D]">PDF Document</span>
                  </div>
                ) : (
                  <img
                    src={cert.fileUrl}
                    alt={cert.title}
                    className="max-h-full w-auto object-contain rounded"
                  />
                )}
                <span
                  className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    cert.published
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-neutral-700/70 text-neutral-300 border border-white/15'
                  }`}
                >
                  {cert.published ? 'Published' : 'Hidden'}
                </span>
              </div>

              {/* Meta */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
                <div>
                  <div className="flex items-start gap-1.5 text-[11px] text-[#C9A45C] font-semibold mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{cert.issuingOrganization}</span>
                  </div>
                  <h3 className="font-serif-elegant text-base font-bold text-[#F5F1E8] leading-snug">
                    {cert.title}
                  </h3>
                  <div className="mt-1.5 text-[11px] text-[#A5A5A5] space-y-0.5">
                    {cert.recipient && <div>Recipient: {cert.recipient}</div>}
                    {cert.issueDate && <div>Date: {cert.issueDate}</div>}
                    {cert.certificateRef && <div>Ref: {cert.certificateRef}</div>}
                  </div>
                </div>

                {/* Controls */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleReorder(idx, -1)}
                      className="p-1.5 rounded bg-[#222222] text-[#A5A5A5] hover:text-white disabled:opacity-25 cursor-pointer"
                      title="Move earlier"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === certificates.length - 1}
                      onClick={() => handleReorder(idx, 1)}
                      className="p-1.5 rounded bg-[#222222] text-[#A5A5A5] hover:text-white disabled:opacity-25 cursor-pointer"
                      title="Move later"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublished(cert)}
                      className="px-2.5 py-1.5 rounded bg-[#222222] hover:bg-[#2B2B2B] text-[#E3C78D] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      title={cert.published ? 'Unpublish' : 'Publish'}
                    >
                      {cert.published ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Publish</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(cert)}
                      className="p-1.5 rounded bg-[#C9A45C]/15 hover:bg-[#C9A45C]/30 text-[#E3C78D] cursor-pointer"
                      title="Edit / Replace"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCertToDelete(cert)}
                      className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload / Edit Certificate Modal */}
      {showFormModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowFormModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveForm}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#161616] border border-[#C9A45C]/50 rounded-xl p-5 sm:p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-serif-elegant text-xl font-bold text-[#F5F1E8]">
                {editingCert ? 'Edit or Replace Certificate' : 'Upload New Certificate'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded border border-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* File upload + Preview */}
            <div className="p-4 rounded-lg bg-[#101010] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold text-[#E3C78D]">
                  Certificate Document (JPG, PNG, WebP, or PDF)
                </span>
                <label className="px-3 py-2 rounded-lg bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] font-bold inline-flex items-center gap-1.5 cursor-pointer self-start">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingFile
                      ? 'Uploading...'
                      : fileUrl
                      ? 'Replace File'
                      : 'Choose File'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                </label>
              </div>

              {fileUrl && (
                <div className="h-44 bg-[#090909] rounded-lg border border-white/10 flex items-center justify-center p-2">
                  {fileType === 'pdf' ? (
                    <iframe src={fileUrl} title="Certificate PDF Preview" className="w-full h-full border-0" />
                  ) : (
                    <img src={fileUrl} alt="Certificate preview" className="max-h-full w-auto object-contain" />
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold uppercase tracking-wider mb-1 text-[#A5A5A5]">
                  Certificate Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Certificate of Excellence — Hair Cutting"
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-white/15 text-[#F5F1E8] focus:outline-none focus:border-[#C9A45C]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold uppercase tracking-wider mb-1 text-[#A5A5A5]">
                  Issuing Institution / Academy *
                </label>
                <input
                  type="text"
                  required
                  value={issuingOrganization}
                  onChange={(e) => setIssuingOrganization(e.target.value)}
                  placeholder="e.g. Jawed Habib Academy"
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-white/15 text-[#F5F1E8] focus:outline-none focus:border-[#C9A45C]"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider mb-1 text-[#A5A5A5]">
                  Recipient (Optional)
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. M. Ravikanth"
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-white/15 text-[#F5F1E8]"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider mb-1 text-[#A5A5A5]">
                  Issue Date (Optional — as printed)
                </label>
                <input
                  type="text"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  placeholder="e.g. 20-Sep-2016"
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-white/15 text-[#F5F1E8]"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider mb-1 text-[#A5A5A5]">
                  Centre / City (Optional)
                </label>
                <input
                  type="text"
                  value={centre}
                  onChange={(e) => setCentre(e.target.value)}
                  placeholder="e.g. HYDERABAD"
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-white/15 text-[#F5F1E8]"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider mb-1 text-[#A5A5A5]">
                  Certificate Ref / Category
                </label>
                <input
                  type="text"
                  value={certificateRef}
                  onChange={(e) => setCertificateRef(e.target.value)}
                  placeholder="e.g. 2598-2010"
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-white/15 text-[#F5F1E8]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold uppercase tracking-wider mb-1 text-[#A5A5A5]">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-white/15 text-[#F5F1E8]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#F5F1E8] cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="accent-[#C9A45C]"
              />
              <span>Publish immediately to public website</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 rounded-lg border border-white/15 text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingFile}
                className="px-5 py-2 rounded-lg bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] font-bold uppercase cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Certificate'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Certificate Enlarge Preview Modal */}
      {previewCert && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewCert(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full bg-[#161616] border border-[#C9A45C]/50 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-elegant text-lg font-bold text-[#F5F1E8]">
                {previewCert.title}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewCert(null)}
                className="p-1.5 rounded border border-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black rounded-lg p-2 flex items-center justify-center min-h-[300px]">
              {previewCert.fileType === 'pdf' ? (
                <iframe src={previewCert.fileUrl} title={previewCert.title} className="w-full h-[60vh] border-0" />
              ) : (
                <img src={previewCert.fileUrl} alt={previewCert.title} className="max-h-[65vh] w-auto object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {certToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#181818] border border-rose-500/50 rounded-xl p-6 text-xs space-y-3">
            <h3 className="font-serif-elegant text-lg font-bold text-rose-400">
              Delete Certificate?
            </h3>
            <p className="text-[#A5A5A5]">
              Are you sure you want to permanently remove &ldquo;{certToDelete.title}&rdquo;?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCertToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-white/15 text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
