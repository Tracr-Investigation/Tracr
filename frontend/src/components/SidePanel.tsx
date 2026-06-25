import { type ReactNode } from 'react';
import { X } from 'lucide-react';

// Side panel sliding in from the right, animated on open/close. Stays mounted
// (toggled via `open`) so the transition plays both ways; `children` fill the
// area below the header.
export const SidePanel = ({
    open,
    onClose,
    title,
    subtitle,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
}) => (
    <>
        {/* Backdrop */}
        <div
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />

        {/* Panel */}
        <div
            className={`fixed top-0 right-0 h-screen w-full max-w-[480px] z-50 flex flex-col
                transition-transform duration-300 ease-in-out
                ${open ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-text-default">{title}</h2>
                    {subtitle && <p className="text-xs text-text-dim mt-0.5">{subtitle}</p>}
                </div>
                <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors">
                    <X size={18} />
                </button>
            </div>

            {children}
        </div>
    </>
);
