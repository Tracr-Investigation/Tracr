import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Trash2, X, ChevronDown, Globe, Lock } from 'lucide-react';
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
const OWNER_PERMISSION = 'owner';
const UNKNOWN_AUTHOR_LABEL = 'inconnu';
const DEFAULT_DOCUMENT_TITLE = 'Nouveau document';
const TOAST_LOAD_ERROR_FALLBACK = 'Erreur de chargement';
const TOAST_GENERIC_ERROR_FALLBACK = 'Erreur';
const TOAST_DOCUMENT_DELETED = 'Document supprimé';
const TOAST_DOCUMENT_CREATED = 'Document créé';

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

const canWriteDocuments = (permission: string | null): boolean => {
  if (permission === null) {
    return false;
  }
  return WRITE_PERMISSIONS.has(permission);
};

const isInvestigationOwner = (permission: string | null): boolean => {
  return permission === OWNER_PERMISSION;
};

const isDocumentAuthor = (
  doc: DocumentItem,
  currentUserId: number | null,
): boolean => {
  if (currentUserId === null) {
    return false;
  }
  return doc.created_by === currentUserId;
};

const canDeleteDocument = (
  doc: DocumentItem,
  permission: string | null,
  currentUserId: number | null,
): boolean => {
  if (isInvestigationOwner(permission)) {
    return true;
  }
  return isDocumentAuthor(doc, currentUserId);
};

const buildDocumentLink = (slug: string, documentId: number): string => {
  return `/investigations/${slug}/documents/${documentId}`;
};

const buildAuthorLine = (doc: DocumentItem): string => {
  const author = doc.created_by_pseudo ?? UNKNOWN_AUTHOR_LABEL;
  if (!doc.updated_at) {
    return author;
  }
  const relativeDate = formatRelativeDate(doc.updated_at);
  return `${author} · ${relativeDate}`;
};

const confirmDocumentDeletion = (doc: DocumentItem): boolean => {
  const message = `Supprimer le document "${doc.title}" ?`;
  return confirm(message);
};

interface DocumentCardProps {
  document: DocumentItem;
  slug: string;
  canDelete: boolean;
  onDelete: (doc: DocumentItem) => void;
}

