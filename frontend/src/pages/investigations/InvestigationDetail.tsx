import {useState, useEffect, useCallback, useRef} from 'react';
import {useParams, Link, useNavigate} from 'react-router-dom';
import {Layout} from '../../components/Layout';
import {StatusBadge} from '../../components/StatusBadge';
import {usePageTitle} from '../../hooks/usePageTitle';
import {Tabs} from '../../components/Tabs';
import {SubTabs} from '../../components/SubTabs';
import {useToast} from '../../contexts/ToastContext';
import {useAuth} from '../../contexts/AuthContext';
import {api} from '../../services/api';
import {
    ChevronRight,
    Calendar,
    User,
    LayersPlus,
    FileText,
    Users,
    Search,
    Trash2,
    Clock,
    UserPlus,
    ChevronDown,
    ChevronUp,
    Tag,
    Plus,
    X,
    Settings,
    CheckSquare,
    History,
    Network,
    Map as MapIcon,
    Archive,
    Crosshair,
    ImagePlus,
    Loader2,
} from 'lucide-react';
import {TasksTab} from './tabs/TasksTab';
import {DocumentsTab} from './tabs/DocumentsTab';
import {SourcesTab} from './tabs/SourcesTab';
import {SelectorsTab} from './tabs/SelectorsTab';
import {TimelineTab} from './tabs/TimelineTab';
import {GraphTab} from './tabs/GraphTab';
import {MapTab} from './tabs/MapTab';
import * as LucideIcons from 'lucide-react';
import {formatRelativeDate} from '../../utils/date';
import {extractIdFromSlug, toInvestigationSlug} from '../../utils/slug';
import {useTranslation} from 'react-i18next';

