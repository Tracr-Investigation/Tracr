import { useEffect, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    closestCorners,
    type DragStartEvent,
    type DragOverEvent,
    type DragEndEvent,
    type UniqueIdentifier,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Lock, Globe, User, Calendar, MessageSquare, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    type TaskData,
    type TaskStatus,
    STATUS_KEYS,
    STATUS_COLORS,
    PriorityBadge,
} from './taskShared';

// Colonnes affichées par défaut (les autres statuts sont masqués derrière « Tout afficher »)
const MAIN_STATUSES: TaskStatus[] = ['todo', 'en_cours', 'termine'];

const COL_PREFIX = 'col-';
const colId = (status: TaskStatus) => `${COL_PREFIX}${status}`;
const isColId = (id: UniqueIdentifier) => typeof id === 'string' && id.startsWith(COL_PREFIX);
const statusFromColId = (id: UniqueIdentifier) => String(id).slice(COL_PREFIX.length) as TaskStatus;

type Columns = Record<TaskStatus, TaskData[]>;

function buildColumns(tasks: TaskData[]): Columns {
    const cols = {} as Columns;
    for (const s of STATUS_KEYS) cols[s] = [];
    for (const task of tasks) {
        (cols[task.status] ?? (cols[task.status] = [])).push(task);
    }
    for (const s of STATUS_KEYS) {
        cols[s].sort((a, b) => a.position - b.position);
    }
    return cols;
}

const isOverdue = (dueDateStr: string | null) =>
    !!dueDateStr && new Date(dueDateStr) < new Date();

// ── Carte ───────────────────────────────────────────────────────────────────

const TaskCard = ({
    task,
    showAssignee,
    onClick,
}: {
    task: TaskData;
    showAssignee: boolean;
    onClick: () => void;
}) => (
    <div
        onClick={onClick}
        className="bg-card/60 border border-border-subtle rounded-lg p-3 text-left hover:border-primary/40 transition-all cursor-pointer group"
    >
        <div className="flex items-center gap-1.5 mb-1.5">
            {task.is_private ? (
                <Lock size={11} className="text-primary shrink-0" />
            ) : task.id_investigation !== null ? (
                <Globe size={11} className="text-text-dim shrink-0" />
            ) : null}
            <span className="text-sm font-medium text-text-default group-hover:text-primary transition-colors line-clamp-2">
                {task.title}
            </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
            <PriorityBadge priority={task.priority} />
            {showAssignee && task.assigned_to_pseudo && (
                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                    <User size={11} />
                    {task.assigned_to_pseudo}
                </span>
            )}
            {task.investigation_title && (
                <span className="inline-flex items-center gap-1 text-xs text-text-dim truncate max-w-[140px]">
                    {task.investigation_title}
                </span>
            )}
            {task.due_date && (
                <span className={`inline-flex items-center gap-1 text-xs ${isOverdue(task.due_date) && task.status !== 'termine' ? 'text-red-400' : 'text-text-muted'}`}>
                    <Calendar size={11} />
                    {new Date(task.due_date).toLocaleDateString('en-US')}
                    {isOverdue(task.due_date) && task.status !== 'termine' && <AlertCircle size={11} />}
                </span>
            )}
            {task.response_count > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                    <MessageSquare size={11} />
                    {task.response_count}
                </span>
            )}
        </div>
    </div>
);

const SortableCard = ({
    task,
    showAssignee,
    disabled,
    onClick,
}: {
    task: TaskData;
    showAssignee: boolean;
    disabled: boolean;
    onClick: () => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id_task,
        disabled,
    });
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCard task={task} showAssignee={showAssignee} onClick={onClick} />
        </div>
    );
};

// ── Colonne ──────────────────────────────────────────────────────────────────

const Column = ({
    status,
    tasks,
    showAssignee,
    canMoveTask,
    onCardClick,
    onAddCard,
}: {
    status: TaskStatus;
    tasks: TaskData[];
    showAssignee: boolean;
    canMoveTask: (task: TaskData) => boolean;
    onCardClick: (task: TaskData) => void;
    onAddCard?: (status: TaskStatus) => void;
}) => {
    const { t } = useTranslation();
    const { setNodeRef } = useDroppable({ id: colId(status) });
    const color = STATUS_COLORS[status] || '#6b7280';

    return (
        <div className="flex flex-col flex-1 min-w-[260px]">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold text-text-default">{t(`tasks.status.${status}`)}</span>
                    <span className="text-xs text-text-dim">{tasks.length}</span>
                </div>
                {onAddCard && (
                    <button
                        onClick={() => onAddCard(status)}
                        className="p-1 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-all"
                        title={t('tasks.addCard')}
                    >
                        <Plus size={14} />
                    </button>
                )}
            </div>
            <div
                ref={setNodeRef}
                className="flex-1 min-h-[120px] bg-card/20 border border-border-subtle rounded-xl p-2 space-y-2"
            >
                <SortableContext items={tasks.map((tk) => tk.id_task)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <SortableCard
                            key={task.id_task}
                            task={task}
                            showAssignee={showAssignee}
                            disabled={!canMoveTask(task)}
                            onClick={() => onCardClick(task)}
                        />
                    ))}
                </SortableContext>
                {tasks.length === 0 && (
                    <p className="text-xs text-text-dim italic text-center py-6">{t('tasks.columnEmpty')}</p>
                )}
            </div>
        </div>
    );
};

