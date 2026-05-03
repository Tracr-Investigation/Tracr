import { Mark, mergeAttributes } from '@tiptap/core';

export const CommentMark = Mark.create({
  name: 'comment',

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el: HTMLElement): string | null => el.getAttribute('data-comment-id'),
        renderHTML: (attrs: Record<string, unknown>): Record<string, string> => ({
          'data-comment-id': String(attrs.commentId ?? ''),
        }),
      },
      resolved: {
        default: false,
        parseHTML: (el: HTMLElement): boolean => el.getAttribute('data-resolved') === 'true',
        renderHTML: (attrs: Record<string, unknown>): Record<string, string> => ({
          'data-resolved': attrs.resolved ? 'true' : 'false',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'comment-mark' }), 0];
  },

  inclusive: false,
  spanning: true,
});