function getIconComponent(iconName: string | null): React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }> {
    if (!iconName) return Tag;
    const icon = (LucideIcons as Record<string, unknown>)[iconName];
    if (icon && typeof icon === 'object' && '$$typeof' in icon) return icon as React.ComponentType<{
        size?: number;
        className?: string;
        style?: React.CSSProperties
    }>;
    if (typeof icon === 'function') return icon as React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
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

interface OwnerData {
    id_user: number;
    pseudo: string;
}

interface CollaboratorData {
    id_collaborator: number;
    id_user: number;
    pseudo: string;
    permission_level: string;
    invited_at: string | null;
    accepted_at: string | null;
}

interface InvestigationDetailData {
    id_investigation: number;
    title: string;
    description: string | null;
    status: StatusData;
    categories?: CategoryData[];
    owner: OwnerData;
    collaborators: CollaboratorData[];
    user_permission: string | null;
    has_cover?: boolean;
    created_at: string | null;
    updated_at: string | null;
    closed_at: string | null;
}

interface UserSearchResult {
    id_user: number;
    pseudo: string;
}

const permissionColors: Record<string, string> = {
    manager: '#f59e0b',
    editeur: '#3b82f6',
    lecteur: '#6b7280',
};

const dropdownStyle = {background: 'var(--color-card)', border: '1px solid var(--color-border)'};

const StatusDropdown = ({
    currentStatusId,
    statuses,
    onSelect,
    onClose,
}: {
    currentStatusId: number;
    statuses: StatusData[];
    onSelect: (id: number) => void;
    onClose: () => void;
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    return (
        <div ref={ref} className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 shadow-xl min-w-[160px]" style={dropdownStyle}>
            {statuses.map((s) => (
                <button
                    key={s.id_status}
                    onClick={() => onSelect(s.id_status)}
                    disabled={s.id_status === currentStatusId}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-input-bg transition-colors disabled:opacity-40 disabled:cursor-default"
                >
                    <StatusBadge name={s.name} color={s.color}/>
                </button>
            ))}
        </div>
    );
};

const CollaboratorsTab = ({
    investigation,
    onRefresh,
}: {
    investigation: InvestigationDetailData;
    onRefresh: () => void;
}) => {
    const {t} = useTranslation();
    const {toast} = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState('lecteur');
    const [inviting, setInviting] = useState(false);
    const [permDropdown, setPermDropdown] = useState<number | null>(null);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const permRef = useRef<HTMLDivElement>(null);

    const canInvite = investigation.user_permission === 'owner' || investigation.user_permission === 'manager';
    const isOwner = investigation.user_permission === 'owner';

    const permissionLabels: Record<string, string> = {
        manager: t('notifications.permissions.manager'),
        editeur: t('notifications.permissions.editeur'),
        lecteur: t('notifications.permissions.lecteur'),
    };

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults([]);
            if (permRef.current && !permRef.current.contains(e.target as Node)) setPermDropdown(null);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (value.length < 2) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const data = await api.searchUsersForInvitation(value);
                setSearchResults(data.users);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const handleInvite = async (pseudo: string) => {
        setInviting(true);
        try {
            await api.inviteCollaborator(investigation.id_investigation, pseudo, selectedPermission);
            toast('success', t('investigationDetail.collaborators.invitedSuccess', {pseudo}));
            setSearchQuery('');
            setSearchResults([]);
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        } finally {
            setInviting(false);
        }
    };

    const handleUpdatePermission = async (collaboratorId: number, newPermission: string) => {
        setPermDropdown(null);
        try {
            await api.updateCollaboratorPermission(investigation.id_investigation, collaboratorId, newPermission);
            toast('success', t('investigationDetail.collaborators.permissionUpdated'));
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        }
    };

    const handleRemove = async (collaboratorId: number, pseudo: string) => {
        try {
            await api.removeCollaborator(investigation.id_investigation, collaboratorId);
            toast('success', t('investigationDetail.collaborators.removed', {pseudo}));
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        }
    };

    const permissionOptions = investigation.user_permission === 'manager'
        ? ['editeur', 'lecteur']
        : ['manager', 'editeur', 'lecteur'];

    return (
        <div className="space-y-5">
            {canInvite && (
                <div className="rounded-xl border border-border-subtle bg-card/30 p-5">
                    <h3 className="text-text-default font-semibold mb-4 flex items-center gap-2 text-sm">
                        <UserPlus size={14} style={{color: 'var(--theme-primary)'}}/>
                        {t('investigationDetail.collaborators.inviteTitle')}
                    </h3>
                    <div className="flex gap-3">
                        <div className="flex-1 relative" ref={searchRef}>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"/>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder={t('investigationDetail.collaborators.searchPlaceholder')}
                                    disabled={inviting}
                                    className="w-full pl-9 pr-4 py-2.5 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-muted focus:outline-none focus:border-[var(--theme-primary)] transition-colors text-sm"
                                />
                            </div>
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl py-1 shadow-xl max-h-48 overflow-y-auto" style={dropdownStyle}>
                                    {searchResults.map((u) => (
                                        <button
                                            key={u.id_user}
                                            onClick={() => handleInvite(u.pseudo)}
                                            disabled={inviting}
                                            className="w-full px-4 py-2.5 text-left text-sm text-text-default hover:bg-input-bg transition-colors flex items-center gap-2"
                                        >
                                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-text-default shrink-0"
                                                style={{background: 'color-mix(in srgb, var(--theme-primary) 25%, transparent)', color: 'var(--theme-primary)'}}>
                                                {u.pseudo.charAt(0).toUpperCase()}
                                            </span>
                                            {u.pseudo}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {searching && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl py-3 shadow-xl text-center text-sm text-text-muted" style={dropdownStyle}>
                                    {t('investigationDetail.collaborators.searching')}
                                </div>
                            )}
                        </div>
                        <select
                            value={selectedPermission}
                            onChange={(e) => setSelectedPermission(e.target.value)}
                            className="px-4 py-2.5 bg-input-bg border border-border rounded-xl text-text-default text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                        >
                            {permissionOptions.map((p) => (
                                <option key={p} value={p} className="bg-card text-text-default">
                                    {permissionLabels[p]}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {investigation.collaborators.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-border-subtle">
                        <Users size={28} className="text-text-dim mb-2"/>
                        <p className="text-text-muted font-medium text-sm mb-1">{t('investigationDetail.collaborators.empty')}</p>
                        <p className="text-text-dim text-xs">
                            {canInvite
                                ? t('investigationDetail.collaborators.emptyDesc')
                                : t('investigationDetail.collaborators.emptyDescReadonly')}
                        </p>
                    </div>
                ) : (
                    investigation.collaborators.map((collab) => (
                        <div
                            key={collab.id_collaborator}
                            className="rounded-xl border border-border-subtle bg-card/30 p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                                    style={{background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)', color: 'var(--theme-primary)'}}>
                                    {collab.pseudo.charAt(0).toUpperCase()}
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-text-default font-medium text-sm">{collab.pseudo}</span>
                                        <span
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                            style={{
                                                backgroundColor: `${permissionColors[collab.permission_level]}20`,
                                                color: permissionColors[collab.permission_level],
                                            }}
                                        >
                                            {permissionLabels[collab.permission_level]}
                                        </span>
                                        {!collab.accepted_at && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">
                                                <Clock size={10}/>
                                                {t('investigationDetail.collaborators.pending')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-text-dim text-xs mt-0.5">
                                        {t('investigationDetail.collaborators.invited')} {collab.invited_at ? formatRelativeDate(collab.invited_at) : ''}
                                    </p>
                                </div>
                            </div>

                            {isOwner && (
                                <div className="flex items-center gap-1">
                                    <div className="relative" ref={permDropdown === collab.id_collaborator ? permRef : null}>
                                        <button
                                            onClick={() => setPermDropdown(permDropdown === collab.id_collaborator ? null : collab.id_collaborator)}
                                            className="p-2 text-text-dim hover:text-text-default hover:bg-input-bg rounded-lg transition-all"
                                        >
                                            <ChevronDown size={14}/>
                                        </button>
                                        {permDropdown === collab.id_collaborator && (
                                            <div className="absolute top-full right-0 mt-1 z-20 rounded-xl py-1 shadow-xl min-w-[140px]" style={dropdownStyle}>
                                                {['manager', 'editeur', 'lecteur'].map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => handleUpdatePermission(collab.id_collaborator, p)}
                                                        disabled={p === collab.permission_level}
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-input-bg transition-colors disabled:opacity-40 disabled:cursor-default"
                                                    >
                                                        <span style={{color: permissionColors[p]}}>
                                                            {permissionLabels[p]}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemove(collab.id_collaborator, collab.pseudo)}
                                        className="p-2 text-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const CategoriesSection = ({
    investigation,
    onRefresh,
}: {
    investigation: InvestigationDetailData;
    onRefresh: () => void;
}) => {
    const {t} = useTranslation();
    const {toast} = useToast();
    const [allCategories, setAllCategories] = useState<CategoryData[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    const canEdit = investigation.user_permission === 'owner'
        || investigation.user_permission === 'manager'
        || investigation.user_permission === 'editeur';

    const fetchAllCategories = useCallback(async () => {
        try {
            const data = await api.getInvestigationCategories();
            setAllCategories(data.categories);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (showPicker) fetchAllCategories();
    }, [showPicker, fetchAllCategories]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const assignedIds = new Set(investigation.categories?.map(c => c.id_category) ?? []);
    const unassigned = allCategories.filter(c => !assignedIds.has(c.id_category));

    const handleAdd = async (categoryId: number) => {
        try {
            await api.addCategoryToInvestigation(investigation.id_investigation, categoryId);
            toast('success', t('investigationDetail.categories.added'));
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        }
    };

    const handleRemove = async (categoryId: number) => {
        try {
            await api.removeCategoryFromInvestigation(investigation.id_investigation, categoryId);
            toast('success', t('investigationDetail.categories.removed'));
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        }
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {investigation.categories?.map((cat) => {
                const CatIcon = getIconComponent(cat.icon);
                return (
                    <span
                        key={cat.id_category}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium group"
                        style={{
                            backgroundColor: `${cat.color || '#8b5cf6'}20`,
                            color: cat.color || '#8b5cf6',
                            border: `1px solid ${cat.color || '#8b5cf6'}40`,
                        }}
                    >
                        <CatIcon size={12}/>
                        {cat.name}
                        {canEdit && (
                            <button
                                onClick={() => handleRemove(cat.id_category)}
                                className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                            >
                                <X size={12}/>
                            </button>
                        )}
                    </span>
                );
            })}
            {canEdit && (
                <div className="relative" ref={pickerRef}>
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-text-dim border border-dashed border-border hover:border-primary/50 hover:text-text-muted transition-all"
                    >
                        <Plus size={12}/>
                        {t('investigationDetail.categories.add')}
                    </button>
                    {showPicker && (
                        <div className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 shadow-xl min-w-[180px] max-h-48 overflow-y-auto" style={dropdownStyle}>
                            {unassigned.length === 0 ? (
                                <p className="px-3 py-2 text-text-muted text-sm">{t('investigationDetail.categories.noMore')}</p>
                            ) : (
                                unassigned.map((cat) => {
                                    const CatIcon = getIconComponent(cat.icon);
                                    return (
                                        <button
                                            key={cat.id_category}
                                            onClick={() => { handleAdd(cat.id_category); setShowPicker(false); }}
                                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-input-bg transition-colors text-sm"
                                        >
                                            <CatIcon size={14} className="shrink-0" style={{color: cat.color || '#8b5cf6'} as React.CSSProperties}/>
                                            <span className="text-text-default">{cat.name}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SettingsTab = ({
    investigation,
    onRefresh,
    onNavigateAway,
    onSlugUpdate,
}: {
    investigation: InvestigationDetailData;
    onRefresh: () => void;
    onNavigateAway: () => void;
    onSlugUpdate: (newTitle: string) => void;
}) => {
    const {t} = useTranslation();
    const {toast} = useToast();
    const [title, setTitle] = useState(investigation.title);
    const [description, setDescription] = useState(investigation.description || '');
    const [saving, setSaving] = useState(false);
    const [transferQuery, setTransferQuery] = useState('');
    const [transferResults, setTransferResults] = useState<UserSearchResult[]>([]);
    const [transferSearching, setTransferSearching] = useState(false);
    const [selectedTransferUser, setSelectedTransferUser] = useState<UserSearchResult | null>(null);
    const [showTransferConfirm, setShowTransferConfirm] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const transferTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transferRef = useRef<HTMLDivElement>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [hasCover, setHasCover] = useState(!!investigation.has_cover);
    const [coverLoading, setCoverLoading] = useState(false);

    const hasChanges = title !== investigation.title || description !== (investigation.description || '');

    // Charge un apercu de la couverture existante (object URL revoque au demontage).
    useEffect(() => {
        if (!investigation.has_cover) return;
        let active = true;
        let created: string | null = null;
        api.getInvestigationCoverUrl(investigation.id_investigation).then((url) => {
            if (url && active) { created = url; setCoverUrl(url); }
            else if (url) URL.revokeObjectURL(url);
        });
        return () => { active = false; if (created) URL.revokeObjectURL(created); };
    }, [investigation.id_investigation, investigation.has_cover]);

    const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (coverInputRef.current) coverInputRef.current.value = '';
        if (!file) return;
        setCoverLoading(true);
        try {
            await api.uploadInvestigationCover(investigation.id_investigation, file);
            if (coverUrl) URL.revokeObjectURL(coverUrl);
            setCoverUrl(URL.createObjectURL(file));
            setHasCover(true);
            toast('success', t('investigationDetail.settings.coverUpdated'));
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        } finally {
            setCoverLoading(false);
        }
    };

    const handleCoverRemove = async () => {
        setCoverLoading(true);
        try {
            await api.deleteInvestigationCover(investigation.id_investigation);
            if (coverUrl) URL.revokeObjectURL(coverUrl);
            setCoverUrl(null);
            setHasCover(false);
            toast('success', t('investigationDetail.settings.coverRemoved'));
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        } finally {
            setCoverLoading(false);
        }
    };

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (transferRef.current && !transferRef.current.contains(e.target as Node)) setTransferResults([]);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const newTitle = title !== investigation.title ? title : null;
            const newDesc = description !== (investigation.description || '') ? description : null;
            await api.updateInvestigation(investigation.id_investigation, newTitle, newDesc);
            toast('success', t('investigationDetail.settings.updated'));
            if (newTitle) onSlugUpdate(newTitle);
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        } finally {
            setSaving(false);
        }
    };

    const handleTransferSearch = (value: string) => {
        setTransferQuery(value);
        setSelectedTransferUser(null);
        if (transferTimeout.current) clearTimeout(transferTimeout.current);
        if (value.length < 2) { setTransferResults([]); return; }
        transferTimeout.current = setTimeout(async () => {
            setTransferSearching(true);
            try {
                const data = await api.searchUsersForInvitation(value);
                setTransferResults(data.users);
            } catch {
                setTransferResults([]);
            } finally {
                setTransferSearching(false);
            }
        }, 300);
    };

    const handleTransfer = async () => {
        if (!selectedTransferUser) return;
        setTransferring(true);
        try {
            await api.transferInvestigation(investigation.id_investigation, selectedTransferUser.pseudo);
            toast('success', t('investigationDetail.settings.transferred', {pseudo: selectedTransferUser.pseudo}));
            onNavigateAway();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        } finally {
            setTransferring(false);
            setShowTransferConfirm(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.deleteInvestigation(investigation.id_investigation);
            toast('success', t('investigationDetail.settings.deleted'));
            onNavigateAway();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        } finally {
            setDeleting(false);
        }
    };

    const inputClass = "w-full px-3 py-2 bg-input-bg border border-border rounded-xl text-text-default text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors placeholder-text-muted";

    return (
        <div className="max-w-2xl space-y-1 divide-y divide-white/6">
            <div className="flex items-start gap-4 py-3">
                <label className="text-sm text-text-muted w-24 shrink-0 pt-1.5">{t('investigationDetail.settings.coverLabel')}</label>
                <div className="flex-1">
                    <div className="flex items-start gap-3">
                        <div className="w-28 h-20 rounded-lg overflow-hidden border border-border bg-input-bg shrink-0 flex items-center justify-center">
                            {coverUrl ? (
                                <img src={coverUrl} alt="" className="w-full h-full object-cover"/>
                            ) : (
                                <span className="text-[10px] text-text-dim text-center px-1.5 leading-tight">
                                    {t('investigationDetail.settings.coverDefault')}
                                </span>
                            )}
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs text-text-dim">{t('investigationDetail.settings.coverHint')}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => coverInputRef.current?.click()}
                                    disabled={coverLoading}
                                    className="px-3 py-1.5 rounded-xl text-xs font-medium border border-border text-text-default hover:border-[var(--theme-primary)] transition-all disabled:opacity-40 inline-flex items-center gap-1.5"
                                >
                                    {coverLoading ? <Loader2 size={13} className="animate-spin"/> : <ImagePlus size={13}/>}
                                    {hasCover ? t('investigationDetail.settings.coverChange') : t('investigationDetail.settings.coverUpload')}
                                </button>
                                {hasCover && (
                                    <button
                                        onClick={handleCoverRemove}
                                        disabled={coverLoading}
                                        className="px-3 py-1.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                                    >
                                        {t('investigationDetail.settings.coverRemove')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleCoverSelect}
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 py-3">
                <label className="text-sm text-text-muted w-24 shrink-0">{t('investigationDetail.settings.titleLabel')}</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass}/>
            </div>

            <div className="flex items-start gap-4 py-3">
                <label className="text-sm text-text-muted w-24 shrink-0 pt-1.5">{t('investigationDetail.settings.descLabel')}</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    placeholder={t('investigationDetail.settings.descPlaceholder')}
                />
            </div>

            {hasChanges && (
                <div className="flex justify-end py-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                        className="px-4 py-1.5 rounded-xl text-text-default text-sm font-semibold transition-all disabled:opacity-40"
                        style={{background: 'var(--theme-primary)'}}
                    >
                        {saving ? t('investigationDetail.settings.saving') : t('investigationDetail.settings.saveChanges')}
                    </button>
                </div>
            )}

            <div className="flex items-center gap-4 py-3">
                <div className="w-24 shrink-0">
                    <span className="text-sm text-text-muted">{t('investigationDetail.settings.transferLabel')}</span>
                </div>
                <div className="flex-1 flex gap-2 items-center relative" ref={transferRef}>
                    <div className="flex-1 relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim"/>
                        <input
                            type="text"
                            value={selectedTransferUser ? selectedTransferUser.pseudo : transferQuery}
                            onChange={(e) => handleTransferSearch(e.target.value)}
                            placeholder={t('investigationDetail.settings.transferPlaceholder')}
                            className="w-full pl-8 pr-3 py-2 bg-input-bg border border-border rounded-xl text-text-default text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors placeholder-text-muted"
                        />
                        {transferResults.length > 0 && !selectedTransferUser && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl py-1 shadow-xl max-h-40 overflow-y-auto" style={dropdownStyle}>
                                {transferResults.map((u) => (
                                    <button
                                        key={u.id_user}
                                        onClick={() => { setSelectedTransferUser(u); setTransferResults([]); setTransferQuery(u.pseudo); }}
                                        className="w-full px-3 py-1.5 text-left text-sm text-text-default hover:bg-input-bg transition-colors flex items-center gap-2"
                                    >
                                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                                            style={{background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)', color: 'var(--theme-primary)'}}>
                                            {u.pseudo.charAt(0).toUpperCase()}
                                        </span>
                                        {u.pseudo}
                                    </button>
                                ))}
                            </div>
                        )}
                        {transferSearching && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl py-2 shadow-xl text-center text-xs text-text-muted" style={dropdownStyle}>
                                {t('investigationDetail.settings.transferSearching')}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowTransferConfirm(true)}
                        disabled={!selectedTransferUser}
                        className="px-3 py-2 bg-yellow-600/80 hover:bg-yellow-600 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-40 whitespace-nowrap"
                    >
                        {t('investigationDetail.settings.transferButton')}
                    </button>
                </div>
                {showTransferConfirm && selectedTransferUser && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full mx-4">
                            <h4 className="text-text-default font-semibold text-sm mb-2">{t('investigationDetail.settings.confirmTransfer')}</h4>
                            <p className="text-text-muted text-xs mb-4">
                                {t('investigationDetail.settings.confirmTransferDesc', {
                                    title: investigation.title,
                                    pseudo: selectedTransferUser.pseudo,
                                })}
                            </p>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowTransferConfirm(false)}
                                    className="px-3 py-1.5 text-xs text-text-muted hover:text-text-default transition-colors">
                                    {t('investigationDetail.settings.cancel')}
                                </button>
                                <button onClick={handleTransfer} disabled={transferring}
                                    className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-40">
                                    {transferring ? t('investigationDetail.settings.transferring') : t('investigationDetail.settings.confirmTransferBtn')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="py-3">
                <div className="flex items-center gap-4">
                    <div className="w-24 shrink-0">
                        <span className="text-sm text-red-400">{t('investigationDetail.settings.deleteLabel')}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs text-text-dim">{t('investigationDetail.settings.deleteDesc')}</span>
                        {!showDeleteConfirm && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-medium transition-all ml-4 whitespace-nowrap"
                            >
                                {t('investigationDetail.settings.deleteButton')}
                            </button>
                        )}
                    </div>
                </div>
                {showDeleteConfirm && (
                    <div className="mt-3 ml-28 space-y-2">
                        <p className="text-xs text-text-muted">
                            {t('investigationDetail.settings.deleteConfirmPrompt', {title: investigation.title})}
                        </p>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder={investigation.title}
                                className="flex-1 px-3 py-1.5 bg-red-500/5 border border-red-500/30 rounded-xl text-text-default placeholder-text-dim text-sm focus:outline-none focus:border-red-500/60 transition-colors"
                            />
                            <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                                className="px-3 py-1.5 text-xs text-text-muted hover:text-text-default transition-colors">
                                {t('investigationDetail.settings.cancel')}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteConfirmText !== investigation.title || deleting}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-40 whitespace-nowrap"
                            >
                                {deleting ? t('investigationDetail.settings.deleting') : t('investigationDetail.settings.confirmDelete')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const InvestigationDetail = () => {
    const {t} = useTranslation();
    const {slug} = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const id = slug ? extractIdFromSlug(slug) : null;
    const [investigation, setInvestigation] = useState<InvestigationDetailData | null>(null);
    const [statuses, setStatuses] = useState<StatusData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDropdown, setOpenDropdown] = useState(false);
    const [headerCollapsed, setHeaderCollapsed] = useState(
        () => localStorage.getItem('investigationHeaderCollapsed') === '1',
    );
    // Source à ouvrir dans l'onglet Sources (déclenché depuis un hit de l'onglet Sélecteurs)
    const [openSourceId, setOpenSourceId] = useState<number | null>(null);
    const toggleHeader = () => {
        setHeaderCollapsed((c) => {
            localStorage.setItem('investigationHeaderCollapsed', c ? '0' : '1');
            return !c;
        });
    };
    const openSourceInTab = (sourceId: number) => {
        setOpenSourceId(sourceId);
        window.location.hash = 'preuves/sources';
    };
    const {toast} = useToast();
    const {user: currentUser} = useAuth();
    usePageTitle(investigation?.title);

    // Compat : réécrit les anciens hash plats (#sources, #graph…) vers la
    // nouvelle hiérarchie d'onglets groupés (#preuves/sources, #analyse/graph…).
    useEffect(() => {
        const LEGACY_HASHES: Record<string, string> = {
            sources: 'preuves/sources',
            selectors: 'preuves/selectors',
            graph: 'analyse/graph',
            map: 'analyse/map',
            timeline: 'analyse/timeline',
            collaborators: 'gestion/collaborators',
            settings: 'gestion/settings',
        };
        const current = window.location.hash.replace(/^#/, '');
        if (LEGACY_HASHES[current]) {
            window.location.hash = LEGACY_HASHES[current];
        }
    }, []);

    const fetchInvestigation = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await api.getInvestigation(id);
            setInvestigation(data);
            const expectedSlug = toInvestigationSlug(data.title, data.id_investigation);
            if (slug && slug !== expectedSlug) {
                navigate(`/investigations/${expectedSlug}`, {replace: true});
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur');
        } finally {
            setLoading(false);
        }
    }, [id, slug, navigate]);

    const refreshInvestigation = useCallback(async () => {
        if (!id) return;
        try {
            const data = await api.getInvestigation(id);
            setInvestigation(data);
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        }
    }, [id, toast]);

    const fetchStatuses = useCallback(async () => {
        try {
            const data = await api.getInvestigationStatuses();
            setStatuses(data.statuses);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchInvestigation();
        fetchStatuses();
    }, [fetchInvestigation, fetchStatuses]);

    const handleStatusChange = async (newStatusId: number) => {
        if (!investigation) return;
        setOpenDropdown(false);
        try {
            await api.updateInvestigationStatus(investigation.id_investigation, newStatusId);
            toast('success', t('investigations.statusUpdated'));
            refreshInvestigation();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Erreur');
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const canChangeStatus = investigation?.user_permission === 'owner'
        || investigation?.user_permission === 'manager'
        || investigation?.user_permission === 'editeur';

    return (
        <Layout>
            <div className="px-6 pt-6 pb-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm mb-6">
                    <Link to="/investigations" className="text-text-dim hover:text-text-default transition-colors">
                        {t('sidebar.investigations')}
                    </Link>
                    <ChevronRight size={13} className="text-text-dim"/>
                    <span className="text-text-default font-medium truncate max-w-xs">
                        {loading ? '…' : investigation?.title ?? 'Introuvable'}
                    </span>
                </nav>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-text-dim text-sm">Chargement…</div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-red-400 font-medium mb-2">{error}</p>
                        <Link to="/investigations" className="text-text-muted hover:text-text-default transition-colors text-sm">
                            {t('investigationDetail.backToInvestigations')}
                        </Link>
                    </div>
                ) : investigation ? (
                    <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <button
                                    onClick={toggleHeader}
                                    className="text-text-dim hover:text-text-default transition-colors shrink-0 p-0.5 -ml-1"
                                    title={headerCollapsed ? 'Déplier l\'en-tête' : 'Replier l\'en-tête'}
                                >
                                    {headerCollapsed ? <ChevronDown size={18}/> : <ChevronUp size={18}/>}
                                </button>
                                <h1 className="text-2xl font-bold text-text-default truncate">{investigation.title}</h1>
                            </div>
                            <div className="relative shrink-0">
                                {canChangeStatus ? (
                                    <button
                                        onClick={() => setOpenDropdown(!openDropdown)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        <StatusBadge name={investigation.status.name} color={investigation.status.color}/>
                                    </button>
                                ) : (
                                    <StatusBadge name={investigation.status.name} color={investigation.status.color}/>
                                )}
                                {openDropdown && canChangeStatus && (
                                    <StatusDropdown
                                        currentStatusId={investigation.status.id_status}
                                        statuses={statuses}
                                        onSelect={handleStatusChange}
                                        onClose={() => setOpenDropdown(false)}
                                    />
                                )}
                            </div>
                        </div>

                        {!headerCollapsed && (
                            <>
                                {investigation.description && (
                                    <p className="text-text-muted text-sm mb-4">{investigation.description}</p>
                                )}

                                <div className="mb-5">
                                    <CategoriesSection investigation={investigation} onRefresh={refreshInvestigation}/>
                                </div>

                                <div className="flex items-center gap-5 text-sm text-text-muted mb-8 flex-wrap">
                                    <span className="flex items-center gap-1.5">
                                        <User size={13} style={{color: 'var(--theme-primary)'}}/>
                                        {investigation.owner.pseudo}
                                    </span>
                                    <span className="w-px h-4 bg-card/30"/>
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={13} style={{color: 'var(--theme-primary)'}}/>
                                        {formatDate(investigation.created_at)}
                                    </span>
                                    {investigation.updated_at && investigation.updated_at !== investigation.created_at && (
                                        <>
                                            <span className="w-px h-4 bg-card/30"/>
                                            <span className="flex items-center gap-1.5">
                                                <LayersPlus size={13} style={{color: 'var(--theme-primary)'}}/>
                                                {t('investigationDetail.updated')} {formatRelativeDate(investigation.updated_at)}
                                            </span>
                                        </>
                                    )}
                                    <span className="w-px h-4 bg-card/30"/>
                                    <span className="font-mono text-text-dim">#{investigation.id_investigation}</span>
                                </div>
                            </>
                        )}

                        <div className={headerCollapsed ? 'mt-4' : ''} />

                        <Tabs
                            tabs={[
                                {
                                    id: 'details',
                                    label: t('investigationDetail.tabs.details'),
                                    icon: FileText,
                                    content: (
                                        <div className="pt-5">
                                            {investigation.description ? (
                                                <p className="text-text-muted">{investigation.description}</p>
                                            ) : (
                                                <p className="text-text-dim italic">{t('investigationDetail.noDescription')}</p>
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    id: 'tasks',
                                    label: t('investigationDetail.tabs.tasks'),
                                    icon: CheckSquare,
                                    content: (
                                        <TasksTab
                                            investigation={investigation}
                                            currentUserId={currentUser?.id_user ?? 0}
                                        />
                                    ),
                                },
                                {
                                    // Groupe « Preuves » : bibliothèque de sources + sélecteurs/hits,
                                    // qui sont fonctionnellement couplés (un hit ouvre sa source).
                                    id: 'preuves',
                                    label: t('investigationDetail.tabs.evidence'),
                                    icon: Archive,
                                    content: (
                                        <SubTabs
                                            parentId="preuves"
                                            tabs={[
                                                {
                                                    id: 'sources',
                                                    label: 'Sources',
                                                    icon: Archive,
                                                    content: (
                                                        <SourcesTab
                                                            investigationId={investigation.id_investigation}
                                                            userPermission={investigation.user_permission}
                                                            openSourceId={openSourceId}
                                                            onSourceOpened={() => setOpenSourceId(null)}
                                                        />
                                                    ),
                                                },
                                                {
                                                    id: 'selectors',
                                                    label: 'Sélecteurs',
                                                    icon: Crosshair,
                                                    content: (
                                                        <SelectorsTab
                                                            investigationId={investigation.id_investigation}
                                                            userPermission={investigation.user_permission}
                                                            onOpenSource={openSourceInTab}
                                                        />
                                                    ),
                                                },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    // Groupe « Analyse » : trois lentilles sur la même donnée d'enquête.
                                    id: 'analyse',
                                    label: t('investigationDetail.tabs.analysis'),
                                    icon: Network,
                                    content: (
                                        <SubTabs
                                            parentId="analyse"
                                            tabs={[
                                                {
                                                    id: 'graph',
                                                    label: t('investigationDetail.tabs.graph'),
                                                    icon: Network,
                                                    content: (
                                                        <GraphTab
                                                            investigationId={investigation.id_investigation}
                                                            userPermission={investigation.user_permission}
                                                        />
                                                    ),
                                                },
                                                {
                                                    id: 'map',
                                                    label: t('investigationDetail.tabs.map'),
                                                    icon: MapIcon,
                                                    content: (
                                                        <MapTab investigationId={investigation.id_investigation}/>
                                                    ),
                                                },
                                                {
                                                    id: 'timeline',
                                                    label: t('investigationDetail.tabs.timeline'),
                                                    icon: History,
                                                    content: (
                                                        <TimelineTab investigationId={investigation.id_investigation}/>
                                                    ),
                                                },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    id: 'documents',
                                    label: 'Documents',
                                    icon: FileText,
                                    content: (
                                        <DocumentsTab
                                            investigationId={investigation.id_investigation}
                                            investigationTitle={investigation.title}
                                            userPermission={investigation.user_permission}
                                        />
                                    ),
                                },
                                {
                                    // Groupe « Gestion » : collaborateurs (tous) + paramètres (owner).
                                    id: 'gestion',
                                    label: t('investigationDetail.tabs.management'),
                                    icon: Settings,
                                    content: (
                                        <SubTabs
                                            parentId="gestion"
                                            tabs={[
                                                {
                                                    id: 'collaborators',
                                                    label: t('investigationDetail.tabs.collaborators'),
                                                    icon: Users,
                                                    content: (
                                                        <CollaboratorsTab
                                                            investigation={investigation}
                                                            onRefresh={refreshInvestigation}
                                                        />
                                                    ),
                                                },
                                                ...(investigation.user_permission === 'owner' ? [{
                                                    id: 'settings',
                                                    label: t('investigationDetail.tabs.settings'),
                                                    icon: Settings,
                                                    content: (
                                                        <SettingsTab
                                                            investigation={investigation}
                                                            onRefresh={refreshInvestigation}
                                                            onNavigateAway={() => navigate('/investigations')}
                                                            onSlugUpdate={(newTitle: string) => {
                                                                const newSlug = toInvestigationSlug(newTitle, investigation.id_investigation);
                                                                navigate(`/investigations/${newSlug}`, {replace: true});
                                                            }}
                                                        />
                                                    ),
                                                }] : []),
                                            ]}
                                        />
                                    ),
                                },
                            ]}
                            defaultTab="details"
                        />
                    </div>
                ) : null}
            </div>
        </Layout>
    );
};
