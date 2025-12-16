import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-dark">
      <Sidebar />
      <main className="lg:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
};