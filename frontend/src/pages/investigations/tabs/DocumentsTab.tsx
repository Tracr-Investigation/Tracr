import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Trash2, X, ChevronDown, Globe, Lock, Eye, ExternalLink } from 'lucide-react';
import { api } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { formatRelativeDate } from '../../../utils/date';
import { toInvestigationSlug } from '../../../utils/slug';

interface Props {
  investigationId: number;
  investigationTitle: string;
  userPermission: string | null;
}

interface DocumentItem {
  id_document: number;
  id_investigation: number;
  title: string;
  created_by: number | null;
  created_by_pseudo: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface TemplateOption {
  id_template: number;
  name: string;
  description: string;
  is_public: boolean;
  is_owner: boolean;
}

const WRITE_PERMISSIONS = new Set(['owner', 'manager', 'editeur']);
const DEFAULT_DOCUMENT_TITLE = 'Nouveau document';

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

const canWriteDocuments = (permission: string | null) =>
  permission !== null && WRITE_PERMISSIONS.has(permission);

const canDeleteDocument = (
  doc: DocumentItem,
  permission: string | null,
  currentUserId: number | null,
) => permission === 'owner' || doc.created_by === currentUserId;

const buildDocumentLink = (slug: string, documentId: number) =>
  `/investigations/${slug}/documents/${documentId}`;

// ── Document preview panel ────────────────────────────────────────────────────

const DocumentPreviewPanel = ({
  doc,
  html,
  loading,
  open,
  slug,
  onClose,
}: {
  doc: DocumentItem | null;
  html: string;
  loading: boolean;
  open: boolean;
  slug: string;
  onClose: () => void;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [doc?.id_document]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[45] lg:hidden" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[660px] z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye size={14} className="text-primary shrink-0" />
              <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">Aperçu</span>
            </div>
            <h2 className="text-base font-bold text-text-default truncate">
              {doc?.title ?? '…'}
            </h2>
            {doc?.updated_at && (
              <p className="text-xs text-text-dim mt-0.5">
                {doc.created_by_pseudo && `${doc.created_by_pseudo} · `}
                {formatRelativeDate(doc.updated_at)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-default transition-colors p-1 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-dim">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm">Chargement du document…</span>
            </div>
          ) : html ? (
            <div className="prose-document" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-text-dim text-sm text-center py-16">Document vide</p>
          )}
        </div>

        {/* Footer */}
        {doc && (
          <div className="px-6 py-4 border-t border-border-subtle shrink-0">
            <Link
              to={buildDocumentLink(slug, doc.id_document)}
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--theme-primary)' }}
            >
              <ExternalLink size={14} />
              Ouvrir le document
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

// ── Document card ─────────────────────────────────────────────────────────────

interface DocumentCardProps {
  document: DocumentItem;
  slug: string;
  canDelete: boolean;
  onDelete: (doc: DocumentItem) => void;
  onPreview: (doc: DocumentItem) => void;
}

const DocumentCard = ({ document, slug, canDelete, onDelete, onPreview }: DocumentCardProps) => {
  const author = document.created_by_pseudo ?? 'inconnu';
  const authorLine = document.updated_at
    ? `${author} · ${formatRelativeDate(document.updated_at)}`
    : author;

  return (
    <div className="bg-card/30 border border-border-subtle rounded-xl p-4 hover:border-border transition-colors flex flex-col group">
      <Link
        to={buildDocumentLink(slug, document.id_document)}
        className="font-semibold text-text-default hover:text-[var(--theme-primary)] transition-colors mb-1 line-clamp-2 text-sm"
      >
        {document.title}
      </Link>
      <div className="text-xs text-text-dim mt-auto pt-2 flex items-center justify-between gap-2">
        <span>{authorLine}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPreview(document)}
            className="p-1 text-text-dim hover:text-primary transition-colors rounded"
            title="Aperçu"
          >
            <Eye size={12} />
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(document)}
              className="p-1 text-text-dim hover:text-red-400 transition-colors rounded"
              title="Supprimer"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Document list ─────────────────────────────────────────────────────────────

const DocumentList = ({
  loading,
  documents,
  slug,
  permission,
  currentUserId,
  onDelete,
  onPreview,
}: {
  loading: boolean;
  documents: DocumentItem[];
  slug: string;
  permission: string | null;
  currentUserId: number | null;
  onDelete: (doc: DocumentItem) => void;
  onPreview: (doc: DocumentItem) => void;
}) => {
  if (loading) return <p className="text-text-muted text-sm py-4">Chargement…</p>;
  if (documents.length === 0) {
    return (
      <p className="text-text-muted text-sm py-8 text-center">
        Aucun document pour cette investigation.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id_document}
          document={doc}
          slug={slug}
          canDelete={canDeleteDocument(doc, permission, currentUserId)}
          onDelete={onDelete}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
};

// ── Create document panel ─────────────────────────────────────────────────────

interface CreatePanelProps {
  investigationId: number;
  slug: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateDocumentPanel = ({ investigationId, slug, open, onClose, onCreated }: CreatePanelProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(DEFAULT_DOCUMENT_TITLE);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle(DEFAULT_DOCUMENT_TITLE);
      setSelectedTemplateId(null);
      setShowTemplates(false);
      setCreating(false);
    }
  }, [open]);

  useEffect(() => {
    api.listTemplates()
      .then(data => setTemplates(data.templates))
      .catch(() => {});
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id_template === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const doc = await api.createDocument(investigationId, {
        title: trimmed,
        id_template: selectedTemplateId,
      });
      toast('success', 'Document créé');
      onCreated();
      window.location.href = buildDocumentLink(slug, doc.id_document);
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[480px] z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-default">Nouveau document</h2>
            <p className="text-xs text-text-dim mt-0.5">Créer un document dans cette enquête</p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col px-6 py-5">
          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                Titre
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus={open}
                maxLength={255}
                className="w-full bg-input-bg border border-border-subtle rounded-xl px-4 py-2.5 text-text-default focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                À partir d'un template <span className="normal-case font-normal text-text-dim">(optionnel)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowTemplates(v => !v)}
                className="w-full bg-input-bg border border-border-subtle rounded-xl px-4 py-2.5 text-left hover:border-border transition-colors flex items-center justify-between"
              >
                <span className={selectedTemplate ? 'text-text-default' : 'text-text-dim'}>
                  {selectedTemplate ? selectedTemplate.name : 'Document vide'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-text-dim transition-transform ${showTemplates ? 'rotate-180' : ''}`}
                />
              </button>

              {showTemplates && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 z-10 rounded-xl py-1 shadow-xl max-h-56 overflow-y-auto"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  <button
                    type="button"
                    onClick={() => { setSelectedTemplateId(null); setShowTemplates(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-input-bg text-sm text-text-muted border-b border-border-subtle transition-colors"
                  >
                    Document vide
                  </button>
                  {templates.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-text-dim">Aucun template disponible</p>
                  ) : (
                    templates.map(t => (
                      <button
                        type="button"
                        key={t.id_template}
                        onClick={() => { setSelectedTemplateId(t.id_template); setShowTemplates(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-input-bg text-sm border-b border-border-subtle last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-text-default">{t.name}</span>
                          {t.is_public
                            ? <Globe size={11} className="text-text-dim" />
                            : t.is_owner && <Lock size={11} className="text-text-dim" />
                          }
                        </div>
                        {t.description && (
                          <p className="text-xs text-text-dim mt-0.5 line-clamp-1">{t.description}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-5 mt-5 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-input-bg border border-border-subtle text-text-muted hover:text-text-default transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all"
              style={{ background: 'var(--theme-primary)' }}
            >
              {creating ? '…' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Tab ───────────────────────────────────────────────────────────────────────

export const DocumentsTab = ({ investigationId, investigationTitle, userPermission }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Preview state
  const [previewDoc, setPreviewDoc]       = useState<DocumentItem | null>(null);
  const [previewOpen, setPreviewOpen]     = useState(false);
  const [previewHtml, setPreviewHtml]     = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const canWrite = canWriteDocuments(userPermission);
  const currentUserId = user?.id_user ?? null;
  const slug = toInvestigationSlug(investigationTitle, investigationId);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listDocuments(investigationId);
      setDocuments(data.documents);
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  }, [investigationId, toast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm(`Supprimer le document "${doc.title}" ?`)) return;
    try {
      await api.deleteDocument(doc.id_document);
      toast('success', 'Document supprimé');
      fetchDocuments();
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur'));
    }
  };

  const handlePreview = useCallback(async (doc: DocumentItem) => {
    setPreviewDoc(doc);
    setPreviewHtml('');
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const full = await api.getDocument(doc.id_document);
      setPreviewHtml((full as { content_html?: string }).content_html ?? '');
    } catch {
      /* silent */
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  return (
    <div className="border-t border-border-subtle pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text-default inline-flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--theme-primary)' }} />
          Documents
          <span className="text-text-dim font-normal text-sm">({documents.length})</span>
        </h3>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--theme-primary)' }}
          >
            <Plus size={14} /> Nouveau document
          </button>
        )}
      </div>

      <DocumentList
        loading={loading}
        documents={documents}
        slug={slug}
        permission={userPermission}
        currentUserId={currentUserId}
        onDelete={handleDelete}
        onPreview={handlePreview}
      />

      <CreateDocumentPanel
        investigationId={investigationId}
        slug={slug}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchDocuments}
      />

      <DocumentPreviewPanel
        doc={previewDoc}
        html={previewHtml}
        loading={previewLoading}
        open={previewOpen}
        slug={slug}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
};
