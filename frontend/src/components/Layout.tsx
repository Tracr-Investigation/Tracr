import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useSidebarStore } from '../stores/sidebarStore';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { collapsed } = useSidebarStore();
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <main className={`transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        {children}
      </main>
    </div>
  );
};
