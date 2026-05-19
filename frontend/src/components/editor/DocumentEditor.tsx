import { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import type { Extensions } from '@tiptap/core';
import * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';

import { createBaseExtensions } from './editorExtensions';
import { CommentMark } from './CommentMark';
import { EditorToolbar } from './EditorToolbar';
import { CommentSidebar, type CommentSidebarHandle } from './CommentSidebar';
import { TemplatePickerModal } from './TemplatePickerModal';
import { useYjsDocument, useRemoteUsers, type RemoteUser } from './useYjsDocument';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { userColor } from '../../utils/userColor';
import './editor.css';

export type { RemoteUser };

const PLACEHOLDER_TEXT = 'Commencez à écrire…';
const SYNC_INJECT_TIMEOUT_MS = 1000;
const SYNC_INJECT_RETRY_MS = 50;
const TOAST_TEMPLATE_INSERTED = 'Template inséré';
const TOAST_TEMPLATE_ERROR_FALLBACK = 'Erreur';

interface Props {
  documentId: number;
  initialContent: string;
  readOnly: boolean;
  isOwner: boolean;
  currentUserId: number;
  currentUserPseudo: string;
  onContentChange: (html: string) => void;
  onRemoteUsersChange?: (users: RemoteUser[]) => void;
}

interface CursorUserInfo {
  name: string;
  color: string;
  userId: number;
}

// extensions collab Yjs et curseurs
const buildCollaborationExtensions = (
  ydoc: Y.Doc,
  provider: WebsocketProvider,
  user: CursorUserInfo,
): Extensions => {
  const collaboration = Collaboration.configure({ document: ydoc });
  const collaborationCursor = CollaborationCursor.configure({ provider, user });
  return [collaboration, collaborationCursor];
};

// assemblage extensions base + commentaire + collab si dispo
const buildExtensions = (
  ydoc: Y.Doc | undefined,
  provider: WebsocketProvider | undefined,
  user: CursorUserInfo,
): Extensions => {
  const hasCollaboration = Boolean(ydoc && provider);
  const base = createBaseExtensions(PLACEHOLDER_TEXT, hasCollaboration);
  const withComment = [...base, CommentMark];

  if (!ydoc || !provider) {
    return withComment;
  }

  const collaborationExtensions = buildCollaborationExtensions(ydoc, provider, user);
  return [...withComment, ...collaborationExtensions];
};

// injection contenu initial avec retry
const injectInitialContent = (
  editorRef: React.RefObject<Editor | null>,
  html: string,
): void => {
  const startTime = Date.now();

  const tryInject = () => {
    const editor = editorRef.current;
    if (editor && editor.isEditable) {
      editor.commands.setContent(html, false);
      return;
    }
    const elapsed = Date.now() - startTime;
    if (elapsed >= SYNC_INJECT_TIMEOUT_MS) {
      return;
    }
    setTimeout(tryInject, SYNC_INJECT_RETRY_MS);
  };

  tryInject();
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

export interface DocumentEditorHandle {
  setContent: (html: string) => void;
}

// éditeur document collaboratif
export const DocumentEditor = forwardRef<DocumentEditorHandle, Props>(({
  documentId,
  initialContent,
  readOnly,
  isOwner,
  currentUserId,
  currentUserPseudo,
  onContentChange,
  onRemoteUsersChange,
}, ref) => {
  const [hasSelection, setHasSelection] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const sidebarRef = useRef<CommentSidebarHandle>(null);
  const editorRef = useRef<Editor | null>(null);
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    setContent: (html: string) => {
      editorRef.current?.commands.setContent(html, false);
    },
  }));

  const handleInitialSync = useCallback(() => {
    injectInitialContent(editorRef, initialContent);
  }, [initialContent]);

  const conn = useYjsDocument({
    documentId,
    initialContent,
    onInitialSync: handleInitialSync,
  });
  const ydoc = conn?.ydoc;
  const provider = conn?.provider;

  const myColor = useMemo(() => userColor(currentUserId), [currentUserId]);

  const cursorUserInfo: CursorUserInfo = useMemo(() => ({
    name: currentUserPseudo,
    color: myColor,
    userId: currentUserId,
  }), [currentUserPseudo, myColor, currentUserId]);

  const isCollaborationReady = Boolean(ydoc && provider);
  const isEditable = !readOnly && isCollaborationReady;

  const handleEditorUpdate = useCallback((editor: Editor) => {
    const html = editor.getHTML();
    onContentChange(html);
  }, [onContentChange]);

  const editor = useEditor(
    {
      editable: isEditable,
      extensions: buildExtensions(ydoc, provider, cursorUserInfo),
      onUpdate: ({ editor: instance }) => handleEditorUpdate(instance),
    },
    [ydoc, provider],
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useRemoteUsers(provider, onRemoteUsersChange);

  const handleCommentClick = () => {
    setPanelOpen(true);
    const shouldOpenForm = hasSelection && !readOnly;
    if (!shouldOpenForm) {
      return;
    }
    sidebarRef.current?.openCommentForm();
  };

  const insertTemplateContent = async (templateId: number) => {
    if (!editor) {
      return;
    }
    const template = await api.getTemplate(templateId);
    const html = template.content_html || '';
    editor.chain().focus().insertContent(html).run();
  };

  const handleInsertTemplate = async (templateId: number) => {
    try {
      await insertTemplateContent(templateId);
      toast('success', TOAST_TEMPLATE_INSERTED);
    } catch (err) {
      const message = getErrorMessage(err, TOAST_TEMPLATE_ERROR_FALLBACK);
      toast('error', message);
    } finally {
      setShowTemplatePicker(false);
    }
  };

  const handleOpenTemplatePicker = () => setShowTemplatePicker(true);
  const handleCloseTemplatePicker = () => setShowTemplatePicker(false);
  const handleClosePanel = () => setPanelOpen(false);

  // Attendre que l'éditeur ET la connexion Yjs soient prêts avant d'afficher
  const isEditorReady = Boolean(editor) && (readOnly || isCollaborationReady);

  if (!isEditorReady) {
    return (
      <div className="flex-1 flex items-center justify-center text-secondary">
        Chargement de l'éditeur...
      </div>
    );
  }

  const showToolbar = !readOnly;
  const canWriteComments = !readOnly;

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto bg-[#0f0f1e]">
          {showToolbar && (
            <div className="sticky top-0 z-10">
              <EditorToolbar
                editor={editor!}
                hasSelection={hasSelection}
                commentCount={commentCount}
                onCommentClick={handleCommentClick}
                onInsertTemplateClick={handleOpenTemplatePicker}
              />
            </div>
          )}
          <div className="max-w-4xl mx-auto pt-8 pb-40 px-6">
            <EditorContent editor={editor!} className="prose-document" />
          </div>
        </div>
      </div>

      <CommentSidebar
        ref={sidebarRef}
        editor={editor!}
        documentId={documentId}
        canWrite={canWriteComments}
        isOwner={isOwner}
        currentUserId={currentUserId}
        onHasSelectionChange={setHasSelection}
        onCountChange={setCommentCount}
        panelOpen={panelOpen}
        onPanelClose={handleClosePanel}
      />

      {showTemplatePicker && (
        <TemplatePickerModal
          onClose={handleCloseTemplatePicker}
          onSelect={handleInsertTemplate}
        />
      )}
    </div>
  );
});
