import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../../contexts/AuthContext';
import {PasswordStrength} from '../../../components/PasswordStrength';
import {isPasswordValid} from '../../../utils/passwordValidation';
import {api} from '../../../services/api';
import {Shield, Eye, EyeOff, Trash2, AlertTriangle, KeyRound, Copy, Check, X, Smartphone} from 'lucide-react';
import {useTranslation} from 'react-i18next';

export const SecurityTab = () => {
    const {t} = useTranslation();
    const {logout, user, login} = useAuth();
    const navigate = useNavigate();

    const [showMfaModal, setShowMfaModal] = useState(false);
    const [mfaPassword, setMfaPassword] = useState('');
    const [showMfaPassword, setShowMfaPassword] = useState(false);
    const [mfaError, setMfaError] = useState('');
    const [mfaLoading, setMfaLoading] = useState(false);

    const handleReconfigureMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        setMfaError('');
        setMfaLoading(true);
        try {
            await api.mfaDisable(mfaPassword);
            const token = localStorage.getItem('token');
            if (user && token) login({...user, mfa_enabled: false}, token);
            navigate('/setup-mfa');
        } catch (err: unknown) {
            setMfaError(err instanceof Error ? err.message : 'Error');
        } finally {
            setMfaLoading(false);
        }
    };

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeletePassword, setShowDeletePassword] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [hasRecovery, setHasRecovery] = useState<boolean | null>(null);
    const [recoveryCreatedAt, setRecoveryCreatedAt] = useState<string | null>(null);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [recoveryStep, setRecoveryStep] = useState<'password' | 'words'>('password');
    const [recoveryPassword, setRecoveryPassword] = useState('');
    const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
    const [recoveryWords, setRecoveryWords] = useState<string[]>([]);
    const [recoveryCopied, setRecoveryCopied] = useState(false);
    const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
    const [recoveryError, setRecoveryError] = useState('');
    const [recoveryLoading, setRecoveryLoading] = useState(false);

    useEffect(() => {
        api.getRecoveryStatus()
            .then((data) => {
                setHasRecovery(data.has_recovery);
                setRecoveryCreatedAt(data.recovery_created_at);
            })
            .catch(() => {});
    }, []);

    const openRecoveryModal = () => {
        setRecoveryStep(hasRecovery ? 'password' : 'words');
        setRecoveryPassword('');
        setRecoveryWords([]);
        setRecoveryCopied(false);
        setRecoveryConfirmed(false);
        setRecoveryError('');
        setShowRecoveryModal(true);
        if (!hasRecovery) {
            setRecoveryLoading(true);
            api.generateRecovery()
                .then((data) => setRecoveryWords(data.words))
                .catch((err: unknown) => setRecoveryError(err instanceof Error ? err.message : 'Error'))
                .finally(() => setRecoveryLoading(false));
        }
    };

    const handleRecoveryConfirmPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecoveryError('');
        setRecoveryLoading(true);
        try {
            const data = await api.generateRecovery(recoveryPassword);
            setRecoveryWords(data.words);
            setRecoveryStep('words');
            setHasRecovery(true);
        } catch (err: unknown) {
            setRecoveryError(err instanceof Error ? err.message : 'Error');
        } finally {
            setRecoveryLoading(false);
        }
    };

    const handleRecoveryCopy = () => {
        navigator.clipboard.writeText(recoveryWords.join(' '));
        setRecoveryCopied(true);
        setTimeout(() => setRecoveryCopied(false), 2000);
    };

    const closeRecoveryModal = () => {
        if (recoveryWords.length > 0) {
            setHasRecovery(true);
        }
        setShowRecoveryModal(false);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!isPasswordValid(newPassword)) {
            setError(t('security.passwordWeak'));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t('security.passwordNoMatch'));
            return;
        }
        if (currentPassword === newPassword) {
            setError(t('security.passwordSame'));
            return;
        }

        setLoading(true);
        try {
            await api.changePassword(currentPassword, newPassword);
            setSuccess(t('security.passwordChanged'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error changing password');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setDeleteError('');
        setDeleteLoading(true);
        try {
            await api.deleteAccount(deletePassword);
            logout();
            navigate('/login');
        } catch (err: unknown) {
            setDeleteError(err instanceof Error ? err.message : 'Error deleting account');
        } finally {
            setDeleteLoading(false);
        }
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setDeletePassword('');
        setShowDeletePassword(false);
        setDeleteError('');
    };

    return (
        <div className="space-y-10">
            {/* Change password section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl" style={{background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'}}>

                        <Shield size={22} className="text-primary"/>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-text-default">{t('security.passwordTitle')}</h2>
                        <p className="text-sm text-text-muted">{t('security.passwordSubtitle')}</p>
                    </div>
                </div>

                <div className="h-px bg-primary/10"/>

                <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-text-default mb-2">{t('security.currentPassword')}</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                                placeholder={t('security.currentPasswordPlaceholder')}
                                required
                            />
                            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors">
                                {showCurrent ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-default mb-2">{t('security.newPassword')}</label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                                placeholder={t('security.newPasswordPlaceholder')}
                                required
                            />
                            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors">
                                {showNew ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                        <PasswordStrength password={newPassword}/>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-default mb-2">{t('security.confirmPassword')}</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                                placeholder={t('security.confirmPasswordPlaceholder')}
                                required
                            />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors">
                                {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <p className="text-green-400 text-sm">{success}</p>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full py-3 !text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{background: 'var(--theme-primary)'}}>
                        {loading ? t('security.updating') : t('security.changePassword')}
                    </button>
                </form>
            </div>

            {/* Recovery code section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl" style={{background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'}}>

                        <KeyRound size={22} className="text-primary"/>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-text-default">{t('security.recoveryTitle')}</h2>
                        <p className="text-sm text-text-muted">{t('security.recoverySubtitle')}</p>
                    </div>
                </div>

                <div className="h-px bg-primary/10"/>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${hasRecovery ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {hasRecovery ? t('security.recoveryActive') : t('security.recoveryNone')}
                        </span>
                        {recoveryCreatedAt && (
                            <span className="text-xs text-text-dim">
                                {new Date(recoveryCreatedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={openRecoveryModal}
                        className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
                        style={{background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-primary) 25%, transparent)', color: 'var(--theme-primary)'}}
                    >
                        {hasRecovery ? t('security.recoveryRegenerate') : t('security.recoveryGenerate')}
                    </button>
                </div>
            </div>

            {/* Two-factor authentication (TOTP) section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl" style={{background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'}}>
                        <Smartphone size={22} className="text-primary"/>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-text-default">{t('mfa.sectionTitle')}</h2>
                        <p className="text-sm text-text-muted">{t('mfa.sectionSubtitle')}</p>
                    </div>
                </div>

                <div className="h-px bg-primary/10"/>

                <div className="flex items-center justify-between">
                    {user?.mfa_enabled ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            {t('mfa.active')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {t('mfa.inactive')}
                        </span>
                    )}
                    {user?.mfa_enabled ? (
                        <button
                            onClick={() => { setMfaPassword(''); setMfaError(''); setShowMfaModal(true); }}
                            className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
                            style={{background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-primary) 25%, transparent)', color: 'var(--theme-primary)'}}
                        >
                            {t('mfa.reconfigure')}
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/setup-mfa')}
                            className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
                            style={{background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-primary) 25%, transparent)', color: 'var(--theme-primary)'}}
                        >
                            {t('mfa.enable')}
                        </button>
                    )}
                </div>
            </div>

            {/* Delete account section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-500/10 rounded-xl">
                        <Trash2 size={22} className="text-red-400"/>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-text-default">{t('security.deleteTitle')}</h2>
                        <p className="text-sm text-red-400">{t('security.deleteSubtitle')}</p>
                    </div>
                </div>

                <div className="h-px bg-red-500/10"/>

                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <p className="text-sm text-red-400">{t('security.deleteWarning')}</p>
                </div>

                <button onClick={() => setShowDeleteModal(true)} className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-all">
                    {t('security.deleteButton')}
                </button>
            </div>

            {/* Recovery modal */}
            {showRecoveryModal && (
                <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeRecoveryModal}>
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <KeyRound size={18} className="text-primary"/>
                                </div>
                                <h3 className="text-base font-semibold text-text-default">{t('security.recoveryWordsTitle')}</h3>
                            </div>
                            <button onClick={closeRecoveryModal} className="text-text-dim hover:text-text-muted transition-colors">
                                <X size={18}/>
                            </button>
                        </div>

                        {recoveryStep === 'password' && (
                            <form onSubmit={handleRecoveryConfirmPassword} className="space-y-4">
                                <p className="text-sm text-text-muted">{t('security.recoveryWordsDesc')}</p>
                                <div className="relative">
                                    <input
                                        type={showRecoveryPassword ? 'text' : 'password'}
                                        value={recoveryPassword}
                                        onChange={(e) => setRecoveryPassword(e.target.value)}
                                        className="w-full px-4 py-3 pr-12 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                                        placeholder={t('security.recoveryPasswordPlaceholder')}
                                        required
                                        autoFocus
                                    />
                                    <button type="button" onClick={() => setShowRecoveryPassword(!showRecoveryPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors">
                                        {showRecoveryPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                                {recoveryError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                        <p className="text-red-400 text-sm">{recoveryError}</p>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button type="button" onClick={closeRecoveryModal} className="flex-1 py-3 bg-card border border-border text-text-muted font-medium rounded-xl hover:bg-primary/10 transition-all">
                                        {t('security.cancel')}
                                    </button>
                                    <button type="submit" disabled={recoveryLoading || !recoveryPassword} className="flex-1 py-3 text-text-default font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{background: 'var(--theme-primary)'}}>
                                        {recoveryLoading ? t('security.recoveryGenerating') : t('security.recoveryConfirm')}
                                    </button>
                                </div>
                            </form>
                        )}

                        {recoveryStep === 'words' && (
                            <div className="space-y-4">
                                {recoveryLoading ? (
                                    <div className="text-center py-6">
                                        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"/>
                                        <p className="text-sm text-text-muted">{t('security.recoveryGenerating')}</p>
                                    </div>
                                ) : recoveryError ? (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                        <p className="text-red-400 text-sm">{recoveryError}</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-text-muted">{t('security.recoveryWordsDesc')}</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {recoveryWords.map((word, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-input-bg border border-border rounded-lg px-2.5 py-1.5">
                                                    <span className="text-xs text-text-dim w-4 shrink-0">{i + 1}.</span>
                                                    <span className="text-xs font-mono font-medium text-text-default">{word}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" onClick={handleRecoveryCopy} className="flex items-center gap-2 text-sm text-primary hover:text-secondary transition-colors">
                                            {recoveryCopied ? <Check size={15}/> : <Copy size={15}/>}
                                            {recoveryCopied ? t('security.recoveryCopied') : t('security.recoveryCopy')}
                                        </button>
                                        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5"/>
                                            <p className="text-xs text-amber-400">{t('security.recoveryWarning')}</p>
                                        </div>
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input type="checkbox" checked={recoveryConfirmed} onChange={(e) => setRecoveryConfirmed(e.target.checked)} className="mt-0.5 accent-primary"/>
                                            <span className="text-sm text-text-muted">{t('security.recoveryCheckbox')}</span>
                                        </label>
                                        <button
                                            type="button"
                                            disabled={!recoveryConfirmed}
                                            onClick={closeRecoveryModal}
                                            className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-text-default font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                            {t('security.recoveryDone')}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MFA reconfigure modal */}
            {showMfaModal && (
                <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMfaModal(false)}>
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl" style={{background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'}}>
                                <Smartphone size={22} className="text-primary"/>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-text-default">{t('mfa.reconfigureTitle')}</h3>
                                <p className="text-sm text-text-muted">{t('mfa.reconfigureSubtitle')}</p>
                            </div>
                        </div>

                        <form onSubmit={handleReconfigureMfa} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showMfaPassword ? 'text' : 'password'}
                                    value={mfaPassword}
                                    onChange={(e) => setMfaPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                                    placeholder={t('security.passwordPlaceholder')}
                                    required
                                    autoFocus
                                />
                                <button type="button" onClick={() => setShowMfaPassword(!showMfaPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors">
                                    {showMfaPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>

                            {mfaError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-red-400 text-sm">{mfaError}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowMfaModal(false)} className="flex-1 py-3 bg-card border border-border text-text-muted font-medium rounded-xl hover:bg-primary/10 hover:text-text-default transition-all">
                                    {t('security.cancel')}
                                </button>
                                <button type="submit" disabled={mfaLoading || !mfaPassword} className="flex-1 py-3 !text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{background: 'var(--theme-primary)'}}>
                                    {mfaLoading ? '…' : t('mfa.continue')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeDeleteModal}>
                    <div className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md space-y-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-500/10 rounded-xl">
                                <AlertTriangle size={22} className="text-red-400"/>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-text-default">{t('security.confirmDeletion')}</h3>
                                <p className="text-sm text-red-400">{t('security.confirmDeletionSubtitle')}</p>
                            </div>
                        </div>

                        <form onSubmit={handleDeleteAccount} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showDeletePassword ? 'text' : 'password'}
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 bg-input-bg border border-red-500/30 rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                                    placeholder={t('security.passwordPlaceholder')}
                                    required
                                    autoFocus
                                />
                                <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors">
                                    {showDeletePassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>

                            {deleteError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-red-400 text-sm">{deleteError}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button type="button" onClick={closeDeleteModal} className="flex-1 py-3 bg-card border border-border text-text-muted font-medium rounded-xl hover:bg-primary/10 hover:text-text-default transition-all">
                                    {t('security.cancel')}
                                </button>
                                <button type="submit" disabled={deleteLoading || !deletePassword} className="flex-1 py-3 bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                    {deleteLoading ? t('security.deleting') : t('security.delete')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
