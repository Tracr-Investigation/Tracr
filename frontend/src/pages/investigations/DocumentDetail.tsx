import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import debounce from 'lodash.debounce';
import { ArrowLeft, Save, Loader2, Check, FileDown, History, ScanSearch, X, ShieldAlert } from 'lucide-react';

import { Layout } from '../../components/Layout';
import { usePageTitle } from '../../hooks/usePageTitle';
import { DocumentEditor, type RemoteUser, type DocumentEditorHandle } from '../../components/editor/DocumentEditor';
import { BackupPanel } from '../../components/editor/BackupPanel';
import { IocPanel } from '../../components/osint/IocPanel';
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

// Marquages disponibles avant export (cf. backend export_service).
type Protocol = 'TLP' | 'PAP';
const PROTOCOL_LEVELS: Record<Protocol, string[]> = {
  TLP: ['CLEAR', 'GREEN', 'AMBER', 'AMBER+STRICT', 'RED'],
  PAP: ['CLEAR', 'GREEN', 'AMBER', 'RED'],
};
const MARK_COLORS: Record<string, string> = {
  RED: '#FF2B2B',
  AMBER: '#FFC000',
  'AMBER+STRICT': '#FFC000',
  GREEN: '#33FF00',
  CLEAR: '#FFFFFF',
};

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
            className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-semibold text-text-default"
            style={{ backgroundColor: avatarBackground }}
          >
            {avatarLabel}
          </div>
        );
      })}
      {hasOverflow && (
        <div className="w-6 h-6 rounded-full border-2 border-card bg-primary/30 flex items-center justify-center text-[10px] font-semibold text-secondary">
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

interface ExportPanelProps {
  exporting: boolean;
  onClose: () => void;
  onConfirm: (marking: { tlp?: string; pap?: string }) => void;
}

// Level selector for a protocol (TLP or PAP). `null` = no marking.
const MarkingSelector = ({
  protocol,
  value,
  onChange,
}: {
  protocol: Protocol;
  value: string | null;
  onChange: (level: string | null) => void;
}) => (
  <div>
    <label className="block text-xs text-secondary mb-1.5">{protocol}</label>
    <div className="grid grid-cols-2 gap-1.5">
      <button
        onClick={() => onChange(null)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          value === null ? 'border-primary bg-primary/10 text-accent' : 'border-border text-secondary hover:text-accent'
        }`}
      >
        <span className="w-3 h-3 rounded-sm shrink-0 border border-border" />
        Aucun
      </button>
      {PROTOCOL_LEVELS[protocol].map((lvl) => {
        const active = lvl === value;
        return (
          <button
            key={lvl}
            onClick={() => onChange(lvl)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              active ? 'border-primary bg-primary/10 text-accent' : 'border-border text-secondary hover:text-accent'
            }`}
          >
            <span
              className="w-3 h-3 rounded-sm shrink-0 border border-black/40"
              style={{ background: MARK_COLORS[lvl] }}
            />
            {lvl}
          </button>
        );
      })}
    </div>
  </div>
);

