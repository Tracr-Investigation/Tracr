import { useState, useEffect } from 'react';
import { X, Link2, Play, Video, Globe } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { detectEmbed, type EmbedPlatform } from './EmbedNode';

// ── Platform display ──────────────────────────────────────────────────────────

const PLATFORM_META: Record<EmbedPlatform, { label: string; color: string; Icon: React.ElementType }> = {
  youtube:   { label: 'YouTube',   color: '#ff0000', Icon: Play  },
  tiktok:    { label: 'TikTok',    color: '#010101', Icon: Video },
  twitter:   { label: 'Twitter/X', color: '#1d9bf0', Icon: Globe },
  instagram: { label: 'Instagram', color: '#e1306c', Icon: Globe },
  generic:   { label: 'Embed',     color: '#6b7280', Icon: Link2 },
};

const EXAMPLES = [
  { label: 'TikTok',    placeholder: 'https://www.tiktok.com/@user/video/123…' },
  { label: 'YouTube',   placeholder: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { label: 'Twitter/X', placeholder: 'https://twitter.com/user/status/123…' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  editor: Editor;
  open: boolean;
  onClose: () => void;
}

export const EmbedDialog = ({ editor, open, onClose }: Props) => {
  const [url, setUrl]     = useState('');
  const [title, setTitle] = useState('');

  const detected = url.trim() ? detectEmbed(url.trim()) : null;
  const meta = detected ? PLATFORM_META[detected.platform] : null;

  useEffect(() => {
    if (open) { setUrl(''); setTitle(''); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleInsert = () => {
    if (!url.trim() || !detected) return;
    editor.chain().focus().insertEmbed({ url: url.trim(), title: title.trim() }).run();
    onClose();
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-[45] lg:hidden" onClick={onClose} />}

      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[440px] z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <h2 className="text-base font-bold text-text-default flex items-center gap-2.5">
            <Video size={16} className="text-primary" />
            Insérer un bloc média
          </h2>
          <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* URL input */}
          <div>
            <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
              URL de la vidéo / publication
            </label>
            <input
              autoFocus={open}
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInsert()}
              placeholder="https://www.tiktok.com/@user/video/…"
              className="w-full px-4 py-2.5 bg-input-bg border border-border-subtle rounded-xl text-text-default text-sm font-mono focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>

          {/* Detected platform feedback */}
          {detected && meta && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3 border"
              style={{
                background: `${meta.color}0d`,
                borderColor: `${meta.color}30`,
              }}
            >
              <meta.Icon size={14} style={{ color: meta.color }} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold" style={{ color: meta.color }}>
                  {meta.label} détecté
                </p>
                <p className="text-[11px] text-text-dim font-mono truncate mt-0.5">
                  {detected.embedUrl}
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
              Titre{' '}
              <span className="font-normal text-text-dim normal-case tracking-normal">
                (optionnel)
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex: Interview keynote 2025"
              className="w-full px-4 py-2.5 bg-input-bg border border-border-subtle rounded-xl text-text-default text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>

          {/* Supported platforms + examples */}
          <div className="rounded-xl p-4 bg-input-bg/50 border border-border-subtle space-y-3">
            <p className="text-xs font-semibold text-text-default/40 uppercase tracking-wider">
              Plateformes supportées
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(PLATFORM_META) as [EmbedPlatform, typeof PLATFORM_META[EmbedPlatform]][])
                .filter(([k]) => k !== 'generic')
                .map(([key, m]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border"
                    style={{
                      borderColor: `${m.color}30`,
                      color: m.color,
                      background: `${m.color}0d`,
                    }}
                  >
                    <m.Icon size={10} />
                    {m.label}
                  </span>
                ))}
            </div>
            <div className="space-y-1.5">
              {EXAMPLES.map(ex => (
                <button
                  key={ex.label}
                  onClick={() => setUrl(ex.placeholder)}
                  className="w-full text-left text-[10px] text-text-dim font-mono hover:text-text-muted transition-colors truncate"
                >
                  {ex.placeholder}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-border-subtle shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-input-bg border border-border-subtle text-text-muted hover:text-text-default transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleInsert}
            disabled={!url.trim() || !detected}
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all flex items-center gap-2"
            style={{ background: 'var(--theme-primary)' }}
          >
            <Video size={13} />
            Insérer
          </button>
        </div>
      </div>
    </>
  );
};
