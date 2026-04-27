import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { api } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';

const LANGUAGES = [
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

export const LanguageTab = () => {
    const { t, i18n } = useTranslation();
    const { user, login } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(user?.language ?? 'en');

    const handleSave = async () => {
        if (selected === user?.language) return;
        setSaving(true);
        try {
            await api.updateLanguage(selected);
            i18n.changeLanguage(selected);
            if (user) {
                login({ ...user, language: selected }, localStorage.getItem('token') ?? '');
            }
            toast('success', t('settings.language.saved'));
        } catch {
            toast('error', t('settings.language.error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h2 className="text-lg font-semibold text-accent flex items-center gap-2 mb-1">
                    <Globe size={18} className="text-primary" />
                    {t('settings.language.title')}
                </h2>
                <p className="text-sm text-secondary">{t('settings.language.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LANGUAGES.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setSelected(lang.code)}
                        className={`
                            flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left
                            ${selected === lang.code
                                ? 'border-primary bg-primary/10 text-accent'
                                : 'border-primary/20 hover:border-primary/40 text-secondary hover:text-accent'
                            }
                        `}
                    >
                        <span className="text-2xl">{lang.flag}</span>
                        <span className="font-medium text-sm">{lang.label}</span>
                        {selected === lang.code && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
                        )}
                    </button>
                ))}
            </div>

            <button
                onClick={handleSave}
                disabled={saving || selected === user?.language}
                className="px-5 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {saving ? t('common.loading') : t('common.save')}
            </button>
        </div>
    );
};
