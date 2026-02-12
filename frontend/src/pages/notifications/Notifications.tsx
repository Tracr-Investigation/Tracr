import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatRelativeDate } from '../../utils/date';
import {
    Bell,
    CheckCheck,
    Mail,
    AlertCircle,
    FileSearch,
    MessageSquare,
    Info,
} from 'lucide-react';

const typeIcons: Record<string, typeof Bell> = {
    invitation: Mail,
    status_change: AlertCircle,
    mention: MessageSquare,
    system: Info,
};

export const Notifications = () => {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();

    const handleClick = async (notification: typeof notifications[0]) => {
        if (!notification.is_read) {
            await markAsRead(notification.id_notification);
        }
        if (notification.reference_type && notification.reference_id) {
            if (notification.reference_type === 'investigation') {
                navigate(`/investigations/${notification.reference_id}`);
            }
        }
    };

    return (
        <Layout>
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-accent mb-2">Notifications</h1>
                        <p className="text-secondary">
                            {unreadCount > 0
                                ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                                : 'Toutes lues'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-accent border border-primary/30 hover:bg-primary/30 transition-all"
                        >
                            <CheckCheck size={16} />
                            Tout marquer comme lu
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center text-secondary py-12">Chargement...</div>
                ) : notifications.length === 0 ? (
                    <div className="bg-dark/50 border border-primary/20 rounded-xl p-12 text-center">
                        <Bell size={48} className="mx-auto text-secondary mb-4" />
                        <p className="text-accent text-lg font-medium mb-2">Aucune notification</p>
                        <p className="text-secondary">
                            Vous recevrez des notifications pour les invitations, changements de statut, etc.
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
                                            <Icon size={20} />
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
                                                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
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
