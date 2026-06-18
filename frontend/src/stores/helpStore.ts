import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HelpStore {
    isHelpMode: boolean;
    toggle: () => void;
}

export const useHelpStore = create<HelpStore>()(
    persist(
        (set) => ({
            isHelpMode: false,
            toggle: () => set(state => ({ isHelpMode: !state.isHelpMode })),
        }),
        { name: 'tracr-help-mode' }
    )
);
