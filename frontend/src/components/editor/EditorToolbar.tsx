import { useState, useRef, useEffect, type ReactNode } from 'react';
import type { Editor, ChainedCommands } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Code2,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Heading3,
  MessageSquare,
  Link as LinkIcon,
  Unlink,
  Palette,
  MapPin,
  Archive,
  Table as TableIcon,
  BetweenHorizontalStart,
  BetweenHorizontalEnd,
  BetweenVerticalStart,
  BetweenVerticalEnd,
  TableCellsMerge,
  TableCellsSplit,
  PanelTop,
  Trash2,
  Superscript,
} from 'lucide-react';
import { LocationModal } from './LocationModal';
import { SourcePickerDialog } from './SourcePickerDialog';
import { ReportTools } from './ReportTools';
import { ImageBar } from './ImageBar';
import { Btn, Divider, ICON_SIZE } from './ToolbarButton';

const SWATCH_SIZE_PX = 20;

// Highlight palette.
const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#bbf7d0',
  '#bfdbfe',
  '#fecaca',
  '#e9d5ff',
  '#fed7aa',
];

// Text color palette.
const TEXT_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#e2e8f0',
];

interface Props {
  editor: Editor;
  hasSelection: boolean;
  commentCount?: number;
  investigationId?: string;
  onCommentClick?: () => void;
  onInsertTemplateClick?: () => void;
}

interface ToggleButtonConfig {
  key: string;
  title: string;
  icon: ReactNode;
  isActive: (editor: Editor) => boolean;
  run: (chain: ChainedCommands) => ChainedCommands;
}

const focusChain = (editor: Editor): ChainedCommands => {
  return editor.chain().focus();
};

// Heading buttons (H1/H2/H3).
const HEADING_BUTTONS: ToggleButtonConfig[] = [
  {
    key: 'heading-1',
    title: 'Titre 1',
    icon: <Heading1 size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    run: (chain) => chain.toggleHeading({ level: 1 }),
  },
  {
    key: 'heading-2',
    title: 'Titre 2',
    icon: <Heading2 size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    run: (chain) => chain.toggleHeading({ level: 2 }),
  },
  {
    key: 'heading-3',
    title: 'Titre 3',
    icon: <Heading3 size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    run: (chain) => chain.toggleHeading({ level: 3 }),
  },
];

// Bold/italic/underline buttons.
const INLINE_FORMAT_BUTTONS: ToggleButtonConfig[] = [
  {
    key: 'bold',
    title: 'Gras',
    icon: <Bold size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('bold'),
    run: (chain) => chain.toggleBold(),
  },
  {
    key: 'italic',
    title: 'Italique',
    icon: <Italic size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('italic'),
    run: (chain) => chain.toggleItalic(),
  },
  {
    key: 'underline',
    title: 'Souligné',
    icon: <UnderlineIcon size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('underline'),
    run: (chain) => chain.toggleUnderline(),
  },
];

// Text alignment buttons.
const ALIGNMENT_BUTTONS: ToggleButtonConfig[] = [
  {
    key: 'align-left',
    title: 'Aligner à gauche',
    icon: <AlignLeft size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive({ textAlign: 'left' }),
    run: (chain) => chain.setTextAlign('left'),
  },
  {
    key: 'align-center',
    title: 'Centrer',
    icon: <AlignCenter size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive({ textAlign: 'center' }),
    run: (chain) => chain.setTextAlign('center'),
  },
  {
    key: 'align-right',
    title: 'Aligner à droite',
    icon: <AlignRight size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive({ textAlign: 'right' }),
    run: (chain) => chain.setTextAlign('right'),
  },
];

// Bullet/ordered/task list buttons.
const LIST_BUTTONS: ToggleButtonConfig[] = [
  {
    key: 'bullet-list',
    title: 'Liste à puces',
    icon: <List size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('bulletList'),
    run: (chain) => chain.toggleBulletList(),
  },
  {
    key: 'ordered-list',
    title: 'Liste numérotée',
    icon: <ListOrdered size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('orderedList'),
    run: (chain) => chain.toggleOrderedList(),
  },
  {
    key: 'task-list',
    title: 'Liste de tâches',
    icon: <ListTodo size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('taskList'),
    run: (chain) => chain.toggleTaskList(),
  },
];

