import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface NotificationData {
    id_notification: number;
    id_user: number;
    type: string;
    title: string;
    message: string | null;
    reference_id: number | null;
    reference_type: string | null;
    is_read: boolean;
    created_at: string | null;
}

interface NotificationContextType {
    notifications: NotificationData[];
    unreadCount: number;
    loading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const { isAuthenticated } = useAuth();

    const silentRefresh = useCallback(async () => {
        try {
            const data = await api.getNotifications();
            setNotifications(data.notifications);
            setUnreadCount(data.unread_count);
        } catch {
            // silent
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getNotifications();
            setNotifications(data.notifications);
            setUnreadCount(data.unread_count);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (id: number) => {
        try {
            await api.markNotificationRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id_notification === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await api.markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            disconnectSocket();
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        fetchNotifications();

        const socket = connectSocket();

        const handleNewNotification = (data: NotificationData) => {
            setNotifications((prev) => [data, ...prev]);
            setUnreadCount((prev) => prev + 1);
        };

        socket.on('new_notification', handleNewNotification);
        socket.on('connect', silentRefresh);

        return () => {
            socket.off('new_notification', handleNewNotification);
            socket.off('connect', silentRefresh);
        };
    }, [isAuthenticated, fetchNotifications, silentRefresh]);

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};
