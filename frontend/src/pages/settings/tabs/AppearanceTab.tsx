import { Moon, Sun, Palette } from 'lucide-react';
import { useThemeStore, type ThemeAccent } from '../../../stores/themeStore';

const ACCENTS: { id: ThemeAccent; label: string; primary: string; secondary: string }[] = [
    { id: 'violet',  label: 'Violet',    primary: '#8b5cf6', secondary: '#a78bfa' },
    { id: 'emerald', label: 'Émeraude',  primary: '#10b981', secondary: '#34d399' },
    { id: 'blue',    label: 'Bleu',      primary: '#3b82f6', secondary: '#60a5fa' },
    { id: 'rose',    label: 'Rose',      primary: '#ec4899', secondary: '#f472b6' },
    { id: 'amber',   label: 'Ambre',     primary: '#f59e0b', secondary: '#fbbf24' },
    { id: 'cyan',    label: 'Cyan',      primary: '#06b6d4', secondary: '#22d3ee' },
];

export const AppearanceTab = () => {
    const { mode, accent, setMode, setAccent } = useThemeStore();

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Mode */}
            <div>
                <h2 className="text-lg font-semibold text-text-default flex items-center gap-2 mb-1">
                    {mode === 'dark' ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
                    Mode d'affichage
                </h2>
                <p className="text-sm text-text-muted mb-4">Choisissez entre l'interface sombre et claire.</p>

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
                            <p className="font-medium text-sm">Sombre</p>
                            <p className="text-xs text-text-dim mt-0.5">Interface sombre</p>
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
                            <p className="font-medium text-sm">Clair</p>
                            <p className="text-xs text-text-dim mt-0.5">Interface claire</p>
                        </div>
                        {mode === 'light' && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                    </button>
                </div>
            </div>

            {/* Accent */}
            <div>
                <h2 className="text-lg font-semibold text-text-default flex items-center gap-2 mb-1">
                    <Palette size={18} className="text-primary" />
                    Couleur d'accentuation
                </h2>
                <p className="text-sm text-text-muted mb-4">Personnalisez la couleur principale de l'interface.</p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {ACCENTS.map((a) => {
                        const selected = accent === a.id;
                        return (
                            <button
                                key={a.id}
                                onClick={() => setAccent(a.id)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                    selected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-border-focus/40'
                                }`}
                            >
                                <span
                                    className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-card transition-all"
                                    style={{
                                        background: `linear-gradient(135deg, ${a.primary}, ${a.secondary})`,
                                        ringColor: selected ? a.primary : 'transparent',
                                        ...(selected ? { boxShadow: `0 0 0 2px var(--bg-card), 0 0 0 4px ${a.primary}` } : {}),
                                    }}
                                />
                                <span className={`text-xs font-medium ${selected ? 'text-text-default' : 'text-text-muted'}`}>
                                    {a.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Preview */}
            <div>
                <h2 className="text-lg font-semibold text-text-default flex items-center gap-2 mb-1">
                    Aperçu
                </h2>
                <p className="text-sm text-text-muted mb-4">Rendu en temps réel du thème sélectionné.</p>

                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">T</span>
                        <div>
                            <p className="text-sm font-semibold text-text-default">Tracr</p>
                            <p className="text-xs text-text-muted">Aperçu du thème actuel</p>
                        </div>
                        <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                            Actif
                        </span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium">
                            Primaire
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-medium">
                            Secondaire
                        </button>
                        <button className="px-3 py-1.5 rounded-lg border border-border text-text-muted text-xs font-medium">
                            Neutre
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
