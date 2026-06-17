import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ShieldCheck, Copy, Check, Loader2 } from 'lucide-react';

// Dedup de l'appel /me/mfa/setup : le double-effet de React StrictMode monterait
// deux requetes concurrentes (donc deux secrets). On partage la promesse en vol ;
// elle est remise a null une fois resolue, donc une vraie revisite refait un appel.
let setupPromise: ReturnType<typeof api.mfaSetup> | null = null;

export const SetupMfa = () => {
    const { t } = useTranslation();
    usePageTitle('Two-factor setup');
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();

    const [qr, setQr] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [loadingSetup, setLoadingSetup] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Deja enrole : rien a faire ici.
    useEffect(() => {
        if (user?.mfa_enabled) navigate('/', { replace: true });
    }, [user?.mfa_enabled, navigate]);

    useEffect(() => {
        // Deja active : ne pas appeler /setup (l'autre effet redirige vers '/').
        if (user?.mfa_enabled) { setLoadingSetup(false); return; }
        let active = true;
        if (!setupPromise) {
            setupPromise = api.mfaSetup();
            // Libere le partage une fois la requete terminee : une revisite ulterieure
            // (ex. reconfiguration) refera bien un nouvel appel.
            setupPromise.finally(() => { setupPromise = null; });
        }
        setupPromise
            .then((data) => { if (active) { setQr(data.qr); setSecret(data.secret); } })
            .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Error'); })
            .finally(() => { if (active) setLoadingSetup(false); });
        return () => { active = false; };
    }, []);

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await api.mfaEnable(code.trim());
            const token = localStorage.getItem('token');
            if (user && token) login({ ...user, mfa_enabled: true }, token);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid code');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}>
                            <ShieldCheck size={24} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-default">{t('mfa.setupTitle')}</h1>
                            <p className="text-sm text-text-muted">{t('mfa.setupSubtitle')}</p>
                        </div>
                    </div>

                    <ol className="text-sm text-text-muted space-y-1 mb-5 list-decimal list-inside">
                        <li>{t('mfa.step1')}</li>
                        <li>{t('mfa.step2')}</li>
                        <li>{t('mfa.step3')}</li>
                    </ol>

                    {loadingSetup ? (
                        <div className="flex items-center justify-center py-12 text-text-muted">
                            <Loader2 size={20} className="animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-center mb-4">
                                {qr && (
                                    <img
                                        src={qr}
                                        alt={t('mfa.qrAlt')}
                                        className="w-44 h-44 rounded-xl border border-border bg-white p-2"
                                    />
                                )}
                            </div>

                            {secret && (
                                <div className="mb-5">
                                    <p className="text-xs text-text-dim mb-1.5 text-center">{t('mfa.cantScan')}</p>
                                    <button
                                        type="button"
                                        onClick={copySecret}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-input-bg border border-border rounded-xl text-text-default font-mono text-xs tracking-wider hover:border-[var(--theme-primary)] transition-colors break-all"
                                    >
                                        {secret}
                                        {copied ? <Check size={13} className="text-green-400 shrink-0" /> : <Copy size={13} className="text-text-dim shrink-0" />}
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="123456"
                                    autoFocus
                                    className="w-full px-4 py-3 bg-input-bg border border-border rounded-xl text-text-default text-center text-lg tracking-[0.4em] font-mono placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                                />

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting || code.length !== 6}
                                    className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {submitting ? t('mfa.verifying') : t('mfa.enableButton')}
                                </button>
                            </form>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={() => { logout(); navigate('/login'); }}
                        className="w-full py-2 mt-2 text-sm text-text-muted hover:text-text-default transition-colors"
                    >
                        {t('mfa.signOut')}
                    </button>
                </div>
            </div>
        </div>
    );
};
