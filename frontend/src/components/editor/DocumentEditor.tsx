import { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import type { Extensions } from '@tiptap/core';
import * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';

import { createBaseExtensions } from './editorExtensions';
import { createEntityMention } from './entityMention';
import { CommentMark } from './CommentMark';
import { EditorToolbar } from './EditorToolbar';
import { CommentSidebar, type CommentSidebarHandle } from './CommentSidebar';
import { TemplateSidebar } from './TemplateSidebar';
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
  investigationId: number;
  initialContent: string;
  readOnly: boolean;
  isOwner: boolean;
  currentUserId: number;
  currentUserPseudo: string;
  onContentChange: (html: string) => void;
  onRemoteUsersChange?: (users: RemoteUser[]) => void;
  onEntityMentionClick?: (entityId: number) => void;
}

interface CursorUserInfo {
  name: string;
  color: string;
  userId: number;
}

const buildCollaborationExtensions = (
  ydoc: Y.Doc,
  provider: WebsocketProvider,
  user: CursorUserInfo,
): Extensions => {
  const collaboration = Collaboration.configure({ document: ydoc });
  const collaborationCursor = CollaborationCursor.configure({ provider, user });
  return [collaboration, collaborationCursor];
};

const buildExtensions = (
  ydoc: Y.Doc | undefined,
  provider: WebsocketProvider | undefined,
  user: CursorUserInfo,
  investigationId: number,
): Extensions => {
  const hasCollaboration = Boolean(ydoc && provider);
  const base = createBaseExtensions(PLACEHOLDER_TEXT, hasCollaboration);
  const withComment = [...base, CommentMark, createEntityMention(investigationId)];

  if (!ydoc || !provider) return withComment;

  return [...withComment, ...buildCollaborationExtensions(ydoc, provider, user)];
};

const injectInitialContent = (editorRef: React.RefObject<Editor | null>, html: string): void => {
  const startTime = Date.now();
  const tryInject = () => {
    const editor = editorRef.current;
    if (editor && editor.isEditable) { editor.commands.setContent(html, false); return; }
    if (Date.now() - startTime >= SYNC_INJECT_TIMEOUT_MS) return;
    setTimeout(tryInject, SYNC_INJECT_RETRY_MS);
  };
  tryInject();
};

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

