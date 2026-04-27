import {useState, useEffect, useCallback} from 'react';
import {api} from '../../../services/api';
import {LogCategoryBadge} from '../../../components/LogCategoryBadge';
import {SearchBar} from '../../../components/SearchBar';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useTranslation} from 'react-i18next';

interface LogData {
    id_log: number;
    id_user: number | null;
    pseudo: string | null;
    category: string;
    action: string;
    detail: string | null;
    ip_address: string | null;
    created_at: string | null;
}

export const LogsTab = () => {
    const {t} = useTranslation();
    const [logs, setLogs] = useState<LogData[]>([]);
    const [total, setTotal] = useState(0);
    const [filtered, setFiltered] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [excludeReads, setExcludeReads] = useState(false);
    const [loading, setLoading] = useState(true);
    const limit = 15;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [category]);

    useEffect(() => {
        setPage(1);
    }, [excludeReads]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getLogs(page, limit, category, debouncedSearch, excludeReads);
            setLogs(data.logs);
            setTotal(data.total);
            setFiltered(data.filtered);
            setCategories(data.categories);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    }, [page, category, debouncedSearch, excludeReads]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const totalPages = Math.ceil(filtered / limit);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        const end = Math.min(totalPages, start + maxVisible - 1);
        start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div>
            <SearchBar
                query={search}
                onQueryChange={setSearch}
                placeholder={t('admin.logs.searchPlaceholder')}
                filter={{
                    value: category || null,
                    onChange: (v) => setCategory((v as string) || ''),
                    options: categories.map((cat) => ({value: cat, label: cat})),
                    placeholder: t('admin.logs.allCategories'),
                }}
                total={total}
                totalLabel="log"
            />

            <div className="flex items-center gap-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary hover:text-accent transition-colors">
                    <input
                        type="checkbox"
                        checked={excludeReads}
                        onChange={(e) => setExcludeReads(e.target.checked)}
                        className="w-4 h-4 rounded border-primary/30 bg-dark/50 text-primary focus:ring-primary/20 cursor-pointer accent-[#8b5cf6]"
                    />
                    {t('admin.logs.hideConsultations')}
                </label>
            </div>

            <div className="bg-dark/50 border border-primary/20 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                        <tr className="border-b border-primary/20">
                            <th className="text-left px-6 py-4 text-sm font-medium text-secondary">{t('admin.logs.colId')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-secondary">{t('admin.logs.colDate')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-secondary">{t('admin.logs.colUser')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-secondary">{t('admin.logs.colCategory')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-secondary">{t('admin.logs.colAction')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-secondary">{t('admin.logs.colDetail')}</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-secondary">{t('admin.logs.colIp')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                                    {t('admin.logs.loading')}
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                                    {t('admin.logs.empty')}
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id_log}
                                    className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                                    <td className="px-6 py-4 text-secondary text-sm font-mono">#{log.id_log}</td>
                                    <td className="px-6 py-4 text-secondary text-sm whitespace-nowrap">{formatDate(log.created_at)}</td>
                                    <td className="px-6 py-4 text-accent text-sm font-medium">{log.pseudo || '—'}</td>
                                    <td className="px-6 py-4">
                                        <LogCategoryBadge category={log.category}/>
                                    </td>
                                    <td className="px-6 py-4 text-accent text-sm">{log.action}</td>
                                    <td className="px-6 py-4 text-secondary text-sm max-w-xs truncate">{log.detail || '—'}</td>
                                    <td className="px-6 py-4 text-secondary text-sm font-mono">{log.ip_address || '—'}</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-primary/20">
                        <p className="text-sm text-secondary">
                            {t('admin.logs.pagination', {page, total: totalPages, count: filtered})}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg bg-dark/50 border border-primary/20 text-secondary hover:bg-primary/20 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={16}/>
                            </button>
                            {getPageNumbers().map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                                        p === page
                                            ? 'bg-primary/20 text-accent border border-primary/30'
                                            : 'bg-dark/50 text-secondary hover:bg-primary/10 hover:text-accent'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg bg-dark/50 border border-primary/20 text-secondary hover:bg-primary/20 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={16}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
