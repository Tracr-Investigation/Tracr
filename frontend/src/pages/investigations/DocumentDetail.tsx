import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import debounce from 'lodash.debounce';
import { ArrowLeft, Save, Loader2, Check, FileDown } from 'lucide-react';

import { Layout } from '../../components/Layout';
import { DocumentEditor, type RemoteUser } from '../../components/editor/DocumentEditor';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { extractIdFromSlug, toInvestigationSlug } from '../../utils/slug';
import { userColor } from '../../utils/userColor';

interface DocumentData {
  id_document: number;
  id_investigation: number;
  title: string;
  content_html: string;
  created_by: number | null;
  created_by_pseudo: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DEBOUNCE_MS = 1500;
const SAVED_RESET_DELAY_MS = 2000;
const REMOTE_USERS_VISIBLE_LIMIT = 5;
const READER_PERMISSION = 'lecteur';
const OWNER_PERMISSION = 'owner';
const DEFAULT_PSEUDO = '?';

const TOAST_TITLE_SAVED = 'Titre enregistré';
const TOAST_PDF_DONE = 'Export PDF terminé';
const TOAST_PDF_ERROR_FALLBACK = "Erreur d'export";
const TOAST_GENERIC_ERROR_FALLBACK = 'Erreur';

const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  window.document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

const isReaderPermission = (permission: string | null): boolean => {
  return permission === READER_PERMISSION;
};

const isOwnerPermission = (permission: string | null): boolean => {
  return permission === OWNER_PERMISSION;
};

const canEditWithPermission = (permission: string | null): boolean => {
  if (permission === null) {
    return false;
  }
  return !isReaderPermission(permission);
};

const resetSavedToIdle = (current: SaveState): SaveState => {
  if (current === 'saved') {
    return 'idle';
  }
  return current;
};

interface RemoteUsersBarProps {
  users: RemoteUser[];
}

const buildAvatarLabel = (pseudo: string): string => {
  return pseudo.slice(0, 1).toUpperCase();
};

const buildAvatarBackground = (user: RemoteUser): string => {
  if (user.color) {
    return user.color;
  }
  return userColor(user.userId);
};

const RemoteUsersBar = ({ users }: RemoteUsersBarProps) => {
  if (users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, REMOTE_USERS_VISIBLE_LIMIT);
  const overflowCount = users.length - visibleUsers.length;
  const hasOverflow = overflowCount > 0;

  return (
    <div className="flex items-center -space-x-1.5">
      {visibleUsers.map((user) => {
        const avatarLabel = buildAvatarLabel(user.pseudo);
        const avatarBackground = buildAvatarBackground(user);
        return (
          <div
            key={user.clientId}
            title={user.pseudo}
            className="w-6 h-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center text-[10px] font-semibold text-white"
            style={{ backgroundColor: avatarBackground }}
          >
            {avatarLabel}
          </div>
        );
      })}
      {hasOverflow && (
        <div className="w-6 h-6 rounded-full border-2 border-[#1a1a2e] bg-primary/30 flex items-center justify-center text-[10px] font-semibold text-secondary">
          +{overflowCount}
        </div>
      )}
    </div>
  );
};

interface SaveStateIndicatorProps {
  saveState: SaveState;
  canEdit: boolean;
  isReader: boolean;
}

const SaveStateIndicator = ({ saveState, canEdit, isReader }: SaveStateIndicatorProps) => {
  if (saveState === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 size={12} className="animate-spin" /> Enregistrement…
      </span>
    );
  }
  if (saveState === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Check size={12} className="text-green-400" /> Enregistré
      </span>
    );
  }
  if (saveState === 'error') {
    return <span className="text-red-400">Erreur</span>;
  }
  if (isReader) {
    return <span>Lecture seule</span>;
  }
  if (canEdit) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Save size={12} /> Auto
      </span>
    );
  }
  return null;
};

interface ExportPdfButtonProps {
  exporting: boolean;
  onClick: () => void;
}

const ExportPdfButton = ({ exporting, onClick }: ExportPdfButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={exporting}
      title="Exporter en PDF"
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-secondary hover:text-accent hover:bg-primary/10 disabled:opacity-40 transition-colors"
    >
      {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
      PDF
    </button>
  );
};

