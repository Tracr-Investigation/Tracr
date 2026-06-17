import {useState, useEffect, useCallback} from 'react';
import {api} from '../../../services/api';
import type {TemplateCategoryData} from '../../../services/api';
import {Layers, Plus, Pencil, Trash2, X} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {useTranslation} from 'react-i18next';

const ICON_OPTIONS = [
    'Tag', 'Shield', 'Search', 'AlertTriangle', 'Bug', 'Globe', 'Lock',
    'Eye', 'FileText', 'Database', 'Server', 'Wifi', 'Key', 'Fingerprint',
    'ShieldAlert', 'ShieldCheck', 'Skull', 'Zap', 'Activity', 'Target',
    'Crosshair', 'Radio', 'Cpu', 'HardDrive', 'Network', 'Cloud',
    'Terminal', 'Code', 'Binary', 'Layers', 'Package', 'Archive',
    'Users', 'MapPin', 'MessageSquare', 'Mail', 'Phone', 'Camera',
    'Image', 'Video', 'Mic', 'Link', 'Hash', 'AtSign',
];

function getIconComponent(iconName: string | null): React.ComponentType<{ size?: number; className?: string }> {
    if (!iconName) return Layers;
    const icon = (LucideIcons as Record<string, unknown>)[iconName];
    if (icon && typeof icon === 'object' && '$$typeof' in icon) return icon as React.ComponentType<{ size?: number; className?: string }>;
    if (typeof icon === 'function') return icon as React.ComponentType<{ size?: number; className?: string }>;
    return Layers;
}

const CategoryBadge = ({name, color, icon}: { name: string; color: string | null; icon: string | null }) => {
    const Icon = getIconComponent(icon);
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
                backgroundColor: `${color || '#f59e0b'}20`,
                color: color || '#f59e0b',
                border: `1px solid ${color || '#f59e0b'}40`,
            }}
        >
            <Icon size={12}/>
            {name}
        </span>
    );
};

interface ModalProps {
    category?: TemplateCategoryData;
    onClose: () => void;
    onSave: () => void;
}

