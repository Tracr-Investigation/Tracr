import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { toInvestigationSlug } from '../../utils/slug';

type Task = {
    id_task: number;
    id_investigation: number;
    investigation_title: string;
    title: string;
    status: 'todo' | 'en_cours' | 'termine';
    priority: 'basse' | 'normale' | 'haute' | 'urgente';
    is_private: boolean;
    due_date: string | null;
};

const PRIORITY_COLORS: Record<string, string> = {
    basse: '#6b7280',
    normale: '#3b82f6',
    haute: '#f97316',
    urgente: '#ef4444',
};

function getDaysInMonth(year: number, month: number): Date[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Pad start with days from previous month
    for (let i = 0; i < firstDay.getDay(); i++) {
        days.push(new Date(year, month, -firstDay.getDay() + i + 1));
    }

    // Days of current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push(new Date(year, month, d));
    }

    // Pad end to complete last week
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
        for (let i = 1; i <= remaining; i++) {
            days.push(new Date(year, month + 1, i));
        }
    }

    return days;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export const Calendar = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const today = new Date();
    const DAYS = t('calendar.days', { returnObjects: true }) as string[];
    const MONTHS = t('calendar.months', { returnObjects: true }) as string[];

    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getMyTasks();
            setTasks(data.tasks);
        } catch {
            /* silently fail */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((y) => y - 1);
        } else {
            setCurrentMonth((m) => m - 1);
        }
        setSelectedDay(null);
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((y) => y + 1);
        } else {
            setCurrentMonth((m) => m + 1);
        }
        setSelectedDay(null);
    };

    const goToToday = () => {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
        setSelectedDay(today);
    };

    const days = getDaysInMonth(currentYear, currentMonth);

    // Map tasks by day key
    const tasksByDay = new Map<string, Task[]>();
    for (const task of tasks) {
        if (!task.due_date) continue;
        const date = new Date(task.due_date);
        const key = toDateKey(date);
        if (!tasksByDay.has(key)) tasksByDay.set(key, []);
        tasksByDay.get(key)!.push(task);
    }

    // Tasks for selected day panel
    const selectedDayTasks = selectedDay
        ? (tasksByDay.get(toDateKey(selectedDay)) ?? [])
        : [];

    const isCurrentMonth = (date: Date) =>
        date.getMonth() === currentMonth && date.getFullYear() === currentYear;

    return (
        <Layout>
            <div className="p-8">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-accent mb-1">{t('calendar.title')}</h1>
                        <p className="text-secondary text-sm">{t('calendar.subtitle')}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToToday}
                            className="px-3 py-1.5 text-sm border border-primary/30 text-secondary hover:text-accent hover:border-primary/60 rounded-lg transition-all"
                        >
                            {t('calendar.today')}
                        </button>
                        <button
                            onClick={goToPrevMonth}
                            className="p-2 hover:bg-primary/10 rounded-lg text-secondary hover:text-accent transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-accent font-semibold min-w-[160px] text-center">
                            {MONTHS[currentMonth]} {currentYear}
                        </span>
                        <button
                            onClick={goToNextMonth}
                            className="p-2 hover:bg-primary/10 rounded-lg text-secondary hover:text-accent transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                <div className={`flex gap-4 ${selectedDay ? 'flex-col lg:flex-row' : ''}`}>
                    {/* Calendar grid */}
                    <div className="flex-1 bg-dark/50 border border-primary/20 rounded-xl overflow-hidden">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 border-b border-primary/10">
                            {DAYS.map((day) => (
                                <div
                                    key={day}
                                    className="py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wide"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Day cells */}
                        {loading ? (
                            <div className="py-20 text-center text-secondary text-sm">Loading...</div>
                        ) : (
                            <div className="grid grid-cols-7">
                                {days.map((date, idx) => {
                                    const key = toDateKey(date);
                                    const dayTasks = tasksByDay.get(key) ?? [];
                                    const isToday = isSameDay(date, today);
                                    const isSelected = selectedDay ? isSameDay(date, selectedDay) : false;
                                    const inMonth = isCurrentMonth(date);
                                    const hasOverdue = dayTasks.some(
                                        (t) => t.status !== 'termine' && new Date(t.due_date!) < today && !isSameDay(date, today)
                                    );

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDay(isSelected ? null : date)}
                                            className={`
                                                min-h-[90px] p-2 border-b border-r border-primary/10 cursor-pointer transition-colors
                                                ${inMonth ? 'hover:bg-primary/5' : 'opacity-30'}
                                                ${isSelected ? 'bg-primary/10 border-primary/30' : ''}
                                            `}
                                        >
                                            {/* Date number */}
                                            <div className="flex items-center justify-between mb-1">
                                                <span
                                                    className={`
                                                        text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                                                        ${isToday ? 'bg-primary text-white' : isSelected ? 'text-accent' : 'text-secondary'}
                                                    `}
                                                >
                                                    {date.getDate()}
                                                </span>
                                                {hasOverdue && (
                                                    <AlertCircle size={11} className="text-red-400" />
                                                )}
                                            </div>

                                            {/* Task chips */}
                                            <div className="space-y-0.5">
                                                {dayTasks.slice(0, 3).map((task) => (
                                                    <div
                                                        key={task.id_task}
                                                        className={`
                                                            flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate
                                                            ${task.status === 'termine' ? 'opacity-40' : ''}
                                                        `}
                                                        style={{
                                                            backgroundColor: `${PRIORITY_COLORS[task.priority]}18`,
                                                            borderLeft: `2px solid ${PRIORITY_COLORS[task.priority]}`,
                                                        }}
                                                        title={task.title}
                                                    >
                                                        <span
                                                            className={`truncate ${task.status === 'termine' ? 'line-through text-secondary' : 'text-accent'}`}
                                                        >
                                                            {task.title}
                                                        </span>
                                                    </div>
                                                ))}
                                                {dayTasks.length > 3 && (
                                                    <p className="text-[10px] text-secondary/60 pl-1">
                                                        {t('calendar.more', { count: dayTasks.length - 3 })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Side panel for selected day */}
                    {selectedDay && (
                        <div className="lg:w-72 bg-dark/50 border border-primary/20 rounded-xl p-5 flex flex-col gap-4 self-start">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-accent">
                                    {selectedDay.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </h3>
                                <button
                                    onClick={() => setSelectedDay(null)}
                                    className="text-secondary hover:text-accent transition-colors text-xs"
                                >
                                    {t('calendar.close')}
                                </button>
                            </div>

                            {selectedDayTasks.length === 0 ? (
                                <div className="text-center py-6">
                                    <CalendarIcon size={28} className="mx-auto text-secondary/30 mb-2" />
                                    <p className="text-secondary/60 text-xs">{t('calendar.noTasksDueThisDay')}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedDayTasks.map((task) => {
                                        const isOverdue =
                                            task.status !== 'termine' &&
                                            new Date(task.due_date!) < today &&
                                            !isSameDay(selectedDay, today);

                                        return (
                                            <button
                                                key={task.id_task}
                                                onClick={() =>
                                                    navigate(
                                                        `/investigations/${toInvestigationSlug(
                                                            task.investigation_title,
                                                            task.id_investigation
                                                        )}`
                                                    )
                                                }
                                                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-all border border-primary/10 hover:border-primary/30 group"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                                                    />
                                                    <span
                                                        className={`text-sm font-medium truncate group-hover:text-primary transition-colors ${
                                                            task.status === 'termine'
                                                                ? 'line-through text-secondary/50'
                                                                : 'text-accent'
                                                        }`}
                                                    >
                                                        {task.title}
                                                    </span>
                                                    {isOverdue && (
                                                        <AlertCircle size={11} className="text-red-400 shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-secondary/60 truncate pl-4">
                                                    {task.investigation_title}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-4 flex-wrap">
                    {(Object.keys(PRIORITY_COLORS) as string[]).map((key) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[key] }} />
                            <span className="text-xs text-secondary">{t(`calendar.priority.${key}`)}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <AlertCircle size={11} className="text-red-400" />
                        <span className="text-xs text-secondary">{t('calendar.overdue')}</span>
                    </div>
                </div>
            </div>
        </Layout>
    );
};