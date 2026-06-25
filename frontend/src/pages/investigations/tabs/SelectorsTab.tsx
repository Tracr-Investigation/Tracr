import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Crosshair, Plus, Trash2, Tag, X, Search, Loader2,
  ScanSearch, ChevronDown, ChevronRight, ExternalLink, Target, AlertTriangle, FileText, Clock,
} from 'lucide-react';
import { api, type SelectorData, type SelectorTypeOption, type HitsResult, type SelectorHit } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { formatRelativeDate } from '../../../utils/date';

interface Props {
  investigationId: number;
  userPermission: string | null;
  /** Opens a source in the Sources tab (slide panel). */
  onOpenSource?: (sourceId: number) => void;
}

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

const canWrite = (permission: string | null) =>
  permission === 'owner' || permission === 'manager' || permission === 'editeur';

const canDeleteSelector = (
  selector: SelectorData,
  permission: string | null,
  currentUserId: number | null,
) => permission === 'owner' || selector.created_by === currentUserId;

// ── Formulaire d'ajout ──────────────────────────────────────────────────────

const AddSelectorForm = ({
  types, onCreate,
}: {
  types: SelectorTypeOption[];
  onCreate: (body: { selector_type: string; value: string; label?: string | null; notes?: string | null }) => Promise<void>;
}) => {
  const [selectorType, setSelectorType] = useState('email');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate({
        selector_type: selectorType,
        value: value.trim(),
        label: label.trim() || null,
        notes: notes.trim() || null,
      });
      setValue('');
      setLabel('');
      setNotes('');
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-card/30 border border-border-subtle rounded-xl p-3 mb-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selectorType}
          onChange={(e) => setSelectorType(e.target.value)}
          className="bg-input-bg border border-border-subtle rounded-lg px-2.5 py-2 text-sm text-text-default focus:outline-none focus:border-[var(--theme-primary)] sm:w-56 shrink-0"
        >
          {types.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Valeur à rechercher (email, pseudo, téléphone…)"
          className="flex-1 bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-default placeholder:text-text-dim focus:outline-none focus:border-[var(--theme-primary)]"
        />
        <button
          type="submit"
          disabled={!value.trim() || saving}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{ background: 'var(--theme-primary)' }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Ajouter
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Libellé (optionnel) - ex. « compte principal »"
            className="sm:w-56 shrink-0 bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-default placeholder:text-text-dim focus:outline-none focus:border-[var(--theme-primary)]"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optionnel)"
            className="flex-1 bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-default placeholder:text-text-dim focus:outline-none focus:border-[var(--theme-primary)]"
          />
        </div>
      )}
    </form>
  );
};

// ── Selector row ──────────────────────────────────────────────────────────────

const SelectorRow = ({
  selector, canDelete, onDelete, hitInfo,
}: {
  selector: SelectorData;
  canDelete: boolean;
  onDelete: (s: SelectorData) => void;
  hitInfo?: { source_count: number; hit_count: number };
}) => (
  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card/20 border border-border-subtle hover:border-border transition-colors group">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim px-1.5 py-0.5 rounded bg-input-bg border border-border-subtle shrink-0 w-32 text-center truncate" title={selector.selector_type_label}>
      {selector.selector_type_label}
    </span>
    <div className="min-w-0 flex-1">
      <span className="font-mono text-sm text-text-default break-all">{selector.value}</span>
      {selector.label && (
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-text-dim">
          <Tag size={10} /> {selector.label}
        </span>
      )}
      {selector.notes && (
        <p className="text-xs text-text-dim mt-0.5 truncate" title={selector.notes}>{selector.notes}</p>
      )}
    </div>
    {hitInfo && hitInfo.source_count > 0 && (
      <span
        className="inline-flex items-center gap-1 shrink-0 text-[11px] font-semibold text-[var(--theme-primary)] px-1.5 py-0.5 rounded bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30"
        title={`${hitInfo.hit_count} occurrence(s) dans ${hitInfo.source_count} source(s)`}
      >
        <Target size={11} /> {hitInfo.source_count} · {hitInfo.hit_count}
      </span>
    )}
    <span className="text-[11px] text-text-dim shrink-0 hidden sm:block">
      {selector.created_at ? formatRelativeDate(selector.created_at) : ''}
      {selector.created_by_pseudo && ` · ${selector.created_by_pseudo}`}
    </span>
    {canDelete && (
      <button
        onClick={() => onDelete(selector)}
        className="p-1 text-text-dim hover:text-red-400 transition-colors rounded opacity-0 group-hover:opacity-100 shrink-0"
        title="Supprimer le sélecteur"
      >
        <Trash2 size={14} />
      </button>
    )}
  </div>
);

