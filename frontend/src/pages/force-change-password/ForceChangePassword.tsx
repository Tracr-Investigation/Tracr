import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { PASSWORD_RULES, isPasswordValid } from '../../utils/passwordValidation';
import { ShieldAlert, Check, X } from 'lucide-react';

export const ForceChangePassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();

    if (!user?.must_change_password) {
        navigate('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (!isPasswordValid(newPassword)) {
            setError('Password does not meet requirements');
            return;
        }

        setLoading(true);
        try {
            await api.forceChangePassword(newPassword);
            login({ ...user, must_change_password: false }, localStorage.getItem('token')!);
            navigate('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error changing password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <ShieldAlert size={24} className="text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-default">Change your password</h1>
                            <p className="text-sm text-text-muted">You must set a new password before continuing</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-text-default mb-2">New password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="••••••••"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-default mb-2">Confirm password</label>
                            <input
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {newPassword && (
                            <ul className="space-y-1.5">
                                {PASSWORD_RULES.map((rule) => {
                                    const ok = rule.test(newPassword);
                                    return (
                                        <li key={rule.label} className={`flex items-center gap-2 text-sm ${ok ? 'text-green-400' : 'text-text-muted'}`}>
                                            {ok ? <Check size={14} /> : <X size={14} />}
                                            {rule.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-border-error rounded-xl">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !isPasswordValid(newPassword) || newPassword !== confirm}
                            className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? 'Saving...' : 'Set new password'}
                        </button>

                        <button
                            type="button"
                            onClick={logout}
                            className="w-full py-2 text-sm text-text-muted hover:text-text-default transition-colors"
                        >
                            Sign out
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
