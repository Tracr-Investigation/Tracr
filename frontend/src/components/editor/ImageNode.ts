import Image from '@tiptap/extension-image';

export type ImageAlign = 'left' | 'center' | 'right';

export const IMAGE_WIDTHS = ['25%', '50%', '75%', '100%'] as const;

const ALIGN_MARGINS: Record<ImageAlign, string> = {
  left: 'margin-left: 0; margin-right: auto',
  center: 'margin-left: auto; margin-right: auto',
  right: 'margin-left: auto; margin-right: 0',
};

const parseAlign = (el: HTMLElement): ImageAlign | null => {
  const { marginLeft, marginRight } = el.style;
  if (marginLeft === 'auto' && marginRight === 'auto') return 'center';
  if (marginLeft === 'auto') return 'right';
  if (marginRight === 'auto') return 'left';
  return null;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageLayout: {
      // Set the width (percentage of the page) and/or alignment of the selected image.
      setImageLayout: (layout: { width?: string | null; align?: ImageAlign | null }) => ReturnType;
    };
  }
}

// Image with a display width and alignment, stored as inline style so the PDF export keeps them.
export const ImageNode = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.style.width || null,
        renderHTML: (attrs) => (attrs.width ? { style: `width: ${attrs.width}` } : {}),
      },
      align: {
        default: null,
        parseHTML: (el) => parseAlign(el),
        renderHTML: (attrs) => (attrs.align ? { style: ALIGN_MARGINS[attrs.align as ImageAlign] } : {}),
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageLayout:
        (layout) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, layout),
    };
  },
});
