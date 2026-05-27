import { useState, useEffect, useCallback } from 'react';
import { X, Plus, ArrowLeft, RotateCcw, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../../services/api';
import { BackupDiffView } from './BackupDiffView';

interface Backup {
  id_backup: number;
  title: string;
  author_pseudo: string | null;
  created_at: string;
}

interface BackupDetail extends Backup {
  content_html: string;
}

interface Props {
  documentId: number;
  currentHtml: string;
  onClose: () => void;
  onRestored: (newTitle: string, newHtml: string) => void;
}

export const BackupPanel = ({ documentId, currentHtml, onClose, onRestored }: Props) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<BackupDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listBackups(documentId);
      setBackups(data.backups);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.createBackup(documentId);
      await loadBackups();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = async (backup: Backup) => {
    setLoadingDetail(true);
    setSelected(null);
    try {
      const detail = await api.getBackup(documentId, backup.id_backup);
      setSelected({ ...detail, author_pseudo: backup.author_pseudo });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRestore = async () => {
    if (!selected) return;
    setRestoring(true);
    try {
      const doc = await api.restoreBackup(documentId, selected.id_backup);
      onRestored(doc.title, doc.content_html);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la restauration');
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (iso: string) =>
    format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: fr });

  return (
    <div className="w-80 flex-shrink-0 border-l border-primary/20 bg-[#12122a] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-primary/20">
        {selected ? (
          <button onClick={() => setSelected(null)} className="text-secondary hover:text-accent transition-colors">
            <ArrowLeft size={15} />
          </button>
        ) : (
          <Clock size={15} className="text-primary" />
        )}
        <span className="flex-1 text-sm font-medium text-accent">
          {selected ? 'Comparaison' : 'Historique des backups'}
        </span>
        <button onClick={onClose} className="text-secondary hover:text-accent transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="text-red-400 text-xs px-3 py-2">{error}</p>
        )}

        {/* Vue diff */}
        {selected && (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-primary/20 bg-primary/5">
              <p className="text-xs text-secondary">{formatDate(selected.created_at)}</p>
              {selected.author_pseudo && (
                <p className="text-xs text-secondary">par {selected.author_pseudo}</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              ) : (
                <BackupDiffView backupHtml={selected.content_html} currentHtml={currentHtml} />
              )}
            </div>
            <div className="px-3 py-3 border-t border-primary/20">
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm disabled:opacity-40"
              >
                {restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                Restaurer cette version
              </button>
            </div>
          </div>
        )}

        {/* Liste des backups */}
        {!selected && (
          <div>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-primary" />
              </div>
            ) : backups.length === 0 ? (
              <p className="text-secondary text-sm text-center px-3 py-8">
                Aucune backup pour ce document.
              </p>
            ) : (
              <ul>
                {backups.map((b) => (
                  <li key={b.id_backup}>
                    <button
                      onClick={() => handleSelect(b)}
                      className="w-full text-left px-3 py-3 border-b border-primary/10 hover:bg-primary/10 transition-colors"
                    >
                      <p className="text-sm text-accent font-medium truncate">{b.title}</p>
                      <p className="text-xs text-secondary mt-0.5">{formatDate(b.created_at)}</p>
                      {b.author_pseudo && (
                        <p className="text-xs text-secondary">par {b.author_pseudo}</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Footer — bouton créer */}
      {!selected && (
        <div className="px-3 py-3 border-t border-primary/20">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm disabled:opacity-40"
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Créer un backup
          </button>
        </div>
      )}
    </div>
  );
};
