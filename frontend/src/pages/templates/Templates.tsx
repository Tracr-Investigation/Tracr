import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { usePageTitle } from '../../hooks/usePageTitle';
import { api, type TemplateCategoryData, type TemplateData } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import {
  FileText, Plus, Pencil, Trash2, X, Globe, Lock,
  Search, ChevronRight, User, Calendar, Eye, Tag,
} from 'lucide-react';
import { formatRelativeDate } from '../../utils/date';
import { TemplateEditor } from '../../components/editor/TemplateEditor';

type FullTemplate = TemplateData & { content_html: string };
type Tab = 'mine' | 'public';

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

// ── Form panel ───────────────────────────────────────────────────────────────

interface FormPanelProps {
  template?: FullTemplate;
  categories: TemplateCategoryData[];
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const FormPanel = ({ template, categories, open, onClose, onSave }: FormPanelProps) => {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [contentHtml, setContentHtml] = useState(template?.content_html ?? '');
  const [isPublic, setIsPublic] = useState(template?.is_public ?? true);
  const [categoryId, setCategoryId] = useState<number | null>(template?.category?.id_category_template ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(template);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        description,
        content_html: contentHtml,
        is_public: isPublic,
        id_category_template: categoryId ?? undefined,
        clear_category: categoryId === null && isEdit,
      };
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
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[680px] z-40 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-default">
              {isEdit ? 'Modifier le template' : 'Nouveau template'}
            </h2>
            {isEdit && <p className="text-xs text-text-dim mt-0.5">{template?.name}</p>}
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="px-6 py-5 space-y-5 flex-1">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">Nom</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus={open}
                className="w-full bg-input-bg border border-border-subtle rounded-xl px-4 py-2.5 text-text-default focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={2000}
                placeholder="Bref descriptif (optionnel)"
                className="w-full bg-input-bg border border-border-subtle rounded-xl px-4 py-2.5 text-text-default focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>

            {/* Category */}
            {categories.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">Catégorie</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryId(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      categoryId === null
                        ? 'border-[var(--theme-primary)] text-text-default'
                        : 'border-border-subtle bg-card/30 text-text-muted hover:border-border'
                    }`}
                    style={categoryId === null ? { background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)' } : undefined}
                  >
                    Aucune
                  </button>
                  {categories.map(cat => {
                    const active = categoryId === cat.id_category_template;
                    return (
                      <button
                        key={cat.id_category_template}
                        type="button"
                        onClick={() => setCategoryId(cat.id_category_template)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          active
                            ? 'text-text-default border-transparent'
                            : 'border-border-subtle bg-card/30 text-text-muted hover:border-border'
                        }`}
                        style={active
                          ? { background: `${cat.color || 'var(--theme-primary)'}22`, borderColor: cat.color || 'var(--theme-primary)', color: cat.color || 'var(--theme-primary)' }
                          : undefined
                        }
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: cat.color || 'var(--theme-primary)' }}
                        />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">Contenu</label>
              <TemplateEditor value={contentHtml} onChange={setContentHtml} placeholder="Rédigez le contenu…" minHeight="260px" />
            </div>

            {/* Visibility */}
            <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-border-subtle hover:border-border transition-colors">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded accent-[var(--theme-primary)]" />
              <span className="text-sm text-text-default inline-flex items-center gap-2">
                {isPublic ? <Globe size={14} className="text-[var(--theme-primary)]" /> : <Lock size={14} className="text-text-dim" />}
                {isPublic ? 'Public - visible par tous les utilisateurs' : 'Privé - visible uniquement par vous'}
              </span>
            </label>

            {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end px-6 py-4 border-t border-border-subtle shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-input-bg border border-border-subtle text-text-muted hover:text-text-default transition-colors text-sm">
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
    </>
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
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[520px] z-40 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        {template && (
          <>
            <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {template.category && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${template.category.color || 'var(--theme-primary)'}22`,
                        color: template.category.color || 'var(--theme-primary)',
                      }}
                    >
                      <Tag size={9} /> {template.category.name}
                    </span>
                  )}
                  {template.is_public ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]">
                      <Globe size={10} /> Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-card/30 text-text-muted">
                      <Lock size={10} /> Privé
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-text-default leading-snug">{template.name}</h2>
              </div>
              <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors mt-0.5 shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-4 px-6 py-3 border-b border-border-subtle shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
                <User size={11} />
                {template.created_by_pseudo ?? 'auteur supprimé'}
              </span>
              {template.updated_at && (
                <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
                  <Calendar size={11} />
                  {formatRelativeDate(template.updated_at)}
                </span>
              )}
            </div>

            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-4">
              {template.description && (
                <p className="text-sm text-text-muted mb-5 leading-relaxed">{template.description}</p>
              )}
              <div className="text-xs font-semibold text-text-default/30 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Eye size={11} /> Aperçu
              </div>
              {template.content_html ? (
                <div
                  className="prose-document rounded-xl p-5"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-border-subtle)' }}
                  dangerouslySetInnerHTML={{ __html: template.content_html }}
                />
              ) : (
                <div className="rounded-xl p-5 text-center text-text-dim text-sm" style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-border-subtle)' }}>
                  Aucun contenu
                </div>
              )}
            </div>

            {template.is_owner && (
              <div className="flex items-center gap-2 px-6 py-4 border-t border-border-subtle shrink-0">
                <button
                  onClick={onEdit}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-text-default transition-all"
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

const TemplateCard = ({ template, selected, onClick }: { template: TemplateData; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-center gap-3 group
      ${selected
        ? 'border-[var(--theme-primary)]/60 bg-[var(--theme-primary)]/8'
        : 'border-border-subtle bg-card/30 hover:border-border hover:bg-input-bg'
      }`}
  >
    <div
      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
      style={{ background: selected ? 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' : 'var(--color-input-bg)' }}
    >
      <FileText size={16} style={{ color: selected ? 'var(--theme-primary)' : 'var(--color-text-muted)' }} />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
        <span className="font-semibold text-sm text-text-default truncate">{template.name}</span>
        {template.category && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              background: `${template.category.color || 'var(--theme-primary)'}20`,
              color: template.category.color || 'var(--theme-primary)',
            }}
          >
            {template.category.name}
          </span>
        )}
        {template.is_public
          ? <Globe size={11} className="shrink-0 text-[var(--theme-primary)] opacity-70" />
          : <Lock size={11} className="shrink-0 text-text-dim" />
        }
      </div>
      {template.description && (
        <p className="text-xs text-text-dim truncate">{template.description}</p>
      )}
      {!template.description && template.created_by_pseudo && (
        <p className="text-xs text-text-dim">{template.created_by_pseudo}</p>
      )}
      {template.created_at && (
        <span className="inline-flex items-center gap-1 text-[10px] text-text-dim mt-0.5">
          <Calendar size={9} />
          {formatRelativeDate(template.created_at)}
        </span>
      )}
    </div>

    <ChevronRight size={14} className={`shrink-0 transition-colors ${selected ? 'text-[var(--theme-primary)]' : 'text-text-dim group-hover:text-text-default/40'}`} />
  </button>
);

// ── Page ─────────────────────────────────────────────────────────────────────

export const Templates = () => {
  const { toast } = useToast();
  usePageTitle('Modèles');
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [categories, setCategories] = useState<TemplateCategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('mine');
  const [filterCategoryId, setFilterCategoryId] = useState<number | null | 'uncategorized'>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<FullTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
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

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.listTemplateCategories();
      setCategories(data.categories);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [fetchTemplates, fetchCategories]);

  const tabFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? templates.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      : templates;
    return tab === 'mine' ? list.filter(t => t.is_owner) : list.filter(t => !t.is_owner && t.is_public);
  }, [templates, search, tab]);

  const filtered = useMemo(() => {
    if (filterCategoryId === null) return tabFiltered;
    if (filterCategoryId === 'uncategorized') return tabFiltered.filter(t => !t.category);
    return tabFiltered.filter(t => t.category?.id_category_template === filterCategoryId);
  }, [tabFiltered, filterCategoryId]);

  const myCount = useMemo(() => templates.filter(t => t.is_owner).length, [templates]);
  const pubCount = useMemo(() => templates.filter(t => !t.is_owner && t.is_public).length, [templates]);

  const handleCardClick = async (template: TemplateData) => {
    if (selectedId === template.id_template) {
      setPreviewOpen(false);
      setSelectedId(null);
      return;
    }
    setFormOpen(false);
    setEditing(null);
    setSelectedId(template.id_template);
    setPreviewOpen(true);
    try {
      const full = await api.getTemplate(template.id_template);
      setPreviewTemplate(full as FullTemplate);
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur'));
    }
  };

  const handleClosePreview = () => { setPreviewOpen(false); setSelectedId(null); };
  const handleCloseForm = () => { setFormOpen(false); setEditing(null); };

  const handleOpenCreate = () => {
    setPreviewOpen(false);
    setSelectedId(null);
    setEditing(null);
    setFormOpen(true);
  };

  const handleEditFromPanel = () => {
    if (!previewTemplate) return;
    setEditing(previewTemplate);
    setPreviewOpen(false);
    setFormOpen(true);
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

  const handleSaved = async () => {
    const wasEditing = editing;
    setFormOpen(false);
    setEditing(null);
    toast('success', wasEditing ? 'Template modifié' : 'Template créé');
    await fetchTemplates();
    if (wasEditing && selectedId === wasEditing.id_template) {
      try {
        const full = await api.getTemplate(wasEditing.id_template);
        setPreviewTemplate(full as FullTemplate);
        setPreviewOpen(true);
      } catch { /* ignore */ }
    }
  };

  const activePanelWidth = formOpen ? 680 : previewOpen ? 520 : 0;

  return (
    <Layout>
      <div className="flex h-screen overflow-hidden">
        {/* Main content */}
        <div
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
          style={{ marginRight: activePanelWidth ? `${activePanelWidth}px` : '0' }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-bold text-text-default flex items-center gap-2.5">
                  <FileText size={22} style={{ color: 'var(--theme-primary)' }} />
                  Templates
                </h1>
                <p className="text-sm text-text-dim mt-1">Modèles de documents réutilisables</p>
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
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full bg-input-bg border border-border-subtle rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-default placeholder-text-muted focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>

            {/* Mine / Public tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-input-bg w-fit mb-4">
              {([
                { key: 'mine', label: 'Mes templates', count: myCount },
                { key: 'public', label: 'Publics', count: pubCount },
              ] as { key: Tab; label: string; count: number }[]).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tab === key ? 'bg-[var(--theme-primary)] text-white shadow' : 'text-text-muted hover:text-text-default'
                  }`}
                >
                  {label}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-primary/20' : 'bg-card/30'}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Category filter chips */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag size={12} className="text-text-dim shrink-0" />
                <button
                  onClick={() => setFilterCategoryId(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    filterCategoryId === null
                      ? 'border-[var(--theme-primary)] text-text-default'
                      : 'border-border-subtle text-text-muted hover:border-border'
                  }`}
                  style={filterCategoryId === null ? { background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)' } : undefined}
                >
                  Tous
                </button>
                {categories.map(cat => {
                  const active = filterCategoryId === cat.id_category_template;
                  return (
                    <button
                      key={cat.id_category_template}
                      onClick={() => setFilterCategoryId(active ? null : cat.id_category_template)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        active ? 'border-transparent' : 'border-border-subtle text-text-muted hover:border-border'
                      }`}
                      style={active
                        ? { background: `${cat.color || 'var(--theme-primary)'}22`, borderColor: cat.color || 'var(--theme-primary)', color: cat.color || 'var(--theme-primary)' }
                        : undefined
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color || 'var(--theme-primary)' }} />
                      {cat.name}
                    </button>
                  );
                })}
                <button
                  onClick={() => setFilterCategoryId(filterCategoryId === 'uncategorized' ? null : 'uncategorized')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    filterCategoryId === 'uncategorized'
                      ? 'border-border text-text-default bg-input-bg'
                      : 'border-border-subtle text-text-dim hover:border-border hover:text-text-muted'
                  }`}
                >
                  Sans catégorie
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-text-dim text-sm">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-dim text-sm gap-2">
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

        {/* Preview panel */}
        <PreviewPanel
          template={previewTemplate}
          open={previewOpen}
          onClose={handleClosePreview}
          onEdit={handleEditFromPanel}
          onDelete={handleDeleteFromPanel}
        />

        {/* Form panel */}
        <FormPanel
          key={editing?.id_template ?? 'new'}
          template={editing ?? undefined}
          categories={categories}
          open={formOpen}
          onClose={handleCloseForm}
          onSave={handleSaved}
        />
      </div>
    </Layout>
  );
};
