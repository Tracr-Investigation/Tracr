import type { ReactNode } from 'react';

export const ICON_SIZE = 14;

interface BtnProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}

const buildBtnClassName = (active: boolean): string => {
  const base = 'p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
  if (active) {
    return `${base} bg-primary/20 text-primary`;
  }

  return `${base} text-secondary hover:text-accent hover:bg-primary/10`;
};

// Generic toolbar button.
export const Btn = ({ active = false, disabled = false, onClick, title, children }: BtnProps) => {
  const className = buildBtnClassName(active);
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={className}>
      {children}
    </button>
  );
};

export const Divider = () => <div className="w-px h-5 bg-primary/20 mx-0.5" />;