const DocumentCard = ({ document, slug, canDelete, onDelete }: DocumentCardProps) => {
  const documentLink = buildDocumentLink(slug, document.id_document);
  const authorLine = buildAuthorLine(document);

  const handleDeleteClick = () => {
    onDelete(document);
  };

  return (
    <div className="bg-[#1a1a2e] border border-primary/20 rounded-lg p-3 hover:border-primary/40 transition-colors flex flex-col group">
      <Link
        to={documentLink}
        className="font-semibold text-accent hover:text-primary transition-colors mb-1 line-clamp-2"
      >
        {document.title}
      </Link>
      <div className="text-xs text-secondary mt-auto pt-2 flex items-center justify-between gap-2">
        <span>{authorLine}</span>
        {canDelete && (
          <button
            onClick={handleDeleteClick}
            className="p-1 text-secondary hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Supprimer"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

interface DocumentListProps {
  loading: boolean;
  documents: DocumentItem[];
  slug: string;
  permission: string | null;
  currentUserId: number | null;
  onDelete: (doc: DocumentItem) => void;
}

const DocumentList = ({
  loading,
  documents,
  slug,
  permission,
  currentUserId,
  onDelete,
}: DocumentListProps) => {
  if (loading) {
    return <p className="text-secondary text-sm py-4">Chargement…</p>;
  }
  if (documents.length === 0) {
    return (
      <p className="text-secondary text-sm py-8 text-center">
        Aucun document pour cette investigation.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {documents.map((doc) => {
        const canDelete = canDeleteDocument(doc, permission, currentUserId);
        return (
          <DocumentCard
            key={doc.id_document}
            document={doc}
            slug={slug}
            canDelete={canDelete}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
};

export const DocumentsTab = ({ investigationId, investigationTitle, userPermission }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const canWrite = canWriteDocuments(userPermission);
  const currentUserId = user?.id_user ?? null;
  const slug = toInvestigationSlug(investigationTitle, investigationId);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listDocuments(investigationId);
      setDocuments(data.documents);
    } catch (err) {
      const message = getErrorMessage(err, TOAST_LOAD_ERROR_FALLBACK);
      toast('error', message);
    } finally {
      setLoading(false);
    }
  }, [investigationId, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (doc: DocumentItem) => {
    if (!confirmDocumentDeletion(doc)) {
      return;
    }
    try {
      await api.deleteDocument(doc.id_document);
      toast('success', TOAST_DOCUMENT_DELETED);
      fetchDocuments();
    } catch (err) {
      const message = getErrorMessage(err, TOAST_GENERIC_ERROR_FALLBACK);
      toast('error', message);
    }
  };

  const handleOpenCreate = () => {
    setShowCreate(true);
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
  };

  return (
    <div className="border-t border-primary/10 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-accent inline-flex items-center gap-2">
          <FileText size={18} /> Documents ({documents.length})
        </h3>
        {canWrite && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
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
      />

      {showCreate && (
        <CreateDocumentModal
          investigationId={investigationId}
          slug={slug}
          onClose={handleCloseCreate}
          onCreated={fetchDocuments}
        />
      )}
    </div>
  );
};

interface CreateModalProps {
  investigationId: number;
  slug: string;
  onClose: () => void;
  onCreated: () => void;
}

interface TemplateOptionItemProps {
  template: TemplateOption;
  onSelect: (id: number) => void;
}

const TemplateOptionItem = ({ template, onSelect }: TemplateOptionItemProps) => {
  const showPublicIcon = template.is_public;
  const showPrivateIcon = !template.is_public && template.is_owner;
  const hasDescription = Boolean(template.description);

  const handleClick = () => {
    onSelect(template.id_template);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-3 py-2 hover:bg-primary/10 text-sm border-b border-primary/10 last:border-b-0"
    >
      <div className="flex items-center gap-2">
        <span className="text-accent">{template.name}</span>
        {showPublicIcon && <Globe size={11} className="text-secondary" />}
        {showPrivateIcon && <Lock size={11} className="text-secondary" />}
      </div>
      {hasDescription && (
        <p className="text-xs text-secondary mt-0.5 line-clamp-1">{template.description}</p>
      )}
    </button>
  );
};

interface TemplateDropdownProps {
  templates: TemplateOption[];
  onSelect: (id: number | null) => void;
}

const TemplateDropdown = ({ templates, onSelect }: TemplateDropdownProps) => {
  const handleSelectEmpty = () => {
    onSelect(null);
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-[#1a1a2e] border border-primary/20 rounded-lg max-h-64 overflow-y-auto shadow-lg">
      <button
        onClick={handleSelectEmpty}
        className="w-full text-left px-3 py-2 hover:bg-primary/10 text-sm text-secondary border-b border-primary/10"
      >
        Document vide
      </button>
      {templates.length === 0 ? (
        <p className="px-3 py-2 text-sm text-secondary">Aucun template disponible</p>
      ) : (
        templates.map((template) => (
          <TemplateOptionItem
            key={template.id_template}
            template={template}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  );
};

const CreateDocumentModal = ({ investigationId, slug, onClose, onCreated }: CreateModalProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(DEFAULT_DOCUMENT_TITLE);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      const data = await api.listTemplates();
      setTemplates(data.templates);
    };
    loadTemplates().catch(() => {
    });
  }, []);

  const selectedTemplate = useMemo(() => {
    const found = templates.find((t) => t.id_template === selectedTemplateId);
    return found ?? null;
  }, [templates, selectedTemplateId]);

  const handleSelectTemplate = (id: number | null) => {
    setSelectedTemplateId(id);
    setShowTemplates(false);
  };

  const handleToggleTemplates = () => {
    setShowTemplates((current) => !current);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    setCreating(true);
    try {
      const doc = await api.createDocument(investigationId, {
        title: trimmedTitle,
        id_template: selectedTemplateId,
      });
      toast('success', TOAST_DOCUMENT_CREATED);
      onCreated();
      window.location.href = buildDocumentLink(slug, doc.id_document);
    } catch (err) {
      const message = getErrorMessage(err, TOAST_GENERIC_ERROR_FALLBACK);
      toast('error', message);
    } finally {
      setCreating(false);
    }
  };

  const handleBackdropClick = () => {
    onClose();
  };

  const handleStopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const trimmedTitle = title.trim();
  const isCreateDisabled = creating || !trimmedTitle;

  let selectedLabel: string;
  if (selectedTemplate) {
    selectedLabel = selectedTemplate.name;
  } else {
    selectedLabel = 'Document vide';
  }

  let selectedLabelClass: string;
  if (selectedTemplate) {
    selectedLabelClass = '';
  } else {
    selectedLabelClass = 'text-secondary';
  }

  let chevronClass: string;
  if (showTemplates) {
    chevronClass = 'rotate-180';
  } else {
    chevronClass = '';
  }

  let createButtonLabel: string;
  if (creating) {
    createButtonLabel = '…';
  } else {
    createButtonLabel = 'Créer';
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#1a1a2e] border border-primary/20 rounded-xl p-6 w-full max-w-lg"
        onClick={handleStopPropagation}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-accent">Nouveau document</h3>
          <button onClick={onClose} className="text-secondary hover:text-accent transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-secondary mb-1.5">Titre</label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              autoFocus
              maxLength={255}
              className="w-full bg-dark border border-primary/20 rounded-lg px-3 py-2 text-accent focus:outline-none focus:border-primary"
            />
          </div>

          <div className="relative">
            <label className="block text-sm text-secondary mb-1.5">
              À partir d'un template (optionnel)
            </label>
            <button
              onClick={handleToggleTemplates}
              className="w-full bg-dark border border-primary/20 rounded-lg px-3 py-2 text-left text-accent hover:border-primary/40 transition-colors flex items-center justify-between"
            >
              <span className={selectedLabelClass}>{selectedLabel}</span>
              <ChevronDown size={14} className={`transition-transform ${chevronClass}`} />
            </button>
            {showTemplates && (
              <TemplateDropdown templates={templates} onSelect={handleSelectTemplate} />
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-dark border border-primary/20 text-secondary hover:text-accent transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreateDisabled}
              className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {createButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
