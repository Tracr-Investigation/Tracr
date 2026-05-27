import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { SearchBar } from '../../../components/SearchBar';
import { ChevronLeft, ChevronRight, KeyRound, X, Check, Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULES, isPasswordValid } from '../../../utils/passwordValidation';

interface UserData {
  id_user: number;
  pseudo: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
}

// ── Reset password modal ────────────────────────────────────────────────────

const ResetPasswordModal = ({ user, onClose }: { user: UserData; onClose: () => void }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.adminResetPassword(user.id_user, newPassword);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-text-default">Reset password</h2>
            <p className="text-sm text-text-muted">User: <span className="text-text-default font-medium">{user.pseudo}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-text-default transition-colors"><X size={18} /></button>
        </div>

        {success ? (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
            <Check size={16} />
            Password reset. The user will be required to change it on next login.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••" required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••" required />
            </div>
            {newPassword && (
              <ul className="space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(newPassword);
                  return (
                    <li key={rule.label} className={`flex items-center gap-2 text-xs ${ok ? 'text-green-400' : 'text-text-muted'}`}>
                      {ok ? <Check size={12} /> : <X size={12} />} {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
            {error && <div className="p-3 bg-red-500/10 border border-border-error rounded-xl"><p className="text-red-400 text-sm">{error}</p></div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-default hover:bg-primary/10 transition-all text-sm">Cancel</button>
              <button type="submit" disabled={loading || !isPasswordValid(newPassword) || newPassword !== confirm}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ── Delete confirmation modal ───────────────────────────────────────────────

const DeleteModal = ({ user, onClose, onDeleted }: { user: UserData; onClose: () => void; onDeleted: () => void }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.adminDeleteUser(user.id_user);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting user');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-default">Delete account</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-text-default transition-colors"><X size={18} /></button>
        </div>
        <p className="text-text-muted text-sm mb-1">This action is irreversible. The account will be permanently deleted.</p>
        <p className="text-text-default font-medium mb-5">"{user.pseudo}"</p>
        {error && <div className="p-3 bg-red-500/10 border border-border-error rounded-xl mb-4"><p className="text-red-400 text-sm">{error}</p></div>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-default hover:bg-primary/10 transition-all text-sm">Cancel</button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Create admin modal ──────────────────────────────────────────────────────

const CreateAdminModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.adminCreateUser(pseudo, password);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating user');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-text-default">Create admin account</h2>
            <p className="text-sm text-text-muted">The user will be required to change their password on first login.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-text-default transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-default mb-2">Username</label>
            <input type="text" value={pseudo} onChange={(e) => setPseudo(e.target.value)}
              className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="username" required autoFocus minLength={3} maxLength={50} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-default mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="••••••••" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-default mb-2">Confirm password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="••••••••" required />
          </div>
          {password && (
            <ul className="space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li key={rule.label} className={`flex items-center gap-2 text-xs ${ok ? 'text-green-400' : 'text-text-muted'}`}>
                    {ok ? <Check size={12} /> : <X size={12} />} {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
          {error && <div className="p-3 bg-red-500/10 border border-border-error rounded-xl"><p className="text-red-400 text-sm">{error}</p></div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-default hover:bg-primary/10 transition-all text-sm">Cancel</button>
            <button type="submit" disabled={loading || !isPasswordValid(password) || password !== confirm || pseudo.length < 3}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">
              {loading ? 'Creating...' : 'Create admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main tab ────────────────────────────────────────────────────────────────

export const UsersTab = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<UserData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUsers(page, limit, debouncedSearch);
      setUsers(data.users);
      setTotal(data.total);
      setFiltered(data.filtered);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(filtered / limit);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const isSuperAdmin = (u: UserData) => u.role === 'super-admin';

  return (
    <div>
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); fetchUsers(); }}
        />
      )}
      {showCreateAdmin && (
        <CreateAdminModal
          onClose={() => setShowCreateAdmin(false)}
          onCreated={() => { setShowCreateAdmin(false); fetchUsers(); }}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <SearchBar query={search} onQueryChange={setSearch} placeholder={t('admin.users.searchPlaceholder')} total={total} totalLabel="user" />
        <button
          onClick={() => setShowCreateAdmin(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shrink-0 ml-4"
        >
          <UserPlus size={16} />
          Create admin
        </button>
      </div>

      <div className="bg-card/30 border border-border-subtle rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">{t('admin.users.colUsername')}</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">{t('admin.users.colRole')}</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">{t('admin.users.colCreated')}</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">{t('admin.users.colStatus')}</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">{t('admin.users.colLastLogin')}</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-dim">{t('admin.users.loading')}</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-dim">{t('admin.users.empty')}</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id_user} className="border-b border-border-subtle hover:bg-card/30 transition-colors">
                    <td className="px-6 py-4 text-text-default font-medium">{u.pseudo}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.role === 'super-admin'
                          ? 'bg-red-500/15 text-red-400'
                          : u.role === 'admin'
                            ? 'bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]'
                            : 'bg-primary/10 text-text-muted'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-sm">{formatDate(u.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-sm ${u.is_active ? 'text-green-400' : 'text-red-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                        {u.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-sm">{formatDate(u.last_login_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {!isSuperAdmin(u) && (
                          <>
                            <button onClick={() => setResetTarget(u)} title="Reset password"
                              className="p-2 rounded-lg text-text-muted hover:text-amber-400 hover:bg-amber-400/10 transition-colors">
                              <KeyRound size={16} />
                            </button>
                            <button onClick={() => setDeleteTarget(u)} title="Delete account"
                              className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
            <p className="text-sm text-text-muted">
              {t('admin.users.pagination', { page, total: totalPages, count: filtered })}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-input-bg border border-border text-text-muted hover:text-text-default hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    p === page
                      ? 'text-text-default border border-border'
                      : 'text-text-muted hover:text-text-default hover:bg-input-bg'
                  }`}
                  style={p === page ? {background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)'} : undefined}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-input-bg border border-border text-text-muted hover:text-text-default hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
