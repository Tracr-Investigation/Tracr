import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { LogCategoryBadge } from '../../../components/LogCategoryBadge';
import { Search, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';

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
  const [logs, setLogs] = useState<LogData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
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

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLogs(page, limit, category, debouncedSearch);
      setLogs(data.logs);
      setTotal(data.total);
      setCategories(data.categories);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, category, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

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
      {/* Stat Card */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 inline-flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <ScrollText size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white/80 text-sm">Total logs</p>
            <p className="text-white text-3xl font-bold">{total}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search by action or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-dark/50 border border-primary/30 rounded-xl text-accent placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategory('')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              category === ''
                ? 'bg-primary/20 text-accent border border-primary/30'
                : 'bg-dark/50 border border-primary/20 text-secondary hover:bg-primary/10 hover:text-accent'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                category === cat
                  ? 'bg-primary/20 text-accent border border-primary/30'
                  : 'bg-dark/50 border border-primary/20 text-secondary hover:bg-primary/10 hover:text-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-dark/50 border border-primary/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary/20">
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">User</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Category</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Action</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Detail</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-secondary">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                    No log found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id_log} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 text-secondary text-sm whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-6 py-4 text-accent text-sm font-medium">{log.pseudo || '—'}</td>
                    <td className="px-6 py-4">
                      <LogCategoryBadge category={log.category} />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-primary/20">
            <p className="text-sm text-secondary">
              Page {page} / {totalPages} ({total} logs)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-dark/50 border border-primary/20 text-secondary hover:bg-primary/20 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
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
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
