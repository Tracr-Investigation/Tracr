const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export {API_URL};

function parseApiError(detail: unknown, fallback: string): string {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail.map((err: { msg?: string }) => err.msg || fallback).join(', ');
    }
    return fallback;
}

export const api = {
    login: async (pseudo: string, password: string) => {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({pseudo, password}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Login error'));
        }

        return data;
    },

    register: async (pseudo: string, password: string) => {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({pseudo, password}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Registration error'));
        }

        return data;
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({current_password: currentPassword, new_password: newPassword}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error changing password'));
        }

        return data;
    },

    deleteAccount: async (password: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/delete-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({password}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error deleting account'));
        }

        return data;
    },

    getUsers: async (page: number = 1, limit: number = 10, search: string = '') => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({page: String(page), limit: String(limit), search});
        const response = await fetch(`${API_URL}/admin/users?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching users'));
        }

        return data;
    },

    getStatuses: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/statuses`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching statuses'));
        }

        return data;
    },

    createStatus: async (name: string, color: string | null) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/statuses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({name, color}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error creating status'));
        }

        return data;
    },

    updateStatus: async (id: number, name: string, color: string | null) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/statuses/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({name, color}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error updating status'));
        }

        return data;
    },

    deleteStatus: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/statuses/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error deleting status'));
        }

        return data;
    },

    getInvestigations: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching investigations'));
        }

        return data;
    },

    getInvestigation: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching investigation'));
        }

        return data;
    },

    getInvestigationStatuses: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/statuses`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching statuses'));
        }

        return data;
    },

    updateInvestigationStatus: async (investigationId: number, idStatus: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({id_status: idStatus}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error updating status'));
        }

        return data;
    },

    createInvestigation: async (title: string, description: string | null) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({title, description}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error creating investigation'));
        }

        return data;
    },

    getNotifications: async (skip: number = 0, limit: number = 50) => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({skip: String(skip), limit: String(limit)});
        const response = await fetch(`${API_URL}/notifications?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching notifications'));
        }

        return data;
    },

    getUnreadCount: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching unread count'));
        }

        return data;
    },

    markNotificationRead: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/notifications/${id}/read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error marking notification as read'));
        }

        return data;
    },

    markAllNotificationsRead: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/notifications/read-all`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error marking all notifications as read'));
        }

        return data;
    },

    getLogs: async (page: number = 1, limit: number = 10, category: string = '', search: string = '') => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({page: String(page), limit: String(limit), category, search});
        const response = await fetch(`${API_URL}/admin/logs?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching logs'));
        }

        return data;
    },
};
