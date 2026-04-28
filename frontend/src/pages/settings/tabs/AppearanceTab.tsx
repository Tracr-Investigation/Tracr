import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../../stores/themeStore';

export const AppearanceTab = () => {
    const { theme, setTheme } = useThemeStore();

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h2 className="text-lg font-semibold text-text-default flex items-center gap-2 mb-1">
                    {theme === 'dark'
                        ? <Moon size={18} className="text-primary" />
                        : <Sun size={18} className="text-primary" />
                    }
                    Apparence
                </h2>
                <p className="text-sm text-text-muted">Choisissez le thème de l'interface.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                        theme === 'dark'
                            ? 'border-primary bg-primary/10 text-text-default'
                            : 'border-border hover:border-primary/40 text-text-muted hover:text-text-default'
                    }`}
                >
                    <Moon size={20} className={theme === 'dark' ? 'text-primary' : ''} />
                    <div>
                        <p className="font-medium text-sm">Sombre</p>
                        <p className="text-xs text-text-dim mt-0.5">Interface sombre</p>
                    </div>
                    {theme === 'dark' && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                </button>

                <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                        theme === 'light'
                            ? 'border-primary bg-primary/10 text-text-default'
                            : 'border-border hover:border-primary/40 text-text-muted hover:text-text-default'
                    }`}
                >
                    <Sun size={20} className={theme === 'light' ? 'text-primary' : ''} />
                    <div>
                        <p className="font-medium text-sm">Clair</p>
                        <p className="text-xs text-text-dim mt-0.5">Interface claire</p>
                    </div>
                    {theme === 'light' && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                </button>
            </div>
        </div>
    );
};