// ── Analysis results (hits) ───────────────────────────────────────────────────

const HitCard = ({ hit, onOpenSource }: { hit: SelectorHit; onOpenSource?: (id: number) => void }) => {
  const [open, setOpen] = useState(false);
  const has = hit.source_count > 0;

  return (
    <div className={`rounded-lg border transition-colors ${has ? 'border-[var(--theme-primary)]/40 bg-[var(--theme-primary)]/5' : 'border-border-subtle bg-card/10'}`}>
      <button
        onClick={() => has && setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${has ? '' : 'cursor-default'}`}
      >
        {has ? (
          open ? <ChevronDown size={14} className="text-text-dim shrink-0" /> : <ChevronRight size={14} className="text-text-dim shrink-0" />
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim px-1.5 py-0.5 rounded bg-input-bg border border-border-subtle shrink-0 w-28 text-center truncate">
          {hit.selector.selector_type_label}
        </span>
        <span className="font-mono text-sm text-text-default break-all min-w-0 flex-1">{hit.selector.value}</span>
        {has ? (
          <span className="inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold text-[var(--theme-primary)]">
            <Target size={13} />
            {hit.source_count} source{hit.source_count > 1 ? 's' : ''} · {hit.hit_count} occ.
          </span>
        ) : (
          <span className="text-xs text-text-dim shrink-0">Aucun hit</span>
        )}
      </button>

      {open && has && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border-subtle/60">
          {hit.sources.map((s) => (
            <div key={s.id_source} className="text-xs">
              <div className="flex items-center gap-1.5 text-text-default">
                <FileText size={11} className="text-text-dim shrink-0" />
                <button
                  onClick={() => onOpenSource?.(s.id_source)}
                  className="font-medium truncate text-left hover:text-[var(--theme-primary)] hover:underline transition-colors min-w-0"
                  title="Ouvrir la source dans Tracr"
                >
                  {s.title}
                </button>
                <span className="text-text-dim shrink-0">· {s.occurrences} occ.</span>
                {s.source_url && (
                  <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-text-dim hover:text-[var(--theme-primary)] shrink-0" title={s.source_url}>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              {s.snippet && (
                <p className="mt-0.5 ml-[18px] text-text-dim font-mono text-[11px] bg-input-bg rounded px-2 py-1 break-words">
                  {s.snippet}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const HitsResults = ({ result, onClose, onOpenSource }: { result: HitsResult; onClose: () => void; onOpenSource?: (id: number) => void }) => {
  const withHits = result.hits.filter((h) => h.source_count > 0);
  return (
    <div className="mb-5 rounded-xl border border-border-subtle bg-card/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-text-default inline-flex items-center gap-2">
          <ScanSearch size={15} style={{ color: 'var(--theme-primary)' }} />
          Résultats de l'analyse
        </h4>
        <button onClick={onClose} className="text-text-dim hover:text-text-default" title="Fermer"><X size={15} /></button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-dim mb-3">
        <span><strong className="text-text-default">{withHits.length}</strong> sélecteur(s) avec hit</span>
        {result.analyzed_sources !== null && (
          <span><strong className="text-text-default">{result.analyzed_sources}</strong>/{result.total_sources} sources analysées</span>
        )}
        {!!result.pending_ocr_sources && result.pending_ocr_sources > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <AlertTriangle size={12} />
            {result.pending_ocr_sources} image(s) non analysée(s) (OCR requis)
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock size={12} />
          {result.computed_at
            ? <>Dernière analyse {formatRelativeDate(result.computed_at)}</>
            : 'Jamais analysé'}
        </span>
      </div>

      {result.hits.length === 0 ? (
        <p className="text-text-dim text-sm py-2">Aucun sélecteur à confronter.</p>
      ) : (
        <div className="space-y-1.5">
          {result.hits.map((h) => <HitCard key={h.selector.id_selector} hit={h} onOpenSource={onOpenSource} />)}
        </div>
      )}
    </div>
  );
};

// ── Tab ─────────────────────────────────────────────────────────────────────

export const SelectorsTab = ({ investigationId, userPermission, onOpenSource }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectors, setSelectors] = useState<SelectorData[]>([]);
  const [types, setTypes] = useState<SelectorTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<HitsResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const currentUserId = user?.id_user ?? null;
  const writable = canWrite(userPermission);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await api.scanHits(investigationId);
      setHits(result);
      toast('success', 'Analyse terminée');
    } catch (err) {
      toast('error', getErrorMessage(err, 'Analyse impossible'));
    } finally {
      setScanning(false);
    }
  }, [investigationId, toast]);

  // On mount, load already-stored hits (last scan) to show matches and the last
  // analysis date without re-running the computation.
  useEffect(() => {
    api.getHits(investigationId)
      .then((result) => { if (result.computed_at || result.hits.some((h) => h.source_count > 0)) setHits(result); })
      .catch(() => { /* non-blocking */ });
  }, [investigationId]);

  // Per-selector summary (id -> counters) to annotate the list.
  const hitMap = useMemo(() => {
    const m = new Map<number, { source_count: number; hit_count: number }>();
    hits?.hits.forEach((h) => m.set(h.selector.id_selector, { source_count: h.source_count, hit_count: h.hit_count }));
    return m;
  }, [hits]);

  const fetchSelectors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listSelectors(investigationId);
      setSelectors(data.selectors);
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  }, [investigationId, toast]);

  useEffect(() => { fetchSelectors(); }, [fetchSelectors]);

  useEffect(() => {
    api.listSelectorTypes()
      .then((d) => setTypes(d.types))
      .catch(() => { /* non-blocking: the type list stays empty */ });
  }, []);

  const handleCreate = useCallback(async (body: { selector_type: string; value: string; label?: string | null; notes?: string | null }) => {
    try {
      const created = await api.createSelector(investigationId, body);
      setSelectors((prev) => [created, ...prev]);
      toast('success', 'Sélecteur ajouté');
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur'));
      throw err;
    }
  }, [investigationId, toast]);

  const handleDelete = async (selector: SelectorData) => {
    if (!confirm(`Supprimer le sélecteur « ${selector.value} » ?`)) return;
    try {
      await api.deleteSelector(selector.id_selector);
      setSelectors((prev) => prev.filter((s) => s.id_selector !== selector.id_selector));
      toast('success', 'Sélecteur supprimé');
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur'));
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selectors;
    return selectors.filter((s) =>
      s.value.toLowerCase().includes(q) ||
      (s.label?.toLowerCase().includes(q) ?? false) ||
      s.selector_type_label.toLowerCase().includes(q),
    );
  }, [selectors, query]);

  return (
    <div className="border-t border-border-subtle pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-default inline-flex items-center gap-2">
          <Crosshair size={16} style={{ color: 'var(--theme-primary)' }} />
          Sélecteurs
          <span className="text-text-dim font-normal text-sm">({selectors.length})</span>
        </h3>
        {selectors.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer…"
                className="bg-input-bg border border-border-subtle rounded-lg pl-7 pr-7 py-1.5 text-xs text-text-default placeholder:text-text-dim focus:outline-none focus:border-[var(--theme-primary)] w-36"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-default">
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={runScan}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 shrink-0"
              style={{ background: 'var(--theme-primary)' }}
              title="Confronter les sélecteurs au texte des sources archivées"
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
              Analyser les sources
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-text-dim mb-4 max-w-2xl">
        Identifiants recherchés dans le cadre de l'enquête (email, pseudo, téléphone, domaine…).
        Ils serviront à détecter automatiquement les correspondances dans le texte des sources archivées.
      </p>

      {writable && types.length > 0 && (
        <AddSelectorForm types={types} onCreate={handleCreate} />
      )}

      {hits && <HitsResults result={hits} onClose={() => setHits(null)} onOpenSource={onOpenSource} />}

      {loading ? (
        <p className="text-text-muted text-sm py-4">Chargement…</p>
      ) : selectors.length === 0 ? (
        <div className="text-center py-12">
          <Crosshair size={28} className="mx-auto text-text-dim mb-3" />
          <p className="text-text-muted text-sm">Aucun sélecteur défini pour cette enquête.</p>
          {writable && <p className="text-text-dim text-xs mt-1">Ajoutez un email, un pseudo ou un numéro pour démarrer.</p>}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-text-muted text-sm py-8 text-center">Aucun sélecteur ne correspond au filtre.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((selector) => (
            <SelectorRow
              key={selector.id_selector}
              selector={selector}
              canDelete={canDeleteSelector(selector, userPermission, currentUserId)}
              onDelete={handleDelete}
              hitInfo={hitMap.get(selector.id_selector)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
