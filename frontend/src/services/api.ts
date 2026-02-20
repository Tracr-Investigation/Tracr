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

    getRecentInvestigations: async (limit: number = 8) => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({limit: String(limit)});
        const response = await fetch(`${API_URL}/investigations/recent?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching recent investigations'));
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

    searchUsersForInvitation: async (query: string) => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({q: query});
        const response = await fetch(`${API_URL}/investigations/users/search?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error searching users'));
        }

        return data;
    },

    inviteCollaborator: async (investigationId: number, pseudo: string, permissionLevel: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/collaborators`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({pseudo, permission_level: permissionLevel}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error inviting collaborator'));
        }

        return data;
    },

    getCollaborators: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/collaborators`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error loading collaborators'));
        }

        return data;
    },

    updateCollaboratorPermission: async (investigationId: number, collaboratorId: number, permissionLevel: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/collaborators/${collaboratorId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({permission_level: permissionLevel}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error updating permission'));
        }

        return data;
    },

    removeCollaborator: async (investigationId: number, collaboratorId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/collaborators/${collaboratorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error removing collaborator'));
        }

        return data;
    },

    getPendingInvitations: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/me/invitations`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error loading invitations'));
        }

        return data;
    },

    acceptInvitation: async (collaboratorId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/invitations/${collaboratorId}/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error accepting invitation'));
        }

        return data;
    },

    rejectInvitation: async (collaboratorId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/invitations/${collaboratorId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error rejecting invitation'));
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

    getCategories: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/categories`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching categories'));
        return data;
    },

    createCategory: async (name: string, color: string | null, icon: string | null) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/categories`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({name, color, icon}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating category'));
        return data;
    },

    updateCategory: async (id: number, name: string, color: string | null, icon: string | null) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/categories/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({name, color, icon}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating category'));
        return data;
    },

    deleteCategory: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/categories/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting category'));
        return data;
    },

    getInvestigationCategories: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/categories`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching categories'));
        return data;
    },

    addCategoryToInvestigation: async (investigationId: number, categoryId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/categories`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({id_category: categoryId}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error adding category'));
        return data;
    },

    removeCategoryFromInvestigation: async (investigationId: number, categoryId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error removing category'));
        return data;
    },

    getLogs: async (page: number = 1, limit: number = 10, category: string = '', search: string = '', excludeReads: boolean = false) => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({page: String(page), limit: String(limit), category, search});
        if (excludeReads) params.set('exclude_reads', 'true');
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
