import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { usePageTitle } from '../../hooks/usePageTitle';
import { PasswordStrength } from '../../components/PasswordStrength';
import { isPasswordValid } from '../../utils/passwordValidation';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { FeatureShowcase } from '../../components/FeatureShowcase';

const TracrLogo = () => (
    <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="100" height="100" fill="transparent" rx="10"/>
        <g transform="translate(15, 15)">
            <line x1="15" y1="15" x2="35" y2="35" stroke="var(--theme-primary)" strokeWidth="2" opacity="0.6"/>
            <line x1="35" y1="35" x2="55" y2="20" stroke="var(--theme-primary)" strokeWidth="2" opacity="0.6"/>
            <line x1="35" y1="35" x2="50" y2="55" stroke="var(--theme-primary)" strokeWidth="2" opacity="0.6"/>
            <line x1="15" y1="15" x2="55" y2="20" stroke="var(--theme-secondary)" strokeWidth="1.5" opacity="0.3"/>
            <line x1="50" y1="55" x2="55" y2="20" stroke="var(--theme-secondary)" strokeWidth="1.5" opacity="0.3"/>
            <circle cx="15" cy="15" r="5" fill="var(--theme-primary)"/>
            <circle cx="55" cy="20" r="5" fill="var(--theme-primary)"/>
            <circle cx="50" cy="55" r="4" fill="white" opacity="0.8"/>
            <circle cx="35" cy="35" r="6" fill="var(--theme-secondary)"/>
            <circle cx="35" cy="35" r="11" fill="none" stroke="var(--theme-secondary)" strokeWidth="1.5" opacity="0.25" className="logo-pulse"/>
        </g>
        <style>{`
            .logo-pulse {
                animation: logoPulse 2.8s ease-in-out infinite;
                transform-origin: 50px 50px;
            }
            @keyframes logoPulse {
                0%, 100% { r: 11; opacity: 0.25; }
                50% { r: 16; opacity: 0; }
            }
        `}</style>
    </svg>
);

export const Register = () => {
    usePageTitle('Inscription');
    const [pseudo, setPseudo] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
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

    const inputStyle = {
        width: '100%', padding: '11px 14px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: '10px',
        color: 'var(--text-default)',
        fontSize: '14px', outline: 'none',
        boxSizing: 'border-box' as const,
        transition: 'border-color 0.2s',
    };

    const labelStyle = {
        display: 'block', fontSize: '13px',
        fontWeight: 500, color: 'var(--text-default)',
        marginBottom: '8px',
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col lg:flex-row"
            style={{ position: 'relative', overflow: 'hidden' }}>

            {/* Background glow */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 60% 50% at 50% 45%, color-mix(in srgb, var(--theme-primary) 8%, transparent), transparent)',
            }} />

            {/* Dot grid texture */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35,
                backgroundImage: 'radial-gradient(circle, var(--theme-primary) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent)',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent)',
            }} />

            {/* Left: feature showcase */}
            <div className="hidden lg:flex flex-1 flex-col justify-center relative z-10" style={{ borderRight: '1px solid var(--border-subtle)' }}>
                <FeatureShowcase />
            </div>

            {/* Right: form */}
            <div className="flex-1 lg:flex-none lg:w-[460px] flex flex-col items-center justify-center p-4 lg:p-8 relative z-10">

            {/* Card */}
            <div style={{
                width: '100%', maxWidth: '400px', position: 'relative',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '20px',
                boxShadow: '0 0 0 1px var(--border-subtle), 0 24px 64px rgba(0,0,0,0.4)',
                overflow: 'hidden',
            }}>
                <div style={{ padding: '40px 32px' }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '72px', height: '72px',
                            background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
                            borderRadius: '18px',
                            border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)',
                            marginBottom: '16px',
                        }}>
                            <TracrLogo />
                        </div>
                        <div style={{
                            fontSize: '22px', fontWeight: 700, letterSpacing: '0.12em',
                            color: 'var(--text-default)', textTransform: 'uppercase',
                        }}>
                            Tracr
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Create your account
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                        <div>
                            <label style={labelStyle}>Username</label>
                            <input
                                data-cy="register-pseudo"
                                type="text"
                                value={pseudo}
                                onChange={(e) => setPseudo(e.target.value)}
                                required
                                autoFocus
                                placeholder="Choose a username"
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    data-cy="register-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    style={{ ...inputStyle, padding: '11px 44px 11px 14px' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-dim)', padding: 0, display: 'flex',
                                }}>
                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                            <PasswordStrength password={password}/>
                        </div>

                        <div>
                            <label style={labelStyle}>Confirm password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    data-cy="register-confirm-password"
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    style={{ ...inputStyle, padding: '11px 44px 11px 14px' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-dim)', padding: 0, display: 'flex',
                                }}>
                                    {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                            {/* Match indicator */}
                            {confirmPassword && (
                                <div style={{
                                    marginTop: '6px', fontSize: '12px',
                                    color: password === confirmPassword ? '#22c55e' : '#f87171',
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                }}>
                                    <span style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: password === confirmPassword ? '#22c55e' : '#f87171',
                                        display: 'inline-block',
                                    }}/>
                                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                </div>
                            )}
                        </div>

                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid var(--border-error)',
                                borderRadius: '10px',
                                fontSize: '13px', color: '#f87171',
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            data-cy="register-submit"
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '12px',
                                background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                                border: 'none', borderRadius: '10px',
                                color: 'white', fontSize: '14px', fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                transition: 'opacity 0.2s, transform 0.15s',
                                marginTop: '4px',
                            }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'scale(1.01)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            {loading ? 'Creating account…' : 'Create my account'}
                        </button>
                    </form>

                    <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Already have an account?{' '}
                        <button onClick={() => navigate('/login')} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--theme-primary)', fontWeight: 600, fontSize: '13px', padding: 0,
                        }}>
                            Sign in
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                A recovery phrase will be generated after registration
            </div>

            </div> {/* end right column */}
        </div>
    );
};
