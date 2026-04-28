import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
export type ThemeAccent = 'violet' | 'emerald' | 'blue' | 'rose' | 'amber' | 'cyan';

interface ThemeStore {
    mode: ThemeMode;
    accent: ThemeAccent;
    setMode: (mode: ThemeMode) => void;
    setAccent: (accent: ThemeAccent) => void;
    toggleMode: () => void;
}

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            mode: 'dark',
            accent: 'violet',
            setMode: (mode) => set({ mode }),
            setAccent: (accent) => set({ accent }),
            toggleMode: () =>
                set((state) => ({ mode: state.mode === 'dark' ? 'light' : 'dark' })),
        }),
        { name: 'tracr-theme-v2' }
    )
);
