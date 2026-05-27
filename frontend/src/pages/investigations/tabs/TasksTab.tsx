import {useState, useEffect, useCallback, useRef} from 'react';
import {
    CheckSquare,
    Square,
    Plus,
    Lock,
    Globe,
    User,
    Calendar,
    MessageSquare,
    Trash2,
    Edit2,
    X,
    ChevronDown,
    AlertCircle,
    Clock,
} from 'lucide-react';
import {api} from '../../../services/api';
import {useToast} from '../../../contexts/ToastContext';
import {formatRelativeDate} from '../../../utils/date';
import {useTranslation} from 'react-i18next';

interface CollaboratorData {
    id_collaborator: number;
    id_user: number;
    pseudo: string;
    permission_level: string;
    accepted_at: string | null;
}

interface InvestigationData {
    id_investigation: number;
    user_permission: string | null;
    collaborators: CollaboratorData[];
    owner: { id_user: number; pseudo: string };
}

interface TaskData {
    id_task: number;
    id_investigation: number;
    title: string;
    description: string | null;
    status: 'todo' | 'en_cours' | 'termine';
    priority: 'basse' | 'normale' | 'haute' | 'urgente';
    is_private: boolean;
    created_by: number | null;
    created_by_pseudo: string | null;
    assigned_to: number | null;
    assigned_to_pseudo: string | null;
    due_date: string | null;
    created_at: string | null;
    updated_at: string | null;
    response_count: number;
}

interface TaskResponseData {
    id_response: number;
    id_task: number;
    id_user: number | null;
    pseudo: string | null;
    content: string;
    created_at: string | null;
    updated_at: string | null;
}

interface MemberOption {
    id_user: number;
    pseudo: string;
}

const PRIORITY_COLORS: Record<string, string> = {
    basse: '#6b7280',
    normale: '#3b82f6',
    haute: '#f97316',
    urgente: '#ef4444',
};

const STATUS_COLORS: Record<string, string> = {
    todo: '#6b7280',
    en_cours: '#f59e0b',
    termine: '#22c55e',
};

const PRIORITY_KEYS = ['basse', 'normale', 'haute', 'urgente'] as const;
const STATUS_KEYS = ['todo', 'en_cours', 'termine'] as const;

