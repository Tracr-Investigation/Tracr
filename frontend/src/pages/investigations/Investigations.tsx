import {useState, useEffect, useCallback, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {Layout} from '../../components/Layout';
import {StatusBadge} from '../../components/StatusBadge';
import {useToast} from '../../contexts/ToastContext';
import {api} from '../../services/api';
import {FileSearch, Plus, X, Calendar, Users, RotateCcw, Tag, Search, Filter} from 'lucide-react';
import {formatRelativeDate} from '../../utils/date';
import {toInvestigationSlug} from '../../utils/slug';
import * as LucideIcons from 'lucide-react';

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

interface InvestigationData {
    id_investigation: number;
    title: string;
    description: string | null;
    is_owner: boolean;
    status: StatusData;
    categories?: CategoryData[];
    created_at: string | null;
    updated_at: string | null;
    closed_at: string | null;
}

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
            className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-xl py-1 shadow-lg min-w-[160px]"
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

const CreateModal = ({onClose, onSave}: { onClose: () => void; onSave: () => void }) => {
    const {t} = useTranslation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const {toast} = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.createInvestigation(title, description || null);
            toast('success', t('investigations.created'));
            onSave();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            toast('error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg"
                 onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-text-default">{t('investigations.modal.title')}</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-default transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-text-muted mb-1.5">{t('investigations.modal.titleLabel')}</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            maxLength={255}
                            className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all"
                            placeholder={t('investigations.modal.titlePlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-text-muted mb-1.5">{t('investigations.modal.descLabel')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={2000}
                            rows={4}
                            className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all resize-none"
                            placeholder={t('investigations.modal.descPlaceholder')}
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-card border border-border text-text-muted hover:bg-primary/10 hover:text-text-default transition-all"
                        >
                            {t('investigations.modal.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title.trim()}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-text-default border border-primary/30 hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? t('investigations.modal.creating') : t('investigations.modal.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const Investigations = () => {
    const {t} = useTranslation();
    const [investigations, setInvestigations] = useState<InvestigationData[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [statuses, setStatuses] = useState<StatusData[]>([]);
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatusId, setFilterStatusId] = useState<number | null>(null);
    const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
    const {toast} = useToast();
    const navigate = useNavigate();

    const fetchInvestigations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getInvestigations();
            setInvestigations(data.investigations);
            setTotal(data.total);
        } catch (err) {
            console.error('Error fetching investigations:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStatuses = useCallback(async () => {
        try {
            const data = await api.getInvestigationStatuses();
            setStatuses(data.statuses);
        } catch (err) {
            console.error('Error fetching statuses:', err);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const data = await api.getInvestigationCategories();
            setCategories(data.categories);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    }, []);

    useEffect(() => {
        fetchInvestigations();
        fetchStatuses();
        fetchCategories();
    }, [fetchInvestigations, fetchStatuses, fetchCategories]);

    const handleStatusChange = async (investigationId: number, newStatusId: number) => {
        setOpenDropdown(null);
        try {
            await api.updateInvestigationStatus(investigationId, newStatusId);
            toast('success', t('investigations.statusUpdated'));
            fetchInvestigations();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error updating status');
        }
    };

    const handleSave = () => {
        setShowCreate(false);
        fetchInvestigations();
    };

    const hasActiveFilters = searchQuery || filterStatusId !== null || filterCategoryId !== null;

    const handleResetFilters = () => {
        setSearchQuery('');
        setFilterStatusId(null);
        setFilterCategoryId(null);
    };

    const filteredInvestigations = investigations.filter((inv) => {
        const matchesSearch = !searchQuery || inv.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatusId === null || inv.status.id_status === filterStatusId;
        const matchesCategory = filterCategoryId === null || inv.categories?.some(c => c.id_category === filterCategoryId);
        return matchesSearch && matchesStatus && matchesCategory;
    });

    return (
        <Layout>
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-text-default mb-2">{t('investigations.title')}</h1>
                        <p className="text-text-muted">{t('investigations.subtitle')}</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-text-default border border-primary/30 hover:bg-primary/30 transition-all"
                    >
                        <Plus size={16}/>
                        {t('investigations.newInvestigation')}
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('investigations.search')}
                            className="w-full pl-9 pr-4 py-2.5 bg-input-bg border border-border rounded-xl text-sm text-text-default placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all"
                        />
                    </div>

                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"/>
                        <select
                            value={filterStatusId ?? ''}
                            onChange={(e) => setFilterStatusId(e.target.value ? Number(e.target.value) : null)}
                            className="pl-9 pr-8 py-2.5 bg-input-bg border border-border rounded-xl text-sm text-text-default focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all appearance-none cursor-pointer"
                        >
                            <option value="">{t('investigations.allStatuses')}</option>
                            {statuses.map((s) => (
                                <option key={s.id_status} value={s.id_status}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"/>
                        <select
                            value={filterCategoryId ?? ''}
                            onChange={(e) => setFilterCategoryId(e.target.value ? Number(e.target.value) : null)}
                            className="pl-9 pr-8 py-2.5 bg-input-bg border border-border rounded-xl text-sm text-text-default focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all appearance-none cursor-pointer"
                        >
                            <option value="">{t('investigations.allCategories')}</option>
                            {categories.map((c) => (
                                <option key={c.id_category} value={c.id_category}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text-default hover:bg-primary/10 border border-border transition-all"
                            title={t('investigations.reset')}
                        >
                            <RotateCcw size={14}/>
                            {t('investigations.reset')}
                        </button>
                    )}

                    <span className="text-text-muted text-sm ml-auto">
                        {total} {t('investigations.title').toLowerCase()}
                    </span>
                </div>

                {/* List */}
                {loading ? (
                    <div className="text-center text-text-muted py-12">{t('investigations.loading')}</div>
                ) : filteredInvestigations.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl p-12 text-center">
                        <FileSearch size={48} className="mx-auto text-text-muted mb-4"/>
                        <p className="text-text-default text-lg font-medium mb-2">{t('investigations.empty')}</p>
                        <p className="text-text-muted mb-6">{t('investigations.emptyDesc')}</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-text-default border border-primary/30 hover:bg-primary/30 transition-all"
                        >
                            <Plus size={16}/>
                            {t('investigations.newInvestigation')}
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filteredInvestigations.map((inv) => (
                            <div
                                key={inv.id_investigation}
                                onClick={() => navigate(`/investigations/${toInvestigationSlug(inv.title, inv.id_investigation)}`)}
                                className="bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/40 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-text-dim text-xs font-mono flex-shrink-0">#{inv.id_investigation}</span>
                                    <h3 className="text-text-default font-semibold truncate">{inv.title}</h3>
                                    {!inv.is_owner && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 flex-shrink-0">
                                            <Users size={9}/>
                                            {t('investigations.collab')}
                                        </span>
                                    )}
                                    <div className="ml-auto flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {inv.categories && inv.categories.length > 0 && (
                                            <div className="hidden sm:flex items-center gap-1">
                                                {inv.categories.slice(0, 2).map((cat) => {
                                                    const CatIcon = getIconComponent(cat.icon);
                                                    return (
                                                        <span
                                                            key={cat.id_category}
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                                            style={{
                                                                backgroundColor: `${cat.color || '#8b5cf6'}15`,
                                                                color: cat.color || '#8b5cf6',
                                                            }}
                                                            title={cat.name}
                                                        >
                                                            <CatIcon size={10}/>
                                                            {cat.name}
                                                        </span>
                                                    );
                                                })}
                                                {inv.categories.length > 2 && (
                                                    <span className="text-[10px] text-text-dim font-medium px-1 py-0.5" title={inv.categories.slice(2).map(c => c.name).join(', ')}>
                                                        +{inv.categories.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="relative">
                                            <button
                                                onClick={() => setOpenDropdown(openDropdown === inv.id_investigation ? null : inv.id_investigation)}
                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                            >
                                                <StatusBadge name={inv.status.name} color={inv.status.color}/>
                                            </button>
                                            {openDropdown === inv.id_investigation && (
                                                <StatusDropdown
                                                    currentStatusId={inv.status.id_status}
                                                    statuses={statuses}
                                                    onSelect={(id) => handleStatusChange(inv.id_investigation, id)}
                                                    onClose={() => setOpenDropdown(null)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {inv.description && (
                                    <p className="text-text-muted text-sm mt-1.5 line-clamp-1 pl-8">{inv.description}</p>
                                )}

                                <div className="flex items-center gap-3 mt-2 pl-8 text-[11px] text-text-dim">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={10}/>
                                        {formatRelativeDate(inv.created_at)}
                                    </span>
                                    {inv.updated_at && inv.updated_at !== inv.created_at && (
                                        <span className="flex items-center gap-1">
                                            {t('investigations.updated')} {formatRelativeDate(inv.updated_at)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showCreate && (
                    <CreateModal onClose={() => setShowCreate(false)} onSave={handleSave}/>
                )}
            </div>
        </Layout>
    );
};
