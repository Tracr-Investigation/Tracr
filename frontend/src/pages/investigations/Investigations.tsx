import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { FileSearch, Plus, X, Calendar, AlignLeft } from 'lucide-react';
import { SearchBar } from '../../components/SearchBar';
import { formatRelativeDate } from '../../utils/date';

interface StatusData {
  id_status: number;
  name: string;
  color: string | null;
}

interface InvestigationData {
  id_investigation: number;
  title: string;
  description: string | null;
  status: StatusData;
  created_at: string | null;
  updated_at: string | null;
  closed_at: string | null;
}

const StatusDropdown = ({
  currentStatusId,
  statuses,
  onSelect,
  onClose,
}: {
  currentStatusId: number;
  statuses: StatusData[];
  onSelect: (id: number) => void;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-20 bg-[#1a1a2e] border border-primary/20 rounded-xl py-1 shadow-lg min-w-[160px]"
    >
      {statuses.map((s) => (
        <button
          key={s.id_status}
          onClick={() => onSelect(s.id_status)}
          disabled={s.id_status === currentStatusId}
          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-default"
        >
          <StatusBadge name={s.name} color={s.color} />
        </button>
      ))}
    </div>
  );
};

const CreateModal = ({ onClose, onSave }: { onClose: () => void; onSave: () => void }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.createInvestigation(title, description || null);
      toast('success', 'Investigation créée avec succès');
      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(message);
      toast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-primary/20 rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-accent">Nouvelle investigation</h3>
          <button onClick={onClose} className="text-secondary hover:text-accent transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-secondary mb-1.5">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={255}
              className="w-full px-4 py-3 bg-dark/50 border border-primary/30 rounded-xl text-accent placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              placeholder="Titre de l'investigation..."
            />
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1.5">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full px-4 py-3 bg-dark/50 border border-primary/30 rounded-xl text-accent placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none"
              placeholder="Décrivez l'investigation..."
            />
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
              disabled={loading || !title.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-accent border border-primary/30 hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Investigations = () => {
  const [investigations, setInvestigations] = useState<InvestigationData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statuses, setStatuses] = useState<StatusData[]>([]);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatusId, setFilterStatusId] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchInvestigations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getInvestigations();
      setInvestigations(data.investigations);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching investigations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await api.getInvestigationStatuses();
      setStatuses(data.statuses);
    } catch (err) {
      console.error('Error fetching statuses:', err);
    }
  }, []);

  useEffect(() => {
    fetchInvestigations();
    fetchStatuses();
  }, [fetchInvestigations, fetchStatuses]);

  const handleStatusChange = async (investigationId: number, newStatusId: number) => {
    setOpenDropdown(null);
    try {
      await api.updateInvestigationStatus(investigationId, newStatusId);
      toast('success', 'Statut mis à jour');
      fetchInvestigations();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleSave = () => {
    setShowCreate(false);
    fetchInvestigations();
  };

  const filteredInvestigations = investigations.filter((inv) => {
    const matchesSearch = !searchQuery || inv.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatusId === null || inv.status.id_status === filterStatusId;
    return matchesSearch && matchesStatus;
  });

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
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-accent mb-2">Investigations</h1>
            <p className="text-secondary">Vos investigations en cours</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-accent border border-primary/30 hover:bg-primary/30 transition-all"
          >
            <Plus size={16} />
            Nouvelle investigation
          </button>
        </div>

        {/* Filtres */}
        <SearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          placeholder="Rechercher une investigation..."
          filter={{
            value: filterStatusId,
            onChange: (v) => setFilterStatusId(v as number | null),
            options: statuses.map((s) => ({ value: s.id_status, label: s.name })),
            placeholder: 'Tous les statuts',
          }}
          total={total}
          totalLabel="investigation"
        />

        {/* Liste */}
        {loading ? (
          <div className="text-center text-secondary py-12">Chargement...</div>
        ) : filteredInvestigations.length === 0 ? (
          <div className="bg-dark/50 border border-primary/20 rounded-xl p-12 text-center">
            <FileSearch size={48} className="mx-auto text-secondary mb-4" />
            <p className="text-accent text-lg font-medium mb-2">Aucune investigation</p>
            <p className="text-secondary mb-6">Créez votre première investigation pour commencer.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-accent border border-primary/30 hover:bg-primary/30 transition-all"
            >
              <Plus size={16} />
              Nouvelle investigation
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredInvestigations.map((inv) => (
              <div
                key={inv.id_investigation}
                onClick={() => navigate(`/investigations/${inv.id_investigation}`)}
                className="bg-dark/50 border border-primary/20 rounded-xl p-5 hover:border-primary/40 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-accent font-semibold text-lg truncate">{inv.title}</h3>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === inv.id_investigation ? null : inv.id_investigation)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <StatusBadge name={inv.status.name} color={inv.status.color} />
                        </button>
                        {openDropdown === inv.id_investigation && (
                          <StatusDropdown
                            currentStatusId={inv.status.id_status}
                            statuses={statuses}
                            onSelect={(id) => handleStatusChange(inv.id_investigation, id)}
                            onClose={() => setOpenDropdown(null)}
                          />
                        )}
                      </div>
                    </div>
                    {inv.description && (
                      <p className="text-secondary text-sm mb-3 flex items-start gap-2">
                        <AlignLeft size={14} className="mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{inv.description}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-secondary">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        Créé le {formatDate(inv.created_at)}
                      </span>
                      {inv.updated_at && inv.updated_at !== inv.created_at && (
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          Modifié {formatRelativeDate(inv.updated_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-secondary text-sm font-mono">#{inv.id_investigation}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modale création */}
        {showCreate && (
          <CreateModal onClose={() => setShowCreate(false)} onSave={handleSave} />
        )}
      </div>
    </Layout>
  );
};
