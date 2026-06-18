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
} from 'lucide-react';
import { LocationModal } from './LocationModal';
import { SourcePickerDialog } from './SourcePickerDialog';

const ICON_SIZE = 14;
const SWATCH_SIZE_PX = 20;

// palette surlignage
const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#bbf7d0',
  '#bfdbfe',
  '#fecaca',
  '#e9d5ff',
  '#fed7aa',
];

// palette couleur texte
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
  investigationId?: number;
  onCommentClick?: () => void;
  onInsertTemplateClick?: () => void;
}

interface BtnProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}

const buildBtnClassName = (active: boolean): string => {
  const base = 'p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
  if (active) {
    return `${base} bg-primary/20 text-primary`;
  }

  return `${base} text-secondary hover:text-accent hover:bg-primary/10`;
};

// bouton générique toolbar
const Btn = ({ active = false, disabled = false, onClick, title, children }: BtnProps) => {
  const className = buildBtnClassName(active);
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={className}>
      {children}
    </button>
  );
};

const Divider = () => <div className="w-px h-5 bg-primary/20 mx-0.5" />;

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

// boutons titres H1 H2 H3
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

// boutons gras italique souligné
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

// boutons alignement texte
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

// boutons listes puces numérotées tâches
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

// boutons citation et code
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

// rendu groupe de boutons toggle
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

interface UndoRedoButtonsProps {
  editor: Editor;
}

// boutons annuler rétablir
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

// pastille couleur cliquable
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

// pastille reset couleur
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

// menu couleurs surlignage et texte
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

// bouton ouvrant menu couleurs avec fermeture clic extérieur
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

// boutons ajout et retrait lien
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

// bouton commentaire avec badge
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

// bouton insertion template
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

// modale saisie URL lien
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

// application URL ou retrait lien
const applyLinkToEditor = (editor: Editor, url: string): void => {
  const trimmed = url.trim();
  const chain = focusChain(editor).extendMarkRange('link');

  if (!trimmed) {
    chain.unsetLink().run();
    return;
  }

  chain.setLink({ href: trimmed }).run();
};

// barre outils principale éditeur
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

        <LinkButtons editor={editor} onOpenLinkDialog={handleOpenLinkDialog} />
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
