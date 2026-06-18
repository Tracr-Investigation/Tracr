import { useState, useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';

import { createBaseExtensions } from './editorExtensions';
import { EditorToolbar } from './EditorToolbar';
import './editor.css';

const DEFAULT_PLACEHOLDER = 'Commencez à écrire…';
const DEFAULT_MIN_HEIGHT = '300px';
const MAX_HEIGHT = '60vh';

interface Props {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
}

// test sélection non vide
const hasSelectionRange = (editor: Editor): boolean => {
  const { from, to } = editor.state.selection;
  return from !== to;
};

// vérif si sync externe nécessaire
const shouldSyncExternalValue = (editor: Editor, value: string): boolean => {
  if (editor.isDestroyed) {
    return false;
  }
  const currentHtml = editor.getHTML();
  return value !== currentHtml;
};

// injection valeur externe dans éditeur
const syncExternalValue = (editor: Editor, value: string): void => {
  const nextValue = value || '';
  editor.commands.setContent(nextValue, false);
};

// éditeur template simple non collaboratif
export const TemplateEditor = ({
  value,
  onChange,
  readOnly = false,
  placeholder = DEFAULT_PLACEHOLDER,
  minHeight = DEFAULT_MIN_HEIGHT,
}: Props) => {
  const [hasSelection, setHasSelection] = useState(false);

  const handleEditorUpdate = (editor: Editor) => {
    const html = editor.getHTML();
    onChange(html);
  };

  const handleSelectionUpdate = (editor: Editor) => {
    const next = hasSelectionRange(editor);
    setHasSelection(next);
  };

  const editor = useEditor({
    editable: !readOnly,
    extensions: createBaseExtensions(placeholder),
    content: value,
    onUpdate: ({ editor: instance }) => handleEditorUpdate(instance),
    onSelectionUpdate: ({ editor: instance }) => handleSelectionUpdate(instance),
  });

  // Sync venant d'un chargement d'un template vers l'éditeur,

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (!shouldSyncExternalValue(editor, value)) {
      return;
    }

    syncExternalValue(editor, value);
  }, [value, editor]);

  if (!editor) {
    return <div className="text-secondary text-sm">Chargement…</div>;
  }

  const showToolbar = !readOnly;
  const containerStyle = { maxHeight: MAX_HEIGHT };
  const innerStyle = { minHeight };

  return (
    <div className="flex flex-col border border-primary/20 rounded-lg overflow-hidden bg-surface">
      {showToolbar && <EditorToolbar editor={editor} hasSelection={hasSelection} />}
      <div className="overflow-y-auto" style={containerStyle}>
        <div className="px-4 py-3" style={innerStyle}>
          <EditorContent editor={editor} className="prose-document" />
        </div>
      </div>
    </div>
  );
};
