import { Send } from 'lucide-react';

interface Props {
  draft: string;
  quote: string;
  submitting: boolean;
  onDraftChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

// formulaire saisie nouveau commentaire
export const CommentForm = ({ draft, quote, submitting, onDraftChange, onCancel, onSubmit }: Props) => {
  const canSubmit = draft.trim().length > 0 && !submitting;

  return (
    <div className="bg-dark border border-primary/20 rounded-lg p-3 space-y-2">
      {quote && (
        <p className="text-xs italic text-yellow-300/80 bg-yellow-500/5 border-l-2 border-yellow-500 pl-2 py-1 rounded-r truncate">
          « {quote} »
        </p>
      )}
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Votre commentaire…"
        rows={3}
        className="w-full bg-[#1a1a2e] border border-primary/20 rounded px-2 py-1.5 text-sm text-accent focus:outline-none focus:border-primary resize-none"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1 rounded border border-primary/20 text-secondary hover:text-accent transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          <Send size={11} /> Ajouter
        </button>
      </div>
    </div>
  );
};
