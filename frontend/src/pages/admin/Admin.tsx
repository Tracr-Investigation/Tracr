import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserData {
  id_user: number;
  pseudo: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
}

export const Admin = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUsers(page, limit, debouncedSearch);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-accent mb-8">Administration</h1>

        {/* Stat Card */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 inline-flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Total users</p>
              <p className="text-white text-3xl font-bold">{total}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-dark/50 border border-primary/30 rounded-xl text-accent placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-dark/50 border border-primary/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary/20">
                  <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Username</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Role</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Created</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-secondary">Last login</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-secondary">
                      Loading...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-secondary">
                      No user found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id_user} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 text-accent font-medium">{u.pseudo}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.role === 'super-admin'
                            ? 'bg-red-500/20 text-red-400'
                            : u.role === 'admin'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-secondary/20 text-secondary'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-secondary text-sm">{formatDate(u.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-sm ${
                          u.is_active ? 'text-green-400' : 'text-red-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            u.is_active ? 'bg-green-400' : 'bg-red-400'
                          }`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-secondary text-sm">{formatDate(u.last_login_at)}</td>
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
                Page {page} / {totalPages} ({total} users)
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
    </Layout>
  );
};
