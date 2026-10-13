import { Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      // Insert a footnote right after the current selection (e.g. after the selected word).
      insertFootnote: (note: string) => ReturnType;
      // Update the note of the selected footnote.
      updateFootnote: (note: string) => ReturnType;
    };
  }
}

// Inline footnote: a numbered call (CSS counter) whose text is stored in an attribute.
// Shown as a tooltip in the editor and printed at the bottom of the page in the PDF export.
export const FootnoteNode = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      note: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-footnote') ?? '',
        renderHTML: (attrs) => ({ 'data-footnote': attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-footnote]' }];
  },

  renderHTML({ node }) {
    return ['sup', { 'data-footnote': node.attrs.note, class: 'footnote-ref', title: node.attrs.note }];
  },

  renderText() {
    return '';
  },

  addCommands() {
    return {
      insertFootnote:
        (note) =>
        ({ state, chain }) =>
          chain()
            .setTextSelection(state.selection.to)
            .insertContent({ type: this.name, attrs: { note } })
            .run(),
      updateFootnote:
        (note) =>
        ({ state, tr, dispatch }) => {
          const { selection } = state;
          if (!(selection instanceof NodeSelection) || selection.node.type.name !== this.name) {
            return false;
          }
          if (dispatch) {
            tr.setNodeMarkup(selection.from, undefined, { ...selection.node.attrs, note });
          }
          return true;
        },
    };
  },
});