const ExportPanel = ({ exporting, onClose, onConfirm }: ExportPanelProps) => {
  const [tlp, setTlp] = useState<string | null>('AMBER');
  const [pap, setPap] = useState<string | null>(null);

  const badges = [
    tlp ? { label: `TLP:${tlp}`, color: MARK_COLORS[tlp] } : null,
    pap ? { label: `PAP:${pap}`, color: MARK_COLORS[pap] } : null,
  ].filter((b): b is { label: string; color: string } => b !== null);

  return (
    <div className="w-80 flex-shrink-0 border-l border-primary/20 bg-card flex flex-col h-full animate-slide-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-primary/20">
        <ShieldAlert size={15} className="text-primary" />
        <span className="flex-1 text-sm font-medium text-accent">Export PDF</span>
        <button onClick={onClose} className="text-secondary hover:text-accent transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <p className="text-xs text-secondary">
          Choisissez un marquage TLP et/ou PAP (les deux peuvent être affichés).
        </p>

        <MarkingSelector protocol="TLP" value={tlp} onChange={setTlp} />
        <MarkingSelector protocol="PAP" value={pap} onChange={setPap} />

        <div>
          <label className="block text-xs text-secondary mb-1.5">Aperçu du marquage</label>
          <div className="flex flex-wrap items-center justify-center gap-2 py-3 rounded-xl border border-border bg-input-bg min-h-[44px]">
            {badges.length === 0 ? (
              <span className="text-xs text-text-dim">Aucun marquage</span>
            ) : (
              badges.map((b) => (
                <span
                  key={b.label}
                  className="inline-block px-3 py-1 rounded font-bold text-sm"
                  style={{ background: '#000', color: b.color }}
                >
                  {b.label}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-primary/20">
        <button
          onClick={() => onConfirm({ tlp: tlp ?? undefined, pap: pap ?? undefined })}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-40"
        >
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
          Générer le PDF
        </button>
      </div>
    </div>
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
  usePageTitle(document?.title);
  const [investigationTitle, setInvestigationTitle] = useState('');
  const [permission, setPermission] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [showIocPanel, setShowIocPanel] = useState(false);
  const [currentHtml, setCurrentHtml] = useState('');
  const editorRef = useRef<DocumentEditorHandle>(null);

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
    setCurrentHtml(html);
    saveContent(html);
  }, [saveContent]);

  const handleRestored = useCallback((newTitle: string, newHtml: string) => {
    setDocument((prev) => prev ? { ...prev, title: newTitle, content_html: newHtml } : prev);
    setTitle(newTitle);
    setCurrentHtml(newHtml);
    editorRef.current?.setContent(newHtml);
  }, []);

  const handleExportPdf = async (marking: { tlp?: string; pap?: string }) => {
    if (!documentId) {
      return;
    }

    setExporting(true);
    try {
      saveContent.flush();
      const { blob, filename } = await api.exportDocument(documentId, 'pdf', marking);
      triggerBlobDownload(blob, filename);
      setShowExportDialog(false);
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
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-primary/20 bg-card">
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

          <ExportPdfButton exporting={exporting} onClick={() => setShowExportDialog(true)} />

          <button
            onClick={() => setShowIocPanel((v) => !v)}
            title="Détecter les indicateurs (IOC)"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${showIocPanel ? 'text-primary bg-primary/20' : 'text-secondary hover:text-accent hover:bg-primary/10'}`}
          >
            <ScanSearch size={13} />
            IOC
          </button>

          {canEdit && (
            <button
              onClick={() => setShowBackupPanel((v) => !v)}
              title="Historique des backups"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${showBackupPanel ? 'text-primary bg-primary/20' : 'text-secondary hover:text-accent hover:bg-primary/10'}`}
            >
              <History size={13} />
              Historique
            </button>
          )}
        </div>

        <div className="flex flex-row flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <DocumentEditor
              ref={editorRef}
              documentId={safeDocument.id_document}
              investigationId={investigationId as number}
              initialContent={safeDocument.content_html}
              readOnly={!canEdit}
              isOwner={isOwner}
              currentUserId={currentUserId}
              currentUserPseudo={currentUserPseudo}
              onContentChange={handleContentChange}
              onRemoteUsersChange={setRemoteUsers}
              onEntityMentionClick={() => navigate(`${backLink}#analyse/graph`)}
            />
          </div>

          {showIocPanel && (
            <IocPanel
              investigationId={investigationId as number}
              html={currentHtml || safeDocument.content_html}
              canEdit={canEdit}
              onClose={() => setShowIocPanel(false)}
            />
          )}

          {showBackupPanel && canEdit && (
            <BackupPanel
              documentId={safeDocument.id_document}
              currentHtml={currentHtml || safeDocument.content_html}
              onClose={() => setShowBackupPanel(false)}
              onRestored={handleRestored}
            />
          )}

          {showExportDialog && (
            <ExportPanel
              exporting={exporting}
              onClose={() => setShowExportDialog(false)}
              onConfirm={handleExportPdf}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};
