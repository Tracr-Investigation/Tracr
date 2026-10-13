import { Mark, Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

// Report-specific editor blocks. Their HTML attributes are allowlisted by the
// backend sanitizer and rendered by the PDF export (see backend report_blocks).

export type CaptionKind = 'figure' | 'table';
export type CalloutVariant = 'key' | 'warning' | 'hypothesis';

export const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  key: 'À retenir',
  warning: "Point d'attention",
  hypothesis: 'Hypothèse',
};

// Admiralty grading: source reliability (letter) + information credibility (digit).
export const SOURCE_RELIABILITY: [string, string][] = [
  ['A', 'Totalement fiable'],
  ['B', 'Habituellement fiable'],
  ['C', 'Assez fiable'],
  ['D', 'Pas toujours fiable'],
  ['E', 'Peu fiable'],
  ['F', 'Fiabilité ne pouvant être évaluée'],
];

export const INFO_CREDIBILITY: [string, string][] = [
  ['1', "Confirmée par d'autres sources"],
  ['2', 'Probablement vraie'],
  ['3', 'Possiblement vraie'],
  ['4', 'Douteuse'],
  ['5', 'Improbable'],
  ['6', 'Véracité ne pouvant être évaluée'],
];

export const describeRating = (rating: string): string => {
  const reliability = SOURCE_RELIABILITY.find(([code]) => code === rating[0])?.[1] ?? '';
  const credibility = INFO_CREDIBILITY.find(([code]) => code === rating[1])?.[1] ?? '';
  return `${rating} : source ${reliability.toLowerCase()}, information ${credibility.toLowerCase()}`;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
    caption: {
      // Turn the current block into a caption, or back into a paragraph when kind is null.
      setCaption: (kind: CaptionKind | null) => ReturnType;
    };
    callout: {
      // Wrap the selection in a callout, change its variant, or unwrap it when variant is null.
      setCallout: (variant: CalloutVariant | null) => ReturnType;
    };
    rating: {
      insertRating: (rating: string) => ReturnType;
      updateRating: (rating: string) => ReturnType;
    };
    redaction: {
      toggleRedaction: () => ReturnType;
    };
  }
}

// Forced page break in the PDF export.
export const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML() {
    return ['div', { 'data-type': 'page-break', class: 'page-break' }];
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});

// Figure/table caption, numbered automatically (CSS counters in the editor, server-side in the PDF).
export const CaptionNode = Node.create({
  name: 'caption',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: 'figure',
        parseHTML: (el) => (el.getAttribute('data-caption') === 'table' ? 'table' : 'figure'),
        renderHTML: (attrs) => ({ 'data-caption': attrs.kind }),
      },
    };
  },

  parseHTML() {
    // Higher priority than the paragraph rule, which also matches <p>.
    return [{ tag: 'p[data-caption]', priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { class: 'caption' }), 0];
  },

  addCommands() {
    return {
      setCaption:
        (kind) =>
        ({ commands }) =>
          kind ? commands.setNode(this.name, { kind }) : commands.setNode('paragraph'),
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter in a caption continues with normal text, not another caption.
      Enter: ({ editor }) => {
        if (!editor.isActive(this.name)) {
          return false;
        }
        return editor.chain().splitBlock().setNode('paragraph').run();
      },
    };
  },
});

// Highlighted box ("À retenir", "Point d'attention", "Hypothèse").
export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'key',
        parseHTML: (el) => el.getAttribute('data-variant') || 'key',
        renderHTML: (attrs) => ({ 'data-variant': attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout', class: 'callout' }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (variant) =>
        ({ editor, commands }) => {
          const inCallout = editor.isActive(this.name);
          if (!variant) {
            return inCallout ? commands.lift(this.name) : false;
          }
          if (inCallout) {
            return commands.updateAttributes(this.name, { variant });
          }
          return commands.wrapIn(this.name, { variant });
        },
    };
  },
});

// Admiralty rating badge (e.g. "B2") placed after a statement.
export const RatingNode = Node.create({
  name: 'rating',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      rating: {
        default: 'F6',
        parseHTML: (el) => el.getAttribute('data-rating') || 'F6',
        renderHTML: (attrs) => ({ 'data-rating': attrs.rating }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-rating]' }];
  },

  renderHTML({ node }) {
    const rating = node.attrs.rating as string;
    return ['span', { 'data-rating': rating, class: 'rating-badge', title: describeRating(rating) }, rating];
  },

  renderText({ node }) {
    return `[${node.attrs.rating}]`;
  },

  addCommands() {
    return {
      insertRating:
        (rating) =>
        ({ state, chain }) =>
          chain()
            .setTextSelection(state.selection.to)
            .insertContent({ type: this.name, attrs: { rating } })
            .run(),
      updateRating:
        (rating) =>
        ({ state, tr, dispatch }) => {
          const { selection } = state;
          if (!(selection instanceof NodeSelection) || selection.node.type.name !== this.name) {
            return false;
          }
          if (dispatch) {
            tr.setNodeMarkup(selection.from, undefined, { rating });
          }
          return true;
        },
    };
  },
});

// Passage to black out in the redacted version of the PDF (still readable in the editor).
export const RedactionMark = Mark.create({
  name: 'redaction',
  priority: 1100,

  parseHTML() {
    return [{ tag: 'span[data-redacted]' }];
  },

  renderHTML() {
    return ['span', { 'data-redacted': 'true', class: 'redaction', title: 'Caviardé dans la version caviardée du PDF' }, 0];
  },

  addCommands() {
    return {
      toggleRedaction:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});

export const reportExtensions = [PageBreakNode, CaptionNode, CalloutNode, RatingNode, RedactionMark];
