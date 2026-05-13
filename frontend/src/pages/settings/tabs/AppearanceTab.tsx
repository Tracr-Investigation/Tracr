import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Palette } from 'lucide-react';
import { useThemeStore, type ThemeAccent } from '../../../stores/themeStore';

const ACCENTS: { id: ThemeAccent; primary: string; secondary: string }[] = [
    { id: 'violet', primary: '#8b5cf6', secondary: '#a78bfa' },
    { id: 'emerald', primary: '#10b981', secondary: '#34d399' },
    { id: 'blue', primary: '#3b82f6', secondary: '#60a5fa' },
    { id: 'rose', primary: '#ec4899', secondary: '#f472b6' },
    { id: 'amber', primary: '#f59e0b', secondary: '#fbbf24' },
    { id: 'cyan', primary: '#06b6d4', secondary: '#22d3ee' },
];

export const AppearanceTab = () => {
    const { t } = useTranslation();
    const { mode, accent, setMode, setAccent } = useThemeStore();
    const [pendingAccent, setPendingAccent] = useState<ThemeAccent>(accent);

    const pendingTheme = ACCENTS.find((a) => a.id === pendingAccent) ?? ACCENTS[0];

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Mode */}
            <div>
                <h2 className="text-lg font-semibold text-text-default flex items-center gap-2 mb-1">
                    {mode === 'dark' ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
                    {t('settings.appearance.displayMode')}
                </h2>
                <p className="text-sm text-text-muted mb-4">{t('settings.appearance.displayModeDesc')}</p>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setMode('dark')}
                        className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                            mode === 'dark'
                                ? 'border-primary bg-primary/10 text-text-default'
                                : 'border-border hover:border-primary/40 text-text-muted hover:text-text-default'
                        }`}
                    >
                        <Moon size={20} className={mode === 'dark' ? 'text-primary' : ''} />
                        <div>
                            <p className="font-medium text-sm">{t('settings.appearance.dark')}</p>
                            <p className="text-xs text-text-dim mt-0.5">{t('settings.appearance.darkDesc')}</p>
                        </div>
                        {mode === 'dark' && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                    </button>

                    <button
                        onClick={() => setMode('light')}
                        className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                            mode === 'light'
                                ? 'border-primary bg-primary/10 text-text-default'
                                : 'border-border hover:border-primary/40 text-text-muted hover:text-text-default'
                        }`}
                    >
                        <Sun size={20} className={mode === 'light' ? 'text-primary' : ''} />
                        <div>
                            <p className="font-medium text-sm">{t('settings.appearance.light')}</p>
                            <p className="text-xs text-text-dim mt-0.5">{t('settings.appearance.lightDesc')}</p>
                        </div>
                        {mode === 'light' && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                    </button>
                </div>
            </div>

            {/* Accent */}
            <div>
                <h2 className="text-lg font-semibold text-text-default flex items-center gap-2 mb-1">
                    <Palette size={18} className="text-primary" />
                    {t('settings.appearance.accentColor')}
                </h2>
                <p className="text-sm text-text-muted mb-4">{t('settings.appearance.accentColorDesc')}</p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {ACCENTS.map((a) => {
                        const selected = pendingAccent === a.id;

                        return (
                            <button
                                key={a.id}
                                onClick={() => setPendingAccent(a.id)}
                                className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all"
                                style={{
                                    borderColor: selected ? a.primary : undefined,
                                    backgroundColor: selected ? `${a.primary}20` : undefined,
                                }}
                            >
                                <span
                                    className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-card transition-all"
                                    style={{
                                        background: `linear-gradient(135deg, ${a.primary}, ${a.secondary})`,
                                        ...(selected ? { boxShadow: `0 0 0 2px var(--bg-card), 0 0 0 4px ${a.primary}` } : {}),
                                    }}
                                />
                                <span
                                    className="text-xs font-medium"
                                    style={{ color: selected ? a.primary : undefined }}
                                >
                                    {t(`settings.appearance.colors.${a.id}`)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Preview */}
            <div>
                <h2 className="text-lg font-semibold text-text-default flex items-center gap-2 mb-1">
                    {t('settings.appearance.preview')}
                </h2>
                <p className="text-sm text-text-muted mb-4">{t('settings.appearance.previewDesc')}</p>

                <div
                    className="bg-card rounded-xl p-5 space-y-3 border"
                    style={{ borderColor: `${pendingTheme.primary}60` }}
                >
                    <div className="flex items-center gap-3">
                        <span
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{
                                backgroundColor: `${pendingTheme.primary}20`,
                                color: pendingTheme.primary,
                            }}
                        >
                            T
                        </span>

                        <div>
                            <p className="text-sm font-semibold" style={{ color: pendingTheme.primary }}>
                                Tracr
                            </p>
                            <p className="text-xs" style={{ color: pendingTheme.secondary }}>
                                {t('settings.appearance.previewCurrent')}
                            </p>
                        </div>

                        <span
                            className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium border"
                            style={{
                                backgroundColor: `${pendingTheme.primary}20`,
                                color: pendingTheme.primary,
                                borderColor: `${pendingTheme.primary}50`,
                            }}
                        >
                            {t('settings.appearance.active')}
                        </span>
                    </div>

                    <div className="h-px" style={{ backgroundColor: `${pendingTheme.primary}40` }} />

                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                            style={{ backgroundColor: pendingTheme.primary }}
                        >
                            {t('settings.appearance.primary')}
                        </button>

                        <button
                            className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                            style={{
                                backgroundColor: `${pendingTheme.primary}20`,
                                color: pendingTheme.primary,
                                borderColor: `${pendingTheme.primary}50`,
                            }}
                        >
                            {t('settings.appearance.secondary')}
                        </button>

                        <button
                            className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                            style={{
                                color: pendingTheme.secondary,
                                borderColor: `${pendingTheme.primary}40`,
                            }}
                        >
                            {t('settings.appearance.neutral')}
                        </button>
                    </div>
                </div>
            </div>

            <button
                onClick={() => setAccent(pendingAccent)}
                disabled={pendingAccent === accent}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    pendingAccent === accent
                        ? 'bg-primary/20 text-text-muted cursor-not-allowed'
                        : 'bg-primary text-white hover:opacity-90'
                }`}
            >
                {t('settings.appearance.apply')}
            </button>
        </div>
    );
};