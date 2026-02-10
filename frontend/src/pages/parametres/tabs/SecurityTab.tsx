import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../../contexts/AuthContext';
import {PasswordStrength} from '../../../components/PasswordStrength';
import {isPasswordValid} from '../../../utils/passwordValidation';
import {api} from '../../../services/api';
import {Shield, Eye, EyeOff, Trash2, AlertTriangle} from 'lucide-react';

export const SecurityTab = () => {
    const {logout} = useAuth();
    const navigate = useNavigate();

    // Change password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Delete account state
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
            setError('New password does not meet security requirements');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (currentPassword === newPassword) {
            setError('New password must be different from the current one');
            return;
        }

        setLoading(true);

        try {
            await api.changePassword(currentPassword, newPassword);
            setSuccess('Password changed successfully');
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
                        <h2 className="text-lg font-semibold text-accent">Password</h2>
                        <p className="text-sm text-secondary">Change your password to secure your account</p>
                    </div>
                </div>

                <div className="h-px bg-primary/10"/>

                <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-accent mb-2">
                            Current password
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 bg-dark/80 border border-primary/20 rounded-xl text-accent placeholder-secondary/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Enter your current password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary transition-colors"
                            >
                                {showCurrent ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-accent mb-2">
                            New password
                        </label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 bg-dark/80 border border-primary/20 rounded-xl text-accent placeholder-secondary/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Enter your new password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary transition-colors"
                            >
                                {showNew ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                        <PasswordStrength password={newPassword}/>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-accent mb-2">
                            Confirm new password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 bg-dark/80 border border-primary/20 rounded-xl text-accent placeholder-secondary/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Confirm your new password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary transition-colors"
                            >
                                {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <p className="text-green-400 text-sm">{success}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? 'Updating...' : 'Change password'}
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
                        <h2 className="text-lg font-semibold text-accent">Delete account</h2>
                        <p className="text-sm text-red-400">Permanently delete your account and all associated data</p>
                    </div>
                </div>

                <div className="h-px bg-red-500/10"/>

                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <p className="text-sm text-red-400">
                        This action is irreversible. Your account will be deactivated and you will no longer be able to
                        log in.
                    </p>
                </div>

                <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-all"
                >
                    Delete my account
                </button>
            </div>

            {/* Delete confirmation modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                     onClick={closeDeleteModal}>
                    <div className="bg-dark border border-red-500/30 rounded-2xl p-6 w-full max-w-md space-y-5"
                         onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-500/10 rounded-xl">
                                <AlertTriangle size={22} className="text-red-400"/>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-accent">Confirm deletion</h3>
                                <p className="text-sm text-red-400">Enter your password to confirm</p>
                            </div>
                        </div>

                        <form onSubmit={handleDeleteAccount} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showDeletePassword ? 'text' : 'password'}
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 bg-dark/80 border border-red-500/30 rounded-xl text-accent placeholder-secondary/40 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                                    placeholder="Your password"
                                    required
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary transition-colors"
                                >
                                    {showDeletePassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>

                            {deleteError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-red-400 text-sm">{deleteError}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeDeleteModal}
                                    className="flex-1 py-3 bg-dark/50 border border-primary/20 text-secondary font-medium rounded-xl hover:bg-primary/10 hover:text-accent transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={deleteLoading || !deletePassword}
                                    className="flex-1 py-3 bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {deleteLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
