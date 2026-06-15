import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ListChecks } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { toInvestigationSlug } from '../../utils/slug';
import { KanbanBoard } from '../../components/tasks/KanbanBoard';
import { CalendarView } from '../calendar/Calendar';
import { usePageTitle } from '../../hooks/usePageTitle';
import { TaskFormPanel, type TaskData, type TaskStatus } from '../../components/tasks/taskShared';

type MyTasksTab = 'personal' | 'assigned' | 'calendar';

export const MyTasks = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();
    usePageTitle(t('sidebar.myTasks'));
    const [searchParams] = useSearchParams();
    const paramTab = searchParams.get('tab');
    const [tab, setTab] = useState<MyTasksTab>(
        paramTab === 'assigned' || paramTab === 'calendar' ? paramTab : 'personal',
    );
    const [personalTasks, setPersonalTasks] = useState<TaskData[]>([]);
    const [assignedTasks, setAssignedTasks] = useState<TaskData[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<TaskData | null>(null);
    const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [p, a] = await Promise.all([api.getPersonalTasks(), api.getAssignedTasks()]);
            setPersonalTasks(p.tasks);
            setAssignedTasks(a.tasks);
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error loading tasks');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const handleMovePersonal = useCallback(async (taskId: number, status: TaskStatus, position: number) => {
        setPersonalTasks((prev) => prev.map((t) => (t.id_task === taskId ? { ...t, status, position } : t)));
        try {
            await api.movePersonalTask(taskId, { status, position });
            fetchAll();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : t('tasks.movedError'));
            fetchAll();
        }
    }, [fetchAll, toast, t]);

    const openCreate = (status: TaskStatus = 'todo') => {
        setEditTask(null);
        setDefaultStatus(status);
        setModalOpen(true);
    };

    const openEdit = (task: TaskData) => {
        setEditTask(task);
        setModalOpen(true);
    };

    const handleSubmit = async (data: Record<string, unknown>) => {
        setSaving(true);
        try {
            if (editTask) {
                await api.updatePersonalTask(editTask.id_task, data as Parameters<typeof api.updatePersonalTask>[1]);
                toast('success', t('tasks.updated'));
            } else {
                await api.createPersonalTask(data as Parameters<typeof api.createPersonalTask>[0]);
                toast('success', t('tasks.created'));
            }
            setModalOpen(false);
            fetchAll();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editTask) return;
        setDeleting(true);
        try {
            await api.deletePersonalTask(editTask.id_task);
            toast('success', t('tasks.deleted'));
            setModalOpen(false);
            fetchAll();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Layout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-text-default flex items-center gap-2">
                            <ListChecks size={24} className="text-primary" />
                            {t('tasks.personalTitle')}
                        </h1>
                        <p className="text-text-muted text-sm mt-1">{t('tasks.personalSubtitle')}</p>
                    </div>
                    {tab === 'personal' && (
                        <button
                            onClick={() => openCreate('todo')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-all"
                        >
                            <Plus size={14} />
                            {t('tasks.newTask')}
                        </button>
                    )}
                </div>

                <div className="flex bg-card/30 border border-border-subtle rounded-lg p-0.5 w-fit mb-5">
                    {(['personal', 'assigned', 'calendar'] as const).map((v) => (
                        <button
                            key={v}
                            onClick={() => setTab(v)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                                tab === v ? 'bg-primary text-white' : 'text-text-muted hover:text-text-default'
                            }`}
                        >
                            {v === 'personal' ? t('tasks.tabPersonal') : v === 'assigned' ? t('tasks.tabAssigned') : t('tasks.tabCalendar')}
                        </button>
                    ))}
                </div>

                {tab === 'calendar' ? (
                    <CalendarView />
                ) : loading ? (
                    <div className="text-center text-text-muted py-12">{t('tasks.loading')}</div>
                ) : tab === 'personal' ? (
                    personalTasks.length === 0 ? (
                        <div className="bg-card/30 border border-border-subtle rounded-xl p-10 text-center">
                            <ListChecks size={32} className="mx-auto text-text-muted mb-3" />
                            <p className="text-text-default font-medium mb-1">{t('tasks.personalEmpty')}</p>
                            <p className="text-text-muted text-sm">{t('tasks.personalEmptyDesc')}</p>
                        </div>
                    ) : (
                        <KanbanBoard
                            tasks={personalTasks}
                            showAssignee={false}
                            onMove={handleMovePersonal}
                            onCardClick={openEdit}
                            onAddCard={openCreate}
                        />
                    )
                ) : assignedTasks.length === 0 ? (
                    <div className="bg-card/30 border border-border-subtle rounded-xl p-10 text-center">
                        <ListChecks size={32} className="mx-auto text-text-muted mb-3" />
                        <p className="text-text-default font-medium mb-1">{t('tasks.assignedEmpty')}</p>
                        <p className="text-text-muted text-sm">{t('tasks.assignedEmptyDesc')}</p>
                    </div>
                ) : (
                    <KanbanBoard
                        tasks={assignedTasks}
                        showAssignee={false}
                        canMoveTask={() => false}
                        onMove={() => {}}
                        onCardClick={(task) =>
                            task.id_investigation &&
                            navigate(`/investigations/${toInvestigationSlug(task.investigation_title || '', task.id_investigation)}`)
                        }
                    />
                )}
            </div>

            <TaskFormPanel
                open={modalOpen}
                heading={editTask ? editTask.title : t('tasks.newTask')}
                headerAction={editTask ? (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-40"
                    >
                        <Trash2 size={15} />
                    </button>
                ) : undefined}
                onClose={() => setModalOpen(false)}
                members={[]}
                personal
                task={editTask}
                defaultStatus={defaultStatus}
                onSubmit={handleSubmit}
                loading={saving}
            />
        </Layout>
    );
};
