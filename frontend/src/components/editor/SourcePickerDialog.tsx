import { useEffect, useState, createElement } from 'react';
import { X, Archive, Camera, FileCode, Film, Image as ImageIcon, History, FileQuestion } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { api, API_URL, type SourceData, type SourceType } from '../../services/api';

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
};

function iconFor(s: SourceData): typeof Camera {
  if (s.source_type === 'media') return s.mime_type.startsWith('video/') ? Film : ImageIcon;
  return TYPE_ICON[s.source_type] ?? FileQuestion;
}

function hostOf(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// Construit le HTML inséré (sanitisé côté serveur : img http, a href/target, code…).
function buildInsertHtml(s: SourceData): string {
  const viewUrl = `${API_URL}/sources/${s.id_source}/view?sig=${s.view_sig}`;
  const title = esc(s.title);
  const url = esc(s.source_url);
  const date = s.captured_at ? new Date(s.captured_at).toLocaleString('fr-FR') : '—';
  const host = esc(hostOf(s.source_url));
  const hash = `${s.content_hash.slice(0, 16)}…`;
  const isImage = s.mime_type.startsWith('image/');

  const citation =
    `<p><strong>Source archivée</strong> — <a href="${url}" target="_blank">${title}</a>` +
    `<br>Capturé le ${date} · ${host} · SHA-256 <code>${hash}</code></p>`;

  if (isImage) {
    return `<img src="${viewUrl}" alt="${title}" title="${title}">${citation}`;
  }
  return `<blockquote>${citation}</blockquote>`;
}

export const SourcePickerDialog = ({ editor, investigationId, open, onClose }: Props) => {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
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

  const insert = (s: SourceData) => {
    editor.chain().focus().insertContent(buildInsertHtml(s)).run();
    onClose();
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
          {loading ? (
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
                  onClick={() => insert(s)}
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
            Les images sont insérées en clair ; les autres types en citation (lien + empreinte SHA-256).
          </p>
        </div>
      </div>
    </>
  );
};
