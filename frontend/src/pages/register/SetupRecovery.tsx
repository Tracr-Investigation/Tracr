import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useTranslation } from 'react-i18next';
import { Copy, Check, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const SetupRecovery = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    usePageTitle('Récupération du compte');

    const stateWords = (location.state as { words?: string[] } | null)?.words;

    const [words, setWords] = useState<string[]>(stateWords ?? []);
    const [copied, setCopied] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    // Fallback: si la page est rechargée, les mots sont perdus → demander le mdp pour régénérer
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [regenLoading, setRegenLoading] = useState(false);
    const [regenError, setRegenError] = useState('');

    const needsRegen = words.length === 0;

    const handleRegen = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegenError('');
        setRegenLoading(true);
        try {
            const data = await api.generateRecovery(password);
            setWords(data.words);
            setConfirmed(false);
        } catch (err: unknown) {
            setRegenError(err instanceof Error ? err.message : 'Error');
        } finally {
            setRegenLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(words.join(' '));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4" style={{ position: 'relative', overflow: 'hidden' }}>

            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 60% 50% at 50% 45%, color-mix(in srgb, var(--theme-primary) 8%, transparent), transparent)',
            }} />

            <div style={{ width: '100%', maxWidth: '460px', position: 'relative' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '56px', height: '56px',
                        background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--theme-primary) 22%, transparent)',
                        borderRadius: '16px', marginBottom: '14px',
                    }}>
                        <ShieldCheck size={26} style={{ color: 'var(--theme-primary)' }} />
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-default)', marginBottom: '6px' }}>
                        {t('setupRecovery.title')}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
                        {t('setupRecovery.subtitle')}
                    </div>
                </div>

                {/* Card */}
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '20px', padding: '32px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
                }}>

                    {needsRegen ? (
                        /* ── Page rafraîchie : les mots sont perdus ── */
                        <form onSubmit={handleRegen} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{
                                display: 'flex', gap: '10px', alignItems: 'flex-start',
                                padding: '12px 14px',
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                borderRadius: '10px',
                            }}>
                                <AlertTriangle size={15} style={{ color: '#f59e0b', marginTop: '1px', flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', color: '#f59e0b', lineHeight: 1.5 }}>
                                    La page a été rechargée — votre phrase précédente n'est plus affichable.
                                    Entrez votre mot de passe pour en générer une nouvelle.
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Mot de passe
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required autoFocus
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%', padding: '11px 44px 11px 14px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: '10px', color: 'var(--text-default)',
                                            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
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

                            {regenError && (
                                <div style={{
                                    padding: '10px 14px', background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid var(--border-error)', borderRadius: '10px',
                                    fontSize: '13px', color: '#f87171',
                                }}>
                                    {regenError}
                                </div>
                            )}

                            <button type="submit" disabled={regenLoading || !password} style={{
                                width: '100%', padding: '13px',
                                background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))',
                                border: 'none', borderRadius: '10px',
                                color: 'white', fontSize: '14px', fontWeight: 600,
                                cursor: regenLoading || !password ? 'not-allowed' : 'pointer',
                                opacity: regenLoading || !password ? 0.6 : 1,
                                transition: 'opacity 0.2s',
                            }}>
                                {regenLoading ? 'Génération…' : 'Générer ma phrase de récupération'}
                            </button>
                        </form>

                    ) : (
                        /* ── Mots disponibles ── */
                        <>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                                {t('setupRecovery.wordsDesc')}
                            </div>

                            {/* Word grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                {words.map((word, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '8px', padding: '8px 10px',
                                        animation: `wordFadeIn 0.35s ease both`,
                                        animationDelay: `${i * 30}ms`,
                                    }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', minWidth: '16px', fontVariantNumeric: 'tabular-nums' }}>
                                            {i + 1}.
                                        </span>
                                        <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-default)' }}>
                                            {word}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Copy */}
                            <button type="button" onClick={handleCopy} style={{
                                display: 'flex', alignItems: 'center', gap: '7px',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: copied ? '#22c55e' : 'var(--theme-primary)',
                                fontSize: '13px', padding: 0, marginBottom: '20px',
                                transition: 'color 0.2s', fontWeight: 500,
                            }}>
                                {copied ? <Check size={15}/> : <Copy size={15}/>}
                                {copied ? t('setupRecovery.copied') : t('setupRecovery.copy')}
                            </button>

                            {/* Warning */}
                            <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: '10px',
                                padding: '12px 14px',
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                borderRadius: '10px', marginBottom: '20px',
                            }}>
                                <AlertTriangle size={15} style={{ color: '#f59e0b', marginTop: '1px', flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', color: '#f59e0b', lineHeight: 1.5 }}>
                                    {t('setupRecovery.warning')}
                                </span>
                            </div>

                            {/* Checkbox */}
                            <label style={{
                                display: 'flex', alignItems: 'flex-start', gap: '10px',
                                cursor: 'pointer', marginBottom: '20px',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={(e) => setConfirmed(e.target.checked)}
                                    style={{ marginTop: '2px', accentColor: 'var(--theme-primary)', flexShrink: 0 }}
                                />
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    {t('setupRecovery.checkbox')}
                                </span>
                            </label>

                            {/* CTA — disabled tant que la checkbox n'est pas cochée */}
                            <button
                                type="button"
                                disabled={!confirmed}
                                onClick={() => {
                                    sessionStorage.removeItem('recovery_pending');
                                    navigate('/');
                                }}
                                style={{
                                    width: '100%', padding: '13px',
                                    background: confirmed
                                        ? 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))'
                                        : 'var(--bg-input)',
                                    border: confirmed ? 'none' : '1px solid var(--border-subtle)',
                                    borderRadius: '10px',
                                    color: confirmed ? 'white' : 'var(--text-dim)',
                                    fontSize: '14px', fontWeight: 600,
                                    cursor: confirmed ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.25s ease',
                                }}
                                onMouseEnter={e => { if (confirmed) e.currentTarget.style.transform = 'scale(1.01)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                {t('setupRecovery.continue')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes wordFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
