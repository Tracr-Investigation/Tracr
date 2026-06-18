import { useState, useEffect, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SubTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

interface SubTabsProps {
  /** Id de l'onglet parent : sert à namespacer le hash sous la forme `parent/sub`. */
  parentId: string;
  tabs: SubTabItem[];
  defaultTab?: string;
}

const getHashParts = (): { top: string | null; sub: string | null } => {
  if (typeof window === 'undefined') return { top: null, sub: null };
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return { top: null, sub: null };
  const [top, sub] = hash.split('/');
  return { top: top || null, sub: sub || null };
};

/**
 * Navigation secondaire (segmented control) à l'intérieur d'un onglet principal.
 * L'état actif est synchronisé avec le hash d'URL au format `parent/sub`
 * (ex. `#preuves/selectors`), ce qui préserve le deep-linking et permet à un
 * autre composant de basculer de sous-vue en écrivant simplement le hash.
 */
export const SubTabs = ({ parentId, tabs, defaultTab }: SubTabsProps) => {
  const hasTab = (id: string | null): id is string => !!id && tabs.some((t) => t.id === id);

  const [activeTab, setActiveTab] = useState(() => {
    const { top, sub } = getHashParts();
    if (top === parentId && hasTab(sub)) return sub;
    return defaultTab ?? tabs[0]?.id;
  });

  useEffect(() => {
    const onHashChange = () => {
      const { top, sub } = getHashParts();
      if (top === parentId && hasTab(sub)) setActiveTab(sub);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, tabs]);

  const handleSelect = (id: string) => {
    setActiveTab(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${parentId}/${id}`);
    }
  };

  const current = tabs.find((t) => t.id === activeTab);

  return (
    <div>
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-1 bg-card/30 border border-border-subtle rounded-lg p-0.5 mb-5 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                data-cy={`subtab-${tab.id}`}
                onClick={() => handleSelect(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  active ? 'bg-primary text-white' : 'text-text-muted hover:text-text-default'
                }`}
              >
                {Icon && <Icon size={14} />}
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {current?.content}
    </div>
  );
};
