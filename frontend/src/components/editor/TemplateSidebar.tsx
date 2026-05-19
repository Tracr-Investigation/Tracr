import { useState, useEffect } from 'react';
import { X, Search, FileText, GripVertical } from 'lucide-react';
import { api } from '../../services/api';
import type { TemplateData, TemplateCategoryData } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache: { templates: TemplateData[]; categories: TemplateCategoryData[]; at: number } | null = null;

// ── Template item ─────────────────────────────────────────────────────────────

const TemplateItem = ({
  template,
  inserting,
  dragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  template: TemplateData;
  inserting: boolean;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) => (
  <div
    draggable
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onClick={onClick}
    className={`
      group relative rounded-xl border p-3 select-none
      transition-all duration-150
      ${inserting ? 'opacity-60 cursor-wait' : 'cursor-grab active:cursor-grabbing'}
      ${dragging ? 'opacity-30 scale-95' : ''}
      border-border-subtle bg-input-bg hover:border-border hover:bg-card/60
    `}
  >
    <div className="flex items-start gap-2">
      <GripVertical
        size={12}
        className="text-text-dim mt-0.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-text-default truncate leading-tight">
          {template.name}
        </p>
        {template.description && (
          <p className="text-[10px] text-text-dim truncate mt-0.5 leading-tight">
            {template.description}
          </p>
        )}
        {template.category && (
          <span
            className="inline-flex items-center mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              background: `${template.category.color ?? 'var(--theme-primary)'}15`,
              color: template.category.color ?? 'var(--theme-primary)',
            }}
          >
            {template.category.name}
          </span>
        )}
      </div>
    </div>
    <p className="text-[9px] text-text-dim mt-2 opacity-0 group-hover:opacity-60 transition-opacity">
      Glisser dans l'éditeur ou cliquer
    </p>
  </div>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (templateId: number) => Promise<void>;
}

export const TemplateSidebar = ({ open, onClose, onInsert }: Props) => {
  const { toast } = useToast();
  const [templates, setTemplates]   = useState<TemplateData[]>([]);
  const [categories, setCategories] = useState<TemplateCategoryData[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState<number | null>(null);
  const [insertingId, setInsertingId] = useState<number | null>(null);
  const [draggingId, setDraggingId]   = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');

    if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
      setTemplates(_cache.templates);
      setCategories(_cache.categories);
      return;
    }

    setLoading(true);
    Promise.all([api.listTemplates(), api.listTemplateCategories()])
      .then(([tRes, cRes]) => {
        _cache = { templates: tRes.templates, categories: cRes.categories, at: Date.now() };
        setTemplates(tRes.templates);
        setCategories(cRes.categories);
      })
      .catch(err => toast('error', err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [open, toast]);

  const filtered = templates.filter(t => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    const matchCat = filterCat === null || t.category?.id_category_template === filterCat;
    return matchSearch && matchCat;
  });

  const handleInsert = async (id: number) => {
    setInsertingId(id);
    try {
      await onInsert(id);
    } finally {
      setInsertingId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, template: TemplateData) => {
    e.dataTransfer.setData('application/tracr-template-id', String(template.id_template));
    e.dataTransfer.setData('text/plain', template.name);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingId(template.id_template);
  };

  return (
    <div
      className={`
        h-full flex flex-col bg-card border-r border-border-subtle shrink-0
        transition-all duration-300 overflow-hidden
        ${open ? 'w-72' : 'w-0'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle shrink-0">
        <h3 className="text-sm font-bold text-text-default flex items-center gap-2">
          <FileText size={13} className="text-primary" />
          Templates
        </h3>
        <button
          onClick={onClose}
          className="text-text-dim hover:text-text-default transition-colors p-1 rounded-lg hover:bg-primary/5"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full bg-input-bg border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
          />
        </div>
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-1 shrink-0">
          <button
            onClick={() => setFilterCat(null)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
              filterCat === null
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border-subtle text-text-dim hover:border-border'
            }`}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat.id_category_template}
              onClick={() => setFilterCat(filterCat === cat.id_category_template ? null : cat.id_category_template)}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all"
              style={
                filterCat === cat.id_category_template
                  ? {
                      borderColor: cat.color ?? 'var(--theme-primary)',
                      background: `${cat.color ?? 'var(--theme-primary)'}15`,
                      color: cat.color ?? 'var(--theme-primary)',
                    }
                  : { borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-dim)' }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-1.5">
        {loading ? (
          <p className="text-xs text-text-dim text-center py-8">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-text-dim text-center py-8">
            {search ? 'Aucun résultat' : 'Aucun template'}
          </p>
        ) : (
          filtered.map(template => (
            <TemplateItem
              key={template.id_template}
              template={template}
              inserting={insertingId === template.id_template}
              dragging={draggingId === template.id_template}
              onDragStart={e => handleDragStart(e, template)}
              onDragEnd={() => setDraggingId(null)}
              onClick={() => handleInsert(template.id_template)}
            />
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-border-subtle shrink-0">
        <p className="text-[10px] text-text-dim leading-relaxed">
          Faites glisser un template dans l'éditeur pour l'insérer à l'endroit souhaité.
        </p>
      </div>
    </div>
  );
};
