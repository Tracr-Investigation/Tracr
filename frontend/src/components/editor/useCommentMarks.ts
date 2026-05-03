import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { Mark, Node as ProseMirrorNode } from '@tiptap/pm/model';

const COMMENT_MARK_NAME = 'comment';

interface CommentMarkAttrs {
  commentId: string;
  resolved: boolean;
}

// test mark commentaire pour un id donné
const isCommentMarkForId = (mark: Mark, commentId: string): boolean => {
  if (mark.type.name !== COMMENT_MARK_NAME) {
    return false;
  }
  return mark.attrs.commentId === commentId;
};

// test type mark commentaire
const isCommentMark = (mark: Mark): boolean => {
  return mark.type.name === COMMENT_MARK_NAME;
};

// extraction commentId depuis mark
const getCommentIdFromMark = (mark: Mark): string | null => {
  const id = mark.attrs.commentId;
  if (typeof id !== 'string') {
    return null;
  }
  if (!id) {
    return null;
  }
  return id;
};

interface UseCommentMarksReturn {
  addMark: (commentId: string) => void;
  updateMark: (commentId: string, attrs: Record<string, unknown>) => void;
  removeMark: (commentId: string) => void;
  getLivingIds: () => Set<string>;
}

// hook gestion marks commentaires sur éditeur
export function useCommentMarks(editor: Editor | null): UseCommentMarksReturn {
  // ajout mark sur sélection
  const addMark = useCallback((commentId: string) => {
    if (!editor) {
      return;
    }
    const attrs: CommentMarkAttrs = { commentId, resolved: false };
    editor.chain().focus().setMark(COMMENT_MARK_NAME, attrs).run();
  }, [editor]);

  // mise à jour attributs mark existante
  const updateMark = useCallback((commentId: string, attrs: Record<string, unknown>) => {
    if (!editor) {
      return;
    }

    const transaction = editor.state.tr;

    const updateMarkOnNode = (node: ProseMirrorNode, pos: number) => {
      node.marks.forEach((mark) => {
        if (!isCommentMarkForId(mark, commentId)) {
          return;
        }
        const nextAttrs = { ...mark.attrs, ...attrs };
        const nextMark = mark.type.create(nextAttrs);
        const nodeStart = pos;
        const nodeEnd = pos + node.nodeSize;
        transaction.addMark(nodeStart, nodeEnd, nextMark);
      });
    };

    editor.state.doc.descendants(updateMarkOnNode);
    editor.view.dispatch(transaction);
  }, [editor]);

  // suppression mark dans tout le doc
  const removeMark = useCallback((commentId: string) => {
    if (!editor) {
      return;
    }
    const markType = editor.schema.marks.comment;
    if (!markType) {
      return;
    }

    const transaction = editor.state.tr;
    let hasChanges = false;

    const removeMarkOnNode = (node: ProseMirrorNode, pos: number) => {
      node.marks.forEach((mark) => {
        if (!isCommentMarkForId(mark, commentId)) {
          return;
        }
        const nodeStart = pos;
        const nodeEnd = pos + node.nodeSize;
        transaction.removeMark(nodeStart, nodeEnd, markType);
        hasChanges = true;
      });
    };

    editor.state.doc.descendants(removeMarkOnNode);

    if (!hasChanges) {
      return;
    }
    editor.view.dispatch(transaction);
  }, [editor]);

  // collecte ids encore présents pour purge orphelins
  const getLivingIds = useCallback((): Set<string> => {
    const ids = new Set<string>();
    if (!editor) {
      return ids;
    }

    const collectIdsFromNode = (node: ProseMirrorNode) => {
      if (!node.isText) {
        return;
      }
      node.marks.forEach((mark) => {
        if (!isCommentMark(mark)) {
          return;
        }
        const id = getCommentIdFromMark(mark);
        if (id === null) {
          return;
        }
        ids.add(id);
      });
    };

    editor.state.doc.descendants(collectIdsFromNode);
    return ids;
  }, [editor]);

  return { addMark, updateMark, removeMark, getLivingIds };
}
