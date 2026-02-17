import {useState, useEffect, useCallback, useRef} from 'react';
import {useParams, Link} from 'react-router-dom';
import {Layout} from '../../components/Layout';
import {StatusBadge} from '../../components/StatusBadge';
import {Tabs} from '../../components/Tabs';
import {useToast} from '../../contexts/ToastContext';
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
    Tag,
    Plus,
    X,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {formatRelativeDate} from '../../utils/date';
import {extractIdFromSlug} from '../../utils/slug';

function getIconComponent(iconName: string | null): React.ComponentType<{ size?: number; className?: string }> {
    if (!iconName) return Tag;
    const icon = (LucideIcons as Record<string, unknown>)[iconName];
    if (icon && typeof icon === 'object' && '$$typeof' in icon) return icon as React.ComponentType<{ size?: number; className?: string }>;
    if (typeof icon === 'function') return icon as React.ComponentType<{ size?: number; className?: string }>;
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

const permissionLabels: Record<string, string> = {
    manager: 'Manager',
    editeur: 'Editor',
    lecteur: 'Reader',
};

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
        <div
            ref={ref}
            className="absolute top-full left-0 mt-1 z-20 bg-[#1a1a2e] border border-primary/20 rounded-xl py-1 shadow-lg min-w-[160px]"
        >
            {statuses.map((s) => (
                <button
                    key={s.id_status}
                    onClick={() => onSelect(s.id_status)}
                    disabled={s.id_status === currentStatusId}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-default"
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

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchResults([]);
            }
            if (permRef.current && !permRef.current.contains(e.target as Node)) {
                setPermDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (value.length < 2) {
            setSearchResults([]);
            return;
        }
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
            toast('success', `${pseudo} invited successfully`);
            setSearchQuery('');
            setSearchResults([]);
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error inviting collaborator');
        } finally {
            setInviting(false);
        }
    };

    const handleUpdatePermission = async (collaboratorId: number, newPermission: string) => {
        setPermDropdown(null);
        try {
            await api.updateCollaboratorPermission(investigation.id_investigation, collaboratorId, newPermission);
            toast('success', 'Permission updated');
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error updating permission');
        }
    };

    const handleRemove = async (collaboratorId: number, pseudo: string) => {
        try {
            await api.removeCollaborator(investigation.id_investigation, collaboratorId);
            toast('success', `${pseudo} has been removed`);
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error removing collaborator');
        }
    };

    const permissionOptions = investigation.user_permission === 'manager'
        ? ['editeur', 'lecteur']
        : ['manager', 'editeur', 'lecteur'];

    return (
        <div className="space-y-6">
            {/* Invite form */}
            {canInvite && (
                <div className="bg-dark/50 border border-primary/20 rounded-xl p-5">
                    <h3 className="text-accent font-semibold mb-4 flex items-center gap-2">
                        <UserPlus size={16} className="text-primary"/>
                        Invite a collaborator
                    </h3>
                    <div className="flex gap-3">
                        <div className="flex-1 relative" ref={searchRef}>
                            <div className="relative">
                                <Search size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"/>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Search for a user..."
                                    disabled={inviting}
                                    className="w-full pl-10 pr-4 py-2.5 bg-dark/50 border border-primary/30 rounded-xl text-accent placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-sm"
                                />
                            </div>
                            {/* Search results */}
                            {searchResults.length > 0 && (
                                <div
                                    className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#1a1a2e] border border-primary/20 rounded-xl py-1 shadow-lg max-h-48 overflow-y-auto">
                                    {searchResults.map((u) => (
                                        <button
                                            key={u.id_user}
                                            onClick={() => handleInvite(u.pseudo)}
                                            disabled={inviting}
                                            className="w-full px-4 py-2.5 text-left text-sm text-accent hover:bg-primary/10 transition-colors flex items-center gap-2"
                                        >
                                            <span
                                                className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                                                {u.pseudo.charAt(0).toUpperCase()}
                                            </span>
                                            {u.pseudo}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {searching && (
                                <div
                                    className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#1a1a2e] border border-primary/20 rounded-xl py-3 shadow-lg text-center text-sm text-secondary">
                                    Searching...
                                </div>
                            )}
                        </div>
                        <select
                            value={selectedPermission}
                            onChange={(e) => setSelectedPermission(e.target.value)}
                            className="px-4 py-2.5 bg-dark/50 border border-primary/30 rounded-xl text-accent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                        >
                            {permissionOptions.map((p) => (
                                <option key={p} value={p}>{permissionLabels[p]}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Collaborators list */}
            <div className="space-y-2">
                {investigation.collaborators.length === 0 ? (
                    <div className="bg-dark/50 border border-primary/20 rounded-xl p-8 text-center">
                        <Users size={32} className="mx-auto text-secondary mb-3"/>
                        <p className="text-accent font-medium mb-1">No collaborators</p>
                        <p className="text-secondary text-sm">
                            {canInvite
                                ? 'Invite users to collaborate on this investigation.'
                                : 'No collaborators have been added yet.'}
                        </p>
                    </div>
                ) : (
                    investigation.collaborators.map((collab) => (
                        <div
                            key={collab.id_collaborator}
                            className="bg-dark/50 border border-primary/20 rounded-xl p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                                    {collab.pseudo.charAt(0).toUpperCase()}
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-accent font-medium text-sm">{collab.pseudo}</span>
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
                                            <span
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                                                <Clock size={10}/>
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-secondary text-xs mt-0.5">
                                        Invited {collab.invited_at ? formatRelativeDate(collab.invited_at) : ''}
                                    </p>
                                </div>
                            </div>

                            {isOwner && (
                                <div className="flex items-center gap-2">
                                    {/* Permission change dropdown */}
                                    <div className="relative" ref={permDropdown === collab.id_collaborator ? permRef : null}>
                                        <button
                                            onClick={() => setPermDropdown(permDropdown === collab.id_collaborator ? null : collab.id_collaborator)}
                                            className="p-2 text-secondary hover:text-accent hover:bg-primary/10 rounded-lg transition-all"
                                            title="Edit permission"
                                        >
                                            <ChevronDown size={14}/>
                                        </button>
                                        {permDropdown === collab.id_collaborator && (
                                            <div
                                                className="absolute top-full right-0 mt-1 z-20 bg-[#1a1a2e] border border-primary/20 rounded-xl py-1 shadow-lg min-w-[140px]">
                                                {['manager', 'editeur', 'lecteur'].map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => handleUpdatePermission(collab.id_collaborator, p)}
                                                        disabled={p === collab.permission_level}
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-default"
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
                                        className="p-2 text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Remove collaborator"
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
        } catch {
            /* ignore */
        }
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
            toast('success', 'Category added');
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error adding category');
        }
    };

    const handleRemove = async (categoryId: number) => {
        try {
            await api.removeCategoryFromInvestigation(investigation.id_investigation, categoryId);
            toast('success', 'Category removed');
            onRefresh();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error removing category');
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
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-secondary border border-dashed border-primary/30 hover:border-primary/50 hover:text-accent transition-all"
                    >
                        <Plus size={12}/>
                        Add
                    </button>
                    {showPicker && (
                        <div className="absolute top-full left-0 mt-1 z-20 bg-[#1a1a2e] border border-primary/20 rounded-xl py-1 shadow-lg min-w-[180px] max-h-48 overflow-y-auto">
                            {unassigned.length === 0 ? (
                                <p className="px-3 py-2 text-secondary text-sm">No more categories</p>
                            ) : (
                                unassigned.map((cat) => {
                                    const CatIcon = getIconComponent(cat.icon);
                                    return (
                                        <button
                                            key={cat.id_category}
                                            onClick={() => {
                                                handleAdd(cat.id_category);
                                                setShowPicker(false);
                                            }}
                                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-primary/10 transition-colors text-sm"
                                        >
                                            <CatIcon size={14} style={{color: cat.color || '#8b5cf6'}}/>
                                            <span className="text-accent">{cat.name}</span>
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

export const InvestigationDetail = () => {
    const {slug} = useParams<{ slug: string }>();
    const id = slug ? extractIdFromSlug(slug) : null;
    const [investigation, setInvestigation] = useState<InvestigationDetailData | null>(null);
    const [statuses, setStatuses] = useState<StatusData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDropdown, setOpenDropdown] = useState(false);
    const {toast} = useToast();

    const fetchInvestigation = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await api.getInvestigation(id);
            setInvestigation(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading investigation');
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Silent refresh: updates data without showing loading state (keeps Tabs mounted)
    const refreshInvestigation = useCallback(async () => {
        if (!id) return;
        try {
            const data = await api.getInvestigation(id);
            setInvestigation(data);
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error refreshing data');
        }
    }, [id, toast]);

    const fetchStatuses = useCallback(async () => {
        try {
            const data = await api.getInvestigationStatuses();
            setStatuses(data.statuses);
        } catch (err) {
            console.error('Error fetching statuses:', err);
        }
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
            toast('success', 'Status updated');
            refreshInvestigation();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error updating status');
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
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
            <div className="p-8">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-1.5 text-sm mb-6">
                    <Link to="/investigations" className="text-secondary hover:text-accent transition-colors">
                        Investigations
                    </Link>
                    <ChevronRight size={14} className="text-secondary"/>
                    <span className="text-accent font-medium truncate max-w-xs">
            {loading ? '...' : investigation?.title ?? 'Not found'}
          </span>
                </nav>

                {loading ? (
                    <div className="text-center text-secondary py-12">Loading...</div>
                ) : error ? (
                    <div className="bg-dark/50 border border-red-500/20 rounded-xl p-12 text-center">
                        <p className="text-red-400 text-lg font-medium mb-2">{error}</p>
                        <Link
                            to="/investigations"
                            className="text-secondary hover:text-accent transition-colors text-sm"
                        >
                            Back to investigations
                        </Link>
                    </div>
                ) : investigation ? (
                    <div>
                        {/* Title + status */}
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <h1 className="text-2xl font-bold text-accent">{investigation.title}</h1>
                            <div className="relative">
                                {canChangeStatus ? (
                                    <button
                                        onClick={() => setOpenDropdown(!openDropdown)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        <StatusBadge name={investigation.status.name}
                                                     color={investigation.status.color}/>
                                    </button>
                                ) : (
                                    <StatusBadge name={investigation.status.name}
                                                 color={investigation.status.color}/>
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

                        {investigation.description && (
                            <p className="text-secondary text-sm mb-4">{investigation.description}</p>
                        )}

                        {/* Categories */}
                        <div className="mb-5">
                            <CategoriesSection investigation={investigation} onRefresh={refreshInvestigation}/>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-5 text-sm text-secondary mb-8">
              <span className="flex items-center gap-2">
                <User size={14} className="text-primary"/>
                  {investigation.owner.pseudo}
              </span>
                            <span className="w-px h-4 bg-primary/20"/>
                            <span className="flex items-center gap-2">
                <Calendar size={14} className="text-primary"/>
                                {formatDate(investigation.created_at)}
              </span>
                            {investigation.updated_at && investigation.updated_at !== investigation.created_at && (
                                <>
                                    <span className="w-px h-4 bg-primary/20"/>
                                    <span className="flex items-center gap-2">
                    <LayersPlus size={14} className="text-primary"/>
                    Updated {formatRelativeDate(investigation.updated_at)}
                  </span>
                                </>
                            )}
                            <span className="w-px h-4 bg-primary/20"/>
                            <span className="font-mono text-secondary/60">#{investigation.id_investigation}</span>
                        </div>

                        <Tabs
                            tabs={[
                                {
                                    id: 'details',
                                    label: 'Details',
                                    icon: FileText,
                                    content: (
                                        <div className="border-t border-primary/10 pt-6">
                                            {investigation.description ? (
                                                <p className="text-secondary">{investigation.description}</p>
                                            ) : (
                                                <p className="text-secondary/50 italic">No description</p>
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    id: 'collaborators',
                                    label: 'Collaborators',
                                    icon: Users,
                                    content: (
                                        <CollaboratorsTab
                                            investigation={investigation}
                                            onRefresh={refreshInvestigation}
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
