import { useEffect, useState, createElement } from 'react';
import { X, Archive, ArrowLeft, Camera, FileCode, Film, Image as ImageIcon, History, FileQuestion, Paperclip } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { api, API_URL, type SourceData, type SourceType } from '../../services/api';
import { IMAGE_WIDTHS } from './ImageNode';

interface Props {
  editor: Editor;
  investigationId: number;
  open: boolean;
  onClose: () => void;
}

const TYPE_ICON: Record<SourceType, typeof Camera> = {
  page_screenshot: Camera,
  page_mhtml: FileCode,
  media: ImageIcon,
  web_archive: History,
  manual_file: Paperclip,
};

function iconFor(s: SourceData): typeof Camera {
  if (s.source_type === 'media') return s.mime_type.startsWith('video/') ? Film : ImageIcon;
  return TYPE_ICON[s.source_type] ?? FileQuestion;
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

const isWebUrl = (url: string): boolean => /^https?:\/\//i.test(url);

// File-like titles ("IMG_1234.jpg") make poor captions: don't prefill them.
const looksLikeFilename = (title: string): boolean => /\.[a-z0-9]{2,5}$/i.test(title.trim());

const formatCapturedAt = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  const day = date.toLocaleDateString('fr-FR');
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} à ${time}`;
};

interface InsertOptions {
  caption: string;
  width: string;
  withProvenance: boolean;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// Provenance line: linked source (site or archived copy) + capture date.
// The full SHA-256 is listed in the PDF "Sources citées" annex, matched by this link.
function buildProvenance(s: SourceData, viewUrl: string): string {
  const href = isWebUrl(s.source_url) ? s.source_url : viewUrl;
  const host = hostOf(s.source_url);
  const label = esc(host || s.title);
  const date = formatCapturedAt(s.captured_at);
  return `Source : <a href="${esc(href)}" target="_blank">${label}</a>${date ? `, capturée le ${date}` : ''}`;
}

// Build the inserted HTML (sanitized server-side: img http, a href/target…).
function buildInsertHtml(s: SourceData, options: InsertOptions): string {
  const viewUrl = `${API_URL}/sources/${s.id_source}/view?sig=${s.view_sig}`;
  const provenance = options.withProvenance ? buildProvenance(s, viewUrl) : '';

  if (s.mime_type.startsWith('image/')) {
    const caption = esc(options.caption.trim());
    const style = options.width === '100%'
      ? ''
      : ` style="width: ${options.width}; margin-left: auto; margin-right: auto"`;
    const image = `<img src="${viewUrl}" alt="${caption || esc(s.title)}"${style}>`;
    const captionText = [caption, provenance].filter(Boolean).join(' - ');
    return captionText ? `${image}<p data-caption="figure">${captionText}</p>` : image;
  }

  // Non-image capture (archived page, video, file): a single reference line.
  const href = isWebUrl(s.source_url) ? s.source_url : viewUrl;
  const date = formatCapturedAt(s.captured_at);
  const host = hostOf(s.source_url);
  return (
    `<p><strong>Source archivée :</strong> <a href="${esc(href)}" target="_blank">${esc(s.title)}</a>` +
    `${host ? ` (${esc(host)})` : ''}${date ? `, capturée le ${date}` : ''}</p>`
  );
}

interface InsertStepProps {
  source: SourceData;
  onBack: () => void;
  onInsert: (options: InsertOptions) => void;
}

// Second step for images: caption, display width, provenance line, with a live preview.
const InsertStep = ({ source, onBack, onInsert }: InsertStepProps) => {
  const [caption, setCaption] = useState(looksLikeFilename(source.title) ? '' : source.title);
  const [width, setWidth] = useState('50%');
  const [withProvenance, setWithProvenance] = useState(true);
  const viewUrl = `${API_URL}/sources/${source.id_source}/view?sig=${source.view_sig}`;
  const host = hostOf(source.source_url);
  const date = formatCapturedAt(source.captured_at);
  const provenancePreview = withProvenance ? `Source : ${host || source.title}${date ? `, capturée le ${date}` : ''}` : '';
  const captionPreview = [caption.trim(), provenancePreview].filter(Boolean).join(' - ');

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="self-start text-xs text-text-dim hover:text-text-default inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Choisir une autre source
      </button>

      <div className="rounded-xl border border-border-subtle bg-input-bg/40 p-3">
        <img
          src={viewUrl}
          alt=""
          className="rounded-lg mx-auto max-h-56 object-contain transition-all"
          style={{ width }}
        />
        {captionPreview && (
          <p className="mt-2 text-center text-xs italic text-text-muted">
            <span className="not-italic font-semibold text-[var(--theme-primary)]">Figure n : </span>
            {captionPreview}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Légende</label>
        <input
          autoFocus
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="ex. Profil Instagram du compte X"
          className="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-default focus:outline-none focus:border-[var(--theme-primary)]"
        />
        <p className="text-[11px] text-text-dim mt-1">Numérotée automatiquement (Figure 1, 2…) et reprise dans la table des figures.</p>
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Taille</label>
        <div className="flex gap-1.5">
          {IMAGE_WIDTHS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setWidth(value)}
              className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${
                width === value
                  ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                  : 'border-border-subtle text-text-muted hover:text-text-default'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-text-default cursor-pointer">
        <input
          type="checkbox"
          checked={withProvenance}
          onChange={(event) => setWithProvenance(event.target.checked)}
          className="mt-0.5 accent-[var(--theme-primary)]"
        />
        <span>
          Indiquer la provenance
          <span className="block text-[11px] text-text-dim">Site et date de capture dans la légende (l'empreinte SHA-256 est en annexe du PDF).</span>
        </span>
      </label>

      <button
        onClick={() => onInsert({ caption, width, withProvenance })}
        className="w-full py-2 rounded-lg text-sm font-semibold text-white"
        style={{ background: 'var(--theme-primary)' }}
      >
        Insérer l'image
      </button>
    </div>
  );
};

export const SourcePickerDialog = ({ editor, investigationId, open, onClose }: Props) => {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SourceData | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setLoading(true);
    api.listSources(investigationId)
      .then((d) => setSources(d.sources))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, [open, investigationId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const insert = (s: SourceData, options: InsertOptions = { caption: '', width: '100%', withProvenance: true }) => {
    editor.chain().focus().insertContent(buildInsertHtml(s, options)).run();
    onClose();
  };

  // Images go through the caption/size step; other captures are inserted directly.
  const handlePick = (s: SourceData) => {
    if (s.mime_type.startsWith('image/')) {
      setSelected(s);
      return;
    }
    insert(s);
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-[45] lg:hidden" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[440px] z-50 flex flex-col
          transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <h2 className="text-base font-bold text-text-default flex items-center gap-2.5">
            <Archive size={16} className="text-primary" />
            Insérer une source
          </h2>
          <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {selected ? (
            <InsertStep source={selected} onBack={() => setSelected(null)} onInsert={(options) => insert(selected, options)} />
          ) : loading ? (
            <p className="text-text-muted text-sm py-8 text-center">Chargement…</p>
          ) : sources.length === 0 ? (
            <p className="text-text-dim text-sm py-8 text-center">
              Aucune source archivée dans cette enquête.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sources.map((s) => (
                <button
                  key={s.id_source}
                  onClick={() => handlePick(s)}
                  className="text-left w-full px-3 py-2.5 rounded-xl border border-border-subtle hover:border-[var(--theme-primary)] bg-input-bg/40 hover:bg-input-bg transition-colors flex items-start gap-3"
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}
                  >
                    {createElement(iconFor(s), { size: 15, style: { color: 'var(--theme-primary)' } })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-text-default text-sm truncate">{s.title}</span>
                    <span className="block text-xs text-text-dim truncate">
                      {hostOf(s.source_url)}
                      {s.mime_type.startsWith('image/') && <span className="text-[var(--theme-primary)]"> · image inline</span>}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border-subtle shrink-0">
          <p className="text-[11px] text-text-dim">
            Images : légende, taille et provenance au choix. Autres types : ligne de référence. Les empreintes SHA-256 sont listées en annexe du PDF.
          </p>
        </div>
      </div>
    </>
  );
};
