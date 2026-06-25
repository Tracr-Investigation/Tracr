import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../services/api';

export const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/maintenance`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!stopped) setActive(!!data.active);
      } catch {
        // backend unreachable: keep the current state
      }
    };
    check();
    const id = setInterval(check, 4000);
    return () => { stopped = true; clearInterval(id); };
  }, []);

  if (!active) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <Loader2 size={48} className="text-primary animate-spin mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-text-default mb-2">{t('maintenance.title')}</h1>
        <p className="text-text-muted">{t('maintenance.message')}</p>
      </div>
    </div>
  );
};
