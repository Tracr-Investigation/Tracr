import { useEffect, useState } from 'react';
import { X, FileText, Globe, Lock, Search, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface Template {
  id_template: number;
  name: string;
  description: string;
  is_public: boolean;
  is_owner: boolean;
}

const LOAD_ERROR_FALLBACK = 'Erreur de chargement des templates';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface TemplateCache {
  data: Template[];
  fetchedAt: number;
}

let templateCache: TemplateCache | null = null;

const getCachedTemplates = (): Template[] | null => {
  if (!templateCache) {
    return null;
  }
  if (Date.now() - templateCache.fetchedAt > CACHE_TTL_MS) {
    return null;
  }
  return templateCache.data;
};

const setCachedTemplates = (data: Template[]): void => {
  templateCache = { data, fetchedAt: Date.now() };
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

const matchesSearch = (t: Template, query: string): boolean => {
  if (!query) {
    return true;
  }
  const lower = query.toLowerCase();
  return t.name.toLowerCase().includes(lower) || t.description.toLowerCase().includes(lower);
};

const getEmptyMessage = (hasSearch: boolean): string => {
  if (hasSearch) {
    return 'Aucun template ne correspond';
  }
  return 'Aucun template disponible';
};

interface VisibilityBadgeProps {
  isPublic: boolean;
  isOwner: boolean;
}

const VisibilityBadge = ({ isPublic, isOwner }: VisibilityBadgeProps) => {
  if (isPublic) {
    return <Globe size={11} className="text-secondary flex-shrink-0" />;
  }
  if (isOwner) {
    return <Lock size={11} className="text-secondary flex-shrink-0" />;
  }
  return null;
};

interface TemplateItemIconProps {
  inserting: boolean;
  isPublic: boolean;
  isOwner: boolean;
}

const TemplateItemIcon = ({ inserting, isPublic, isOwner }: TemplateItemIconProps) => {
  if (inserting) {
    return <Loader2 size={11} className="text-secondary animate-spin flex-shrink-0" />;
  }
  return <VisibilityBadge isPublic={isPublic} isOwner={isOwner} />;
};

interface TemplateItemDescriptionProps {
  description: string;
}

const TemplateItemDescription = ({ description }: TemplateItemDescriptionProps) => {
  if (!description) {
    return null;
  }
  return <p className="text-xs text-secondary line-clamp-2">{description}</p>;
};

interface TemplateItemProps {
  template: Template;
  inserting: boolean;
  onSelect: (id: number) => void;
}

const TemplateItem = ({ template, inserting, onSelect }: TemplateItemProps) => {
  const handleClick = () => {
    onSelect(template.id_template);
  };

  return (
    <button
      onClick={handleClick}
      disabled={inserting}
      className="text-left bg-dark border border-primary/20 rounded-lg p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-wait"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-semibold text-accent text-sm flex-1 min-w-0 truncate">
          {template.name}
        </span>
        <TemplateItemIcon
          inserting={inserting}
          isPublic={template.is_public}
          isOwner={template.is_owner}
        />
      </div>
      <TemplateItemDescription description={template.description} />
    </button>
  );
};

interface TemplateGridProps {
  templates: Template[];
  insertingId: number | null;
  onSelect: (id: number) => void;
}

const TemplateGrid = ({ templates, insertingId, onSelect }: TemplateGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {templates.map((t) => (
        <TemplateItem
          key={t.id_template}
          template={t}
          inserting={insertingId === t.id_template}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

interface TemplateListContentProps {
  loading: boolean;
  templates: Template[];
  emptyMessage: string;
  insertingId: number | null;
  onSelect: (id: number) => void;
}

const TemplateListContent = ({
  loading,
  templates,
  emptyMessage,
  insertingId,
  onSelect,
}: TemplateListContentProps) => {
  if (loading) {
    return <p className="text-secondary text-sm py-8 text-center">Chargement…</p>;
  }
  if (templates.length === 0) {
    return <p className="text-secondary text-sm py-8 text-center">{emptyMessage}</p>;
  }
  return <TemplateGrid templates={templates} insertingId={insertingId} onSelect={onSelect} />;
};

// Modale principale 

interface Props {
  onClose: () => void;
  onSelect: (templateId: number) => Promise<void>;
}

export const TemplatePickerModal = ({ onClose, onSelect }: Props) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [insertingId, setInsertingId] = useState<number | null>(null);

  useEffect(() => {
    const cached = getCachedTemplates();
    if (cached) {
      setTemplates(cached);
      setLoading(false);
      return;
    }
    api.listTemplates()
      .then((d) => {
        setCachedTemplates(d.templates);
        setTemplates(d.templates);
      })
      .catch((err) => toast('error', getErrorMessage(err, LOAD_ERROR_FALLBACK)))
      .finally(() => setLoading(false));
  }, [toast]);

  // Fermeture sur Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const hasSearch = Boolean(search.trim());
  const filtered = templates.filter((t) => matchesSearch(t, search));
  const emptyMessage = getEmptyMessage(hasSearch);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleBackdropClick = () => {
    onClose();
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleTemplateSelect = async (id: number) => {
    setInsertingId(id);
    try {
      await onSelect(id);
    } finally {
      setInsertingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#1a1a2e] border border-primary/20 rounded-xl p-5 w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={handleContainerClick}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-accent inline-flex items-center gap-2">
            <FileText size={16} /> Insérer un template
          </h3>
          <button onClick={onClose} className="text-secondary hover:text-accent transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Rechercher..."
            autoFocus
            className="w-full bg-dark border border-primary/20 rounded-lg pl-9 pr-3 py-1.5 text-sm text-accent placeholder-secondary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <TemplateListContent
            loading={loading}
            templates={filtered}
            emptyMessage={emptyMessage}
            insertingId={insertingId}
            onSelect={handleTemplateSelect}
          />
        </div>

        <p className="text-xs text-secondary mt-3 pt-3 border-t border-primary/10">
          Le contenu du template sera inséré à la position du curseur.
        </p>
      </div>
    </div>
  );
};
