import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../../contexts/AuthContext';
import {PasswordStrength} from '../../../components/PasswordStrength';
import {isPasswordValid} from '../../../utils/passwordValidation';
import {api} from '../../../services/api';
import {Shield, Eye, EyeOff, Trash2, AlertTriangle} from 'lucide-react';
import {useTranslation} from 'react-i18next';

export const SecurityTab = () => {
    const {t} = useTranslation();
    const {logout} = useAuth();
    const navigate = useNavigate();

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
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Shield size={22} className="text-primary"/>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text-default">{t('security.passwordTitle')}</h2>
                        <p className="text-sm text-text-muted">{t('security.passwordSubtitle')}</p>
                    </div>
                </div>

                <div className="h-px bg-border-subtle"/>

                <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-text-default mb-2">{t('security.currentPassword')}</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
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
                                className="w-full px-4 py-3 pr-12 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
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
                                className="w-full px-4 py-3 pr-12 bg-input-bg border border-border rounded-xl text-text-default placeholder-text-dim focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder={t('security.confirmPasswordPlaceholder')}
                                required
                            />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors">
                                {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-border-error rounded-xl">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <p className="text-green-400 text-sm">{success}</p>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {loading ? t('security.updating') : t('security.changePassword')}
                    </button>
                </form>
            </div>

            {/* Delete account section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-500/10 rounded-xl">
                        <Trash2 size={22} className="text-red-400"/>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text-default">{t('security.deleteTitle')}</h2>
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

            {/* Delete confirmation modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeDeleteModal}>
                    <div className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md space-y-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-500/10 rounded-xl">
                                <AlertTriangle size={22} className="text-red-400"/>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-text-default">{t('security.confirmDeletion')}</h3>
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
