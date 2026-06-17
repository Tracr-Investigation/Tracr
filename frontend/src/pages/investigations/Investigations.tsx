import {useState, useEffect, useCallback, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {Layout} from '../../components/Layout';
import {StatusBadge} from '../../components/StatusBadge';
import {usePageTitle} from '../../hooks/usePageTitle';
import {useToast} from '../../contexts/ToastContext';
import {api} from '../../services/api';
import {FileSearch, Plus, X, Calendar, Users, RotateCcw, Tag, Search, Filter, ChevronRight} from 'lucide-react';
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
            className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 shadow-xl min-w-[160px]"
            style={{background: 'var(--color-card)', border: '1px solid var(--color-border)'}}
        >
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

const CreatePanel = ({open, onClose, onSave}: {open: boolean; onClose: () => void; onSave: () => void}) => {
    const {t} = useTranslation();
    const {toast} = useToast();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) {
            setTitle('');
            setDescription('');
            setError('');
            setLoading(false);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.createInvestigation(title, description || null);
            toast('success', t('investigations.created'));
            onSave();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur';
            setError(message);
            toast('error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={`fixed top-0 right-0 h-screen w-full max-w-[480px] z-50 flex flex-col
                    transition-transform duration-300 ease-in-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
                style={{background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)'}}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-text-default">{t('investigations.modal.title')}</h2>
                        <p className="text-xs text-text-dim mt-0.5">{t('investigations.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors">
                        <X size={18}/>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
                    <div className="px-6 py-5 space-y-5 flex-1">
                        <div>
                            <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                                {t('investigations.modal.titleLabel')}
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                maxLength={255}
                                autoFocus={open}
                                className="w-full bg-input-bg border border-border-subtle rounded-xl px-4 py-2.5 text-text-default placeholder-text-muted focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                                placeholder={t('investigations.modal.titlePlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                                {t('investigations.modal.descLabel')}
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={2000}
                                rows={5}
                                className="w-full bg-input-bg border border-border-subtle rounded-xl px-4 py-2.5 text-text-default placeholder-text-muted focus:outline-none focus:border-[var(--theme-primary)] transition-colors resize-none"
                                placeholder={t('investigations.modal.descPlaceholder')}
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 justify-end px-6 py-4 border-t border-border-subtle shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-input-bg border border-border-subtle text-text-muted hover:text-text-default transition-colors text-sm"
                        >
                            {t('investigations.modal.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title.trim()}
                            className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all"
                            style={{background: 'var(--theme-primary)'}}
                        >
                            {loading ? t('investigations.modal.creating') : t('investigations.modal.create')}
                        </button>
                    </div>
                </form>
            </div>
        </>
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
    usePageTitle(t('sidebar.investigations'));

    const fetchInvestigations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getInvestigations();
            setInvestigations(data.investigations);
            setTotal(data.total);
        } catch {
            /* silently fail */
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStatuses = useCallback(async () => {
        try {
            const data = await api.getInvestigationStatuses();
            setStatuses(data.statuses);
        } catch { /* ignore */ }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const data = await api.getInvestigationCategories();
            setCategories(data.categories);
        } catch { /* ignore */ }
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
            toast('error', err instanceof Error ? err.message : 'Erreur');
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
            <div className="px-6 pt-6 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-text-default mb-1 flex items-center gap-2.5">
                            <FileSearch size={20} style={{color: 'var(--theme-primary)'}}/>
                            {t('investigations.title')}
                        </h1>
                        <p className="text-text-muted text-sm">{t('investigations.subtitle')}</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-text-default text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                        style={{background: 'var(--theme-primary)'}}
                    >
                        <Plus size={15}/>
                        {t('investigations.newInvestigation')}
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim"/>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('investigations.search')}
                            className="w-full bg-input-bg border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-default placeholder-text-muted focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                        />
                    </div>

                    <div className="relative">
                        <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"/>
                        <select
                            value={filterStatusId ?? ''}
                            onChange={(e) => setFilterStatusId(e.target.value ? Number(e.target.value) : null)}
                            className="pl-8 pr-8 py-2.5 bg-input-bg border border-border rounded-xl text-sm text-text-default focus:outline-none focus:border-[var(--theme-primary)] transition-colors appearance-none cursor-pointer"
                        >
                            <option value="">{t('investigations.allStatuses')}</option>
                            {statuses.map((s) => (
                                <option key={s.id_status} value={s.id_status}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"/>
                        <select
                            value={filterCategoryId ?? ''}
                            onChange={(e) => setFilterCategoryId(e.target.value ? Number(e.target.value) : null)}
                            className="pl-8 pr-8 py-2.5 bg-input-bg border border-border rounded-xl text-sm text-text-default focus:outline-none focus:border-[var(--theme-primary)] transition-colors appearance-none cursor-pointer"
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
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-default bg-input-bg border border-border-subtle hover:border-border transition-all"
                        >
                            <RotateCcw size={13}/>
                            {t('investigations.reset')}
                        </button>
                    )}

                    <span className="text-text-dim text-sm ml-auto">
                        {total} {t('investigations.title').toLowerCase()}
                    </span>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-text-dim text-sm">Chargement…</div>
                ) : filteredInvestigations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <FileSearch size={36} className="text-text-dim mb-3"/>
                        <p className="text-text-muted font-medium mb-1">{t('investigations.empty')}</p>
                        <p className="text-text-dim text-sm mb-6">{t('investigations.emptyDesc')}</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-text-default text-sm font-semibold"
                            style={{background: 'var(--theme-primary)'}}
                        >
                            <Plus size={14}/>
                            {t('investigations.newInvestigation')}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filteredInvestigations.map((inv) => (
                            <button
                                key={inv.id_investigation}
                                onClick={() => navigate(`/investigations/${toInvestigationSlug(inv.title, inv.id_investigation)}`)}
                                className="w-full text-left p-4 rounded-xl border border-border-subtle bg-card/30 hover:border-border hover:bg-input-bg transition-all group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-text-dim text-xs font-mono shrink-0">#{inv.id_investigation}</span>
                                    <span className="text-text-default font-semibold truncate flex-1">{inv.title}</span>
                                    {!inv.is_owner && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-400 shrink-0">
                                            <Users size={9}/>
                                            {t('investigations.collab')}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                                                        >
                                                            <CatIcon size={10}/>
                                                            {cat.name}
                                                        </span>
                                                    );
                                                })}
                                                {inv.categories.length > 2 && (
                                                    <span className="text-[10px] text-text-dim px-1">
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
                                    <ChevronRight size={14} className="text-text-dim group-hover:text-text-muted transition-colors shrink-0"/>
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
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Create panel - always mounted for smooth slide transition */}
            <CreatePanel
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onSave={handleSave}
            />
        </Layout>
    );
};
