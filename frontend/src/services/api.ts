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
