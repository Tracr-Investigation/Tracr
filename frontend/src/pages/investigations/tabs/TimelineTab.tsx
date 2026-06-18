import {useState, useEffect, useCallback} from 'react';
import {
    FileText,
    CheckSquare,
    Users,
    Settings,
    Link2,
    Network,
    AlertCircle,
    ChevronDown,
} from 'lucide-react';
import {api} from '../../../services/api';
import {formatRelativeDate} from '../../../utils/date';
import {useTranslation} from 'react-i18next';
import {HelpTooltip} from '../../../components/HelpTooltip';

interface TimelineEvent {
    id_log: number;
    id_user: number | null;
    pseudo: string | null;
    category: string;
    action: string;
    detail: string | null;
    created_at: string | null;
}

const CATEGORY_CONFIG: Record<string, {icon: React.ComponentType<{size?: number; className?: string}>; color: string; bg: string}> = {
    investigation: {icon: Settings, color: 'text-primary', bg: 'bg-primary/15'},
    document:      {icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/15'},
    task:          {icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-500/15'},
    collaboration: {icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/15'},
    entity:        {icon: Network, color: 'text-violet-400', bg: 'bg-violet-500/15'},
    category:      {icon: Link2, color: 'text-cyan-400', bg: 'bg-cyan-500/15'},
};

function getCategoryConfig(category: string) {
    return CATEGORY_CONFIG[category] ?? {icon: AlertCircle, color: 'text-text-muted', bg: 'bg-border'};
}

function formatAction(category: string, action: string): string {
    const map: Record<string, string> = {
        'investigation.create': 'Investigation created',
        'investigation.update': 'Investigation updated',
        'investigation.delete': 'Investigation deleted',
        'investigation.status_change': 'Status changed',
        'investigation.transfer_ownership': 'Ownership transferred',
        'document.create': 'Document created',
        'document.update': 'Document updated',
        'document.delete': 'Document deleted',
        'document.export_pdf': 'Exported to PDF',
        'document.backup_create': 'Backup created',
        'document.backup_restore': 'Backup restored',
        'task.create': 'Task created',
        'task.update': 'Task updated',
        'task.delete': 'Task deleted',
        'task.add_response': 'Response added',
        'task.delete_response': 'Response deleted',
        'collaboration.invite': 'Collaborator invited',
        'collaboration.accept_invitation': 'Invitation accepted',
        'collaboration.reject_invitation': 'Invitation rejected',
        'collaboration.update_permission': 'Permission updated',
        'collaboration.remove': 'Collaborator removed',
        'collaboration.self_remove': 'Collaborator left',
        'entity.create': 'Entity created',
        'entity.update': 'Entity updated',
        'entity.delete': 'Entity deleted',
        'entity.link': 'Link created',
        'entity.unlink': 'Link deleted',
        'category.assign': 'Category assigned',
        'category.unassign': 'Category removed',
    };
    return map[`${category}.${action}`] ?? action.replace(/_/g, ' ');
}

const BATCH_SIZE = 50;

export const TimelineTab = ({investigationId}: {investigationId: number}) => {
    const {t} = useTranslation();
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getTimeline(investigationId, 0, BATCH_SIZE);
            setEvents(data.events);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('investigationDetail.timeline.errorLoad'));
        } finally {
            setLoading(false);
        }
    }, [investigationId]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const data = await api.getTimeline(investigationId, events.length, BATCH_SIZE);
            setEvents(prev => [...prev, ...data.events]);
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) {
        return (
            <div className="pt-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-border shrink-0 mt-0.5"/>
                        <div className="flex-1 space-y-2 pt-1">
                            <div className="h-3 bg-border rounded w-48"/>
                            <div className="h-3 bg-border rounded w-72"/>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="pt-6 text-center py-12">
                <AlertCircle size={32} className="mx-auto text-red-400 mb-3"/>
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="pt-6 text-center py-16">
                <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center mx-auto mb-4">
                    <Settings size={20} className="text-text-muted"/>
                </div>
                <p className="text-text-default font-medium mb-1">{t('investigationDetail.timeline.empty')}</p>
                <p className="text-text-muted text-sm">{t('investigationDetail.timeline.emptyDesc')}</p>
            </div>
        );
    }

    return (
        <div className="pt-6">
            <HelpTooltip helpKey="timeline.overview">
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border-subtle"/>

                <div className="space-y-1">
                    {events.map((event, idx) => {
                        const cfg = getCategoryConfig(event.category);
                        const Icon = cfg.icon;
                        const isLast = idx === events.length - 1;

                        return (
                            <div key={event.id_log} className={`relative flex gap-4 group ${isLast ? '' : ''}`}>
                                {/* Icon dot */}
                                <div className={`relative z-10 w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5 border border-border`}>
                                    <Icon size={14} className={cfg.color}/>
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="text-text-default text-sm font-medium">
                                                {formatAction(event.category, event.action)}
                                            </span>
                                            {event.pseudo && (
                                                <span className="text-text-muted text-xs ml-2">
                                                    {t('investigationDetail.timeline.by')}{' '}
                                                    <span className="text-text-default font-medium">{event.pseudo}</span>
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-text-dim text-xs shrink-0 pt-0.5">
                                            {event.created_at ? formatRelativeDate(event.created_at) : ''}
                                        </span>
                                    </div>
                                    {event.detail && (
                                        <p className="text-text-muted text-xs mt-0.5 font-mono">{event.detail}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            </HelpTooltip>

            {events.length < total && (
                <div className="flex justify-center mt-4">
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text-default border border-border hover:border-primary/40 rounded-lg transition-all disabled:opacity-40"
                    >
                        <ChevronDown size={14}/>
                        {loadingMore ? '...' : t('investigationDetail.timeline.showMore', {count: total - events.length})}
                    </button>
                </div>
            )}

            <p className="text-center text-text-dim text-xs mt-6">
                {t('investigationDetail.timeline.total_other', {count: total})}
            </p>
        </div>
    );
};