const PriorityBadge = ({priority}: { priority: string }) => {
    const {t} = useTranslation();
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

const TaskStatusBadge = ({status}: { status: string }) => {
    const {t} = useTranslation();
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

const TaskForm = ({
                      members,
                      task,
                      onSubmit,
                      onCancel,
                      loading,
                  }: {
    members: MemberOption[];
    task?: TaskData | null;
    onSubmit: (data: Record<string, unknown>) => void;
    onCancel: () => void;
    loading: boolean;
}) => {
    const {t} = useTranslation();
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [status, setStatus] = useState(task?.status || 'todo');
    const [priority, setPriority] = useState(task?.priority || 'normale');
    const [isPrivate, setIsPrivate] = useState(task?.is_private ?? false);
    const [assignedTo, setAssignedTo] = useState<number | null>(task?.assigned_to ?? null);
    const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.substring(0, 10) : '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            is_private: isPrivate,
            assigned_to: assignedTo,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
            clear_assigned: assignedTo === null && task?.assigned_to !== undefined,
            clear_due_date: !dueDate && !!task?.due_date,
        });
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
                        onChange={(e) => setPriority(e.target.value as TaskData['priority'])}
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
                        onChange={(e) => setStatus(e.target.value as 'todo' | 'en_cours' | 'termine')}
                        className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-text-default text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                    >
                        {STATUS_KEYS.map((val) => (
                            <option key={val} value={val}>{t(`tasks.status.${val}`)}</option>
                        ))}
                    </select>
                </div>
            </div>

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
                    {isPrivate ? <Lock size={14} className="text-primary"/> :
                        <Globe size={14} className="text-text-muted"/>}
                    {isPrivate ? t('tasks.privateLabel') : t('tasks.sharedLabel')}
                </span>
            </div>

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

const TaskDetailModal = ({
                             task,
                             investigationId,
                             currentUserId,
                             userPermission,
                             onClose,
                             onRefresh,
                             members,
                         }: {
    task: TaskData;
    investigationId: number;
    currentUserId: number;
    userPermission: string | null;
    onClose: () => void;
    onRefresh: () => void;
    members: MemberOption[];
}) => {
    const {t} = useTranslation();
    const {toast} = useToast();
    const [responses, setResponses] = useState<TaskResponseData[]>([]);
    const [loadingResponses, setLoadingResponses] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [editing, setEditing] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isOwner = userPermission === 'owner';
    const canEdit = isOwner || task.created_by === currentUserId;
    const canDelete = isOwner || task.created_by === currentUserId;

    const fetchResponses = useCallback(async () => {
        try {
            const data = await api.getTaskResponses(investigationId, task.id_task);
            setResponses(data.responses);
        } catch {
            /* ignore */
        } finally {
            setLoadingResponses(false);
        }
    }, [investigationId, task.id_task]);

    useEffect(() => {
        fetchResponses();
    }, [fetchResponses]);

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setSubmittingComment(true);
        try {
            await api.createTaskResponse(investigationId, task.id_task, newComment.trim());
            setNewComment('');
            fetchResponses();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error adding comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (responseId: number) => {
        try {
            await api.deleteTaskResponse(investigationId, task.id_task, responseId);
            fetchResponses();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error deleting comment');
        }
    };

    const handleEditSubmit = async (formData: Record<string, unknown>) => {
        setSavingEdit(true);
        try {
            await api.updateTask(investigationId, task.id_task, formData as Parameters<typeof api.updateTask>[2]);
            toast('success', t('tasks.updated'));
            setEditing(false);
            onRefresh();
            onClose();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error updating task');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.deleteTask(investigationId, task.id_task);
            toast('success', t('tasks.deleted'));
            onRefresh();
            onClose();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error deleting task');
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
            <div
                className="bg-card/30 border border-border-subtle rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-start justify-between p-5 border-b border-border-subtle">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {task.is_private ? (
                                <Lock size={14} className="text-primary shrink-0"/>
                            ) : (
                                <Globe size={14} className="text-text-muted shrink-0"/>
                            )}
                            <h3 className="text-text-default font-semibold truncate">{task.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <PriorityBadge priority={task.priority}/>
                            <TaskStatusBadge status={task.status}/>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 shrink-0">
                        {canEdit && !editing && (
                            <button
                                onClick={() => setEditing(true)}
                                className="p-2 text-text-muted hover:text-text-default hover:bg-primary/10 rounded-lg transition-all"
                            >
                                <Edit2 size={14}/>
                            </button>
                        )}
                        {canDelete && !editing && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-40"
                            >
                                <Trash2 size={14}/>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text-default hover:bg-primary/10 rounded-lg transition-all"
                        >
                            <X size={14}/>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {editing ? (
                        <TaskForm
                            members={members}
                            task={task}
                            onSubmit={handleEditSubmit}
                            onCancel={() => setEditing(false)}
                            loading={savingEdit}
                        />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {task.assigned_to_pseudo && (
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <User size={13} className="text-primary shrink-0"/>
                                        <span>{t('tasks.assignedLabel')} <span
                                            className="text-text-default">{task.assigned_to_pseudo}</span></span>
                                    </div>
                                )}
                                {task.created_by_pseudo && (
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <User size={13} className="text-text-muted shrink-0"/>
                                        <span>Created by <span
                                            className="text-text-default">{task.created_by_pseudo}</span></span>
                                    </div>
                                )}
                                {task.due_date && (
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <Calendar size={13} className="text-primary shrink-0"/>
                                        <span>{t('tasks.dueDateLabel')}: <span
                                            className="text-text-default">{formatDate(task.due_date)}</span></span>
                                    </div>
                                )}
                                {task.created_at && (
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <Clock size={13} className="text-text-muted shrink-0"/>
                                        <span>{formatRelativeDate(task.created_at)}</span>
                                    </div>
                                )}
                            </div>

                            {task.description && (
                                <div className="bg-surface rounded-lg p-3">
                                    <p className="text-text-muted text-sm whitespace-pre-wrap">{task.description}</p>
                                </div>
                            )}
                        </>
                    )}

                    {!editing && (
                        <div>
                            <h4 className="text-text-default text-sm font-medium mb-3 flex items-center gap-2">
                                <MessageSquare size={14} className="text-primary"/>
                                {t('tasks.comments', {count: responses.length})}
                            </h4>

                            {loadingResponses ? (
                                <p className="text-text-muted text-sm">{t('tasks.loading')}</p>
                            ) : responses.length === 0 ? (
                                <p className="text-text-dim text-sm italic">{t('tasks.noComments')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {responses.map((resp) => (
                                        <div key={resp.id_response} className="flex gap-2.5 group">
                                            <span
                                                className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0 mt-0.5">
                                                {resp.pseudo ? resp.pseudo.charAt(0).toUpperCase() : '?'}
                                            </span>
                                            <div className="flex-1 bg-surface rounded-lg p-2.5">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span
                                                        className="text-text-default text-xs font-medium">{resp.pseudo || 'Deleted user'}</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-text-dim text-xs">
                                                            {resp.created_at ? formatRelativeDate(resp.created_at) : ''}
                                                        </span>
                                                        {(resp.id_user === currentUserId || isOwner) && (
                                                            <button
                                                                onClick={() => handleDeleteComment(resp.id_response)}
                                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-red-400 transition-all"
                                                            >
                                                                <X size={12}/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-text-muted text-xs whitespace-pre-wrap">{resp.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={handleSubmitComment} className="mt-3 flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={t('tasks.addCommentPlaceholder')}
                                    maxLength={2000}
                                    className="flex-1 px-3 py-2 bg-input-bg border border-border rounded-lg text-text-default text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={submittingComment || !newComment.trim()}
                                    className="px-3 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {t('tasks.send')}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const TasksTab = ({
                             investigation,
                             currentUserId,
                         }: {
    investigation: InvestigationData;
    currentUserId: number;
}) => {
    const {t} = useTranslation();
    const {toast} = useToast();
    const [tasks, setTasks] = useState<TaskData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
    const [filterVisibility, setFilterVisibility] = useState<'all' | 'shared' | 'private'>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const [closingTaskId, setClosingTaskId] = useState<number | null>(null);
    const [showCompleted, setShowCompleted] = useState(false);

    const userPermission = investigation.user_permission;
    const canCreate = userPermission === 'owner' || userPermission === 'manager' || userPermission === 'editeur';

    const members: MemberOption[] = [
        {id_user: investigation.owner.id_user, pseudo: investigation.owner.pseudo},
        ...investigation.collaborators
            .filter((c) => c.accepted_at !== null)
            .map((c) => ({id_user: c.id_user, pseudo: c.pseudo})),
    ];

    const handleToggleStatus = async (e: React.MouseEvent, task: TaskData) => {
        e.stopPropagation();
        setClosingTaskId(task.id_task);
        const newStatus = task.status === 'termine' ? 'todo' : 'termine';
        try {
            await api.updateTask(investigation.id_investigation, task.id_task, {status: newStatus});
            fetchTasks();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error updating task');
        } finally {
            setClosingTaskId(null);
        }
    };

    const fetchTasks = useCallback(async () => {
        try {
            const data = await api.getTasks(investigation.id_investigation);
            setTasks(data.tasks);
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error loading tasks');
        } finally {
            setLoading(false);
        }
    }, [investigation.id_investigation, toast]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
                setStatusDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleCreate = async (formData: Record<string, unknown>) => {
        setCreating(true);
        try {
            await api.createTask(investigation.id_investigation, formData as Parameters<typeof api.createTask>[1]);
            toast('success', t('tasks.created'));
            setShowCreateModal(false);
            fetchTasks();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error creating task');
        } finally {
            setCreating(false);
        }
    };

    const filteredTasks = tasks.filter((task) => {
        if (!showCompleted && task.status === 'termine') return false;
        if (filterVisibility === 'shared' && task.is_private) return false;
        if (filterVisibility === 'private' && !task.is_private) return false;
        if (filterStatus !== 'all' && task.status !== filterStatus) return false;
        return true;
    });

    const completedCount = tasks.filter((t) => t.status === 'termine').length;

    const isOverdue = (dueDateStr: string | null) => {
        if (!dueDateStr) return false;
        return new Date(dueDateStr) < new Date();
    };

    if (loading) {
        return <div className="text-center text-text-muted py-12">{t('tasks.loading')}</div>;
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-card/30 border border-border-subtle rounded-lg p-0.5">
                        {(['all', 'shared', 'private'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setFilterVisibility(v)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                    filterVisibility === v
                                        ? 'bg-primary text-white'
                                        : 'text-text-muted hover:text-text-default'
                                }`}
                            >
                                {v === 'all' ? t('tasks.filterAll') : v === 'shared' ? t('tasks.filterShared') : t('tasks.filterPrivate')}
                            </button>
                        ))}
                    </div>

                    <div className="relative" ref={statusDropdownRef}>
                        <button
                            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-card/30 border border-border-subtle rounded-lg text-xs text-text-muted hover:text-text-default transition-all"
                        >
                            <span>
                                {filterStatus === 'all' ? t('tasks.allStatuses') : t(`tasks.status.${filterStatus}`)}
                            </span>
                            <ChevronDown size={12}/>
                        </button>
                        {statusDropdownOpen && (
                            <div
                                className="absolute top-full left-0 mt-1 z-20 bg-card/30 border border-border-subtle rounded-xl py-1 shadow-lg min-w-[160px]">
                                <button
                                    onClick={() => {
                                        setFilterStatus('all');
                                        setStatusDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs hover:bg-primary/10 transition-colors ${filterStatus === 'all' ? 'text-primary' : 'text-text-muted'}`}
                                >
                                    {t('tasks.allStatuses')}
                                </button>
                                {STATUS_KEYS.map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => {
                                            setFilterStatus(val);
                                            setStatusDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs hover:bg-primary/10 transition-colors ${filterStatus === val ? 'text-primary' : 'text-text-muted'}`}
                                    >
                                        {t(`tasks.status.${val}`)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {completedCount > 0 && (
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                showCompleted
                                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                    : 'border-border text-text-muted hover:text-text-default'
                            }`}
                        >
                            <CheckSquare size={13}/>
                            {showCompleted ? t('tasks.hideCompleted') : t('tasks.showCompleted', {count: completedCount})}
                        </button>
                    )}
                    {canCreate && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-all"
                        >
                            <Plus size={14}/>
                            {t('tasks.newTask')}
                        </button>
                    )}
                </div>
            </div>

            {filteredTasks.length === 0 ? (
                <div className="bg-card/30 border border-border-subtle rounded-xl p-10 text-center">
                    <CheckSquare size={32} className="mx-auto text-text-muted mb-3"/>
                    <p className="text-text-default font-medium mb-1">{t('tasks.empty')}</p>
                    <p className="text-text-muted text-sm">
                        {canCreate ? t('tasks.emptyDesc') : t('tasks.emptyReadonly')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredTasks.map((task) => {
                        const canToggleStatus =
                            userPermission === 'owner' ||
                            task.created_by === currentUserId ||
                            task.assigned_to === currentUserId;
                        const isClosing = closingTaskId === task.id_task;

                        return (
                        <button
                            key={task.id_task}
                            onClick={() => setSelectedTask(task)}
                            className="w-full bg-card/30 border border-border-subtle rounded-xl p-4 text-left hover:border-primary/40 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    {canToggleStatus && (
                                        <button
                                            onClick={(e) => handleToggleStatus(e, task)}
                                            disabled={isClosing}
                                            title={task.status === 'termine' ? t('tasks.reopen') : t('tasks.markDone')}
                                            className={`mt-0.5 shrink-0 transition-colors disabled:opacity-40 ${
                                                task.status === 'termine'
                                                    ? 'text-green-500 hover:text-text-muted'
                                                    : 'text-text-dim hover:text-green-500'
                                            }`}
                                        >
                                            {task.status === 'termine'
                                                ? <CheckSquare size={15}/>
                                                : <Square size={15}/>
                                            }
                                        </button>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            {task.is_private ? (
                                                <Lock size={12} className="text-primary shrink-0"/>
                                            ) : (
                                                <Globe size={12} className="text-text-dim shrink-0"/>
                                            )}
                                            <span className={`text-sm font-medium truncate group-hover:text-primary transition-colors ${task.status === 'termine' ? 'line-through text-text-dim' : 'text-text-default'}`}>
                                                {task.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <PriorityBadge priority={task.priority}/>
                                            <TaskStatusBadge status={task.status}/>
                                            {task.assigned_to_pseudo && (
                                                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                                                    <User size={11}/>
                                                    {task.assigned_to_pseudo}
                                                </span>
                                            )}
                                            {task.due_date && (
                                                <span className={`inline-flex items-center gap-1 text-xs ${isOverdue(task.due_date) && task.status !== 'termine' ? 'text-red-400' : 'text-text-muted'}`}>
                                                    <Calendar size={11}/>
                                                    {new Date(task.due_date).toLocaleDateString('en-US')}
                                                    {isOverdue(task.due_date) && task.status !== 'termine' && (
                                                        <AlertCircle size={11}/>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {task.response_count > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs text-text-muted shrink-0">
                                        <MessageSquare size={12}/>
                                        {task.response_count}
                                    </span>
                                )}
                            </div>
                        </button>
                        );
                    })}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
                    <div className="bg-card/30 border border-border-subtle rounded-xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
                            <h3 className="text-text-default font-semibold flex items-center gap-2">
                                <Plus size={16} className="text-primary"/>
                                {t('tasks.newTask')}
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1.5 text-text-muted hover:text-text-default hover:bg-primary/10 rounded-lg transition-all"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                        <div className="p-5">
                            <TaskForm
                                members={members}
                                onSubmit={handleCreate}
                                onCancel={() => setShowCreateModal(false)}
                                loading={creating}
                            />
                        </div>
                    </div>
                </div>
            )}

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    investigationId={investigation.id_investigation}
                    currentUserId={currentUserId}
                    userPermission={userPermission}
                    onClose={() => setSelectedTask(null)}
                    onRefresh={fetchTasks}
                    members={members}
                />
            )}
        </div>
    );
};
