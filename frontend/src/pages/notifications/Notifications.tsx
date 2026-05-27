import {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {Layout} from '../../components/Layout';
import {useNotifications} from '../../contexts/NotificationContext';
import {useToast} from '../../contexts/ToastContext';
import {api} from '../../services/api';
import {formatRelativeDate} from '../../utils/date';
import {useTranslation} from 'react-i18next';
import {
    Bell,
    CheckCheck,
    Mail,
    AlertCircle,
    MessageSquare,
    Info,
    UserPlus,
    Check,
    X,
} from 'lucide-react';

interface PendingInvitation {
    id_collaborator: number;
    id_investigation: number;
    investigation_title: string;
    permission_level: string;
    invited_by_pseudo: string | null;
    invited_at: string | null;
}

const typeIcons: Record<string, typeof Bell> = {
    invitation: Mail,
    status_change: AlertCircle,
    mention: MessageSquare,
    system: Info,
};

export const Notifications = () => {
    const {t} = useTranslation();
    const {notifications, unreadCount, loading, markAsRead, markAllAsRead} = useNotifications();
    const {toast} = useToast();
    const navigate = useNavigate();
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [loadingInvitations, setLoadingInvitations] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const fetchInvitations = useCallback(async () => {
        try {
            const data = await api.getPendingInvitations();
            setInvitations(data.invitations);
        } catch {
            setInvitations([]);
        } finally {
            setLoadingInvitations(false);
        }
    }, []);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const handleAccept = async (id: number) => {
        setProcessingId(id);
        try {
            await api.acceptInvitation(id);
            toast('success', t('notifications.invitationAccepted'));
            fetchInvitations();
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

    const handleClick = async (notification: typeof notifications[0]) => {
        if (!notification.is_read) {
            await markAsRead(notification.id_notification);
        }
        if (notification.reference_type && notification.reference_id) {
            if (notification.reference_type === 'investigation' || notification.reference_type === 'collaboration') {
                navigate(`/investigations/${notification.reference_id}`);
            }
        }
    };

    return (
        <Layout>
            <div className="px-6 pt-6 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-text-default mb-1 flex items-center gap-2.5">
                            <Bell size={20} style={{color: 'var(--theme-primary)'}}/>
                            {t('notifications.title')}
                        </h1>
                        <p className="text-text-muted text-sm">
                            {unreadCount > 0
                                ? t('notifications.unread', {count: unreadCount})
                                : t('notifications.allRead')}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-text-default text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                            style={{background: 'var(--theme-primary)'}}
                        >
                            <CheckCheck size={15}/>
                            {t('notifications.markAllAsRead')}
                        </button>
                    )}
                </div>

                {/* Pending invitations */}
                {!loadingInvitations && invitations.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                            <UserPlus size={12} style={{color: 'var(--theme-primary)'}}/>
                            {t('notifications.pendingInvitations')}
                        </h2>
                        <div className="flex flex-col gap-2">
                            {invitations.map((inv) => (
                                <div
                                    key={inv.id_collaborator}
                                    className="rounded-xl border p-5"
                                    style={{background: 'color-mix(in srgb, var(--theme-primary) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)'}}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                style={{background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)'}}>
                                                <Mail size={18} style={{color: 'var(--theme-primary)'}}/>
                                            </div>
                                            <div>
                                                <p className="text-text-default text-sm font-medium">
                                                    {inv.invited_by_pseudo
                                                        ? <><span style={{color: 'var(--theme-primary)'}}>{inv.invited_by_pseudo}</span>{' '}{t('notifications.invitedBy')}</>
                                                        : t('notifications.invitationTo')
                                                    }
                                                    {' '}
                                                    <span className="font-semibold">{inv.investigation_title}</span>
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                                        style={{background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', color: 'var(--theme-primary)'}}>
                                                        {t(`notifications.permissions.${inv.permission_level}`) || inv.permission_level}
                                                    </span>
                                                    {inv.invited_at && (
                                                        <span className="text-xs text-text-dim">
                                                            {formatRelativeDate(inv.invited_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-4">
                                            <button
                                                onClick={() => handleAccept(inv.id_collaborator)}
                                                disabled={processingId === inv.id_collaborator}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 disabled:opacity-50 transition-all"
                                            >
                                                <Check size={13}/>
                                                {t('notifications.accept')}
                                            </button>
                                            <button
                                                onClick={() => handleReject(inv.id_collaborator)}
                                                disabled={processingId === inv.id_collaborator}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-50 transition-all"
                                            >
                                                <X size={13}/>
                                                {t('notifications.reject')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notification list */}
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-text-dim text-sm">Chargement…</div>
                ) : notifications.length === 0 && invitations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Bell size={36} className="text-text-dim mb-3"/>
                        <p className="text-text-muted font-medium mb-1">{t('notifications.empty')}</p>
                        <p className="text-text-dim text-sm">{t('notifications.emptyDesc')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {notifications.map((notification) => {
                            const Icon = typeIcons[notification.type] || Bell;
                            return (
                                <button
                                    key={notification.id_notification}
                                    onClick={() => handleClick(notification)}
                                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                                        notification.is_read
                                            ? 'border-border-subtle opacity-60 hover:opacity-100'
                                            : 'border-border bg-card/20 hover:border-border'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                            notification.is_read ? 'bg-input-bg' : ''
                                        }`}
                                            style={!notification.is_read ? {background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'} : undefined}>
                                            <Icon size={16} className={notification.is_read ? 'text-text-dim' : ''} style={!notification.is_read ? {color: 'var(--theme-primary)'} : undefined}/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className={`font-semibold text-sm truncate ${notification.is_read ? 'text-text-muted' : 'text-text-default'}`}>
                                                    {notification.title}
                                                </h3>
                                                {!notification.is_read && (
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: 'var(--theme-primary)'}}/>
                                                )}
                                            </div>
                                            {notification.message && (
                                                <p className="text-text-muted text-xs mb-1.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <p className="text-[11px] text-text-dim">
                                                {formatRelativeDate(notification.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
};
