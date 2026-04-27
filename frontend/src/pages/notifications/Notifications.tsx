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
            toast('error', err instanceof Error ? err.message : 'Error accepting invitation');
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
            toast('error', err instanceof Error ? err.message : 'Error rejecting invitation');
        } finally {
            setProcessingId(null);
        }
    };

    const handleClick = async (notification: typeof notifications[0]) => {
        if (!notification.is_read) {
            await markAsRead(notification.id_notification);
        }
        if (notification.reference_type && notification.reference_id) {
            if (notification.reference_type === 'investigation') {
                navigate(`/investigations/${notification.reference_id}`);
            }
            if (notification.reference_type === 'collaboration') {
                navigate(`/investigations/${notification.reference_id}`);
            }
        }
    };

    return (
        <Layout>
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-accent mb-2">{t('notifications.title')}</h1>
                        <p className="text-secondary">
                            {unreadCount > 0
                                ? t('notifications.unread', {count: unreadCount})
                                : t('notifications.allRead')}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-accent border border-primary/30 hover:bg-primary/30 transition-all"
                        >
                            <CheckCheck size={16}/>
                            {t('notifications.markAllAsRead')}
                        </button>
                    )}
                </div>

                {/* Pending invitations */}
                {!loadingInvitations && invitations.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
                            <UserPlus size={18} className="text-primary"/>
                            {t('notifications.pendingInvitations')}
                        </h2>
                        <div className="grid gap-3">
                            {invitations.map((inv) => (
                                <div
                                    key={inv.id_collaborator}
                                    className="bg-dark/50 border border-primary/30 rounded-xl p-5"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                <Mail size={20} className="text-primary"/>
                                            </div>
                                            <div>
                                                <p className="text-accent font-medium">
                                                    {inv.invited_by_pseudo
                                                        ? <><span
                                                            className="text-primary">{inv.invited_by_pseudo}</span>{' '}{t('notifications.invitedBy')}</>
                                                        : t('notifications.invitationTo')
                                                    }
                                                    {' '}
                                                    <span
                                                        className="font-semibold">{inv.investigation_title}</span>
                                                </p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span
                                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                                        {t(`notifications.permissions.${inv.permission_level}`) || inv.permission_level}
                                                    </span>
                                                    {inv.invited_at && (
                                                        <span className="text-xs text-secondary">
                                                            {formatRelativeDate(inv.invited_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                            <button
                                                onClick={() => handleAccept(inv.id_collaborator)}
                                                disabled={processingId === inv.id_collaborator}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 transition-all"
                                            >
                                                <Check size={14}/>
                                                {t('notifications.accept')}
                                            </button>
                                            <button
                                                onClick={() => handleReject(inv.id_collaborator)}
                                                disabled={processingId === inv.id_collaborator}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 transition-all"
                                            >
                                                <X size={14}/>
                                                {t('notifications.reject')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center text-secondary py-12">{t('notifications.loading')}</div>
                ) : notifications.length === 0 && invitations.length === 0 ? (
                    <div className="bg-dark/50 border border-primary/20 rounded-xl p-12 text-center">
                        <Bell size={48} className="mx-auto text-secondary mb-4"/>
                        <p className="text-accent text-lg font-medium mb-2">{t('notifications.empty')}</p>
                        <p className="text-secondary">
                            {t('notifications.emptyDesc')}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {notifications.map((notification) => {
                            const Icon = typeIcons[notification.type] || Bell;
                            return (
                                <button
                                    key={notification.id_notification}
                                    onClick={() => handleClick(notification)}
                                    className={`
                                        w-full text-left bg-dark/50 border rounded-xl p-5 transition-all cursor-pointer
                                        ${notification.is_read
                                        ? 'border-primary/10 opacity-70 hover:opacity-100'
                                        : 'border-primary/30 hover:border-primary/50'
                                    }
                                    `}
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`
                                                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                                                ${notification.is_read
                                                ? 'bg-primary/5 text-secondary'
                                                : 'bg-primary/20 text-primary'
                                            }
                                            `}
                                        >
                                            <Icon size={20}/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3
                                                    className={`font-semibold truncate ${
                                                        notification.is_read ? 'text-secondary' : 'text-accent'
                                                    }`}
                                                >
                                                    {notification.title}
                                                </h3>
                                                {!notification.is_read && (
                                                    <span
                                                        className="w-2 h-2 bg-primary rounded-full flex-shrink-0"/>
                                                )}
                                            </div>
                                            {notification.message && (
                                                <p className="text-secondary text-sm mb-2 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <p className="text-xs text-secondary">
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
