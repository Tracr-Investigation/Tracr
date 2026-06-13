import { useState, useEffect, useCallback, useMemo, createElement } from 'react';
import {
  Archive, Camera, FileCode, Film, Image as ImageIcon, FileQuestion,
  Download, Trash2, Eye, X, ExternalLink, ShieldCheck, Copy, Check, Clock, Filter, History,
} from 'lucide-react';
import { api, type SourceData, type SourceType } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { formatRelativeDate } from '../../../utils/date';
import { ArchivedPageViewer } from './ArchivedPageViewer';
import { ExtensionInstallCard } from './ExtensionInstallCard';

interface Props {
  investigationId: number;
  userPermission: string | null;
}

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

const canDeleteSource = (
  source: SourceData,
  permission: string | null,
  currentUserId: number | null,
) => permission === 'owner' || source.created_by === currentUserId;

const TYPE_META: Record<SourceType, { label: string; icon: typeof Camera }> = {
  page_screenshot: { label: 'Capture', icon: Camera },
  page_mhtml: { label: 'Page (MHTML)', icon: FileCode },
  media: { label: 'Média', icon: ImageIcon },
  web_archive: { label: 'Page archivée', icon: History },
};

type TypeFilter = 'all' | SourceType;
const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'page_screenshot', label: 'Captures' },
  { id: 'page_mhtml', label: 'Pages MHTML' },
  { id: 'web_archive', label: 'Archives' },
  { id: 'media', label: 'Médias' },
];

