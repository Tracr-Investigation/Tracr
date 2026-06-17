import {useState, useEffect, useCallback, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {Layout} from '../../components/Layout';
import {StatusBadge} from '../../components/StatusBadge';
import {usePageTitle} from '../../hooks/usePageTitle';
import {useAuth} from '../../contexts/AuthContext';
import {useNotifications} from '../../contexts/NotificationContext';
import {useToast} from '../../contexts/ToastContext';
import {api} from '../../services/api';
import {formatRelativeDate} from '../../utils/date';
import {toInvestigationSlug} from '../../utils/slug';
import {
    FileSearch, ArrowRight, Users, Tag, CheckSquare, Calendar, AlertCircle, ChevronRight,
    Clock, Mail, Check, X, UserPlus, Bell, MessageSquare, Info, PieChart,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

type IconCmp = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;

function getIconComponent(iconName: string | null): IconCmp {
    if (!iconName) return Tag;
    const icon = (LucideIcons as Record<string, unknown>)[iconName];
    if (icon && typeof icon === 'object' && '$$typeof' in icon) return icon as IconCmp;
    if (typeof icon === 'function') return icon as IconCmp;
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
    closed_at?: string | null;
}

interface PendingInvitation {
    id_collaborator: number;
    id_investigation: number;
    investigation_title: string;
    permission_level: string;
    invited_by_pseudo: string | null;
    invited_at: string | null;
}

const PRIMARY = 'var(--theme-primary)';
const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

const notifTypeIcons: Record<string, IconCmp> = {
    invitation: Mail,
    status_change: AlertCircle,
    mention: MessageSquare,
    system: Info,
};

// ── Stat card ───────────────────────────────────────────────────────────────

const StatCard = ({icon: Icon, label, value, color}: {
    icon: IconCmp; label: string; value: number; color: string;
}) => (
    <div className="rounded-xl border border-border-subtle bg-card/30 p-4 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{background: tint(color, 14)}}>
            <Icon size={19} style={{color}}/>
        </div>
        <div className="min-w-0">
            <p className="text-2xl font-bold text-text-default leading-none">{value}</p>
            <p className="text-[11px] text-text-muted mt-1.5 truncate">{label}</p>
        </div>
    </div>
);

// ── Breakdown bars ────────────────────────────────────────────────────────────

interface BreakdownItem {
    key: string | number;
    label: string;
    count: number;
    color: string;
    icon?: IconCmp;
}

const Breakdown = ({title, items, emptyLabel}: {
    title: string; items: BreakdownItem[]; emptyLabel: string;
}) => {
    const max = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
    return (
        <div>
            <h3 className="text-[11px] font-semibold text-text-dim uppercase tracking-wider mb-3">{title}</h3>
            {items.length === 0 ? (
                <p className="text-text-dim text-xs py-2">{emptyLabel}</p>
            ) : (
                <div className="space-y-2">
                    {items.map((it) => {
                        const ItIcon = it.icon;
                        return (
                            <div key={it.key} className="flex items-center gap-2.5">
                                {ItIcon
                                    ? <ItIcon size={12} className="shrink-0" />
                                    : <span className="w-2 h-2 rounded-full shrink-0" style={{background: it.color}}/>
                                }
                                <span className="text-xs text-text-muted w-24 truncate shrink-0">{it.label}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-input-bg overflow-hidden">
                                    <div className="h-full rounded-full" style={{width: `${(it.count / max) * 100}%`, background: it.color}}/>
                                </div>
                                <span className="text-xs font-medium text-text-dim w-6 text-right shrink-0">{it.count}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── Home ────────────────────────────────────────────────────────────────────

export const Home = () => {
    const {user} = useAuth();
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {toast} = useToast();
    const {notifications, markAsRead} = useNotifications();
    usePageTitle(t('sidebar.dashboard'));

    const [recentInvestigations, setRecentInvestigations] = useState<InvestigationData[]>([]);
    const [allInvestigations, setAllInvestigations] = useState<InvestigationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [myTasks, setMyTasks] = useState<Awaited<ReturnType<typeof api.getMyTasks>>['tasks']>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const fetchRecent = useCallback(async () => {
        setLoading(true);
        try {
            const [recent, all] = await Promise.all([
                api.getRecentInvestigations(6),
                api.getInvestigations(),
            ]);
            setRecentInvestigations(recent.investigations);
            setAllInvestigations(all.investigations);
        } catch {
            /* silently fail */
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMyTasks = useCallback(async () => {
        try {
            const data = await api.getMyTasks();
            setMyTasks(data.tasks);
        } catch {
            /* silently fail */
        } finally {
            setLoadingTasks(false);
        }
    }, []);

    const fetchInvitations = useCallback(async () => {
        try {
            const data = await api.getPendingInvitations();
            setInvitations(data.invitations);
        } catch {
            setInvitations([]);
        }
    }, []);

    useEffect(() => {
        fetchRecent();
        fetchMyTasks();
        fetchInvitations();
    }, [fetchRecent, fetchMyTasks, fetchInvitations]);

    const handleAccept = async (id: number) => {
        setProcessingId(id);
        try {
            await api.acceptInvitation(id);
            toast('success', t('notifications.invitationAccepted'));
            fetchInvitations();
            fetchRecent();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: number) => {
        setProcessingId(id);
        try {
            await api.rejectInvitation(id);
            toast('success', t('notifications.invitationRejected'));
            fetchInvitations();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleNotifClick = async (n: typeof notifications[0]) => {
        if (!n.is_read) await markAsRead(n.id_notification);
        if (n.reference_id && (n.reference_type === 'investigation' || n.reference_type === 'collaboration')) {
            navigate(`/investigations/${n.reference_id}`);
        }
    };

    // ── Derived stats (client-side aggregation) ──────────────────────────────
    const stats = useMemo(() => {
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const open = myTasks.filter((t) => t.status !== 'termine');
        const overdue = open.filter((t) => t.due_date && new Date(t.due_date) < now);
        const dueThisWeek = open.filter((t) => {
            if (!t.due_date) return false;
            const d = new Date(t.due_date);
            return d >= now && d <= weekEnd;
        });
        const active = allInvestigations.filter((i) => !i.closed_at);
        return {
            active: active.length,
            open: open.length,
            overdue: overdue.length,
            dueThisWeek: dueThisWeek.length,
        };
    }, [myTasks, allInvestigations]);

    const statusBreakdown = useMemo<BreakdownItem[]>(() => {
        const map = new Map<string, BreakdownItem>();
        for (const inv of allInvestigations) {
            const key = inv.status?.name ?? '-';
            const existing = map.get(key);
            if (existing) existing.count += 1;
            else map.set(key, {key, label: key, count: 1, color: inv.status?.color || '#8b5cf6'});
        }
        return [...map.values()].sort((a, b) => b.count - a.count);
    }, [allInvestigations]);

    const categoryBreakdown = useMemo<BreakdownItem[]>(() => {
        const map = new Map<number, BreakdownItem>();
        for (const inv of allInvestigations) {
            for (const cat of inv.categories ?? []) {
                const existing = map.get(cat.id_category);
                if (existing) existing.count += 1;
                else map.set(cat.id_category, {
                    key: cat.id_category, label: cat.name, count: 1,
                    color: cat.color || '#8b5cf6', icon: getIconComponent(cat.icon),
                });
            }
        }
        return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6);
    }, [allInvestigations]);

    const recentNotifications = notifications.slice(0, 5);

    return (
        <Layout>
            <div className="px-6 pt-6 pb-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-text-default mb-1">{t('home.title')}</h1>
                    <p className="text-text-muted text-sm">
                        {t('home.welcome')} <span className="text-text-default font-medium">{user?.pseudo}</span>
                    </p>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <StatCard icon={FileSearch}  label={t('home.activeInvestigations')} value={stats.active}      color={PRIMARY}/>
                    <StatCard icon={CheckSquare} label={t('home.openTasks')}            value={stats.open}        color="#3b82f6"/>
                    <StatCard icon={AlertCircle} label={t('home.overdueTasks')}         value={stats.overdue}     color="#ef4444"/>
                    <StatCard icon={Clock}       label={t('home.dueThisWeek')}          value={stats.dueThisWeek} color="#f97316"/>
                </div>

                {/* Pending invitations */}
                {invitations.length > 0 && (
                    <div className="mb-4 rounded-xl border bg-card/30"
                        style={{borderColor: tint(PRIMARY, 30)}}>
                        <div className="flex items-center px-5 py-4 border-b" style={{borderColor: tint(PRIMARY, 20)}}>
                            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <UserPlus size={12} style={{color: PRIMARY}}/>
                                {t('notifications.pendingInvitations')}
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{background: tint(PRIMARY, 20), color: PRIMARY}}>
                                    {invitations.length}
                                </span>
                            </h2>
                        </div>
                        <div className="p-3 flex flex-col gap-2">
                            {invitations.map((inv) => (
                                <div key={inv.id_collaborator} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-input-bg transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{background: tint(PRIMARY, 15)}}>
                                            <Mail size={16} style={{color: PRIMARY}}/>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-text-default truncate">
                                                {inv.invited_by_pseudo
                                                    ? <><span style={{color: PRIMARY}}>{inv.invited_by_pseudo}</span> {t('notifications.invitedBy')} </>
                                                    : `${t('notifications.invitationTo')} `}
                                                <span className="font-semibold">{inv.investigation_title}</span>
                                            </p>
                                            {inv.invited_at && (
                                                <p className="text-[11px] text-text-dim mt-0.5">{formatRelativeDate(inv.invited_at)}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleAccept(inv.id_collaborator)}
                                            disabled={processingId === inv.id_collaborator}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 disabled:opacity-50 transition-all"
                                        >
                                            <Check size={12}/>
                                            {t('notifications.accept')}
                                        </button>
                                        <button
                                            onClick={() => handleReject(inv.id_collaborator)}
                                            disabled={processingId === inv.id_collaborator}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-50 transition-all"
                                        >
                                            <X size={12}/>
                                            {t('notifications.reject')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main grid: recent investigations + my tasks */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start mb-4">
                    {/* Recent investigations */}
                    <div className="lg:col-span-3 rounded-xl border border-border-subtle bg-card/30">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('home.recentlyViewed')}</h2>
                            <button
                                onClick={() => navigate('/investigations')}
                                className="flex items-center gap-1 text-xs text-text-dim hover:text-text-default transition-colors"
                            >
                                {t('home.viewAll')}
                                <ArrowRight size={12}/>
                            </button>
                        </div>

                        <div className="p-3">
                            {loading ? (
                                <p className="text-text-dim text-sm py-8 text-center">{t('home.loading')}</p>
                            ) : recentInvestigations.length === 0 ? (
                                <div className="py-10 text-center">
                                    <FileSearch size={28} className="mx-auto text-text-dim mb-2"/>
                                    <p className="text-text-dim text-sm">{t('home.noRecentInvestigations')}</p>
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    {recentInvestigations.map((inv) => (
                                        <button
                                            key={inv.id_investigation}
                                            onClick={() => navigate(`/investigations/${toInvestigationSlug(inv.title, inv.id_investigation)}`)}
                                            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-input-bg transition-all group"
                                        >
                                            <span className="text-text-dim text-xs font-mono shrink-0">#{inv.id_investigation}</span>
                                            <span className="text-text-default text-sm font-medium truncate flex-1">{inv.title}</span>
                                            {!inv.is_owner && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-400 shrink-0">
                                                    <Users size={8}/>
                                                    {t('home.collab')}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2 shrink-0">
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
                                                                >
                                                                    <CatIcon size={9}/>
                                                                    {cat.name}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {inv.updated_at && (
                                                    <span className="text-[11px] text-text-dim hidden sm:block">{formatRelativeDate(inv.updated_at)}</span>
                                                )}
                                                <StatusBadge name={inv.status.name} color={inv.status.color}/>
                                            </div>
                                            <ChevronRight size={12} className="text-text-dim group-hover:text-text-muted transition-colors shrink-0"/>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* My assigned tasks */}
                    <div className="lg:col-span-2 rounded-xl border border-border-subtle bg-card/30">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <CheckSquare size={12} style={{color: PRIMARY}}/>
                                {t('home.myTasks')}
                            </h2>
                            <button
                                onClick={() => navigate('/tasks?tab=calendar')}
                                className="flex items-center gap-1 text-xs text-text-dim hover:text-text-default transition-colors"
                            >
                                <Calendar size={11}/>
                                {t('home.viewCalendar')}
                            </button>
                        </div>

                        <div className="p-3">
                            {loadingTasks ? (
                                <p className="text-text-dim text-sm py-8 text-center">{t('home.loading')}</p>
                            ) : myTasks.length === 0 ? (
                                <div className="py-10 text-center">
                                    <CheckSquare size={24} className="mx-auto text-text-dim mb-2"/>
                                    <p className="text-text-dim text-xs">{t('home.noAssignedTasks')}</p>
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    {myTasks.map((task) => {
                                        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'termine';
                                        const PRIORITY_DOT: Record<string, string> = {
                                            basse: '#6b7280', normale: '#3b82f6', haute: '#f97316', urgente: '#ef4444',
                                        };
                                        return (
                                            <button
                                                key={task.id_task}
                                                onClick={() => navigate(`/investigations/${toInvestigationSlug(task.investigation_title, task.id_investigation)}`)}
                                                className="w-full text-left flex flex-col gap-1 px-3 py-2.5 rounded-lg hover:bg-input-bg transition-all group"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                                        style={{backgroundColor: PRIORITY_DOT[task.priority] ?? '#6b7280'}}
                                                    />
                                                    <span className={`text-sm truncate ${task.status === 'termine' ? 'line-through text-text-dim' : 'text-text-default group-hover:text-text-muted transition-colors'}`}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 pl-3.5">
                                                    <span className="text-[11px] text-text-dim truncate">{task.investigation_title}</span>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-[10px] text-text-dim">{t(`tasks.status.${task.status}`)}</span>
                                                        {task.due_date && (
                                                            <span className={`inline-flex items-center gap-0.5 text-[10px] ${isOverdue ? 'text-red-400' : 'text-text-dim'}`}>
                                                                {isOverdue ? <AlertCircle size={10}/> : <Calendar size={10}/>}
                                                                {new Date(task.due_date).toLocaleDateString('en-US', {day: '2-digit', month: '2-digit'})}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Secondary grid: breakdown + recent notifications */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
                    {/* Breakdown by status / category */}
                    <div className="lg:col-span-3 rounded-xl border border-border-subtle bg-card/30">
                        <div className="flex items-center px-5 py-4 border-b border-border-subtle">
                            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <PieChart size={12} style={{color: PRIMARY}}/>
                                {t('home.byStatus')}
                            </h2>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Breakdown title={t('home.byStatus')} items={statusBreakdown} emptyLabel={t('home.noData')}/>
                            <Breakdown title={t('home.byCategory')} items={categoryBreakdown} emptyLabel={t('home.noData')}/>
                        </div>
                    </div>

                    {/* Recent notifications */}
                    <div className="lg:col-span-2 rounded-xl border border-border-subtle bg-card/30">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <Bell size={12} style={{color: PRIMARY}}/>
                                {t('home.recentNotifications')}
                            </h2>
                            <button
                                onClick={() => navigate('/notifications')}
                                className="flex items-center gap-1 text-xs text-text-dim hover:text-text-default transition-colors"
                            >
                                {t('home.viewAll')}
                                <ArrowRight size={12}/>
                            </button>
                        </div>
                        <div className="p-3">
                            {recentNotifications.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Bell size={24} className="mx-auto text-text-dim mb-2"/>
                                    <p className="text-text-dim text-xs">{t('home.noNotifications')}</p>
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    {recentNotifications.map((n) => {
                                        const Icon = notifTypeIcons[n.type] || Bell;
                                        return (
                                            <button
                                                key={n.id_notification}
                                                onClick={() => handleNotifClick(n)}
                                                className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-input-bg transition-all"
                                            >
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                    style={n.is_read ? undefined : {background: tint(PRIMARY, 15)}}>
                                                    <Icon size={14} className={n.is_read ? 'text-text-dim' : ''} style={n.is_read ? undefined : {color: PRIMARY}}/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm truncate ${n.is_read ? 'text-text-muted' : 'text-text-default font-medium'}`}>{n.title}</span>
                                                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background: PRIMARY}}/>}
                                                    </div>
                                                    {n.created_at && (
                                                        <p className="text-[11px] text-text-dim mt-0.5">{formatRelativeDate(n.created_at)}</p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
