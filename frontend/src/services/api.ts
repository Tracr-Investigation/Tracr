const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface EntityData {
    id_entity: number;
    id_investigation: number;
    type: string;
    label: string;
    value: string | null;
    notes: string | null;
    color: string | null;
    pos_x: number | null;
    pos_y: number | null;
    created_by: number | null;
    created_by_pseudo: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface RelationData {
    id_relation: number;
    id_investigation: number;
    source_id: number;
    target_id: number;
    label: string | null;
    created_by: number | null;
    created_by_pseudo: string | null;
    created_at: string | null;
}

export interface UpdateCommit {
    sha: string;
    message: string;
    author: string | null;
    date: string | null;
    url: string | null;
}

export type UpdateApplyStatus = 'idle' | 'pending' | 'running' | 'done' | 'failed';

export interface UpdateApplyState {
    status: UpdateApplyStatus;
    message: string | null;
    target_sha: string | null;
    requested_by: string | null;
    requested_at: string | null;
    started_at: string | null;
    finished_at: string | null;
    log_tail: string | null;
}

export interface UpdateStatusData {
    repo: string;
    branch: string;
    current_sha: string | null;
    latest_sha: string | null;
    checked_at: string;
    known: boolean;
    up_to_date: boolean | null;
    ahead_by: number | null;
    behind_by: number | null;
    commits: UpdateCommit[];
    flags: { migrations: boolean; deps: boolean; rebuild: boolean };
    compare_url: string | null;
    error: 'current_sha_unknown' | 'rate_limited' | 'github_unreachable' | null;
    apply: UpdateApplyState;
    cached: boolean;
}

export {API_URL};

export type SourceType = 'page_screenshot' | 'page_mhtml' | 'media' | 'web_archive' | 'manual_file';

export interface SourceData {
    id_source: number;
    id_investigation: number;
    created_by: number | null;
    created_by_pseudo: string | null;
    title: string;
    source_url: string;
    source_type: SourceType;
    mime_type: string;
    size_bytes: number;
    content_hash: string;
    capture_group: string | null;
    role: string | null;
    show_in_list: boolean;
    page_metadata: Record<string, unknown> | null;
    notes: string | null;
    text_status: string | null;
    extracted_text: string | null;
    view_sig: string;
    captured_at: string | null;
    created_at: string | null;
}

export interface SelectorData {
    id_selector: number;
    id_investigation: number;
    created_by: number | null;
    created_by_pseudo: string | null;
    selector_type: string;
    selector_type_label: string;
    value: string;
    normalized_value: string;
    label: string | null;
    notes: string | null;
    created_at: string | null;
}

export interface SelectorTypeOption {
    value: string;
    label: string;
}

export interface HitSourceRef {
    id_source: number;
    title: string;
    source_type: SourceType;
    source_url: string;
    occurrences: number;
    snippet: string | null;
}

export interface SelectorHit {
    selector: SelectorData;
    hit_count: number;
    source_count: number;
    sources: HitSourceRef[];
}

export interface HitsResult {
    total_sources: number;
    analyzed_sources: number | null;
    pending_ocr_sources: number | null;
    selector_count: number;
    computed_at: string | null;
    stale?: boolean;
    hits: SelectorHit[];
}

export interface SourceHitEntry {
    selector: SelectorData;
    occurrences: number;
    snippet: string | null;
}

export interface SourceHitsResult {
    id_source: number;
    title: string;
    text_status: string;
    analyzed: boolean;
    computed_at?: string | null;
    selector_count?: number;
    hits: SourceHitEntry[];
}

export interface TemplateCategoryData {
    id_category_template: number;
    name: string;
    color: string | null;
    icon: string | null;
    created_at: string | null;
}

export interface TemplateData {
    id_template: number;
    name: string;
    description: string;
    is_public: boolean;
    created_by: number | null;
    created_by_pseudo: string | null;
    is_owner: boolean;
    created_at: string | null;
    updated_at: string | null;
    category: TemplateCategoryData | null;
}

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

    // Etape 2 du login quand le MFA est actif : verifie le code TOTP.
    loginMfa: async (mfaToken: string, code: string) => {
        const response = await fetch(`${API_URL}/login/mfa`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({mfa_token: mfaToken, code}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'MFA error'));
        return data;
    },

    mfaSetup: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/me/mfa/setup`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'MFA setup error'));
        return data as { secret: string; otpauth_uri: string; qr: string };
    },

    mfaEnable: async (code: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/me/mfa/enable`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({code}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'MFA enable error'));
        return data as { mfa_enabled: boolean };
    },

    mfaDisable: async (password: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/me/mfa/disable`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({password}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'MFA disable error'));
        return data as { mfa_enabled: boolean };
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

    forceChangePassword: async (newPassword: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/force-change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({new_password: newPassword}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error changing password'));
        }

        return data;
    },

    adminCreateUser: async (pseudo: string, password: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({pseudo, password}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error creating user'));
        }

        return data;
    },

    adminDeleteUser: async (userId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error deleting user'));
        }

        return data;
    },

    adminResetPassword: async (userId: number, newPassword: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users/${userId}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({new_password: newPassword}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error resetting password'));
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

    updateLanguage: async (language: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/me/language`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({language}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error updating language'));
        }

        return data as { language: string };
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

    getUpdateStatus: async (force: boolean = false): Promise<UpdateStatusData> => {
        const token = localStorage.getItem('token');
        const params = force ? '?force=true' : '';
        const response = await fetch(`${API_URL}/admin/update/status${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error fetching update status'));
        }

        return data;
    },

    applyUpdate: async (): Promise<UpdateApplyState> => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/update/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error applying update'));
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

    createInvestigation: async (title: string, description: string | null, objectives: string | null = null) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({title, description, objectives}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Error creating investigation'));
        }

        return data;
    },

    updateInvestigation: async (id: number, title: string | null, description: string | null, objectives: string | null = null) => {
        const token = localStorage.getItem('token');
        const body: Record<string, string | null> = {};
        if (title !== null) body.title = title;
        if (description !== null) body.description = description;
        if (objectives !== null) body.objectives = objectives;
        const response = await fetch(`${API_URL}/investigations/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating investigation'));
        return data;
    },

    transferInvestigation: async (id: number, newOwnerPseudo: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${id}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({new_owner_pseudo: newOwnerPseudo}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error transferring investigation'));
        return data;
    },

    deleteInvestigation: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting investigation'));
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

    getMyTasks: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tasks/me`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching my tasks'));
        return data as { tasks: Array<{
            id_task: number;
            id_investigation: number;
            investigation_title: string;
            title: string;
            status: 'todo' | 'en_cours' | 'bloque' | 'en_revue' | 'a_valider' | 'termine';
            priority: 'basse' | 'normale' | 'haute' | 'urgente';
            is_private: boolean;
            due_date: string | null;
        }> };
    },

    getTasks: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/tasks`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching tasks'));
        return data;
    },

    createTask: async (investigationId: number, body: {
        title: string;
        description?: string | null;
        status?: string;
        priority?: string;
        is_private?: boolean;
        assigned_to?: number | null;
        due_date?: string | null;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/tasks`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating task'));
        return data;
    },

    updateTask: async (investigationId: number, taskId: number, body: {
        title?: string | null;
        description?: string | null;
        status?: string | null;
        priority?: string | null;
        is_private?: boolean | null;
        assigned_to?: number | null;
        clear_assigned?: boolean;
        due_date?: string | null;
        clear_due_date?: boolean;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating task'));
        return data;
    },

    deleteTask: async (investigationId: number, taskId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting task'));
        return data;
    },

    getTaskResponses: async (investigationId: number, taskId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/tasks/${taskId}/responses`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching responses'));
        return data;
    },

    createTaskResponse: async (investigationId: number, taskId: number, content: string) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/tasks/${taskId}/responses`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({content}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating response'));
        return data;
    },

    deleteTaskResponse: async (investigationId: number, taskId: number, responseId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/tasks/${taskId}/responses/${responseId}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting response'));
        return data;
    },

    // ── Kanban : déplacement d'une tâche d'enquête ──────────────────────────
    moveTask: async (investigationId: number, taskId: number, body: { status: string; position: number }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/tasks/${taskId}/move`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error moving task'));
        return data;
    },

    // ── Tâches personnelles (hors enquête) ──────────────────────────────────
    getPersonalTasks: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tasks/personal`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching personal tasks'));
        return data;
    },

    createPersonalTask: async (body: {
        title: string;
        description?: string | null;
        status?: string;
        priority?: string;
        due_date?: string | null;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tasks/personal`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating personal task'));
        return data;
    },

    updatePersonalTask: async (taskId: number, body: {
        title?: string | null;
        description?: string | null;
        status?: string | null;
        priority?: string | null;
        due_date?: string | null;
        clear_due_date?: boolean;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tasks/personal/${taskId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating personal task'));
        return data;
    },

    movePersonalTask: async (taskId: number, body: { status: string; position: number }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tasks/personal/${taskId}/move`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error moving personal task'));
        return data;
    },

    deletePersonalTask: async (taskId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tasks/personal/${taskId}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting personal task'));
        return data;
    },

    getAssignedTasks: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tasks/assigned`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching assigned tasks'));
        return data;
    },

    // ── Template categories ─────────────────────────────────────────────────
    listTemplateCategories: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/categories`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching template categories'));
        return data as { categories: TemplateCategoryData[] };
    },

    createTemplateCategory: async (body: { name: string; color?: string; icon?: string }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/categories`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating template category'));
        return data as TemplateCategoryData;
    },

    updateTemplateCategory: async (id: number, body: { name?: string; color?: string; icon?: string }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/categories/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating template category'));
        return data as TemplateCategoryData;
    },

    deleteTemplateCategory: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/categories/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting template category'));
        return data;
    },

    // ── Templates ────────────────────────────────────────────────────────────
    listTemplates: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching templates'));
        return data as { templates: TemplateData[] };
    },

    getTemplate: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/${id}`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching template'));
        return data as TemplateData & { content_html: string };
    },

    createTemplate: async (body: {
        name: string;
        description?: string;
        content_html?: string;
        is_public?: boolean;
        id_category_template?: number | null;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating template'));
        return data as TemplateData;
    },

    updateTemplate: async (id: number, body: {
        name?: string;
        description?: string;
        content_html?: string;
        is_public?: boolean;
        id_category_template?: number | null;
        clear_category?: boolean;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating template'));
        return data as TemplateData;
    },

    deleteTemplate: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/templates/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting template'));
        return data;
    },

    listDocuments: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/documents`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching documents'));
        return data;
    },

    createDocument: async (investigationId: number, body: {
        title: string;
        content_html?: string;
        id_template?: number | null;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/documents`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating document'));
        return data;
    },

    getDocument: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${id}`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching document'));
        return data;
    },

    updateDocument: async (id: number, body: { title?: string; content_html?: string }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating document'));
        return data;
    },

    deleteDocument: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting document'));
        return data;
    },

    exportDocument: async (
        id: number,
        format: 'pdf',
        marking?: { tlp?: string; pap?: string },
    ) => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({format});
        if (marking?.tlp) params.set('tlp', marking.tlp);
        if (marking?.pap) params.set('pap', marking.pap);
        const response = await fetch(`${API_URL}/documents/${id}/export?${params.toString()}`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(parseApiError(data.detail, 'Export failed'));
        }
        const cd = response.headers.get('Content-Disposition') || '';
        const match = cd.match(/filename\*=UTF-8''([^;]+)/) || cd.match(/filename="?([^";]+)"?/);
        const filename = match ? decodeURIComponent(match[1]) : `document.${format}`;
        const blob = await response.blob();
        return { blob, filename };
    },

    // Image de couverture de l'enquete (page de garde des exports PDF).
    uploadInvestigationCover: async (investigationId: number, file: File) => {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('file', file);
        const response = await fetch(`${API_URL}/investigations/${investigationId}/cover`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${token}`},
            body: fd,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error uploading cover'));
        return data as { has_cover: boolean };
    },

    deleteInvestigationCover: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/cover`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error removing cover'));
        return data as { has_cover: boolean };
    },

    // Recupere l'image de couverture sous forme d'object URL (ou null si absente).
    getInvestigationCoverUrl: async (investigationId: number): Promise<string | null> => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/cover`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        if (!response.ok) return null;
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    },

    listDocumentComments: async (documentId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${documentId}/comments`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching comments'));
        return data;
    },

    createDocumentComment: async (documentId: number, body: { comment_id: string; quote: string; content: string }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${documentId}/comments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating comment'));
        return data;
    },

    toggleResolveDocumentComment: async (documentId: number, commentId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${documentId}/comments/${commentId}/resolve`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error toggling comment'));
        return data;
    },

    deleteDocumentComment: async (documentId: number, commentId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${documentId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting comment'));
        return data;
    },

    generateRecovery: async (currentPassword?: string) => {
        const token = localStorage.getItem('token');
        const body = currentPassword ? { current_password: currentPassword } : {};
        const response = await fetch(`${API_URL}/generate-recovery`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error generating recovery code'));
        return data as { words: string[] };
    },

    recoverPassword: async (pseudo: string, recoveryPhrase: string, newPassword: string) => {
        const response = await fetch(`${API_URL}/recover-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pseudo, recovery_phrase: recoveryPhrase, new_password: newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error recovering password'));
        return data;
    },

    getRecoveryStatus: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/me/recovery-status`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching recovery status'));
        return data as { has_recovery: boolean; recovery_created_at: string | null };
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

    createBackup: async (documentId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${documentId}/backups`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Backup error'));
        return data as { id_backup: number; created_at: string };
    },

    listBackups: async (documentId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${documentId}/backups`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching backups'));
        return data as { backups: { id_backup: number; title: string; author_pseudo: string | null; kind: 'manual' | 'auto'; pinned: boolean; created_at: string }[] };
    },

    pinBackup: async (documentId: number, backupId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${documentId}/backups/${backupId}/pin`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Pin error'));
        return data as { id_backup: number; pinned: boolean };
    },

    getBackup: async (documentId: number, backupId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${documentId}/backups/${backupId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching backup'));
        return data as { id_backup: number; title: string; content_html: string; created_at: string };
    },

    restoreBackup: async (documentId: number, backupId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/documents/${documentId}/backups/${backupId}/restore`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Restore error'));
        return data;
    },

    // --- Sources (preuves OSINT) ---

    listSources: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/sources`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching sources'));
        return data as { sources: SourceData[] };
    },

    getSource: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/sources/${id}`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching source'));
        return data as SourceData;
    },

    deleteSource: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/sources/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting source'));
        return data;
    },

    updateSource: async (
        id: number,
        body: { title?: string; notes?: string | null; show_in_list?: boolean },
    ) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/sources/${id}`, {
            method: 'PATCH',
            headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating source'));
        return data as SourceData;
    },

    listSourceMedia: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/sources/${id}/media`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching media'));
        return data as { media: SourceData[] };
    },

    // Ajout manuel d'un fichier comme source (hors extension navigateur).
    uploadSource: async (
        investigationId: number,
        params: { file: File; title: string; source_url?: string; notes?: string },
    ) => {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('file', params.file);
        fd.append('title', params.title);
        fd.append('source_type', 'manual_file');
        if (params.source_url) fd.append('source_url', params.source_url);
        if (params.notes) fd.append('notes', params.notes);
        const response = await fetch(`${API_URL}/investigations/${investigationId}/sources`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${token}`},
            body: fd,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error uploading source'));
        return data as SourceData;
    },

    // Recupere le binaire de la capture (preview + telechargement). Auth requise,
    // donc on passe par fetch + blob plutot qu'une URL <img src> directe.
    downloadSource: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/sources/${id}/download`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(parseApiError(data.detail, 'Download failed'));
        }
        const cd = response.headers.get('Content-Disposition') || '';
        const match = cd.match(/filename\*=UTF-8''([^;]+)/) || cd.match(/filename="?([^";]+)"?/);
        const filename = match ? decodeURIComponent(match[1]) : `source-${id}`;
        const blob = await response.blob();
        return { blob, filename };
    },

    // --- Sélecteurs (identifiants OSINT recherchés dans les sources) ---

    listSelectorTypes: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/selectors/types`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching selector types'));
        return data as { types: SelectorTypeOption[] };
    },

    listSelectors: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/selectors`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching selectors'));
        return data as { selectors: SelectorData[] };
    },

    createSelector: async (
        investigationId: number,
        body: { selector_type: string; value: string; label?: string | null; notes?: string | null },
    ) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/selectors`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating selector'));
        return data as SelectorData;
    },

    updateSelector: async (
        id: number,
        body: { selector_type?: string; value?: string; label?: string | null; notes?: string | null },
    ) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/selectors/${id}`, {
            method: 'PATCH',
            headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating selector'));
        return data as SelectorData;
    },

    deleteSelector: async (id: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/selectors/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting selector'));
        return data;
    },

    // Correspondances déjà enregistrées (dernier scan) + date de dernière analyse.
    getHits: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/hits`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching hits'));
        return data as HitsResult;
    },

    // (Re)lance l'analyse de toute l'enquête et enregistre les correspondances.
    scanHits: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/hits/scan`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error scanning hits'));
        return data as HitsResult;
    },

    // Hits déjà enregistrés pour une source (sans recalcul).
    getSourceHits: async (sourceId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/sources/${sourceId}/hits`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching source hits'));
        return data as SourceHitsResult;
    },

    // (Re)lance l'analyse d'une source contre les sélecteurs et enregistre les hits.
    analyzeSource: async (sourceId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/sources/${sourceId}/analyze`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error analyzing source'));
        return data as SourceHitsResult;
    },

    // Lance l'OCR (Tesseract local) sur une source image puis ré-analyse.
    ocrSource: async (sourceId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/sources/${sourceId}/ocr`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error running OCR'));
        return data as SourceHitsResult;
    },

    // --- Timeline ---

    getTimeline: async (investigationId: number, skip = 0, limit = 50) => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({skip: String(skip), limit: String(limit)});
        const response = await fetch(`${API_URL}/investigations/${investigationId}/timeline?${params}`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching timeline'));
        return data as {
            events: Array<{
                id_log: number;
                id_user: number | null;
                pseudo: string | null;
                category: string;
                action: string;
                detail: string | null;
                created_at: string | null;
            }>;
            total: number;
        };
    },

    // --- Graph ---

    getGraph: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/graph`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching graph'));
        return data as {
            nodes: EntityData[];
            edges: RelationData[];
        };
    },

    // --- Entities ---

    listEntities: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/entities`, {
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error fetching entities'));
        return data as { entities: EntityData[] };
    },

    createEntity: async (investigationId: number, body: {
        type: string; label: string; value?: string | null; notes?: string | null;
        color?: string | null; pos_x?: number | null; pos_y?: number | null;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/entities`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating entity'));
        return data as EntityData;
    },

    updateEntity: async (investigationId: number, entityId: number, body: {
        label?: string | null; value?: string | null; notes?: string | null;
        color?: string | null; pos_x?: number | null; pos_y?: number | null;
        clear_value?: boolean; clear_notes?: boolean;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/entities/${entityId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating entity'));
        return data as EntityData;
    },

    resetEntityPositions: async (investigationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/entities/reset-positions`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error resetting positions'));
        return data;
    },

    deleteEntity: async (investigationId: number, entityId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/entities/${entityId}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting entity'));
        return data;
    },

    // --- Relations ---

    createRelation: async (investigationId: number, body: {
        source_id: number; target_id: number; label?: string | null;
    }) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/relations`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error creating relation'));
        return data as RelationData;
    },

    updateRelation: async (investigationId: number, relationId: number, label: string | null) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/relations/${relationId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({label}),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error updating relation'));
        return data as RelationData;
    },

    deleteRelation: async (investigationId: number, relationId: number) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/investigations/${investigationId}/relations/${relationId}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(parseApiError(data.detail, 'Error deleting relation'));
        return data;
    },

    geocode: async (address: string): Promise<{ lat: number; lng: number; display_name: string }> => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/geocode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ address }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(parseApiError(data.detail, 'Geocoding error'));
        }
        return data;
    },
};