// Blockquote and code buttons.
const QUOTE_CODE_BUTTONS: ToggleButtonConfig[] = [
  {
    key: 'blockquote',
    title: 'Citation',
    icon: <Quote size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('blockquote'),
    run: (chain) => chain.toggleBlockquote(),
  },
  {
    key: 'code',
    title: 'Code inline',
    icon: <Code size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('code'),
    run: (chain) => chain.toggleCode(),
  },
  {
    key: 'code-block',
    title: 'Bloc de code',
    icon: <Code2 size={ICON_SIZE} />,
    isActive: (editor) => editor.isActive('codeBlock'),
    run: (chain) => chain.toggleCodeBlock(),
  },
];

interface ToggleGroupProps {
  buttons: ToggleButtonConfig[];
  editor: Editor;
}

// Render a group of toggle buttons.
const ToggleGroup = ({ buttons, editor }: ToggleGroupProps) => {
  return (
    <>
      {buttons.map((config) => {
        const handleClick = () => {
          config.run(focusChain(editor)).run();
        };
        return (
          <Btn
            key={config.key}
            active={config.isActive(editor)}
            onClick={handleClick}
            title={config.title}
          >
            {config.icon}
          </Btn>
        );
      })}
    </>
  );
};

interface TableActionConfig {
  key: string;
  title: string;
  icon: ReactNode;
  run: (chain: ChainedCommands) => ChainedCommands;
  isActive?: (editor: Editor) => boolean;
}

// Contextual table actions (shown when the cursor is inside a table).
const TABLE_ACTIONS: TableActionConfig[] = [
  {
    key: 'add-row-before',
    title: 'Insérer une ligne au-dessus',
    icon: <BetweenHorizontalStart size={ICON_SIZE} />,
    run: (chain) => chain.addRowBefore(),
  },
  {
    key: 'add-row-after',
    title: 'Insérer une ligne en dessous',
    icon: <BetweenHorizontalEnd size={ICON_SIZE} />,
    run: (chain) => chain.addRowAfter(),
  },
  {
    key: 'add-column-before',
    title: 'Insérer une colonne à gauche',
    icon: <BetweenVerticalStart size={ICON_SIZE} />,
    run: (chain) => chain.addColumnBefore(),
  },
  {
    key: 'add-column-after',
    title: 'Insérer une colonne à droite',
    icon: <BetweenVerticalEnd size={ICON_SIZE} />,
    run: (chain) => chain.addColumnAfter(),
  },
  {
    key: 'toggle-header-row',
    title: "Ligne d'en-tête",
    icon: <PanelTop size={ICON_SIZE} />,
    run: (chain) => chain.toggleHeaderRow(),
  },
  {
    key: 'merge-cells',
    title: 'Fusionner les cellules',
    icon: <TableCellsMerge size={ICON_SIZE} />,
    run: (chain) => chain.mergeCells(),
  },
  {
    key: 'split-cell',
    title: 'Scinder la cellule',
    icon: <TableCellsSplit size={ICON_SIZE} />,
    run: (chain) => chain.splitCell(),
  },
];

// Destructive table actions, labelled for clarity.
const TABLE_DELETE_ACTIONS: { key: string; label: string; run: (chain: ChainedCommands) => ChainedCommands }[] = [
  { key: 'delete-row', label: 'Ligne', run: (chain) => chain.deleteRow() },
  { key: 'delete-column', label: 'Colonne', run: (chain) => chain.deleteColumn() },
  { key: 'delete-table', label: 'Tableau', run: (chain) => chain.deleteTable() },
];

interface TableBarProps {
  editor: Editor;
}

