import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { StatusBadge } from '../../../components/StatusBadge';
import { CircleDot, Plus, Pencil, Trash2, X } from 'lucide-react';

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
  const [name, setName] = useState(status?.name || '');
  const [color, setColor] = useState(status?.color || '#8b5cf6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (status) {
        await api.updateStatus(status.id_status, name, color);
      } else {
        await api.createStatus(name, color);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-primary/20 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-accent">
            {status ? 'Modifier le statut' : 'Nouveau statut'}
          </h3>
          <button onClick={onClose} className="text-secondary hover:text-accent transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-secondary mb-1.5">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              className="w-full px-4 py-3 bg-dark/50 border border-primary/30 rounded-xl text-accent placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              placeholder="Ex: En cours, Terminé..."
            />
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1.5">Couleur</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 rounded-lg border border-primary/30 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                maxLength={7}
                className="flex-1 px-4 py-3 bg-dark/50 border border-primary/30 rounded-xl text-accent font-mono placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                placeholder="#8b5cf6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1.5">Aperçu</label>
            <div className="p-3 bg-dark/30 rounded-xl">
              <StatusBadge name={name || 'Statut'} color={color} />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-dark/50 border border-primary/20 text-secondary hover:bg-primary/10 hover:text-accent transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-accent border border-primary/30 hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Enregistrement...' : status ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteModal = ({ status, onClose, onSave }: ModalProps) => {
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-primary/20 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-accent mb-3">Supprimer le statut</h3>
        <p className="text-secondary mb-2">
          Êtes-vous sûr de vouloir supprimer le statut :
        </p>
        <div className="mb-6">
          <StatusBadge name={status?.name || ''} color={status?.color || null} />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-dark/50 border border-primary/20 text-secondary hover:bg-primary/10 hover:text-accent transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StatusesTab = () => {
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

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleSave = () => {
    setShowCreate(false);
    setEditStatus(undefined);
    setDeleteStatus(undefined);
    fetchStatuses();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Stat Card + Bouton créer */}
      <div className="mb-8 flex items-center justify-between">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 inline-flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <CircleDot size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white/80 text-sm">Total statuts</p>
            <p className="text-white text-3xl font-bold">{total}</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-accent border border-primary/30 hover:bg-primary/30 transition-all"
        >
          <Plus size={16} />
          Nouveau statut
        </button>
      </div>

      {/* Table */}
      <div className="bg-dark/50 border border-primary/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary/20">
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">ID</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Statut</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Couleur</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Créé le</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-secondary">
                    Chargement...
                  </td>
                </tr>
              ) : statuses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-secondary">
                    Aucun statut trouvé
                  </td>
                </tr>
              ) : (
                statuses.map((s) => (
                  <tr key={s.id_status} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 text-secondary text-sm font-mono">#{s.id_status}</td>
                    <td className="px-6 py-4">
                      <StatusBadge name={s.name} color={s.color} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-primary/20"
                          style={{ backgroundColor: s.color || '#6b7280' }}
                        />
                        <span className="text-secondary text-sm font-mono">{s.color || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-secondary text-sm">{formatDate(s.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditStatus(s)}
                          className="p-2 rounded-lg bg-dark/50 border border-primary/20 text-secondary hover:bg-primary/20 hover:text-accent transition-all"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteStatus(s)}
                          className="p-2 rounded-lg bg-dark/50 border border-red-500/20 text-secondary hover:bg-red-500/20 hover:text-red-400 transition-all"
                          title="Supprimer"
                        >
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

      {/* Modales */}
      {showCreate && (
        <StatusFormModal onClose={() => setShowCreate(false)} onSave={handleSave} />
      )}
      {editStatus && (
        <StatusFormModal status={editStatus} onClose={() => setEditStatus(undefined)} onSave={handleSave} />
      )}
      {deleteStatus && (
        <DeleteModal status={deleteStatus} onClose={() => setDeleteStatus(undefined)} onSave={handleSave} />
      )}
    </div>
  );
};
