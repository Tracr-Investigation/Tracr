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
  if (!templateCache) return null;
  if (Date.now() - templateCache.fetchedAt > CACHE_TTL_MS) return null;
  return templateCache.data;
};

const setCachedTemplates = (data: Template[]): void => {
  templateCache = { data, fetchedAt: Date.now() };
};

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

const matchesSearch = (t: Template, query: string): boolean => {
  if (!query) return true;
  const lower = query.toLowerCase();
  return t.name.toLowerCase().includes(lower) || t.description.toLowerCase().includes(lower);
};

// ── Sub-components ────────────────────────────────────────────────────────────

const VisibilityBadge = ({ isPublic, isOwner }: { isPublic: boolean; isOwner: boolean }) => {
  if (isPublic) return <Globe size={11} className="text-text-dim flex-shrink-0" />;
  if (isOwner) return <Lock size={11} className="text-text-dim flex-shrink-0" />;
  return null;
};

const TemplateItem = ({
  template,
  inserting,
  onSelect,
}: {
  template: Template;
  inserting: boolean;
  onSelect: (id: number) => void;
}) => (
  <button
    onClick={() => onSelect(template.id_template)}
    disabled={inserting}
    className="text-left bg-input-bg border border-border-subtle rounded-xl p-3 hover:border-border hover:bg-card/60 transition-all disabled:opacity-50 disabled:cursor-wait"
  >
    <div className="flex items-center gap-1.5 mb-1">
      <span className="font-semibold text-text-default text-sm flex-1 min-w-0 truncate">
        {template.name}
      </span>
      {inserting
        ? <Loader2 size={11} className="text-text-dim animate-spin flex-shrink-0" />
        : <VisibilityBadge isPublic={template.is_public} isOwner={template.is_owner} />
      }
    </div>
    {template.description && (
      <p className="text-xs text-text-muted line-clamp-2">{template.description}</p>
    )}
  </button>
);

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: number) => Promise<void>;
}

export const TemplatePickerModal = ({ open, onClose, onSelect }: Props) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [insertingId, setInsertingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    const cached = getCachedTemplates();
    if (cached) {
      setTemplates(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.listTemplates()
      .then((d) => { setCachedTemplates(d.templates); setTemplates(d.templates); })
      .catch((err) => toast('error', getErrorMessage(err, LOAD_ERROR_FALLBACK)))
      .finally(() => setLoading(false));
  }, [open, toast]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const filtered = templates.filter((t) => matchesSearch(t, search));

  const handleSelect = async (id: number) => {
    setInsertingId(id);
    try {
      await onSelect(id);
    } finally {
      setInsertingId(null);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[45] lg:hidden" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[560px] z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <h2 className="text-base font-bold text-text-default flex items-center gap-2.5">
            <FileText size={16} className="text-primary" />
            Insérer un template
          </h2>
          <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              autoFocus={open}
              className="w-full bg-input-bg border border-border-subtle rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loading ? (
            <p className="text-text-muted text-sm py-10 text-center">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-text-muted text-sm py-10 text-center">
              {search.trim() ? 'Aucun template ne correspond' : 'Aucun template disponible'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map((t) => (
                <TemplateItem
                  key={t.id_template}
                  template={t}
                  inserting={insertingId === t.id_template}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle shrink-0">
          <p className="text-xs text-text-dim">
            Le contenu du template sera inséré à la position du curseur.
          </p>
        </div>
      </div>
    </>
  );
};
