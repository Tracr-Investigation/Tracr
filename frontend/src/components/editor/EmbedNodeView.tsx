import { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Play, Video, Globe, Link2, GripVertical } from 'lucide-react';
import type { EmbedPlatform } from './EmbedNode';

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORM = {
  youtube:   { label: 'YouTube',   Icon: Play,    color: '#ff0000', height: 'aspect-video' },
  tiktok:    { label: 'TikTok',    Icon: Video,   color: '#010101', height: 'tiktok' },
  twitter:   { label: 'Twitter/X', Icon: Globe,   color: '#1d9bf0', height: 'fixed-400' },
  instagram: { label: 'Instagram', Icon: Globe,   color: '#e1306c', height: 'fixed-540' },
  generic:   { label: 'Embed',     Icon: Link2,   color: '#6b7280', height: 'fixed-400' },
} satisfies Record<EmbedPlatform, { label: string; Icon: React.ElementType; color: string; height: string }>;

// ── View ─────────────────────────────────────────────────────────────────────

export const EmbedNodeView = ({ node, selected }: NodeViewProps) => {
  const { url, platform, embedUrl, title } = node.attrs as {
    url: string;
    platform: EmbedPlatform;
    embedUrl: string;
    title: string;
  };

  const [loaded, setLoaded] = useState(false);

  const cfg = PLATFORM[platform] ?? PLATFORM.generic;
  const { Icon, color, label, height } = cfg;

  const isTikTok    = height === 'tiktok';
  const isAspect    = height === 'aspect-video';
  const fixedHeight = height.startsWith('fixed-') ? height.replace('fixed-', '') + 'px' : undefined;

  return (
    <NodeViewWrapper data-drag-handle>
      <div
        contentEditable={false}
        className={`my-4 rounded-xl overflow-hidden border transition-all ${
          selected
            ? 'border-primary/60 ring-2 ring-primary/20'
            : 'border-border-subtle hover:border-border'
        }`}
        style={{ background: 'var(--color-input-bg)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
          <GripVertical size={13} className="text-text-dim cursor-grab shrink-0" />
          <div
            className="w-4 h-4 rounded flex items-center justify-center shrink-0"
            style={{ background: `${color}20` }}
          >
            <Icon size={9} style={{ color }} />
          </div>
          <span className="text-xs font-semibold text-text-muted">{label}</span>
          {title && <span className="text-xs text-text-dim truncate">— {title}</span>}
          <span className="ml-auto text-[10px] text-text-dim font-mono truncate max-w-[200px] opacity-60">
            {url}
          </span>
        </div>

        {/* Iframe container */}
        <div
          className={`relative bg-black/10 ${isAspect ? 'aspect-video' : ''}`}
          style={
            isTikTok
              ? { maxWidth: '325px', margin: '0 auto', height: '740px' }
              : fixedHeight
              ? { height: fixedHeight }
              : undefined
          }
        >
          {/* Loader */}
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-dim">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs">Chargement {label}…</span>
            </div>
          )}

          <iframe
            src={embedUrl}
            className="w-full border-0"
            style={{
              height: isTikTok
                ? '740px'
                : isAspect
                ? '100%'
                : fixedHeight ?? '400px',
              display: 'block',
            }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
};
