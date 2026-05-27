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
                <h2 className="text-base font-semibold text-text-default flex items-center gap-2 mb-1">
                    {mode === 'dark' ? <Moon size={16} style={{color: 'var(--theme-primary)'}}/> : <Sun size={16} style={{color: 'var(--theme-primary)'}}/>}
                    Mode d'affichage
                </h2>
                <p className="text-sm text-text-muted mb-4">{t('settings.appearance.displayModeDesc')}</p>

                <div className="grid grid-cols-2 gap-3">
                    {([
                        {value: 'dark', Icon: Moon, label: 'Sombre', desc: 'Interface sombre'},
                        {value: 'light', Icon: Sun, label: 'Clair', desc: 'Interface claire'},
                    ] as const).map(({value, Icon, label, desc}) => {
                        const active = mode === value;
                        return (
                            <button
                                key={value}
                                onClick={() => setMode(value)}
                                className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                                    active ? 'border-[var(--theme-primary)] text-text-default' : 'border-border bg-card/30 text-text-muted hover:text-text-default hover:border-border'
                                }`}
                                style={active ? {background: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)'} : undefined}
                            >
                                <Icon size={20} style={active ? {color: 'var(--theme-primary)'} : undefined} className={active ? '' : 'text-text-dim'}/>
                                <div>
                                    <p className="font-medium text-sm">{label}</p>
                                    <p className="text-xs text-text-dim mt-0.5">{desc}</p>
                                </div>
                                {active && <span className="ml-auto w-2 h-2 rounded-full" style={{background: 'var(--theme-primary)'}}/>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Accent */}
            <div>
                <h2 className="text-base font-semibold text-text-default flex items-center gap-2 mb-1">
                    <Palette size={16} style={{color: 'var(--theme-primary)'}}/>
                    Couleur d'accentuation
                </h2>
                <p className="text-sm text-text-muted mb-4">{t('settings.appearance.accentColorDesc')}</p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {ACCENTS.map((a) => {
                        const selected = pendingAccent === a.id;

                        return (
                            <button
                                key={a.id}
                                onClick={() => setAccent(a.id)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                    selected ? 'border-[var(--theme-primary)]' : 'border-border bg-card/30 hover:border-border'
                                }`}
                                style={selected ? {background: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)'} : undefined}
                            >
                                <span
                                    className="w-8 h-8 rounded-full shrink-0 transition-all"
                                    style={{
                                        background: `linear-gradient(135deg, ${a.primary}, ${a.secondary})`,
                                        ...(selected ? {boxShadow: `0 0 0 2px rgba(0,0,0,0.5), 0 0 0 4px ${a.primary}`} : {}),
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
                <h2 className="text-base font-semibold text-text-default mb-1">Aperçu</h2>
                <p className="text-sm text-text-muted mb-4">Rendu en temps réel du thème sélectionné.</p>

                <div className="bg-card/30 border border-border-subtle rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)', color: 'var(--theme-primary)'}}>T</span>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: pendingTheme.primary }}>
                                Tracr
                            </p>
                            <p className="text-xs" style={{ color: pendingTheme.secondary }}>
                                {t('settings.appearance.previewCurrent')}
                            </p>
                        </div>
                        <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', color: 'var(--theme-primary)'}}>
                            Actif
                        </span>
                    </div>
                    <div className="h-px bg-primary/10"/>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg text-text-default text-xs font-medium" style={{background: 'var(--theme-primary)'}}>
                            Primaire
                        </button>
                        <button className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                            style={{background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', color: 'var(--theme-primary)', borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)'}}>
                            Secondaire
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