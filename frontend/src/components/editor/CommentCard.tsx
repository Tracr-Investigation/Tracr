import { Check, Trash2 } from 'lucide-react';

export interface DocumentComment {
  id_comment: number;
  id_document: number;
  comment_id: string;
  quote: string;
  content: string;
  author_id: number | null;
  author_pseudo: string | null;
  resolved: boolean;
  created_at: string | null;
}

const DATE_LOCALE = 'fr-FR';
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

// Format the displayed comment date.
const formatCommentDate = (rawDate: string | null): string => {
  if (!rawDate) {
    return '';
  }
  const date = new Date(rawDate);
  return date.toLocaleDateString(DATE_LOCALE, DATE_FORMAT_OPTIONS);
};

interface Props {
  comment: DocumentComment;
  canWrite: boolean;
  canDelete: boolean;
  onResolve: (c: DocumentComment) => void;
  onDelete: (c: DocumentComment) => void;
}

// Comment display card.
export const CommentCard = ({ comment, canWrite, canDelete, onResolve, onDelete }: Props) => {
  const { resolved } = comment;
  return (
    <div className={`bg-dark border border-primary/20 rounded-lg p-3 transition-opacity ${resolved ? 'opacity-50' : ''}`}>
      {comment.quote && (
        <p className="text-xs italic text-yellow-300/80 bg-yellow-500/5 border-l-2 border-yellow-500 pl-2 py-1 mb-2 rounded-r truncate">
          « {comment.quote} »
        </p>
      )}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-accent">{comment.author_pseudo ?? 'Anonyme'}</span>
        <span className="text-xs text-secondary">{formatCommentDate(comment.created_at)}</span>
      </div>
      <p className="text-sm text-accent mb-2 whitespace-pre-wrap break-words">{comment.content}</p>
      <div className="flex gap-2">
        {canWrite && (
          <button
            onClick={() => onResolve(comment)}
            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors"
          >
            <Check size={11} /> {resolved ? 'Rouvrir' : 'Résoudre'}
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(comment)}
            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={11} /> Supprimer
          </button>
        )}
      </div>
    </div>
  );
};