function iconForSource(source: SourceData): typeof Camera {
  if (source.source_type === 'media') {
    if (source.mime_type.startsWith('video/')) return Film;
    if (source.mime_type.startsWith('image/')) return ImageIcon;
    return FileQuestion;
  }
  return TYPE_META[source.source_type]?.icon ?? FileQuestion;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function hostOf(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Vignette (aperçu direct des images) ───────────────────────────────────────

const SourceThumb = ({ source, onClick }: { source: SourceData; onClick: () => void }) => {
  const isImage = source.mime_type.startsWith('image/');
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isImage) return;
    let active = true;
    let made: string | null = null;
    api.downloadSource(source.id_source)
      .then(({ blob }) => {
        if (!active) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch(() => active && setFailed(true));
    return () => { active = false; if (made) URL.revokeObjectURL(made); };
  }, [source.id_source, isImage]);

  return (
    <button
      onClick={onClick}
      className="block w-full h-24 rounded-lg overflow-hidden bg-input-bg border border-border-subtle mb-2 flex items-center justify-center group/thumb"
      title="Aperçu"
    >
      {isImage && url ? (
        <img src={url} alt={source.title} className="w-full h-full object-cover object-top group-hover/thumb:opacity-90 transition-opacity" />
      ) : isImage && !failed ? (
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      ) : (
        createElement(iconForSource(source), { size: 22, style: { color: 'var(--theme-primary)' }, className: 'opacity-70' })
      )}
    </button>
  );
};

// ── Hash badge (preuve d'intégrité) ───────────────────────────────────────────

const HashBadge = ({ hash }: { hash: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={copy}
      title="Copier l'empreinte SHA-256"
      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-dim hover:text-text-default transition-colors"
    >
      <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
      <span className="truncate max-w-[110px]">{hash.slice(0, 12)}…</span>
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
    </button>
  );
};

// ── Source card ───────────────────────────────────────────────────────────────

const SourceCard = ({
  source, canDelete, onPreview, onDownload, onDelete,
}: {
  source: SourceData;
  canDelete: boolean;
  onPreview: (s: SourceData) => void;
  onDownload: (s: SourceData) => void;
  onDelete: (s: SourceData) => void;
}) => {
  const meta = TYPE_META[source.source_type];

  return (
    <div className="bg-card/30 border border-border-subtle rounded-xl p-3 hover:border-border transition-colors flex flex-col group">
      <SourceThumb source={source} onClick={() => onPreview(source)} />

      <div className="flex items-start justify-between gap-2 mb-1">
        <button
          onClick={() => onPreview(source)}
          className="text-left font-semibold text-text-default hover:text-[var(--theme-primary)] transition-colors line-clamp-2 text-sm"
        >
          {source.title}
        </button>
        <span className="text-[10px] text-text-dim uppercase tracking-wider shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-input-bg border border-border-subtle">
          {meta?.label ?? source.source_type}
        </span>
      </div>

      <a
        href={source.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-text-dim hover:text-[var(--theme-primary)] transition-colors truncate mb-2"
        title={source.source_url}
      >
        <ExternalLink size={11} className="shrink-0" />
        <span className="truncate">{hostOf(source.source_url)}</span>
      </a>

      <div className="flex items-center gap-1.5 text-xs text-text-dim mb-2">
        <Clock size={11} className="shrink-0" />
        <span>{source.captured_at ? formatRelativeDate(source.captured_at) : '—'}</span>
        <span className="text-text-dim/50">·</span>
        <span>{formatBytes(source.size_bytes)}</span>
      </div>

      <div className="mt-auto pt-2 flex items-center justify-between gap-2 border-t border-border-subtle/60">
        <HashBadge hash={source.content_hash} />
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onPreview(source)} className="p-1 text-text-dim hover:text-primary transition-colors rounded" title="Aperçu">
            <Eye size={13} />
          </button>
          <button onClick={() => onDownload(source)} className="p-1 text-text-dim hover:text-[var(--theme-primary)] transition-colors rounded" title="Télécharger">
            <Download size={13} />
          </button>
          {canDelete && (
            <button onClick={() => onDelete(source)} className="p-1 text-text-dim hover:text-red-400 transition-colors rounded" title="Supprimer">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Preview panel ─────────────────────────────────────────────────────────────

const SourcePreviewPanel = ({
  source, open, onClose, onDownload,
}: {
  source: SourceData | null;
  open: boolean;
  onClose: () => void;
  onDownload: (s: SourceData) => void;
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const isImage = source?.mime_type.startsWith('image/') ?? false;
  const isVideo = source?.mime_type.startsWith('video/') ?? false;
  const isArchive = source?.source_type === 'web_archive';
  const previewable = isImage || isVideo;

  useEffect(() => {
    let revoked: string | null = null;
    setFailed(false);
    setBlobUrl(null);
    if (open && source && previewable) {
      setLoading(true);
      api.downloadSource(source.id_source)
        .then(({ blob }) => {
          const url = URL.createObjectURL(blob);
          revoked = url;
          setBlobUrl(url);
        })
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
    }
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [open, source, previewable]);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-[45] lg:hidden" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-screen w-full ${isArchive ? 'max-w-[1000px]' : 'max-w-[660px]'} z-50 flex flex-col
          transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye size={14} className="text-primary shrink-0" />
              <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">Aperçu de la source</span>
            </div>
            <h2 className="text-base font-bold text-text-default truncate">{source?.title ?? '…'}</h2>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {source && isArchive ? (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2 text-xs text-text-dim">
                <History size={13} className="text-[var(--theme-primary)]" />
                Page archivée (HTML autonome, rendu fidèle)
              </div>
              <ArchivedPageViewer source={source} />
            </div>
          ) : (
          <div className="rounded-xl bg-input-bg border border-border-subtle overflow-hidden mb-5 flex items-center justify-center min-h-[160px]">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-text-dim">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm">Chargement…</span>
              </div>
            ) : failed ? (
              <p className="text-text-dim text-sm py-16">Aperçu indisponible</p>
            ) : isImage && blobUrl ? (
              <img src={blobUrl} alt={source?.title} className="max-w-full h-auto" />
            ) : isVideo && blobUrl ? (
              <video src={blobUrl} controls className="max-w-full max-h-[420px]" />
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-text-dim">
                <FileQuestion size={28} />
                <span className="text-sm">Pas d'aperçu pour ce type ({source?.mime_type})</span>
              </div>
            )}
          </div>
          )}

          {source && (
            <dl className="space-y-3 text-sm">
              <Field label="Source">
                <a href={source.source_url} target="_blank" rel="noopener noreferrer"
                   className="text-[var(--theme-primary)] hover:underline break-all inline-flex items-center gap-1">
                  <ExternalLink size={12} className="shrink-0" />{source.source_url}
                </a>
              </Field>
              <Field label="Type">{TYPE_META[source.source_type]?.label ?? source.source_type} · {source.mime_type}</Field>
              <Field label="Capturé le">
                {source.captured_at ? new Date(source.captured_at).toLocaleString('fr-FR') : '—'}
                {source.created_by_pseudo && <span className="text-text-dim"> · par {source.created_by_pseudo}</span>}
              </Field>
              <Field label="Taille">{formatBytes(source.size_bytes)}</Field>
              <Field label="Empreinte SHA-256">
                <span className="font-mono text-xs text-text-muted break-all flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-400 shrink-0" />{source.content_hash}
                </span>
              </Field>
              {source.page_metadata && Object.keys(source.page_metadata).length > 0 && (
                <Field label="Métadonnées de page">
                  <pre className="font-mono text-[11px] text-text-muted bg-input-bg rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(source.page_metadata, null, 2)}
                  </pre>
                </Field>
              )}
            </dl>
          )}
        </div>

        {source && (
          <div className="px-6 py-4 border-t border-border-subtle shrink-0">
            <button
              onClick={() => onDownload(source)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--theme-primary)' }}
            >
              <Download size={14} /> Télécharger l'original
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-[11px] font-semibold text-text-default/50 uppercase tracking-wider mb-1">{label}</dt>
    <dd className="text-text-muted">{children}</dd>
  </div>
);

// ── Barre de filtres ──────────────────────────────────────────────────────────

const FilterBar = ({
  typeFilter, setTypeFilter, dateFrom, setDateFrom, dateTo, setDateTo, counts,
}: {
  typeFilter: TypeFilter;
  setTypeFilter: (t: TypeFilter) => void;
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
  counts: Record<TypeFilter, number>;
}) => (
  <div className="flex flex-wrap items-center gap-2 mb-4">
    <div className="flex items-center gap-1">
      {TYPE_FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => setTypeFilter(f.id)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
            typeFilter === f.id
              ? 'text-white border-transparent'
              : 'text-text-dim border-border-subtle hover:text-text-default'
          }`}
          style={typeFilter === f.id ? { background: 'var(--theme-primary)' } : undefined}
        >
          {f.label} <span className="opacity-60">{counts[f.id]}</span>
        </button>
      ))}
    </div>

    <div className="flex items-center gap-1.5 ml-auto text-xs text-text-dim">
      <Filter size={13} />
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="bg-input-bg border border-border-subtle rounded-lg px-2 py-1 text-text-default focus:outline-none focus:border-[var(--theme-primary)]"
        title="Date de début"
      />
      <span>→</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="bg-input-bg border border-border-subtle rounded-lg px-2 py-1 text-text-default focus:outline-none focus:border-[var(--theme-primary)]"
        title="Date de fin"
      />
      {(dateFrom || dateTo) && (
        <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-text-dim hover:text-red-400 transition-colors" title="Réinitialiser les dates">
          <X size={14} />
        </button>
      )}
    </div>
  </div>
);

// ── Tab ───────────────────────────────────────────────────────────────────────

export const SourcesTab = ({ investigationId, userPermission }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewSource, setPreviewSource] = useState<SourceData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const currentUserId = user?.id_user ?? null;

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listSources(investigationId);
      setSources(data.sources);
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  }, [investigationId, toast]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const counts = useMemo<Record<TypeFilter, number>>(() => ({
    all: sources.length,
    page_screenshot: sources.filter((s) => s.source_type === 'page_screenshot').length,
    page_mhtml: sources.filter((s) => s.source_type === 'page_mhtml').length,
    web_archive: sources.filter((s) => s.source_type === 'web_archive').length,
    media: sources.filter((s) => s.source_type === 'media').length,
  }), [sources]);

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Infinity;
    return sources.filter((s) => {
      if (typeFilter !== 'all' && s.source_type !== typeFilter) return false;
      if (s.captured_at) {
        const t = new Date(s.captured_at).getTime();
        if (t < from || t > to) return false;
      }
      return true;
    });
  }, [sources, typeFilter, dateFrom, dateTo]);

  const handleDownload = useCallback(async (source: SourceData) => {
    try {
      const { blob, filename } = await api.downloadSource(source.id_source);
      triggerDownload(blob, filename);
    } catch (err) {
      toast('error', getErrorMessage(err, 'Téléchargement impossible'));
    }
  }, [toast]);

  const handleDelete = async (source: SourceData) => {
    if (!confirm(`Supprimer la source "${source.title}" ? Cette action est définitive.`)) return;
    try {
      await api.deleteSource(source.id_source);
      toast('success', 'Source supprimée');
      if (previewSource?.id_source === source.id_source) setPreviewOpen(false);
      fetchSources();
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur'));
    }
  };

  const handlePreview = (source: SourceData) => {
    setPreviewSource(source);
    setPreviewOpen(true);
  };

  return (
    <div className="border-t border-border-subtle pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-default inline-flex items-center gap-2">
          <Archive size={16} style={{ color: 'var(--theme-primary)' }} />
          Sources
          <span className="text-text-dim font-normal text-sm">({filtered.length}{filtered.length !== sources.length ? `/${sources.length}` : ''})</span>
        </h3>
      </div>

      <p className="text-xs text-text-dim mb-4 max-w-2xl">
        Captures de preuves (pages, screenshots, médias) horodatées et empreintées (SHA-256),
        envoyées depuis l'extension navigateur Tracr.
      </p>

      <ExtensionInstallCard />

      {sources.length > 0 && (
        <FilterBar
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          dateFrom={dateFrom} setDateFrom={setDateFrom}
          dateTo={dateTo} setDateTo={setDateTo}
          counts={counts}
        />
      )}

      {loading ? (
        <p className="text-text-muted text-sm py-4">Chargement…</p>
      ) : sources.length === 0 ? (
        <div className="text-center py-12">
          <Archive size={28} className="mx-auto text-text-dim mb-3" />
          <p className="text-text-muted text-sm">Aucune source archivée pour cette enquête.</p>
          <p className="text-text-dim text-xs mt-1">Utilisez l'extension navigateur pour capturer une page ou un média.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-text-muted text-sm py-8 text-center">Aucune source ne correspond aux filtres.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((source) => (
            <SourceCard
              key={source.id_source}
              source={source}
              canDelete={canDeleteSource(source, userPermission, currentUserId)}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <SourcePreviewPanel
        source={previewSource}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />
    </div>
  );
};
