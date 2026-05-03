import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { FileText, Plus, Pencil, Trash2, X, Globe, Lock, Search } from 'lucide-react';
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

interface FormValues {
  name: string;
  description: string;
  contentHtml: string;
  isPublic: boolean;
}

interface SubmitPayload {
  name: string;
  description: string;
  content_html: string;
  is_public: boolean;
}


const UNKNOWN_AUTHOR_LABEL = 'auteur supprimé';
const TOAST_LOAD_ERROR_FALLBACK = 'Erreur de chargement';
const TOAST_GENERIC_ERROR_FALLBACK = 'Erreur';
const TOAST_TEMPLATE_DELETED = 'Template supprimé';
const TOAST_TEMPLATE_CREATED = 'Template créé';
const TOAST_TEMPLATE_UPDATED = 'Template modifié';
const SUBMIT_ERROR_FALLBACK = 'An error occurred';

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

const buildAuthorPart = (pseudo: string | null): string => {
  if (pseudo) {
    return `par ${pseudo}`;
  }
  return UNKNOWN_AUTHOR_LABEL;
};

const buildAuthorLine = (template: TemplateData): string => {
  const authorPart = buildAuthorPart(template.created_by_pseudo);
  if (!template.updated_at) {
    return authorPart;
  }
  const relativeDate = formatRelativeDate(template.updated_at);
  return `${authorPart} · ${relativeDate}`;
};

const matchesSearchQuery = (template: TemplateData, query: string): boolean => {
  const lowerName = template.name.toLowerCase();
  const lowerDesc = template.description.toLowerCase();
  return lowerName.includes(query) || lowerDesc.includes(query);
};

const isMyTemplate = (template: TemplateData): boolean => {
  return template.is_owner;
};

const isPublicTemplate = (template: TemplateData): boolean => {
  if (template.is_owner) {
    return false;
  }
  return template.is_public;
};

const confirmTemplateDeletion = (template: TemplateData): boolean => {
  return confirm(`Supprimer le template "${template.name}" ?`);
};

const getVisibilityTitle = (isPublic: boolean): string => {
  if (isPublic) {
    return 'Public';
  }
  return 'Privé';
};

const getInitialFormValues = (template?: FullTemplate): FormValues => {
  if (!template) {
    return { name: '', description: '', contentHtml: '', isPublic: false };
  }
  return {
    name: template.name,
    description: template.description,
    contentHtml: template.content_html,
    isPublic: template.is_public,
  };
};

const getModalTitle = (isEditMode: boolean): string => {
  if (isEditMode) {
    return 'Modifier le template';
  }
  return 'Nouveau template';
};

const getSubmitLabel = (isEditMode: boolean): string => {
  if (isEditMode) {
    return 'Enregistrer';
  }
  return 'Créer';
};

const getSubmitButtonLabel = (loading: boolean, submitLabel: string): string => {
  if (loading) {
    return '…';
  }
  return submitLabel;
};

const buildSubmitPayload = (
  name: string,
  description: string,
  contentHtml: string,
  isPublic: boolean,
): SubmitPayload => ({
  name,
  description,
  content_html: contentHtml,
  is_public: isPublic,
});


interface VisibilityIconProps {
  isPublic: boolean;
  size: number;
}

const VisibilityIcon = ({ isPublic, size }: VisibilityIconProps) => {
  if (isPublic) {
    return <Globe size={size} />;
  }
  return <Lock size={size} />;
};

interface FormErrorProps {
  message: string;
}

const FormError = ({ message }: FormErrorProps) => {
  if (!message) {
    return null;
  }
  return <p className="text-red-400 text-sm">{message}</p>;
};

interface TemplateDescriptionProps {
  description: string;
}

const TemplateDescription = ({ description }: TemplateDescriptionProps) => {
  if (!description) {
    return null;
  }
  return <p className="text-sm text-secondary mb-3 line-clamp-2">{description}</p>;
};

