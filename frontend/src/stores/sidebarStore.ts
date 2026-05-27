import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
    collapsed: boolean;
    toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
    persist(
        (set) => ({
            collapsed: false,
            toggle: () => set(state => ({ collapsed: !state.collapsed })),
        }),
        { name: 'tracr-sidebar' }
    )
);
