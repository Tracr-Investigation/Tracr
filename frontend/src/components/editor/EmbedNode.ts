import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { EmbedNodeView } from './EmbedNodeView';

export type EmbedPlatform = 'youtube' | 'tiktok' | 'twitter' | 'instagram' | 'generic';

export interface EmbedDetection {
  platform: EmbedPlatform;
  embedUrl: string;
  aspectRatio?: string;
}

export function detectEmbed(url: string): EmbedDetection {
  const clean = url.trim();

  // YouTube — youtu.be/ID  ou  youtube.com/watch?v=ID
  const yt = clean.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) {
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${yt[1]}?rel=0`,
      aspectRatio: '16/9',
    };
  }

  // TikTok — tiktok.com/@user/video/ID
  const tt = clean.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tt) {
    return {
      platform: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${tt[1]}`,
    };
  }

  // Twitter/X — twitter.com/user/status/ID  ou  x.com/user/status/ID
  const tw = clean.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  if (tw) {
    return {
      platform: 'twitter',
      embedUrl: `https://twitframe.com/show?url=${encodeURIComponent(clean)}`,
    };
  }

  // Instagram — instagram.com/p/CODE  ou  instagram.com/reel/CODE
  const ig = clean.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  if (ig) {
    return {
      platform: 'instagram',
      embedUrl: `https://www.instagram.com/p/${ig[1]}/embed`,
    };
  }

  // Generic iframe
  return { platform: 'generic', embedUrl: clean };
}

// ── TipTap command types ───────────────────────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      insertEmbed: (attrs: { url: string; title?: string }) => ReturnType;
    };
  }
}

// ── Extension ─────────────────────────────────────────────────────────────────

export const EmbedNode = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: el => el.getAttribute('data-url') ?? '',
        renderHTML: attrs => ({ 'data-url': attrs.url }),
      },
      platform: {
        default: 'generic',
        parseHTML: el => el.getAttribute('data-platform') ?? 'generic',
        renderHTML: attrs => ({ 'data-platform': attrs.platform }),
      },
      embedUrl: {
        default: '',
        parseHTML: el => el.getAttribute('data-embed-url') ?? '',
        renderHTML: attrs => ({ 'data-embed-url': attrs.embedUrl }),
      },
      title: {
        default: '',
        parseHTML: el => el.getAttribute('data-title') ?? '',
        renderHTML: attrs => (attrs.title ? { 'data-title': attrs.title } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }];
  },

  renderHTML({ node }) {
    const { url, platform, embedUrl, title } = node.attrs;
    const label = ({ youtube: 'YouTube', tiktok: 'TikTok', twitter: 'Twitter/X', instagram: 'Instagram', generic: 'Embed' } as Record<string, string>)[platform as string] ?? 'Embed';
    return [
      'div',
      {
        'data-type': 'embed',
        'data-url': url,
        'data-platform': platform,
        'data-embed-url': embedUrl,
        ...(title ? { 'data-title': title } : {}),
        class: 'embed-block',
      },
      ['div', { class: 'embed-header' }, `▶ ${label}${title ? ` — ${title}` : ''}`],
      [
        'iframe',
        {
          src: embedUrl,
          frameborder: '0',
          allowfullscreen: 'true',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
          loading: 'lazy',
          style: 'width:100%;display:block;border:0;',
        },
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView);
  },

  addCommands() {
    return {
      insertEmbed:
        (attrs) =>
        ({ commands }) => {
          const { platform, embedUrl } = detectEmbed(attrs.url);
          return commands.insertContent({
            type: 'embed',
            attrs: {
              url: attrs.url,
              platform,
              embedUrl,
              title: attrs.title ?? '',
            },
          });
        },
    };
  },
});
