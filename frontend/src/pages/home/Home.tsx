import {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {Layout} from '../../components/Layout';
import {StatusBadge} from '../../components/StatusBadge';
import {useAuth} from '../../contexts/AuthContext';
import {api} from '../../services/api';
import {formatRelativeDate} from '../../utils/date';
import {toInvestigationSlug} from '../../utils/slug';
import {FileSearch, ArrowRight, Users, Tag} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

function getIconComponent(iconName: string | null): React.ComponentType<{ size?: number; className?: string }> {
    if (!iconName) return Tag;
    const icon = (LucideIcons as Record<string, unknown>)[iconName];
    if (icon && typeof icon === 'object' && '$$typeof' in icon) return icon as React.ComponentType<{ size?: number; className?: string }>;
    if (typeof icon === 'function') return icon as React.ComponentType<{ size?: number; className?: string }>;
    return Tag;
}

interface StatusData {
    id_status: number;
    name: string;
    color: string | null;
}

interface CategoryData {
    id_category: number;
    name: string;
    color: string | null;
    icon: string | null;
}

interface InvestigationData {
    id_investigation: number;
    title: string;
    description: string | null;
    is_owner: boolean;
    status: StatusData;
    categories?: CategoryData[];
    updated_at: string | null;
}

export const Home = () => {
    const {user} = useAuth();
    const navigate = useNavigate();
    const [recentInvestigations, setRecentInvestigations] = useState<InvestigationData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRecent = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getRecentInvestigations(6);
            setRecentInvestigations(data.investigations);
        } catch (err) {
            console.error('Error fetching recent investigations:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecent();
    }, [fetchRecent]);

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-accent mb-2">Dashboard</h1>
                    <p className="text-secondary">
                        Welcome back, <span className="text-accent font-medium">{user?.pseudo}</span>
                    </p>
                </div>

                {/* Recent investigations block */}
                <div className="bg-dark/50 border border-primary/20 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-accent uppercase tracking-wide">Recently viewed</h2>
                        <button
                            onClick={() => navigate('/investigations')}
                            className="flex items-center gap-1 text-xs text-secondary hover:text-accent transition-colors"
                        >
                            View all
                            <ArrowRight size={12}/>
                        </button>
                    </div>

                    {loading ? (
                        <p className="text-secondary text-sm py-4 text-center">Loading...</p>
                    ) : recentInvestigations.length === 0 ? (
                        <div className="py-6 text-center">
                            <FileSearch size={32} className="mx-auto text-secondary/50 mb-2"/>
                            <p className="text-secondary text-sm">No recently viewed investigations</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentInvestigations.map((inv) => (
                                <div
                                    key={inv.id_investigation}
                                    onClick={() => navigate(`/investigations/${toInvestigationSlug(inv.title, inv.id_investigation)}`)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-all cursor-pointer group"
                                >
                                    <span className="text-secondary/40 text-xs font-mono flex-shrink-0">#{inv.id_investigation}</span>
                                    <h3 className="text-accent text-sm font-medium truncate">{inv.title}</h3>
                                    {!inv.is_owner && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 flex-shrink-0">
                                            <Users size={8}/>
                                            Collab
                                        </span>
                                    )}
                                    <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                                        {inv.categories && inv.categories.length > 0 && (
                                            <div className="hidden md:flex items-center gap-1">
                                                {inv.categories.slice(0, 2).map((cat) => {
                                                    const CatIcon = getIconComponent(cat.icon);
                                                    return (
                                                        <span
                                                            key={cat.id_category}
                                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                                            style={{
                                                                backgroundColor: `${cat.color || '#8b5cf6'}15`,
                                                                color: cat.color || '#8b5cf6',
                                                            }}
                                                            title={cat.name}
                                                        >
                                                            <CatIcon size={9}/>
                                                            {cat.name}
                                                        </span>
                                                    );
                                                })}
                                                {inv.categories.length > 2 && (
                                                    <span className="text-[10px] text-secondary/50">+{inv.categories.length - 2}</span>
                                                )}
                                            </div>
                                        )}
                                        {inv.updated_at && (
                                            <span className="text-[11px] text-secondary/40 hidden sm:block">{formatRelativeDate(inv.updated_at)}</span>
                                        )}
                                        <StatusBadge name={inv.status.name} color={inv.status.color}/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};
