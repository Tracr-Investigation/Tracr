import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { PasswordStrength } from '../../components/PasswordStrength';
import { isPasswordValid } from '../../utils/passwordValidation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { FeatureShowcase } from '../../components/FeatureShowcase';

type Panel = 'login' | 'recovery' | 'success';

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

export const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [panel, setPanel] = useState<Panel>('login');

    const [pseudo, setPseudo] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const [recPseudo, setRecPseudo] = useState('');
    const [recPhrase, setRecPhrase] = useState('');
    const [recNewPw, setRecNewPw] = useState('');
    const [recConfirm, setRecConfirm] = useState('');
    const [showRecNewPw, setShowRecNewPw] = useState(false);
    const [showRecConfirm, setShowRecConfirm] = useState(false);
    const [recError, setRecError] = useState('');
    const [recLoading, setRecLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);
        try {
            const data = await api.login(pseudo, password);
            login({id_user: data.id_user, pseudo: data.pseudo, role: data.role, language: data.language ?? 'en', must_change_password: data.must_change_password ?? false}, data.token);
            if (data.must_change_password) {
                navigate('/force-change-password');
            } else {
                navigate('/');
            }
        } catch (err: unknown) {
            setLoginError(err instanceof Error ? err.message : 'Login error');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecError('');
        if (!isPasswordValid(recNewPw)) { setRecError(t('forgotPassword.weak')); return; }
        if (recNewPw !== recConfirm) { setRecError(t('forgotPassword.noMatch')); return; }
        setRecLoading(true);
        try {
            await api.recoverPassword(recPseudo, recPhrase, recNewPw);
            setPanel('success');
        } catch (err: unknown) {
            setRecError(err instanceof Error ? err.message : 'Error');
        } finally {
            setRecLoading(false);
        }
    };

    const goToRecovery = () => { setLoginError(''); setPanel('recovery'); };
    const goToLogin = () => {
        setPanel('login');
        setRecError(''); setRecPseudo(''); setRecPhrase(''); setRecNewPw(''); setRecConfirm('');
    };

    const translateX = panel === 'login' ? '0%' : panel === 'recovery' ? '-33.333%' : '-66.666%';

    return (
        <div className="min-h-screen bg-surface flex flex-col lg:flex-row" style={{ position: 'relative', overflow: 'hidden' }}>

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
                width: '100%', maxWidth: '400px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '20px',
                boxShadow: '0 0 0 1px var(--border-subtle), 0 24px 64px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Slider */}
                <div style={{
                    display: 'flex',
                    width: '300%',
                    transform: `translateX(${translateX})`,
                    transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                }}>

                    {/* ── Panel 1: Login ── */}
                    <div style={{ width: '33.333%', minWidth: '33.333%', padding: '40px 32px' }}>

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
                                Investigation platform
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-default)', marginBottom: '8px' }}>
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={pseudo}
                                    onChange={(e) => setPseudo(e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="Your username"
                                    style={{
                                        width: '100%', padding: '11px 14px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: '10px',
                                        color: 'var(--text-default)',
                                        fontSize: '14px', outline: 'none',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                                />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-default)' }}>
                                        Password
                                    </label>
                                    <button type="button" onClick={goToRecovery} style={{
                                        fontSize: '12px', color: 'var(--theme-primary)',
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                        opacity: 0.85,
                                        transition: 'opacity 0.15s',
                                    }}
                                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
                                    >
                                        {t('forgotPassword.link')}
                                    </button>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%', padding: '11px 44px 11px 14px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: '10px',
                                            color: 'var(--text-default)',
                                            fontSize: '14px', outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.2s',
                                        }}
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
                            </div>

                            {loginError && (
                                <div style={{
                                    padding: '10px 14px',
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid var(--border-error)',
                                    borderRadius: '10px',
                                    fontSize: '13px', color: '#f87171',
                                }}>
                                    {loginError}
                                </div>
                            )}

                            <button type="submit" disabled={loginLoading} style={{
                                width: '100%', padding: '12px',
                                background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                                border: 'none', borderRadius: '10px',
                                color: 'white', fontSize: '14px', fontWeight: 600,
                                cursor: loginLoading ? 'not-allowed' : 'pointer',
                                opacity: loginLoading ? 0.6 : 1,
                                transition: 'opacity 0.2s, transform 0.15s',
                                position: 'relative', overflow: 'hidden',
                            }}
                                onMouseEnter={e => { if (!loginLoading) e.currentTarget.style.transform = 'scale(1.01)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                {loginLoading ? 'Signing in…' : 'Sign in'}
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                            Don't have an account?{' '}
                            <button onClick={() => navigate('/register')} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--theme-primary)', fontWeight: 600, fontSize: '13px', padding: 0,
                            }}>
                                Create an account
                            </button>
                        </div>
                    </div>

                    {/* ── Panel 2: Recovery ── */}
                    <div style={{ width: '33.333%', minWidth: '33.333%', padding: '40px 32px' }}>

                        <div style={{ marginBottom: '24px' }}>
                            <button type="button" onClick={goToLogin} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', fontSize: '13px', padding: 0,
                                marginBottom: '20px',
                                transition: 'color 0.15s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-default)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                <ArrowLeft size={15}/>
                                Back to login
                            </button>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-default)', marginBottom: '4px' }}>
                                {t('forgotPassword.title')}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {t('forgotPassword.subtitle')}
                            </div>
                        </div>

                        <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {t('forgotPassword.pseudo')}
                                </label>
                                <input
                                    type="text"
                                    value={recPseudo}
                                    onChange={(e) => setRecPseudo(e.target.value)}
                                    required
                                    placeholder={t('forgotPassword.pseudoPlaceholder')}
                                    style={{
                                        width: '100%', padding: '10px 13px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: '9px',
                                        color: 'var(--text-default)',
                                        fontSize: '13px', outline: 'none',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {t('forgotPassword.phrase')}
                                </label>
                                <textarea
                                    value={recPhrase}
                                    onChange={(e) => setRecPhrase(e.target.value)}
                                    required
                                    rows={3}
                                    placeholder={t('forgotPassword.phrasePlaceholder')}
                                    style={{
                                        width: '100%', padding: '10px 13px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: '9px',
                                        color: 'var(--text-default)',
                                        fontSize: '13px', outline: 'none',
                                        boxSizing: 'border-box',
                                        resize: 'none', fontFamily: 'monospace',
                                        lineHeight: 1.6,
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {t('forgotPassword.newPassword')}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showRecNewPw ? 'text' : 'password'}
                                        value={recNewPw}
                                        onChange={(e) => setRecNewPw(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%', padding: '10px 40px 10px 13px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: '9px',
                                            color: 'var(--text-default)',
                                            fontSize: '13px', outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                                    />
                                    <button type="button" onClick={() => setShowRecNewPw(!showRecNewPw)} style={{
                                        position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--text-dim)', padding: 0, display: 'flex',
                                    }}>
                                        {showRecNewPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                                    </button>
                                </div>
                                <PasswordStrength password={recNewPw}/>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {t('forgotPassword.confirmPassword')}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showRecConfirm ? 'text' : 'password'}
                                        value={recConfirm}
                                        onChange={(e) => setRecConfirm(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%', padding: '10px 40px 10px 13px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: '9px',
                                            color: 'var(--text-default)',
                                            fontSize: '13px', outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                                    />
                                    <button type="button" onClick={() => setShowRecConfirm(!showRecConfirm)} style={{
                                        position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--text-dim)', padding: 0, display: 'flex',
                                    }}>
                                        {showRecConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
                                    </button>
                                </div>
                            </div>

                            {recError && (
                                <div style={{
                                    padding: '10px 13px',
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid var(--border-error)',
                                    borderRadius: '9px',
                                    fontSize: '13px', color: '#f87171',
                                }}>
                                    {recError}
                                </div>
                            )}

                            <button type="submit" disabled={recLoading} style={{
                                width: '100%', padding: '12px',
                                background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                                border: 'none', borderRadius: '10px',
                                color: 'white', fontSize: '14px', fontWeight: 600,
                                cursor: recLoading ? 'not-allowed' : 'pointer',
                                opacity: recLoading ? 0.6 : 1,
                                transition: 'opacity 0.2s, transform 0.15s',
                                marginTop: '4px',
                            }}
                                onMouseEnter={e => { if (!recLoading) e.currentTarget.style.transform = 'scale(1.01)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                {recLoading ? t('forgotPassword.recovering') : t('forgotPassword.recover')}
                            </button>
                        </form>
                    </div>

                    {/* ── Panel 3: Success ── */}
                    <div style={{ width: '33.333%', minWidth: '33.333%', padding: '56px 32px', textAlign: 'center' }}>
                        <div style={{
                            width: '64px', height: '64px',
                            background: 'rgba(34,197,94,0.12)',
                            border: '1px solid rgba(34,197,94,0.25)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                            animation: 'successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>

                        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-default)', marginBottom: '10px' }}>
                            {t('forgotPassword.successTitle')}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
                            {t('forgotPassword.successMsg')}
                        </div>

                        <button onClick={goToLogin} style={{
                            width: '100%', padding: '12px',
                            background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                            border: 'none', borderRadius: '10px',
                            color: 'white', fontSize: '14px', fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s, transform 0.15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            {t('forgotPassword.backToLogin')}
                        </button>

                        <style>{`
                            @keyframes successPop {
                                from { transform: scale(0.5); opacity: 0; }
                                to   { transform: scale(1);   opacity: 1; }
                            }
                        `}</style>
                    </div>

                </div>
            </div>

            {/* Bottom hint */}
            <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                {panel === 'login' && (
                    <>Secure investigation platform, all data is encrypted</>
                )}
            </div>

            </div> {/* end right column */}
        </div>
    );
};