// ── Board ────────────────────────────────────────────────────────────────────

export const KanbanBoard = ({
    tasks,
    showAssignee = true,
    canMoveTask = () => true,
    onMove,
    onCardClick,
    onAddCard,
}: {
    tasks: TaskData[];
    showAssignee?: boolean;
    canMoveTask?: (task: TaskData) => boolean;
    onMove: (taskId: number, status: TaskStatus, position: number) => void;
    onCardClick: (task: TaskData) => void;
    onAddCard?: (status: TaskStatus) => void;
}) => {
    const { t } = useTranslation();
    const [columns, setColumns] = useState<Columns>(() => buildColumns(tasks));
    const [activeTask, setActiveTask] = useState<TaskData | null>(null);
    const [showAll, setShowAll] = useState(false);

    // Re-synchronise quand la liste source change (sauf pendant un drag en cours)
    useEffect(() => {
        if (!activeTask) setColumns(buildColumns(tasks));
    }, [tasks, activeTask]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const findColumn = (id: UniqueIdentifier): TaskStatus | null => {
        if (isColId(id)) return statusFromColId(id);
        for (const s of STATUS_KEYS) {
            if (columns[s].some((t) => t.id_task === id)) return s;
        }
        return null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const id = event.active.id;
        for (const s of STATUS_KEYS) {
            const found = columns[s].find((t) => t.id_task === id);
            if (found) { setActiveTask(found); return; }
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;
        const activeCol = findColumn(active.id);
        const overCol = findColumn(over.id);
        if (!activeCol || !overCol || activeCol === overCol) return;

        setColumns((prev) => {
            const activeItems = prev[activeCol];
            const overItems = prev[overCol];
            const activeIndex = activeItems.findIndex((t) => t.id_task === active.id);
            if (activeIndex < 0) return prev;
            const moved = { ...activeItems[activeIndex], status: overCol };
            let overIndex = overItems.findIndex((t) => t.id_task === over.id);
            if (overIndex < 0) overIndex = overItems.length;
            return {
                ...prev,
                [activeCol]: activeItems.filter((t) => t.id_task !== active.id),
                [overCol]: [...overItems.slice(0, overIndex), moved, ...overItems.slice(overIndex)],
            };
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        if (!over) return;
        const overCol = findColumn(over.id);
        if (!overCol) return;

        setColumns((prev) => {
            const items = prev[overCol];
            const oldIndex = items.findIndex((t) => t.id_task === active.id);
            if (oldIndex < 0) return prev;
            let newIndex = items.findIndex((t) => t.id_task === over.id);
            if (newIndex < 0) newIndex = items.length - 1;
            const reordered = arrayMove(items, oldIndex, newIndex);
            const finalIndex = reordered.findIndex((t) => t.id_task === active.id);
            onMove(Number(active.id), overCol, finalIndex);
            return { ...prev, [overCol]: reordered };
        });
    };

    // Colonnes visibles : les 3 principales, + les statuts supplémentaires si
    // « Tout afficher » est actif OU s'ils contiennent déjà des tâches (jamais cachées).
    const visibleStatuses = STATUS_KEYS.filter(
        (s) => MAIN_STATUSES.includes(s) || showAll || columns[s].length > 0,
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex justify-end mb-2">
                <button
                    onClick={() => setShowAll((v) => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-muted hover:text-text-default border border-border-subtle rounded-lg transition-all"
                >
                    {showAll ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showAll ? t('tasks.showMainColumns') : t('tasks.showAllColumns')}
                </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4">
                {visibleStatuses.map((status) => (
                    <Column
                        key={status}
                        status={status}
                        tasks={columns[status]}
                        showAssignee={showAssignee}
                        canMoveTask={canMoveTask}
                        onCardClick={onCardClick}
                        onAddCard={onAddCard}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeTask ? <TaskCard task={activeTask} showAssignee={showAssignee} onClick={() => {}} /> : null}
            </DragOverlay>
        </DndContext>
    );
};