interface TemplateCardActionsProps {
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const TemplateCardActions = ({ canEdit, onEdit, onDelete }: TemplateCardActionsProps) => {
  if (!canEdit) {
    return null;
  }
  return (
    <div className="flex gap-1">
      <button
        onClick={onEdit}
        className="p-1 text-secondary hover:text-accent transition-colors"
        title="Modifier"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={onDelete}
        className="p-1 text-secondary hover:text-red-400 transition-colors"
        title="Supprimer"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

interface ModalProps {
  template?: FullTemplate;
  onClose: () => void;
  onSave: () => void;
}

const TemplateFormModal = ({ template, onClose, onSave }: ModalProps) => {
  const initialValues = getInitialFormValues(template);
  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);
  const [contentHtml, setContentHtml] = useState(initialValues.contentHtml);
  const [isPublic, setIsPublic] = useState(initialValues.isPublic);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = Boolean(template);
  const modalTitle = getModalTitle(isEditMode);
  const submitLabel = getSubmitLabel(isEditMode);
  const submitButtonLabel = getSubmitButtonLabel(loading, submitLabel);
  const trimmedName = name.trim();
  const isNameEmpty = trimmedName.length === 0;
  const isSubmitDisabled = loading || isNameEmpty;

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value);
  };

  const handleVisibilityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsPublic(event.target.checked);
  };

  const submitTemplate = async () => {
    const payload = buildSubmitPayload(name, description, contentHtml, isPublic);
    if (template) {
      await api.updateTemplate(template.id_template, payload);
      return;
    }
    await api.createTemplate(payload);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitTemplate();
      onSave();
    } catch (err) {
      const message = getErrorMessage(err, SUBMIT_ERROR_FALLBACK);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = () => {
    onClose();
  };

  const handleStopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#1a1a2e] border border-primary/20 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={handleStopPropagation}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-accent">{modalTitle}</h3>
          <button onClick={onClose} className="text-secondary hover:text-accent transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-secondary mb-1.5">Nom</label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              required
              minLength={1}
              maxLength={255}
              className="w-full bg-dark border border-primary/20 rounded-lg px-3 py-2 text-accent focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={handleDescriptionChange}
              maxLength={2000}
              placeholder="Bref descriptif (optionnel)"
              className="w-full bg-dark border border-primary/20 rounded-lg px-3 py-2 text-accent focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1.5">Contenu</label>
            <TemplateEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder="Rédigez le contenu du template…"
              minHeight="280px"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={handleVisibilityChange}
              className="rounded"
            />
            <span className="text-sm text-secondary inline-flex items-center gap-1.5">
              <VisibilityIcon isPublic={isPublic} size={14} />
              Rendre public (visible par tous les utilisateurs)
            </span>
          </label>

          <FormError message={error} />

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-dark border border-primary/20 text-secondary hover:text-accent transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {submitButtonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


interface CardProps {
  template: TemplateData;
  onEdit: (id: number) => void;
  onDelete: (template: TemplateData) => void;
  canEdit?: boolean;
}

const TemplateCard = ({ template, onEdit, onDelete, canEdit = false }: CardProps) => {
  const visibilityTitle = getVisibilityTitle(template.is_public);
  const authorLine = buildAuthorLine(template);

  const handleEditClick = () => {
    onEdit(template.id_template);
  };

  const handleDeleteClick = () => {
    onDelete(template);
  };

  return (
    <div className="bg-[#1a1a2e] border border-primary/20 rounded-lg p-4 hover:border-primary/40 transition-colors flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-accent leading-tight">{template.name}</h3>
        <span className="text-xs inline-flex items-center gap-1 text-secondary" title={visibilityTitle}>
          <VisibilityIcon isPublic={template.is_public} size={12} />
        </span>
      </div>

      <TemplateDescription description={template.description} />

      <div className="text-xs text-secondary mt-auto pt-2 border-t border-primary/10 flex items-center justify-between gap-2">
        <span>{authorLine}</span>
        <TemplateCardActions
          canEdit={canEdit}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      </div>
    </div>
  );
};

interface TemplateGridProps {
  templates: TemplateData[];
  emptyLabel: string;
  canEdit?: boolean;
  onEdit: (id: number) => void;
  onDelete: (template: TemplateData) => void;
}

const TemplateGrid = ({
  templates,
  emptyLabel,
  canEdit = false,
  onEdit,
  onDelete,
}: TemplateGridProps) => {
  if (templates.length === 0) {
    return <p className="text-secondary text-sm py-4">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id_template}
          template={template}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
};

interface PublicTemplatesSectionProps {
  templates: TemplateData[];
  onEdit: (id: number) => void;
  onDelete: (template: TemplateData) => void;
}

const PublicTemplatesSection = ({ templates, onEdit, onDelete }: PublicTemplatesSectionProps) => {
  if (templates.length === 0) {
    return null;
  }
  return (
    <section>
      <h2 className="text-lg font-semibold text-accent mb-3">
        Templates publics ({templates.length})
      </h2>
      <TemplateGrid templates={templates} emptyLabel="" onEdit={onEdit} onDelete={onDelete} />
    </section>
  );
};

interface TemplatesContentProps {
  loading: boolean;
  myTemplates: TemplateData[];
  publicTemplates: TemplateData[];
  onEdit: (id: number) => void;
  onDelete: (template: TemplateData) => void;
}

const TemplatesContent = ({
  loading,
  myTemplates,
  publicTemplates,
  onEdit,
  onDelete,
}: TemplatesContentProps) => {
  if (loading) {
    return <p className="text-secondary text-center py-8">Chargement...</p>;
  }
  return (
    <>
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-accent mb-3">
          Mes templates ({myTemplates.length})
        </h2>
        <TemplateGrid
          templates={myTemplates}
          emptyLabel="Vous n'avez créé aucun template."
          canEdit
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </section>
      <PublicTemplatesSection
        templates={publicTemplates}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
};


interface TemplateModalProps {
  show: boolean;
  template: FullTemplate | undefined;
  onClose: () => void;
  onSave: () => void;
}

const TemplateModal = ({ show, template, onClose, onSave }: TemplateModalProps) => {
  if (!show) {
    return null;
  }
  return <TemplateFormModal template={template} onClose={onClose} onSave={onSave} />;
};


export const Templates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<FullTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listTemplates();
      setTemplates(data.templates);
    } catch (err) {
      const message = getErrorMessage(err, TOAST_LOAD_ERROR_FALLBACK);
      toast('error', message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) {
      return templates;
    }
    return templates.filter((template) => matchesSearchQuery(template, query));
  }, [templates, search]);

  const myTemplates = useMemo(() => filtered.filter(isMyTemplate), [filtered]);
  const publicTemplates = useMemo(() => filtered.filter(isPublicTemplate), [filtered]);

  const handleOpenCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const full = await api.getTemplate(id);
      setEditing(full);
      setShowModal(true);
    } catch (err) {
      const message = getErrorMessage(err, TOAST_GENERIC_ERROR_FALLBACK);
      toast('error', message);
    }
  };

  const handleDelete = async (template: TemplateData) => {
    if (!confirmTemplateDeletion(template)) {
      return;
    }
    try {
      await api.deleteTemplate(template.id_template);
      toast('success', TOAST_TEMPLATE_DELETED);
      fetchTemplates();
    } catch (err) {
      const message = getErrorMessage(err, TOAST_GENERIC_ERROR_FALLBACK);
      toast('error', message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSaved = () => {
    let successMessage: string;
    if (editing) {
      successMessage = TOAST_TEMPLATE_UPDATED;
    } else {
      successMessage = TOAST_TEMPLATE_CREATED;
    }
    setShowModal(false);
    setEditing(null);
    toast('success', successMessage);
    fetchTemplates();
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  let editingTemplate: FullTemplate | undefined;
  if (editing) {
    editingTemplate = editing;
  }

  return (
    <Layout>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-accent flex items-center gap-2">
              <FileText size={28} />
              Templates
            </h1>
            <p className="text-secondary mt-1">Modèles de documents réutilisables</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> Nouveau
          </button>
        </div>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Rechercher un template..."
            className="w-full bg-dark border border-primary/20 rounded-lg pl-9 pr-3 py-2 text-accent placeholder-secondary focus:outline-none focus:border-primary"
          />
        </div>

        <TemplatesContent
          loading={loading}
          myTemplates={myTemplates}
          publicTemplates={publicTemplates}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />

        <TemplateModal
          show={showModal}
          template={editingTemplate}
          onClose={handleCloseModal}
          onSave={handleSaved}
        />
      </div>
    </Layout>
  );
};
