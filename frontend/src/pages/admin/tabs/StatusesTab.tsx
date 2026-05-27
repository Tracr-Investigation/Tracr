import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { StatusBadge } from '../../../components/StatusBadge';
import { CircleDot, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatusData {
  id_status: number;
  name: string;
  color: string | null;
  created_at: string | null;
}

interface ModalProps {
  status?: StatusData;
  onClose: () => void;
  onSave: () => void;
}

const StatusFormModal = ({ status, onClose, onSave }: ModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(status?.name || '');
  const [color, setColor] = useState(status?.color || '#8b5cf6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (status) { await api.updateStatus(status.id_status, name, color); }
      else { await api.createStatus(name, color); }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card/30 border border-border-subtle rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-default">
            {status ? t('admin.statuses.editTitle') : t('admin.statuses.newTitle')}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-default transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1.5">{t('admin.statuses.nameLabel')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50}
              className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all"
              placeholder={t('admin.statuses.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1.5">{t('admin.statuses.colorLabel')}</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 rounded-lg border border-border cursor-pointer bg-transparent"
              />
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} maxLength={7}
                className="flex-1 px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default font-mono placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all"
                placeholder="#8b5cf6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1.5">{t('admin.statuses.previewLabel')}</label>
            <div className="p-3 bg-surface rounded-xl">
              <StatusBadge name={name || t('admin.statuses.previewDefault')} color={color} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-card/30 border border-border-subtle text-text-muted hover:bg-primary/10 hover:text-text-default transition-all">
              {t('admin.statuses.cancel')}
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-text-default border border-primary/30 hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              {loading ? t('admin.statuses.saving') : status ? t('admin.statuses.update') : t('admin.statuses.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteModal = ({ status, onClose, onSave }: ModalProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!status) return;
    setLoading(true);
    try {
      await api.deleteStatus(status.id_status);
      onSave();
    } catch (err) {
      console.error('Error deleting status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card/30 border border-border-subtle rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-default mb-3">{t('admin.statuses.deleteTitle')}</h3>
        <p className="text-text-muted mb-2">{t('admin.statuses.deleteConfirm')}</p>
        <div className="mb-6"><StatusBadge name={status?.name || ''} color={status?.color || null} /></div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-card/30 border border-border-subtle text-text-muted hover:bg-primary/10 hover:text-text-default transition-all">
            {t('admin.statuses.cancel')}
          </button>
          <button onClick={handleDelete} disabled={loading} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            {loading ? t('admin.statuses.deleting') : t('admin.statuses.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StatusesTab = () => {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<StatusData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editStatus, setEditStatus] = useState<StatusData | undefined>(undefined);
  const [deleteStatus, setDeleteStatus] = useState<StatusData | undefined>(undefined);

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getStatuses();
      setStatuses(data.statuses);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching statuses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  const handleSave = () => {
    setShowCreate(false);
    setEditStatus(undefined);
    setDeleteStatus(undefined);
    fetchStatuses();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 inline-flex items-center gap-4">
          <div className="w-12 h-12 bg-white/15 rounded-lg flex items-center justify-center">
            <CircleDot size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">{t('admin.statuses.totalLabel')}</p>
            <p className="text-white text-3xl font-bold">{total}</p>
          </div>
        </div>

        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-text-default border border-primary/30 hover:bg-primary/30 transition-all">
          <Plus size={16} />
          {t('admin.statuses.newStatus')}
        </button>
      </div>

      <div className="bg-card/30 border border-border-subtle rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">{t('admin.statuses.colId')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">{t('admin.statuses.colStatus')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">{t('admin.statuses.colColor')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">{t('admin.statuses.colCreated')}</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-muted">{t('admin.statuses.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-muted">{t('admin.statuses.loading')}</td></tr>
              ) : statuses.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-muted">{t('admin.statuses.empty')}</td></tr>
              ) : (
                statuses.map((s) => (
                  <tr key={s.id_status} className="border-b border-border-subtle hover:bg-card/20 transition-colors">
                    <td className="px-6 py-4 text-text-muted text-sm font-mono">#{s.id_status}</td>
                    <td className="px-6 py-4"><StatusBadge name={s.name} color={s.color} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: s.color || '#6b7280' }} />
                        <span className="text-text-muted text-sm font-mono">{s.color || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-sm">{formatDate(s.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditStatus(s)} className="p-2 rounded-lg bg-card/30 border border-border-subtle text-text-muted hover:bg-primary/20 hover:text-text-default transition-all" title={t('admin.statuses.editTooltip')}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteStatus(s)} className="p-2 rounded-lg bg-card border border-red-500/20 text-text-muted hover:bg-red-500/20 hover:text-red-400 transition-all" title={t('admin.statuses.deleteTooltip')}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <StatusFormModal onClose={() => setShowCreate(false)} onSave={handleSave} />}
      {editStatus && <StatusFormModal status={editStatus} onClose={() => setEditStatus(undefined)} onSave={handleSave} />}
      {deleteStatus && <DeleteModal status={deleteStatus} onClose={() => setDeleteStatus(undefined)} onSave={handleSave} />}
    </div>
  );
};