export interface DocumentEditorHandle {
  setContent: (html: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DocumentEditor = forwardRef<DocumentEditorHandle, Props>(({
  documentId,
  investigationId,
  initialContent,
  readOnly,
  isOwner,
  currentUserId,
  currentUserPseudo,
  onContentChange,
  onRemoteUsersChange,
  onEntityMentionClick,
}, ref) => {
  const [hasSelection, setHasSelection]             = useState(false);
  const [commentCount, setCommentCount]             = useState(0);
  const [panelOpen, setPanelOpen]                   = useState(false);
  const [templateSidebarOpen, setTemplateSidebarOpen] = useState(false);
  const [isDragOver, setIsDragOver]                 = useState(false);

  const sidebarRef  = useRef<CommentSidebarHandle>(null);
  const editorRef   = useRef<Editor | null>(null);
  const { toast }   = useToast();

  useImperativeHandle(ref, () => ({
    setContent: (html: string) => { editorRef.current?.commands.setContent(html, false); },
  }));

  const handleInitialSync = useCallback(() => {
    injectInitialContent(editorRef, initialContent);
  }, [initialContent]);

  const conn     = useYjsDocument({ documentId, initialContent, onInitialSync: handleInitialSync });
  const ydoc     = conn?.ydoc;
  const provider = conn?.provider;

  const myColor = useMemo(() => userColor(currentUserId), [currentUserId]);
  const cursorUserInfo: CursorUserInfo = useMemo(() => ({
    name: currentUserPseudo, color: myColor, userId: currentUserId,
  }), [currentUserPseudo, myColor, currentUserId]);

  const isCollaborationReady = Boolean(ydoc && provider);
  const isEditable = !readOnly && isCollaborationReady;

  const handleEditorUpdate = useCallback((editor: Editor) => {
    onContentChange(editor.getHTML());
  }, [onContentChange]);

  const editor = useEditor(
    {
      editable: isEditable,
      extensions: buildExtensions(ydoc, provider, cursorUserInfo, investigationId),
      onUpdate: ({ editor: instance }) => handleEditorUpdate(instance),
    },
    [ydoc, provider, investigationId],
  );

  useEffect(() => { editorRef.current = editor; }, [editor]);
  useRemoteUsers(provider, onRemoteUsersChange);

  // ── Template insertion ────────────────────────────────────────────────────

  const insertTemplateAt = useCallback(async (templateId: number, pos?: number) => {
    if (!editor) return;
    const template = await api.getTemplate(templateId);
    const html = template.content_html || '';
    if (pos !== undefined) {
      editor.chain().focus().insertContentAt(pos, html).run();
    } else {
      editor.chain().focus().insertContent(html).run();
    }
  }, [editor]);

  const handleInsertTemplate = useCallback(async (templateId: number) => {
    try {
      await insertTemplateAt(templateId);
      toast('success', TOAST_TEMPLATE_INSERTED);
    } catch (err) {
      toast('error', getErrorMessage(err, TOAST_TEMPLATE_ERROR_FALLBACK));
    }
  }, [insertTemplateAt, toast]);

  // ── Drag & drop from TemplateSidebar ─────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/tracr-template-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    const rawId = e.dataTransfer.getData('application/tracr-template-id');
    if (!rawId || !editor) return;
    e.preventDefault();
    setIsDragOver(false);

    // Resolve ProseMirror position from pixel coordinates
    const posResult = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    const pos = posResult?.pos;

    try {
      await insertTemplateAt(Number(rawId), pos);
      toast('success', TOAST_TEMPLATE_INSERTED);
    } catch (err) {
      toast('error', getErrorMessage(err, TOAST_TEMPLATE_ERROR_FALLBACK));
    }
  }, [editor, insertTemplateAt, toast]);

  // ── Comments ──────────────────────────────────────────────────────────────

  const handleCommentClick = () => {
    setPanelOpen(true);
    if (hasSelection && !readOnly) sidebarRef.current?.openCommentForm();
  };

  const handleEditorAreaClick = useCallback((e: React.MouseEvent) => {
    if (!onEntityMentionClick) return;
    const mention = (e.target as HTMLElement).closest('.entity-mention');
    const id = mention?.getAttribute('data-id');
    if (id) onEntityMentionClick(Number(id));
  }, [onEntityMentionClick]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isEditorReady = Boolean(editor) && (readOnly || isCollaborationReady);

  if (!isEditorReady) {
    return (
      <div className="flex-1 flex items-center justify-center text-secondary">
        Chargement de l'éditeur...
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Template sidebar (left) */}
      {!readOnly && (
        <TemplateSidebar
          open={templateSidebarOpen}
          onClose={() => setTemplateSidebarOpen(false)}
          onInsert={handleInsertTemplate}
        />
      )}

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div
          className={`flex-1 overflow-y-auto bg-[#0f0f1e] transition-all duration-200 ${
            isDragOver ? 'ring-2 ring-inset ring-primary/40' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleEditorAreaClick}
        >
          {!readOnly && (
            <div className="sticky top-0 z-[800]">
              <EditorToolbar
                editor={editor!}
                hasSelection={hasSelection}
                commentCount={commentCount}
                onCommentClick={handleCommentClick}
                onInsertTemplateClick={() => setTemplateSidebarOpen(v => !v)}
              />
            </div>
          )}
          <div className="max-w-4xl mx-auto pt-8 pb-40 px-6">
            <EditorContent editor={editor!} className="prose-document" />
          </div>
        </div>
      </div>

      {/* Comment sidebar (right) */}
      <CommentSidebar
        ref={sidebarRef}
        editor={editor!}
        documentId={documentId}
        canWrite={!readOnly}
        isOwner={isOwner}
        currentUserId={currentUserId}
        onHasSelectionChange={setHasSelection}
        onCountChange={setCommentCount}
        panelOpen={panelOpen}
        onPanelClose={() => setPanelOpen(false)}
      />
    </div>
  );
});
