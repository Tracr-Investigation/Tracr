import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { SeparatorHorizontal, Captions, MessageSquareWarning, Gauge, EyeOff, ChevronDown } from 'lucide-react';
import { Btn, ICON_SIZE } from './ToolbarButton';
import {
  CALLOUT_LABELS,
  INFO_CREDIBILITY,
  SOURCE_RELIABILITY,
  describeRating,
  type CalloutVariant,
  type CaptionKind,
} from './reportExtensions';

interface MenuItem {
  key: string;
  label: string;
  active?: boolean;
  onSelect: () => void;
}

interface DropdownButtonProps {
  title: string;
  icon: ReactNode;
  active: boolean;
  items: MenuItem[];
}

// Toolbar button opening a small menu, closed on outside click or selection.
const DropdownButton = ({ title, icon, active, items }: DropdownButtonProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Btn active={active} onClick={() => setOpen((current) => !current)} title={title}>
        <span className="flex items-center gap-0.5">
          {icon}
          <ChevronDown size={10} />
        </span>
      </Btn>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-card border border-primary/20 rounded-lg py-1 shadow-lg min-w-[180px]">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                item.active ? 'text-primary bg-primary/10' : 'text-secondary hover:text-accent hover:bg-primary/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface RatingDialogProps {
  initialRating: string | null;
  onApply: (rating: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

const selectClass =
  'w-full bg-dark border border-primary/20 rounded-lg px-3 py-2 text-accent text-sm focus:outline-none focus:border-primary';

// Admiralty rating picker (source reliability + information credibility).
const RatingDialog = ({ initialRating, onApply, onDelete, onClose }: RatingDialogProps) => {
  const [reliability, setReliability] = useState(initialRating?.[0] ?? 'B');
  const [credibility, setCredibility] = useState(initialRating?.[1] ?? '2');
  const rating = `${reliability}${credibility}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-primary/20 rounded-xl p-5 w-full max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-accent mb-1">
          {initialRating ? 'Modifier la cotation' : 'Coter une information'}
        </h3>
        <p className="text-xs text-secondary mb-4">
          Système de l'Amirauté. La cotation est placée après la sélection ; la grille est ajoutée en annexe du PDF.
        </p>
        <label className="block text-xs text-secondary mb-1">Fiabilité de la source</label>
        <select value={reliability} onChange={(event) => setReliability(event.target.value)} className={selectClass}>
          {SOURCE_RELIABILITY.map(([code, label]) => (
            <option key={code} value={code}>{code} - {label}</option>
          ))}
        </select>
        <label className="block text-xs text-secondary mt-3 mb-1">Crédibilité de l'information</label>
        <select value={credibility} onChange={(event) => setCredibility(event.target.value)} className={selectClass}>
          {INFO_CREDIBILITY.map(([code, label]) => (
            <option key={code} value={code}>{code} - {label}</option>
          ))}
        </select>
        <p className="mt-3 text-sm text-accent">
          <span className="rating-badge" data-rating={rating}>{rating}</span>{' '}
          <span className="text-secondary text-xs">{describeRating(rating)}</span>
        </p>
        <div className="flex gap-2 justify-end mt-4">
          {initialRating && (
            <button
              type="button"
              onClick={onDelete}
              className="mr-auto px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm"
            >
              Supprimer
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-dark border border-primary/20 text-secondary hover:text-accent transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onApply(rating)}
            className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

const CAPTION_LABELS: Record<CaptionKind, string> = {
  figure: 'Légende de figure',
  table: 'Légende de tableau',
};

interface ReportToolsProps {
  editor: Editor;
}

// Report toolbar group: page break, captions, callouts, Admiralty rating, redaction.
export const ReportTools = ({ editor }: ReportToolsProps) => {
  const [ratingDialog, setRatingDialog] = useState<{ rating: string | null } | null>(null);

  const chain = () => editor.chain().focus();

  const captionItems: MenuItem[] = [
    ...(Object.keys(CAPTION_LABELS) as CaptionKind[]).map((kind) => ({
      key: kind,
      label: CAPTION_LABELS[kind],
      active: editor.isActive('caption', { kind }),
      onSelect: () => chain().setCaption(kind).run(),
    })),
    { key: 'none', label: 'Texte normal', onSelect: () => chain().setCaption(null).run() },
  ];

  const calloutItems: MenuItem[] = [
    ...(Object.keys(CALLOUT_LABELS) as CalloutVariant[]).map((variant) => ({
      key: variant,
      label: CALLOUT_LABELS[variant],
      active: editor.isActive('callout', { variant }),
      onSelect: () => chain().setCallout(variant).run(),
    })),
    { key: 'none', label: "Retirer l'encadré", onSelect: () => chain().setCallout(null).run() },
  ];

  const handleOpenRating = () => {
    const isEditing = editor.isActive('rating');
    setRatingDialog({ rating: isEditing ? (editor.getAttributes('rating').rating as string) : null });
  };

  const handleApplyRating = (rating: string) => {
    if (ratingDialog?.rating) {
      chain().updateRating(rating).run();
    } else {
      chain().insertRating(rating).run();
    }
    setRatingDialog(null);
  };

  const handleDeleteRating = () => {
    chain().deleteSelection().run();
    setRatingDialog(null);
  };

  return (
    <>
      <Btn onClick={() => chain().insertPageBreak().run()} title="Saut de page (PDF)">
        <SeparatorHorizontal size={ICON_SIZE} />
      </Btn>
      <DropdownButton
        title="Légende numérotée (placer le curseur sur la ligne sous l'image ou le tableau)"
        icon={<Captions size={ICON_SIZE} />}
        active={editor.isActive('caption')}
        items={captionItems}
      />
      <DropdownButton
        title="Encadré"
        icon={<MessageSquareWarning size={ICON_SIZE} />}
        active={editor.isActive('callout')}
        items={calloutItems}
      />
      <Btn
        active={editor.isActive('rating')}
        onClick={handleOpenRating}
        title="Cotation de l'information (Amirauté), ou cliquer sur une cotation pour la modifier"
      >
        <Gauge size={ICON_SIZE} />
      </Btn>
      <Btn
        active={editor.isActive('redaction')}
        onClick={() => chain().toggleRedaction().run()}
        title="Caviarder la sélection (noircie dans la version caviardée du PDF)"
      >
        <EyeOff size={ICON_SIZE} />
      </Btn>

      {ratingDialog && (
        <RatingDialog
          initialRating={ratingDialog.rating}
          onApply={handleApplyRating}
          onDelete={handleDeleteRating}
          onClose={() => setRatingDialog(null)}
        />
      )}
    </>
  );
};
