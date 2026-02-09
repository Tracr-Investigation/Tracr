import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';
import {api} from '../../services/api';

export const Login = () => {
    const [pseudo, setPseudo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const {login} = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await api.login(pseudo, password);
            login({id_user: data.id_user, pseudo: data.pseudo, role: data.role}, data.token);
            navigate('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-dark/50 backdrop-blur-sm border border-primary/20 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-accent mb-2">Username</label>
                            <input
                                type="text"
                                value={pseudo}
                                onChange={(e) => setPseudo(e.target.value)}
                                className="w-full px-4 py-3 bg-dark/50 border border-primary/30 rounded-xl text-accent placeholder-secondary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Your username"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-accent mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-dark/50 border border-primary/30 rounded-xl text-accent placeholder-secondary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-secondary text-sm">
                            Don't have an account?{' '}
                            <button
                                onClick={() => navigate('/register')}
                                className="text-primary hover:text-secondary font-semibold transition-colors"
                            >
                                Create an account
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};