// Secondary toolbar row for table editing.
const TableBar = ({ editor }: TableBarProps) => {
  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1 border-b border-primary/20 bg-card">
      <span className="text-[10px] uppercase font-semibold text-secondary mr-1">Tableau</span>
      {TABLE_ACTIONS.map((config) => {
        const handleClick = () => {
          config.run(focusChain(editor)).run();
        };
        const canRun = config.run(editor.can().chain().focus()).run();
        return (
          <Btn key={config.key} onClick={handleClick} disabled={!canRun} title={config.title}>
            {config.icon}
          </Btn>
        );
      })}
      <Divider />
      <Trash2 size={12} className="text-secondary mx-1" />
      {TABLE_DELETE_ACTIONS.map((config) => {
        const handleClick = () => {
          config.run(focusChain(editor)).run();
        };
        return (
          <button
            key={config.key}
            type="button"
            onClick={handleClick}
            title={`Supprimer : ${config.label.toLowerCase()}`}
            className="px-1.5 py-0.5 rounded text-[11px] text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
};

interface UndoRedoButtonsProps {
  editor: Editor;
}

// Undo/redo buttons.
const UndoRedoButtons = ({ editor }: UndoRedoButtonsProps) => {
  const handleUndo = () => {
    focusChain(editor).undo().run();
  };

  const handleRedo = () => {
    focusChain(editor).redo().run();
  };

  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();

  return (
    <>
      <Btn onClick={handleUndo} disabled={!canUndo} title="Annuler">
        <Undo2 size={ICON_SIZE} />
      </Btn>
      <Btn onClick={handleRedo} disabled={!canRedo} title="Rétablir">
        <Redo2 size={ICON_SIZE} />
      </Btn>
    </>
  );
};

interface ColorSwatchProps {
  color: string;
  onClick: () => void;
}

// Clickable color swatch.
const ColorSwatch = ({ color, onClick }: ColorSwatchProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-black/20 hover:scale-110 transition-transform"
      style={{ backgroundColor: color, width: SWATCH_SIZE_PX, height: SWATCH_SIZE_PX }}
      title={color}
    />
  );
};

interface ClearSwatchProps {
  title: string;
  onClick: () => void;
}

// Reset-color swatch.
const ClearSwatch = ({ title, onClick }: ClearSwatchProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-primary/30 bg-dark text-secondary text-[10px] flex items-center justify-center hover:scale-110 transition-transform"
      style={{ width: SWATCH_SIZE_PX, height: SWATCH_SIZE_PX }}
      title={title}
    >
      ✕
    </button>
  );
};

interface ColorMenuProps {
  editor: Editor;
  onPick: () => void;
}

// Highlight and text color menu.
const ColorMenu = ({ editor, onPick }: ColorMenuProps) => {
  const handleSetHighlight = (color: string) => {
    focusChain(editor).setHighlight({ color }).run();
    onPick();
  };

  const handleUnsetHighlight = () => {
    focusChain(editor).unsetHighlight().run();
    onPick();
  };

  const handleSetTextColor = (color: string) => {
    focusChain(editor).setColor(color).run();
    onPick();
  };

  const handleUnsetTextColor = () => {
    focusChain(editor).unsetColor().run();
    onPick();
  };

  return (
    <div className="absolute top-full left-0 mt-1 z-30 bg-card border border-primary/20 rounded-lg p-2 shadow-lg min-w-[200px]">
      <p className="text-[10px] uppercase font-semibold text-secondary mb-1">Surlignage</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {HIGHLIGHT_COLORS.map((color) => {
          const handleClick = () => handleSetHighlight(color);
          return <ColorSwatch key={color} color={color} onClick={handleClick} />;
        })}
        <ClearSwatch title="Retirer surlignage" onClick={handleUnsetHighlight} />
      </div>

      <p className="text-[10px] uppercase font-semibold text-secondary mb-1">Couleur du texte</p>
      <div className="flex flex-wrap gap-1">
        {TEXT_COLORS.map((color) => {
          const handleClick = () => handleSetTextColor(color);
          return <ColorSwatch key={color} color={color} onClick={handleClick} />;
        })}
        <ClearSwatch title="Couleur par défaut" onClick={handleUnsetTextColor} />
      </div>
    </div>
  );
};

interface ColorMenuButtonProps {
  editor: Editor;
}

// Button opening the color menu, closing on outside click.
const ColorMenuButton = ({ editor }: ColorMenuButtonProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const node = containerRef.current;
      if (!node) {
        return;
      }
      
      if (node.contains(event.target as Node)) {
        return;
      }
      
      setShowMenu(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleToggle = () => {
    setShowMenu((current) => !current);
  };

  const handlePick = () => {
    setShowMenu(false);
  };

  const isActive = editor.isActive('highlight') || editor.isActive('textStyle');

  return (
    <div className="relative" ref={containerRef}>
      <Btn active={isActive} onClick={handleToggle} title="Couleur de texte / surlignage">
        <Palette size={ICON_SIZE} />
      </Btn>
      {showMenu && <ColorMenu editor={editor} onPick={handlePick} />}
    </div>
  );
};

interface LinkButtonsProps {
  editor: Editor;
  onOpenLinkDialog: () => void;
}

// Add/remove link buttons.
const LinkButtons = ({ editor, onOpenLinkDialog }: LinkButtonsProps) => {
  const handleUnsetLink = () => {
    focusChain(editor).unsetLink().run();
  };

  const isLinkActive = editor.isActive('link');

  return (
    <>
      <Btn active={isLinkActive} onClick={onOpenLinkDialog} title="Ajouter / éditer un lien">
        <LinkIcon size={ICON_SIZE} />
      </Btn>
      {isLinkActive && (
        <Btn onClick={handleUnsetLink} title="Retirer le lien">
          <Unlink size={ICON_SIZE} />
        </Btn>
      )}
    </>
  );
};

interface CommentButtonProps {
  hasSelection: boolean;
  commentCount: number;
  onClick: () => void;
}

const buildCommentButtonClassName = (hasSelection: boolean): string => {
  const base = 'relative p-1.5 rounded transition-colors';
  if (hasSelection) {
    return `${base} text-primary`;
  }
  return `${base} text-secondary hover:text-accent hover:bg-primary/10`;
};

const buildCommentTitle = (hasSelection: boolean): string => {
  if (hasSelection) {
    return 'Commenter la sélection';
  }
  return 'Ouvrir les commentaires';
};

// Comment button with badge.
const CommentButton = ({ hasSelection, commentCount, onClick }: CommentButtonProps) => {
  const className = buildCommentButtonClassName(hasSelection);
  const title = buildCommentTitle(hasSelection);
  const showBadge = commentCount > 0;

  return (
    <button type="button" onClick={onClick} title={title} className={className}>
      <MessageSquare size={ICON_SIZE} />
      {showBadge && (
        <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1">
          {commentCount}
        </span>
      )}
    </button>
  );
};

interface InsertTemplateButtonProps {
  onClick: () => void;
}

// Insert-template button.
const InsertTemplateButton = ({ onClick }: InsertTemplateButtonProps) => {
  return (
    <Btn onClick={onClick} title="Insérer un template">
      <span className="font-bold text-[14px] leading-none w-[14px] h-[14px] flex items-center justify-center">
        T
      </span>
    </Btn>
  );
};

interface LinkDialogProps {
  initialUrl: string;
  onApply: (url: string) => void;
  onClose: () => void;
}

// Link URL input modal.
const LinkDialog = ({ initialUrl, onApply, onClose }: LinkDialogProps) => {
  const [linkUrl, setLinkUrl] = useState(initialUrl);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLinkUrl(event.target.value);
  };

  const handleApply = () => {
    onApply(linkUrl);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    handleApply();
  };

  const handleStopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-primary/20 rounded-xl p-5 w-full max-w-md"
        onClick={handleStopPropagation}
      >
        <h3 className="text-base font-semibold text-accent mb-4">Ajouter / éditer un lien</h3>
        <input
          type="url"
          autoFocus
          value={linkUrl}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="https://exemple.com"
          className="w-full bg-dark border border-primary/20 rounded-lg px-3 py-2 text-accent focus:outline-none focus:border-primary"
        />
        <p className="text-xs text-secondary mt-2">Laisser vide pour retirer le lien</p>
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-dark border border-primary/20 text-secondary hover:text-accent transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

interface FootnoteDialogProps {
  initialNote: string;
  isEditing: boolean;
  onApply: (note: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

// Footnote text input modal (create or edit).
const FootnoteDialog = ({ initialNote, isEditing, onApply, onDelete, onClose }: FootnoteDialogProps) => {
  const [note, setNote] = useState(initialNote);

  const handleApply = () => {
    onApply(note);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }
    event.preventDefault();
    handleApply();
  };

  const handleStopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-primary/20 rounded-xl p-5 w-full max-w-md"
        onClick={handleStopPropagation}
      >
        <h3 className="text-base font-semibold text-accent mb-4">
          {isEditing ? 'Modifier la note' : 'Ajouter une note de bas de page'}
        </h3>
        <textarea
          autoFocus
          rows={4}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Définition, explication, référence…"
          className="w-full bg-dark border border-primary/20 rounded-lg px-3 py-2 text-accent focus:outline-none focus:border-primary resize-none"
        />
        <p className="text-xs text-secondary mt-2">
          Placée après la sélection, numérotée automatiquement et imprimée en bas de page dans le PDF. Entrée pour valider, Maj+Entrée pour aller à la ligne.
        </p>
        <div className="flex gap-2 justify-end mt-4">
          {isEditing && (
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
            onClick={handleApply}
            disabled={!note.trim()}
            className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm disabled:opacity-40"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

// Apply URL or remove link.
const applyLinkToEditor = (editor: Editor, url: string): void => {
  const trimmed = url.trim();
  const chain = focusChain(editor).extendMarkRange('link');

  if (!trimmed) {
    chain.unsetLink().run();
    return;
  }

  chain.setLink({ href: trimmed }).run();
};

// Main editor toolbar.
export const EditorToolbar = ({
  editor,
  hasSelection,
  commentCount = 0,
  investigationId,
  onCommentClick,
  onInsertTemplateClick,
}: Props) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [footnoteDialog, setFootnoteDialog] = useState<{ note: string; isEditing: boolean } | null>(null);

  const handleOpenLinkDialog = () => {
    const currentHref = (editor.getAttributes('link').href as string | undefined) ?? '';
    setLinkInitialUrl(currentHref);
    setShowLinkDialog(true);
  };

  const handleCloseLinkDialog = () => {
    setShowLinkDialog(false);
  };

  const handleApplyLink = (url: string) => {
    applyLinkToEditor(editor, url);
    setShowLinkDialog(false);
  };

  // Edit the selected footnote, or create a new one after the selection.
  const handleOpenFootnoteDialog = () => {
    const isEditing = editor.isActive('footnote');
    const note = isEditing ? ((editor.getAttributes('footnote').note as string | undefined) ?? '') : '';
    setFootnoteDialog({ note, isEditing });
  };

  const handleApplyFootnote = (note: string) => {
    const trimmed = note.trim();
    if (footnoteDialog?.isEditing) {
      focusChain(editor).updateFootnote(trimmed).run();
    } else {
      focusChain(editor).insertFootnote(trimmed).run();
    }
    setFootnoteDialog(null);
  };

  const handleDeleteFootnote = () => {
    focusChain(editor).deleteSelection().run();
    setFootnoteDialog(null);
  };

  const handleInsertTable = () => {
    focusChain(editor).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const isInTable = editor.isActive('table');
  const showInsertTemplate = Boolean(onInsertTemplateClick);
  const showComment = Boolean(onCommentClick);

  return (
    <>
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-primary/20 bg-card">
        <UndoRedoButtons editor={editor} />
        <Divider />

        <ToggleGroup buttons={HEADING_BUTTONS} editor={editor} />
        <Divider />

        <ToggleGroup buttons={INLINE_FORMAT_BUTTONS} editor={editor} />
        <Divider />

        <ColorMenuButton editor={editor} />
        <Divider />

        <ToggleGroup buttons={ALIGNMENT_BUTTONS} editor={editor} />
        <Divider />

        <ToggleGroup buttons={LIST_BUTTONS} editor={editor} />
        <Divider />

        <ToggleGroup buttons={QUOTE_CODE_BUTTONS} editor={editor} />
        <Divider />

        <Btn active={isInTable} disabled={isInTable} onClick={handleInsertTable} title="Insérer un tableau">
          <TableIcon size={ICON_SIZE} />
        </Btn>
        <Divider />

        <LinkButtons editor={editor} onOpenLinkDialog={handleOpenLinkDialog} />
        <Btn
          active={editor.isActive('footnote')}
          onClick={handleOpenFootnoteDialog}
          title="Note de bas de page (sélectionner un mot, ou cliquer sur un numéro de note pour la modifier)"
        >
          <Superscript size={ICON_SIZE} />
        </Btn>
        <Divider />

        <ReportTools editor={editor} />
        <Divider />

        <Btn
          onClick={() => { setShowLinkDialog(false); setShowLocationModal(true); }}
          title="Insérer une localisation"
        >
          <MapPin size={ICON_SIZE} />
        </Btn>

        {investigationId != null && (
          <Btn
            onClick={() => { setShowLinkDialog(false); setShowSourceDialog(true); }}
            title="Insérer une source archivée"
          >
            <Archive size={ICON_SIZE} />
          </Btn>
        )}

        {showInsertTemplate && (
          <>
            <Divider />
            <InsertTemplateButton onClick={onInsertTemplateClick as () => void} />
          </>
        )}

        {showComment && (
          <>
            <Divider />
            <CommentButton
              hasSelection={hasSelection}
              commentCount={commentCount}
              onClick={onCommentClick as () => void}
            />
          </>
        )}
      </div>

      {isInTable && <TableBar editor={editor} />}
      {editor.isActive('image') && <ImageBar editor={editor} />}

      {footnoteDialog && (
        <FootnoteDialog
          initialNote={footnoteDialog.note}
          isEditing={footnoteDialog.isEditing}
          onApply={handleApplyFootnote}
          onDelete={handleDeleteFootnote}
          onClose={() => setFootnoteDialog(null)}
        />
      )}

      {showLinkDialog && (
        <LinkDialog
          initialUrl={linkInitialUrl}
          onApply={handleApplyLink}
          onClose={handleCloseLinkDialog}
        />
      )}

      <LocationModal
        editor={editor}
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />

      {investigationId != null && (
        <SourcePickerDialog
          editor={editor}
          investigationId={investigationId}
          open={showSourceDialog}
          onClose={() => setShowSourceDialog(false)}
        />
      )}
    </>
  );
};
