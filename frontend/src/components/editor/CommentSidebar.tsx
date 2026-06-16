import { useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { X } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useCommentMarks } from './useCommentMarks';
import { CommentCard, type DocumentComment } from './CommentCard';
import { CommentForm } from './CommentForm';

const genId = () => `c_${Math.random().toString(36).slice(2, 10)}`;

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

export type CommentSidebarHandle = {
  openCommentForm: () => void;
  commentCount: number;
};

interface Props {
  editor: Editor | null;
  documentId: number;
  canWrite: boolean;
  isOwner: boolean;
  currentUserId: number;
  onHasSelectionChange: (v: boolean) => void;
  onCountChange: (n: number) => void;
  panelOpen: boolean;
  onPanelClose: () => void;
}

type Pending = { quote: string; commentId: string } | null;

export const CommentSidebar = forwardRef<CommentSidebarHandle, Props>((props, ref) => {
  const {
    editor, documentId, canWrite, isOwner, currentUserId,
    onHasSelectionChange, onCountChange, panelOpen, onPanelClose,
  } = props;

  const { toast } = useToast();
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [submitting, setSubmitting] = useState(false);

  const { addMark, updateMark, removeMark, getLivingIds } = useCommentMarks(editor);

  // Chargement initial des commentaires
  useEffect(() => {
    api.listDocumentComments(documentId)
      .then((d) => setComments(d.comments))
      .catch((err) => toast('error', getErrorMessage(err, 'Erreur de chargement des commentaires')));
  }, [documentId, toast]);

  useEffect(() => {
    onCountChange(comments.length);
  }, [comments.length, onCountChange]);

  // Détection sélection texte
  useEffect(() => {
    if (!editor) {
      return;
    }
    const check = () => {
      const { from, to } = editor.state.selection;
      onHasSelectionChange(from !== to);
    };
    editor.on('selectionUpdate', check);
    check();
    return () => {
      editor.off('selectionUpdate', check);
    };
  }, [editor, onHasSelectionChange]);

  // Suppression des commentaires orphelins
  useEffect(() => {
    if (!editor) {
      return;
    }
    const sweep = () => {
      const living = getLivingIds();
      comments.forEach((c) => {
        if (!living.has(c.comment_id)) {
          api.deleteDocumentComment(documentId, c.id_comment).catch((err) => {
            console.error('Orphan comment cleanup failed:', err);
          });
          setComments((prev) => prev.filter((x) => x.id_comment !== c.id_comment));
        }
      });
    };
    const handler = () => setTimeout(sweep, 300);
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
  }, [editor, comments, getLivingIds, documentId]);

  // Ouverture du formulaire de commentaire sur la sélection courante
  const openCommentForm = useCallback(() => {
    if (!editor || !canWrite) {
      return;
    }
    const { from, to } = editor.state.selection;
    if (from === to) {
      return;
    }
    const quote = editor.state.doc.textBetween(from, to, ' ').slice(0, 200);
    const commentId = genId();
    addMark(commentId);
    setPending({ quote, commentId });
    setDraft('');
  }, [editor, addMark, canWrite]);

  useImperativeHandle(
    ref,
    () => ({ openCommentForm, commentCount: comments.length }),
    [openCommentForm, comments.length],
  );

  const cancelForm = () => {
    if (pending) {
      removeMark(pending.commentId);
    }
    setPending(null);
    setDraft('');
  };

  const submitForm = async () => {
    if (!pending || !draft.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.createDocumentComment(documentId, {
        comment_id: pending.commentId,
        quote: pending.quote,
        content: draft.trim(),
      });
      setComments((prev) => [...prev, created]);
      setPending(null);
      setDraft('');
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur lors de l\'enregistrement du commentaire'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (c: DocumentComment) => {
    try {
      const res = await api.toggleResolveDocumentComment(documentId, c.id_comment);
      setComments((prev) =>
        prev.map((x) => {
          if (x.id_comment !== c.id_comment) {
            return x;
          }
          return { ...x, resolved: res.resolved };
        }),
      );
      updateMark(c.comment_id, { resolved: res.resolved });
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur lors de la résolution'));
    }
  };

  const handleDelete = async (c: DocumentComment) => {
    if (!confirm('Supprimer ce commentaire ?')) {
      return;
    }
    try {
      await api.deleteDocumentComment(documentId, c.id_comment);
      setComments((prev) => prev.filter((x) => x.id_comment !== c.id_comment));
      removeMark(c.comment_id);
    } catch (err) {
      toast('error', getErrorMessage(err, 'Erreur lors de la suppression'));
    }
  };

  if (!panelOpen) {
    return null;
  }

  const active = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  const canDeleteComment = (c: DocumentComment) => isOwner || c.author_id === currentUserId;

  return (
    <aside className="w-80 bg-card border-l border-primary/20 flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-primary/20">
        <h3 className="text-sm font-semibold text-accent">Commentaires ({active.length})</h3>
        <button onClick={onPanelClose} className="text-secondary hover:text-accent transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pending && canWrite && (
          <CommentForm
            draft={draft}
            quote={pending.quote}
            submitting={submitting}
            onDraftChange={setDraft}
            onCancel={cancelForm}
            onSubmit={submitForm}
          />
        )}

        {comments.length === 0 && !pending && (
          <p className="text-secondary text-sm text-center py-8">Aucun commentaire</p>
        )}

        {active.map((c) => (
          <CommentCard
            key={c.id_comment}
            comment={c}
            canWrite={canWrite}
            canDelete={canDeleteComment(c)}
            onResolve={handleResolve}
            onDelete={handleDelete}
          />
        ))}

        {resolved.length > 0 && (
          <details className="pt-2">
            <summary className="text-xs text-secondary cursor-pointer hover:text-accent transition-colors">
              {resolved.length} résolus
            </summary>
            <div className="space-y-3 mt-2">
              {resolved.map((c) => (
                <CommentCard
                  key={c.id_comment}
                  comment={c}
                  canWrite={canWrite}
                  canDelete={canDeleteComment(c)}
                  onResolve={handleResolve}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </aside>
  );
});

CommentSidebar.displayName = 'CommentSidebar';