const CategoryFormModal = ({category, onClose, onSave}: ModalProps) => {
    const {t} = useTranslation();
    const [name, setName] = useState(category?.name || '');
    const [color, setColor] = useState(category?.color || '#f59e0b');
    const [icon, setIcon] = useState(category?.icon || 'Layers');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (category) {
                await api.updateTemplateCategory(category.id_category_template, {name, color, icon});
            } else {
                await api.createTemplateCategory({name, color, icon});
            }
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-card/30 border border-border-subtle rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-text-default">
                        {category ? t('admin.templateCategories.editTitle') : t('admin.templateCategories.newTitle')}
                    </h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-default transition-colors"><X size={20}/></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-text-muted mb-1.5">{t('admin.templateCategories.nameLabel')}</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50}
                            className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all"
                            placeholder={t('admin.templateCategories.namePlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-text-muted mb-1.5">{t('admin.templateCategories.colorLabel')}</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                                className="w-12 h-12 rounded-lg border border-border cursor-pointer bg-transparent"
                            />
                            <input type="text" value={color} onChange={(e) => setColor(e.target.value)} maxLength={7}
                                className="flex-1 px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default font-mono placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all"
                                placeholder="#f59e0b"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-text-muted mb-1.5">{t('admin.templateCategories.iconLabel')}</label>
                        <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto p-2 bg-surface rounded-xl border border-border">
                            {ICON_OPTIONS.map((iconName) => {
                                const IconComp = getIconComponent(iconName);
                                return (
                                    <button key={iconName} type="button" onClick={() => setIcon(iconName)}
                                        className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                                            icon === iconName
                                                ? 'bg-primary/30 text-white border border-primary/50'
                                                : 'text-text-muted hover:bg-primary/10 hover:text-text-default border border-transparent'
                                        }`}
                                        title={iconName}
                                    >
                                        <IconComp size={16}/>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-text-muted mb-1.5">{t('admin.templateCategories.previewLabel')}</label>
                        <div className="p-3 bg-surface rounded-xl">
                            <CategoryBadge name={name || t('admin.templateCategories.previewDefault')} color={color} icon={icon}/>
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-card/30 border border-border-subtle text-text-muted hover:bg-primary/10 hover:text-text-default transition-all">
                            {t('admin.templateCategories.cancel')}
                        </button>
                        <button type="submit" disabled={loading || !name.trim()} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-text-default border border-primary/30 hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            {loading ? t('admin.templateCategories.saving') : category ? t('admin.templateCategories.update') : t('admin.templateCategories.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteModal = ({category, onClose, onSave}: ModalProps) => {
    const {t} = useTranslation();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!category) return;
        setLoading(true);
        try {
            await api.deleteTemplateCategory(category.id_category_template);
            onSave();
        } catch (err) {
            console.error('Error deleting template category:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-card/30 border border-border-subtle rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-text-default mb-3">{t('admin.templateCategories.deleteTitle')}</h3>
                <p className="text-text-muted mb-2">{t('admin.templateCategories.deleteConfirm')}</p>
                <div className="mb-6">
                    <CategoryBadge name={category?.name || ''} color={category?.color || null} icon={category?.icon || null}/>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-card/30 border border-border-subtle text-text-muted hover:bg-primary/10 hover:text-text-default transition-all">
                        {t('admin.templateCategories.cancel')}
                    </button>
                    <button onClick={handleDelete} disabled={loading} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        {loading ? t('admin.templateCategories.deleting') : t('admin.templateCategories.delete')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const TemplateCategoriesTab = () => {
    const {t} = useTranslation();
    const [categories, setCategories] = useState<TemplateCategoryData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editCategory, setEditCategory] = useState<TemplateCategoryData | undefined>(undefined);
    const [deleteCategory, setDeleteCategory] = useState<TemplateCategoryData | undefined>(undefined);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.listTemplateCategories();
            setCategories(data.categories);
        } catch (err) {
            console.error('Error fetching template categories:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const handleSave = () => {
        setShowCreate(false);
        setEditCategory(undefined);
        setDeleteCategory(undefined);
        fetchCategories();
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 inline-flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/15 rounded-lg flex items-center justify-center">
                        <Layers size={24} className="text-white"/>
                    </div>
                    <div>
                        <p className="text-white/70 text-sm">{t('admin.templateCategories.totalLabel')}</p>
                        <p className="text-white text-3xl font-bold">{categories.length}</p>
                    </div>
                </div>

                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-text-default border border-primary/30 hover:bg-primary/30 transition-all">
                    <Plus size={16}/>
                    {t('admin.templateCategories.newCategory')}
                </button>
            </div>

            <div className="bg-card/30 border border-border-subtle rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                        <tr className="border-b border-border">
                            <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">{t('admin.templateCategories.colId')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">{t('admin.templateCategories.colCategory')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">{t('admin.templateCategories.colColor')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">{t('admin.templateCategories.colIcon')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">{t('admin.templateCategories.colCreated')}</th>
                            <th className="text-right px-6 py-4 text-sm font-medium text-text-muted">{t('admin.templateCategories.colActions')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted">{t('admin.templateCategories.loading')}</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted">{t('admin.templateCategories.empty')}</td></tr>
                        ) : (
                            categories.map((c) => {
                                const IconComp = getIconComponent(c.icon);
                                return (
                                    <tr key={c.id_category_template} className="border-b border-border-subtle hover:bg-card/20 transition-colors">
                                        <td className="px-6 py-4 text-text-muted text-sm font-mono">#{c.id_category_template}</td>
                                        <td className="px-6 py-4"><CategoryBadge name={c.name} color={c.color} icon={c.icon}/></td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded-full border border-border" style={{backgroundColor: c.color || '#f59e0b'}}/>
                                                <span className="text-text-muted text-sm font-mono">{c.color || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-text-muted text-sm">
                                                <IconComp size={14}/>
                                                {c.icon || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-text-muted text-sm">{formatDate(c.created_at)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setEditCategory(c)} className="p-2 rounded-lg bg-card/30 border border-border-subtle text-text-muted hover:bg-primary/20 hover:text-text-default transition-all" title={t('admin.templateCategories.editTooltip')}>
                                                    <Pencil size={14}/>
                                                </button>
                                                <button onClick={() => setDeleteCategory(c)} className="p-2 rounded-lg bg-card border border-red-500/20 text-text-muted hover:bg-red-500/20 hover:text-red-400 transition-all" title={t('admin.templateCategories.deleteTooltip')}>
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreate && <CategoryFormModal onClose={() => setShowCreate(false)} onSave={handleSave}/>}
            {editCategory && <CategoryFormModal category={editCategory} onClose={() => setEditCategory(undefined)} onSave={handleSave}/>}
            {deleteCategory && <DeleteModal category={deleteCategory} onClose={() => setDeleteCategory(undefined)} onSave={handleSave}/>}
        </div>
    );
};
