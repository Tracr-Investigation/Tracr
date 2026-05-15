import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PasswordStrength } from '../../components/PasswordStrength';
import { isPasswordValid } from '../../utils/passwordValidation';
import { useAuth } from '../../contexts/AuthContext';

export const Register = () => {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pseudo.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!isPasswordValid(password)) {
      setError('Password does not meet security requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const data = await api.register(pseudo, password);
      login({ id_user: data.id_user, pseudo: data.pseudo, role: data.role, language: data.language ?? 'en' }, data.token);
      sessionStorage.setItem('recovery_pending', '1');
      navigate('/setup-recovery', { state: { words: data.recovery_words } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-primary/10 rounded-2xl mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-text-default mb-2">Sign up</h1>
          <p className="text-text-muted">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-default mb-2">Username</label>
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Choose a username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-default mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
                required
              />
              <PasswordStrength password={password} />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-default mb-2">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-border-error rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Creating...' : 'Create my account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary hover:text-secondary font-semibold transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
