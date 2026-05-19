import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import {
  FileText, Plus, Pencil, Trash2, X, Globe, Lock,
  Search, ChevronRight, User, Calendar, Eye,
} from 'lucide-react';
import { formatRelativeDate } from '../../utils/date';
import { TemplateEditor } from '../../components/editor/TemplateEditor';

interface TemplateData {
  id_template: number;
  name: string;
  description: string;
  is_public: boolean;
  created_by: number | null;
  created_by_pseudo: string | null;
  is_owner: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface FullTemplate extends TemplateData {
  content_html: string;
}

type Tab = 'mine' | 'public';

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

// ── Form modal ──────────────────────────────────────────────────────────────

interface ModalProps {
  template?: FullTemplate;
  onClose: () => void;
  onSave: () => void;
}

const TemplateFormModal = ({ template, onClose, onSave }: ModalProps) => {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [contentHtml, setContentHtml] = useState(template?.content_html ?? '');
  const [isPublic, setIsPublic] = useState(template?.is_public ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(template);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { name: name.trim(), description, content_html: contentHtml, is_public: isPublic };
      if (template) {
        await api.updateTemplate(template.id_template, payload);
      } else {
        await api.createTemplate(payload);
      }
      onSave();
    } catch (err) {
      setError(getErrorMessage(err, 'Erreur'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#12122a] border border-white/10 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">
            {isEdit ? 'Modifier le template' : 'Nouveau template'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Nom</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Bref descriptif (optionnel)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Contenu</label>
            <TemplateEditor value={contentHtml} onChange={setContentHtml} placeholder="Rédigez le contenu…" minHeight="260px" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded accent-[var(--theme-primary)]" />
            <span className="text-sm text-white/70 inline-flex items-center gap-2">
              {isPublic ? <Globe size={14} className="text-[var(--theme-primary)]" /> : <Lock size={14} className="text-white/40" />}
              {isPublic ? 'Public — visible par tous les utilisateurs' : 'Privé — visible uniquement par vous'}
            </span>
          </label>

          {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors text-sm">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all"
              style={{ background: 'var(--theme-primary)' }}
            >
              {loading ? '…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Preview panel ────────────────────────────────────────────────────────────

interface PreviewPanelProps {
  template: FullTemplate | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PreviewPanel = ({ template, open, onClose, onEdit, onDelete }: PreviewPanelProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [template?.id_template]);

  return (
    <>
      {/* Backdrop (mobile only) */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[520px] z-40 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: '#0e0e1f', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
      >
        {template && (
          <>
            {/* Panel header */}
            <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-white/8 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {template.is_public ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]">
                      <Globe size={10} /> Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-white/50">
                      <Lock size={10} /> Privé
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-white leading-snug">{template.name}</h2>
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white transition-colors mt-0.5 shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-white/8 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
                <User size={11} />
                {template.created_by_pseudo ?? 'auteur supprimé'}
              </span>
              {template.updated_at && (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
                  <Calendar size={11} />
                  {formatRelativeDate(template.updated_at)}
                </span>
              )}
            </div>

            {/* Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-4">
              {template.description && (
                <p className="text-sm text-white/60 mb-5 leading-relaxed">{template.description}</p>
              )}

              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Eye size={11} /> Aperçu
              </div>

              {template.content_html ? (
                <div
                  className="prose-document rounded-xl p-5"
                  style={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.07)' }}
                  dangerouslySetInnerHTML={{ __html: template.content_html }}
                />
              ) : (
                <div className="rounded-xl p-5 text-center text-white/30 text-sm" style={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.07)' }}>
                  Aucun contenu
                </div>
              )}
            </div>

            {/* Footer actions */}
            {template.is_owner && (
              <div className="flex items-center gap-2 px-6 py-4 border-t border-white/8 shrink-0">
                <button
                  onClick={onEdit}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: 'var(--theme-primary)' }}
                >
                  <Pencil size={14} /> Modifier
                </button>
                <button
                  onClick={onDelete}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  template: TemplateData;
  selected: boolean;
  onClick: () => void;
}

const TemplateCard = ({ template, selected, onClick }: CardProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-center gap-3 group
        ${selected
          ? 'border-[var(--theme-primary)]/60 bg-[var(--theme-primary)]/8'
          : 'border-white/8 bg-white/3 hover:border-white/16 hover:bg-white/5'
        }`}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: selected ? 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' : 'rgba(255,255,255,0.05)' }}
      >
        <FileText size={16} style={{ color: selected ? 'var(--theme-primary)' : 'rgba(255,255,255,0.35)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm text-white truncate">{template.name}</span>
          {template.is_public
            ? <Globe size={11} className="shrink-0 text-[var(--theme-primary)] opacity-70" />
            : <Lock size={11} className="shrink-0 text-white/30" />
          }
        </div>
        {template.description && (
          <p className="text-xs text-white/40 truncate">{template.description}</p>
        )}
        {!template.description && template.created_by_pseudo && (
          <p className="text-xs text-white/30">{template.created_by_pseudo}</p>
        )}
      </div>

      <ChevronRight size={14} className={`shrink-0 transition-colors ${selected ? 'text-[var(--theme-primary)]' : 'text-white/20 group-hover:text-white/40'}`} />
    </button>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

export const Templates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('mine');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<FullTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FullTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listTemplates();
      setTemplates(data.templates);
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? templates.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      : templates;
    if (tab === 'mine') return list.filter(t => t.is_owner);
    return list.filter(t => !t.is_owner && t.is_public);
  }, [templates, search, tab]);

  const myCount = useMemo(() => templates.filter(t => t.is_owner).length, [templates]);
  const pubCount = useMemo(() => templates.filter(t => !t.is_owner && t.is_public).length, [templates]);

  const handleCardClick = async (template: TemplateData) => {
    if (selectedId === template.id_template) {
      setPreviewOpen(false);
      setSelectedId(null);
      return;
    }
    setSelectedId(template.id_template);
    setPreviewOpen(true);
    try {
      const full = await api.getTemplate(template.id_template);
      setPreviewTemplate(full);
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur'));
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedId(null);
  };

  const handleEditFromPanel = () => {
    if (!previewTemplate) return;
    setEditing(previewTemplate);
    setShowModal(true);
  };

  const handleDeleteFromPanel = async () => {
    if (!previewTemplate) return;
    if (!confirm(`Supprimer le template "${previewTemplate.name}" ?`)) return;
    try {
      await api.deleteTemplate(previewTemplate.id_template);
      toast('success', 'Template supprimé');
      handleClosePreview();
      fetchTemplates();
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur'));
    }
  };

  const handleOpenCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const handleSaved = async () => {
    const msg = editing ? 'Template modifié' : 'Template créé';
    setShowModal(false);
    // Refresh preview if we edited the selected template
    if (editing && selectedId === editing.id_template) {
      try {
        const full = await api.getTemplate(editing.id_template);
        setPreviewTemplate(full);
      } catch { /* ignore */ }
    }
    setEditing(null);
    toast('success', msg);
    fetchTemplates();
  };

  return (
    <Layout>
      <div className="flex h-screen overflow-hidden">
        {/* Main content */}
        <div
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
          style={{ marginRight: previewOpen ? '520px' : '0' }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                  <FileText size={22} style={{ color: 'var(--theme-primary)' }} />
                  Templates
                </h1>
                <p className="text-sm text-white/40 mt-1">Modèles de documents réutilisables</p>
              </div>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'var(--theme-primary)' }}
              >
                <Plus size={15} /> Nouveau
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 w-fit">
              {([
                { key: 'mine', label: 'Mes templates', count: myCount },
                { key: 'public', label: 'Publics', count: pubCount },
              ] as { key: Tab; label: string; count: number }[]).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tab === key
                      ? 'bg-[var(--theme-primary)] text-white shadow'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {label}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-white/20' : 'bg-white/10'}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-white/30 text-sm">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-white/30 text-sm gap-2">
                <FileText size={32} className="opacity-20" />
                {tab === 'mine' ? 'Aucun template créé.' : 'Aucun template public disponible.'}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map(t => (
                  <TemplateCard
                    key={t.id_template}
                    template={t}
                    selected={selectedId === t.id_template}
                    onClick={() => handleCardClick(t)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Slide panel */}
        <PreviewPanel
          template={previewTemplate}
          open={previewOpen}
          onClose={handleClosePreview}
          onEdit={handleEditFromPanel}
          onDelete={handleDeleteFromPanel}
        />
      </div>

      {showModal && (
        <TemplateFormModal
          template={editing ?? undefined}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSaved}
        />
      )}
    </Layout>
  );
};