export const DocumentDetail = () => {
  const { slug, docId } = useParams<{ slug: string; docId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  let investigationId: number | null = null;
  if (slug) {
    investigationId = extractIdFromSlug(slug);
  }

  let documentId: number | null = null;
  if (docId) {
    documentId = parseInt(docId, 10);
  }

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [investigationTitle, setInvestigationTitle] = useState('');
  const [permission, setPermission] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!documentId || !investigationId) {
      return;
    }

    const loadDocumentAndInvestigation = async () => {
      const [doc, inv] = await Promise.all([
        api.getDocument(documentId),
        api.getInvestigation(investigationId),
      ]);
      if (doc.id_investigation !== investigationId) {
        throw new Error('Document does not belong to this investigation');
      }
      setDocument(doc);
      setTitle(doc.title);
      setInvestigationTitle(inv.title);
      setPermission(inv.user_permission);
    };

    loadDocumentAndInvestigation()
      .catch((err) => {
        const message = getErrorMessage(err, TOAST_GENERIC_ERROR_FALLBACK);
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [documentId, investigationId]);

  const isReader = isReaderPermission(permission);
  const isOwner = isOwnerPermission(permission);
  const canEdit = canEditWithPermission(permission);

  const saveContent = useMemo(() => {
    const performSave = async (html: string) => {
      if (!documentId) {
        return;
      }
      setSaveState('saving');
      try {
        await api.updateDocument(documentId, { content_html: html });
        setSaveState('saved');
        setTimeout(() => {
          setSaveState(resetSavedToIdle);
        }, SAVED_RESET_DELAY_MS);
      } catch {
        setSaveState('error');
      }
    };

    return debounce(performSave, SAVE_DEBOUNCE_MS);
  }, [documentId]);

  useEffect(() => {
    return () => {
      saveContent.flush();
    };
  }, [saveContent]);

  const handleContentChange = useCallback((html: string) => {
    saveContent(html);
  }, [saveContent]);

  const handleExportPdf = async () => {
    if (!documentId) {
      return;
    }

    setExporting(true);
    try {
      saveContent.flush();
      const { blob, filename } = await api.exportDocument(documentId, 'pdf');
      triggerBlobDownload(blob, filename);
      toast('success', TOAST_PDF_DONE);
    } catch (err) {
      const message = getErrorMessage(err, TOAST_PDF_ERROR_FALLBACK);
      toast('error', message);
    } finally {
      setExporting(false);
    }
  };

  const hasUnchangedTitle = (document: DocumentData, nextTitle: string): boolean => {
    return nextTitle === document.title;
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleTitleBlur = async () => {
    if (!documentId || !document) {
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    if (hasUnchangedTitle(document, trimmed)) {
      return;
    }

    try {
      await api.updateDocument(documentId, { title: trimmed });
      setDocument({ ...document, title: trimmed });
      toast('success', TOAST_TITLE_SAVED);
    } catch (err) {
      const message = getErrorMessage(err, TOAST_GENERIC_ERROR_FALLBACK);
      toast('error', message);
      setTitle(document.title);
    }
  };

  const handleNavigateBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center text-secondary">Chargement…</div>
      </Layout>
    );
  }

  const hasFatalError = Boolean(error) || !document || !investigationId;

  if (hasFatalError) {
    const errorMessage = error || 'Document introuvable';
    return (
      <Layout>
        <div className="p-8">
          <p className="text-red-400">{errorMessage}</p>
          <button onClick={handleNavigateBack} className="mt-4 text-primary underline">
            Retour
          </button>
        </div>
      </Layout>
    );
  }

  const investigationSlug = toInvestigationSlug(investigationTitle, investigationId as number);
  const backLink = `/investigations/${investigationSlug}`;
  const currentUserId = user?.id_user ?? 0;
  const currentUserPseudo = user?.pseudo ?? DEFAULT_PSEUDO;
  const safeDocument = document as DocumentData;

  return (
    <Layout>
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-primary/20 bg-[#1a1a2e]">
          <Link
            to={backLink}
            className="text-secondary hover:text-accent transition-colors inline-flex items-center gap-1 text-sm whitespace-nowrap"
          >
            <ArrowLeft size={14} /> Retour
          </Link>

          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            disabled={!canEdit}
            className="flex-1 bg-transparent text-accent font-semibold focus:outline-none px-2 py-1 disabled:opacity-70"
            placeholder="Titre du document"
          />

          <RemoteUsersBar users={remoteUsers} />

          <div className="text-xs text-secondary inline-flex items-center gap-1.5 min-w-[80px]">
            <SaveStateIndicator saveState={saveState} canEdit={canEdit} isReader={isReader} />
          </div>

          <ExportPdfButton exporting={exporting} onClick={handleExportPdf} />
        </div>

        <DocumentEditor
          documentId={safeDocument.id_document}
          initialContent={safeDocument.content_html}
          readOnly={!canEdit}
          isOwner={isOwner}
          currentUserId={currentUserId}
          currentUserPseudo={currentUserPseudo}
          onContentChange={handleContentChange}
          onRemoteUsersChange={setRemoteUsers}
        />
      </div>
    </Layout>
  );
};
