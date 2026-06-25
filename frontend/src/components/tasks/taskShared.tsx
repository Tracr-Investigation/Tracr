import { useState } from 'react';
import { Lock, Globe, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type TaskStatus = 'todo' | 'en_cours' | 'bloque' | 'en_revue' | 'a_valider' | 'termine';
export type TaskPriority = 'basse' | 'normale' | 'haute' | 'urgente';

export interface TaskData {
    id_task: number;
    id_investigation: number | null;
    investigation_title?: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    is_private: boolean;
    position: number;
    created_by: number | null;
    created_by_pseudo: string | null;
    assigned_to: number | null;
    assigned_to_pseudo: string | null;
    due_date: string | null;
    created_at: string | null;
    updated_at: string | null;
    response_count: number;
}

export interface MemberOption {
    id_user: number;
    pseudo: string;
}

export const PRIORITY_COLORS: Record<string, string> = {
    basse: '#6b7280',
    normale: '#3b82f6',
    haute: '#f97316',
    urgente: '#ef4444',
};

export const STATUS_COLORS: Record<string, string> = {
    todo: '#6b7280',
    en_cours: '#f59e0b',
    bloque: '#ef4444',
    en_revue: '#a855f7',
    a_valider: '#06b6d4',
    termine: '#22c55e',
};

export const PRIORITY_KEYS = ['basse', 'normale', 'haute', 'urgente'] as const;
// Kanban column order (aligned with the backend TaskStatus enum).
export const STATUS_KEYS: TaskStatus[] = ['todo', 'en_cours', 'bloque', 'en_revue', 'a_valider', 'termine'];

export const PriorityBadge = ({ priority }: { priority: string }) => {
    const { t } = useTranslation();
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
                backgroundColor: `${PRIORITY_COLORS[priority] || '#6b7280'}20`,
                color: PRIORITY_COLORS[priority] || '#6b7280',
            }}
        >
            {t(`tasks.priority.${priority}`, priority)}
        </span>
    );
};

export const TaskStatusBadge = ({ status }: { status: string }) => {
    const { t } = useTranslation();
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
                backgroundColor: `${STATUS_COLORS[status] || '#6b7280'}20`,
                color: STATUS_COLORS[status] || '#6b7280',
            }}
        >
            {t(`tasks.status.${status}`, status)}
        </span>
    );
};

// Task create/edit form, shared by the investigation board and the personal board
// (in `personal` mode, assignment and visibility are hidden).
export const TaskForm = ({
    members,
    task,
    personal = false,
    defaultStatus,
    onSubmit,
    onCancel,
    loading,
}: {
    members: MemberOption[];
    task?: TaskData | null;
    personal?: boolean;
    defaultStatus?: TaskStatus;
    onSubmit: (data: Record<string, unknown>) => void;
    onCancel: () => void;
    loading: boolean;
}) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [status, setStatus] = useState<TaskStatus>(task?.status || defaultStatus || 'todo');
    const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'normale');
    const [isPrivate, setIsPrivate] = useState(task?.is_private ?? false);
    const [assignedTo, setAssignedTo] = useState<number | null>(task?.assigned_to ?? null);
    const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.substring(0, 10) : '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        const base: Record<string, unknown> = {
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
            clear_due_date: !dueDate && !!task?.due_date,
        };
        if (!personal) {
            base.is_private = isPrivate;
            base.assigned_to = assignedTo;
            base.clear_assigned = assignedTo === null && task?.assigned_to !== undefined;
        }
        onSubmit(base);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs text-text-muted mb-1">{t('tasks.titleLabel')}</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('tasks.titlePlaceholder')}
                    maxLength={255}
                    required
                    className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-text-default text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                />
            </div>

            <div>
                <label className="block text-xs text-text-muted mb-1">{t('tasks.descLabel')}</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('tasks.descPlaceholder')}
                    rows={3}
                    maxLength={2000}
                    className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-text-default text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs text-text-muted mb-1">{t('tasks.priorityLabel')}</label>
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TaskPriority)}
                        className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-text-default text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                    >
                        {PRIORITY_KEYS.map((val) => (
                            <option key={val} value={val}>{t(`tasks.priority.${val}`)}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-text-muted mb-1">{t('tasks.statusLabel')}</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as TaskStatus)}
                        className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-text-default text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                    >
                        {STATUS_KEYS.map((val) => (
                            <option key={val} value={val}>{t(`tasks.status.${val}`)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!personal && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-text-muted mb-1">{t('tasks.assignedLabel')}</label>
                        <select
                            value={assignedTo ?? ''}
                            onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-text-default text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                        >
                            <option value="">{t('tasks.assignedNobody')}</option>
                            {members.map((m) => (
                                <option key={m.id_user} value={m.id_user}>{m.pseudo}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-text-muted mb-1">{t('tasks.dueDateLabel')}</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-text-default text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>
                </div>
            )}

            {personal && (
                <div>
                    <label className="block text-xs text-text-muted mb-1">{t('tasks.dueDateLabel')}</label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-text-default text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                </div>
            )}

            {!personal && (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${isPrivate ? 'bg-primary' : 'bg-primary/20'}`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-5' : ''}`}
                        />
                    </button>
                    <span className="text-sm text-text-default flex items-center gap-1.5">
                        {isPrivate ? <Lock size={14} className="text-primary" /> :
                            <Globe size={14} className="text-text-muted" />}
                        {isPrivate ? t('tasks.privateLabel') : t('tasks.sharedLabel')}
                    </span>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-text-muted hover:text-text-default transition-colors"
                >
                    {t('tasks.cancel')}
                </button>
                <button
                    type="submit"
                    disabled={loading || !title.trim()}
                    className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? t('tasks.saving') : task ? t('tasks.save') : t('tasks.create')}
                </button>
            </div>
        </form>
    );
};

// Slide-in panel (from the right) for creating/editing a task; the inner form is
// mounted only while open so it starts fresh every time.
export const TaskFormPanel = ({
    open,
    heading,
    headerAction,
    onClose,
    members,
    task,
    personal = false,
    defaultStatus,
    onSubmit,
    loading,
}: {
    open: boolean;
    heading: string;
    headerAction?: React.ReactNode;
    onClose: () => void;
    members: MemberOption[];
    task?: TaskData | null;
    personal?: boolean;
    defaultStatus?: TaskStatus;
    onSubmit: (data: Record<string, unknown>) => void;
    loading: boolean;
}) => {
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
                style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
                    <h2 className="text-lg font-bold text-text-default flex items-center gap-2 min-w-0">
                        <Plus size={16} className="text-primary shrink-0" />
                        <span className="truncate">{heading}</span>
                    </h2>
                    <div className="flex items-center gap-1 shrink-0">
                        {headerAction}
                        <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {open && (
                        <TaskForm
                            members={members}
                            task={task}
                            personal={personal}
                            defaultStatus={defaultStatus}
                            onSubmit={onSubmit}
                            onCancel={onClose}
                            loading={loading}
                        />
                    )}
                </div>
            </div>
        </>
    );
};
