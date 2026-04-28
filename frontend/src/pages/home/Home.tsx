import {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {Layout} from '../../components/Layout';
import {StatusBadge} from '../../components/StatusBadge';
import {useAuth} from '../../contexts/AuthContext';
import {api} from '../../services/api';
import {formatRelativeDate} from '../../utils/date';
import {toInvestigationSlug} from '../../utils/slug';
import {FileSearch, ArrowRight, Users, Tag, CheckSquare, Calendar, AlertCircle} from 'lucide-react';
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
    const {t} = useTranslation();
    const [recentInvestigations, setRecentInvestigations] = useState<InvestigationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [myTasks, setMyTasks] = useState<Awaited<ReturnType<typeof api.getMyTasks>>['tasks']>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

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

    const fetchMyTasks = useCallback(async () => {
        try {
            const data = await api.getMyTasks();
            setMyTasks(data.tasks);
        } catch {
            /* silencieux */
        } finally {
            setLoadingTasks(false);
        }
    }, []);

    useEffect(() => {
        fetchRecent();
        fetchMyTasks();
    }, [fetchRecent, fetchMyTasks]);

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-text-default mb-2">{t('home.title')}</h1>
                    <p className="text-text-muted">
                        {t('home.welcome')} <span className="text-text-default font-medium">{user?.pseudo}</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
                {/* Recent investigations block */}
                <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-text-default uppercase tracking-wide">{t('home.recentlyViewed')}</h2>
                        <button
                            onClick={() => navigate('/investigations')}
                            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-default transition-colors"
                        >
                            {t('home.viewAll')}
                            <ArrowRight size={12}/>
                        </button>
                    </div>

                    {loading ? (
                        <p className="text-text-muted text-sm py-4 text-center">Loading...</p>
                    ) : recentInvestigations.length === 0 ? (
                        <div className="py-6 text-center">
                            <FileSearch size={32} className="mx-auto text-text-dim mb-2"/>
                            <p className="text-text-muted text-sm">{t('home.noRecentInvestigations')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentInvestigations.map((inv) => (
                                <div
                                    key={inv.id_investigation}
                                    onClick={() => navigate(`/investigations/${toInvestigationSlug(inv.title, inv.id_investigation)}`)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-all cursor-pointer group"
                                >
                                    <span className="text-text-dim text-xs font-mono flex-shrink-0">#{inv.id_investigation}</span>
                                    <h3 className="text-text-default text-sm font-medium truncate">{inv.title}</h3>
                                    {!inv.is_owner && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 flex-shrink-0">
                                            <Users size={8}/>
                                            {t('home.collab')}
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
                                                    <span className="text-[10px] text-text-dim">+{inv.categories.length - 2}</span>
                                                )}
                                            </div>
                                        )}
                                        {inv.updated_at && (
                                            <span className="text-[11px] text-text-dim hidden sm:block">{formatRelativeDate(inv.updated_at)}</span>
                                        )}
                                        <StatusBadge name={inv.status.name} color={inv.status.color}/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* My assigned tasks */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-text-default uppercase tracking-wide flex items-center gap-2">
                            <CheckSquare size={14} className="text-primary"/>
                            {t('home.myTasks')}
                        </h2>
                        <button
                            onClick={() => navigate('/calendar')}
                            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-default transition-colors"
                        >
                            <Calendar size={12}/>
                            {t('home.viewCalendar')}
                        </button>
                    </div>

                    {loadingTasks ? (
                        <p className="text-text-muted text-sm py-4 text-center">Loading...</p>
                    ) : myTasks.length === 0 ? (
                        <div className="py-6 text-center">
                            <CheckSquare size={28} className="mx-auto text-text-dim mb-2"/>
                            <p className="text-text-dim text-xs">{t('home.noAssignedTasks')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {myTasks.map((task) => {
                                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'termine';
                                const PRIORITY_DOT: Record<string, string> = {
                                    basse: '#6b7280', normale: '#3b82f6', haute: '#f97316', urgente: '#ef4444',
                                };
                                const STATUS_LABEL: Record<string, string> = {
                                    todo: t('home.taskStatus.todo'),
                                    en_cours: t('home.taskStatus.en_cours'),
                                    termine: t('home.taskStatus.termine'),
                                };
                                return (
                                    <div
                                        key={task.id_task}
                                        onClick={() => navigate(`/investigations/${toInvestigationSlug(task.investigation_title, task.id_investigation)}`)}
                                        className="group flex flex-col gap-1 px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                style={{backgroundColor: PRIORITY_DOT[task.priority] ?? '#6b7280'}}
                                            />
                                            <span className={`text-sm truncate ${task.status === 'termine' ? 'line-through text-text-dim' : 'text-text-default group-hover:text-primary transition-colors'}`}>
                                                {task.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 pl-3.5">
                                            <span className="text-[11px] text-text-dim truncate">{task.investigation_title}</span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] text-text-dim">{STATUS_LABEL[task.status]}</span>
                                                {task.due_date && (
                                                    <span className={`inline-flex items-center gap-0.5 text-[10px] ${isOverdue ? 'text-red-400' : 'text-text-dim'}`}>
                                                        {isOverdue ? <AlertCircle size={10}/> : <Calendar size={10}/>}
                                                        {new Date(task.due_date).toLocaleDateString('en-US', {day: '2-digit', month: '2-digit'})}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                </div>{/* end grid */}
            </div>
        </Layout>
    );
};
