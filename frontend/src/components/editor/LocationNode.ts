import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { LocationNodeView } from './LocationNodeView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    location: {
      insertLocation: (attrs: { lat: number; lng: number; address: string }) => ReturnType;
    };
  }
}

export const LocationNode = Node.create({
  name: 'location',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      lat: { default: null },
      lng: { default: null },
      address: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="location"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { lat, lng, address } = HTMLAttributes;
    const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=600x200&markers=${lat},${lng},red-pushpin`;
    return [
      'div',
      mergeAttributes({ 'data-type': 'location', class: 'location-block', style: 'margin:1em 0;border:1px solid #ccc;border-radius:8px;overflow:hidden;font-family:sans-serif' }, HTMLAttributes),
      ['img', { src: mapUrl, style: 'width:100%;height:200px;object-fit:cover;display:block', alt: address }],
      ['div', { style: 'padding:8px 12px' },
        ['p', { style: 'margin:0;font-weight:600' }, `📍 ${address}`],
        ['p', { style: 'margin:4px 0 0;font-size:0.8em;opacity:0.65' }, `${lat}° N, ${lng}° E`],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LocationNodeView);
  },

  addCommands() {
    return {
      insertLocation:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: 'location', attrs }),
    };
  },
});
