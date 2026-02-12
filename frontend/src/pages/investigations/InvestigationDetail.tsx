import {useState, useEffect, useCallback, useRef} from 'react';
import {useParams, Link} from 'react-router-dom';
import {Layout} from '../../components/Layout';
import {StatusBadge} from '../../components/StatusBadge';
import {useToast} from '../../contexts/ToastContext';
import {api} from '../../services/api';
import {ChevronRight, Calendar, User, LayersPlus} from 'lucide-react';
import {formatRelativeDate} from '../../utils/date';

interface StatusData {
    id_status: number;
    name: string;
    color: string | null;
}

interface OwnerData {
    id_user: number;
    pseudo: string;
}

interface InvestigationDetailData {
    id_investigation: number;
    title: string;
    description: string | null;
    status: StatusData;
    owner: OwnerData;
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
                    <StatusBadge name={s.name} color={s.color}/>
                </button>
            ))}
        </div>
    );
};

export const InvestigationDetail = () => {
    const {id} = useParams<{ id: string }>();
    const [investigation, setInvestigation] = useState<InvestigationDetailData | null>(null);
    const [statuses, setStatuses] = useState<StatusData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDropdown, setOpenDropdown] = useState(false);
    const {toast} = useToast();

    const fetchInvestigation = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await api.getInvestigation(Number(id));
            setInvestigation(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchStatuses = useCallback(async () => {
        try {
            const data = await api.getInvestigationStatuses();
            setStatuses(data.statuses);
        } catch (err) {
            console.error('Error fetching statuses:', err);
        }
    }, []);

    useEffect(() => {
        fetchInvestigation();
        fetchStatuses();
    }, [fetchInvestigation, fetchStatuses]);

    const handleStatusChange = async (newStatusId: number) => {
        if (!investigation) return;
        setOpenDropdown(false);
        try {
            await api.updateInvestigationStatus(investigation.id_investigation, newStatusId);
            toast('success', 'Statut mis à jour');
            fetchInvestigation();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
        }
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
        <Layout>
            <div className="p-8">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-1.5 text-sm mb-6">
                    <Link to="/investigations" className="text-secondary hover:text-accent transition-colors">
                        Investigations
                    </Link>
                    <ChevronRight size={14} className="text-secondary"/>
                    <span className="text-accent font-medium truncate max-w-xs">
            {loading ? '...' : investigation?.title ?? 'Introuvable'}
          </span>
                </nav>

                {loading ? (
                    <div className="text-center text-secondary py-12">Chargement...</div>
                ) : error ? (
                    <div className="bg-dark/50 border border-red-500/20 rounded-xl p-12 text-center">
                        <p className="text-red-400 text-lg font-medium mb-2">{error}</p>
                        <Link
                            to="/investigations"
                            className="text-secondary hover:text-accent transition-colors text-sm"
                        >
                            Retour aux investigations
                        </Link>
                    </div>
                ) : investigation ? (
                    <div>
                        {/* Titre + statut */}
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <h1 className="text-2xl font-bold text-accent">{investigation.title}</h1>
                            <div className="relative">
                                <button
                                    onClick={() => setOpenDropdown(!openDropdown)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <StatusBadge name={investigation.status.name} color={investigation.status.color}/>
                                </button>
                                {openDropdown && (
                                    <StatusDropdown
                                        currentStatusId={investigation.status.id_status}
                                        statuses={statuses}
                                        onSelect={handleStatusChange}
                                        onClose={() => setOpenDropdown(false)}
                                    />
                                )}
                            </div>
                        </div>

                        {investigation.description && (
                            <p className="text-secondary text-sm mb-5">{investigation.description}</p>
                        )}

                        {/* Metadonnees */}
                        <div className="flex items-center gap-5 text-sm text-secondary mb-8">
              <span className="flex items-center gap-2">
                <User size={14} className="text-primary"/>
                  {investigation.owner.pseudo}
              </span>
                            <span className="w-px h-4 bg-primary/20"/>
                            <span className="flex items-center gap-2">
                <Calendar size={14} className="text-primary"/>
                                {formatDate(investigation.created_at)}
              </span>
                            {investigation.updated_at && investigation.updated_at !== investigation.created_at && (
                                <>
                                    <span className="w-px h-4 bg-primary/20"/>
                                    <span className="flex items-center gap-2">
                    <LayersPlus size={14} className="text-primary"/>
                    Mis a jour {formatRelativeDate(investigation.updated_at)}
                  </span>
                                </>
                            )}
                            <span className="w-px h-4 bg-primary/20"/>
                            <span className="font-mono text-secondary/60">#{investigation.id_investigation}</span>
                        </div>

                        <div className="border-t border-primary/10"/>
                    </div>
                ) : null}
            </div>
        </Layout>
    );
};