import { useState, useEffect, Fragment, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
}

const getHashTab = (): string | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  // Supporte les hash imbriqués `parent/sub` : seul le segment parent pilote
  // l'onglet de premier niveau (le sous-onglet est géré par <SubTabs>).
  const top = hash.split('/')[0];
  return top || null;
};

export const Tabs = ({ tabs, defaultTab }: TabsProps) => {
  const hasTab = (id: string | null): id is string => !!id && tabs.some((t) => t.id === id);

  const [activeTab, setActiveTab] = useState(() => {
    const hash = getHashTab();
    return hasTab(hash) ? hash : (defaultTab ?? tabs[0]?.id);
  });

  // Permet l'ouverture directe d'un onglet via le hash d'URL (#graph, #map…).
  useEffect(() => {
    const onHashChange = () => {
      const hash = getHashTab();
      if (hasTab(hash)) setActiveTab(hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  const handleSelect = (id: string) => {
    setActiveTab(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  const current = tabs.find((t) => t.id === activeTab);

  return (
    <div>
      <div className="border-b border-border-subtle mb-6">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                data-cy={`tab-${tab.id}`}
                onClick={() => handleSelect(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2
                  ${active
                    ? 'border-[var(--theme-primary)] text-text-default'
                    : 'border-transparent text-text-muted hover:text-text-default hover:border-border'
                  }
                `}
              >
                {Icon && <Icon size={15} style={active ? {color: 'var(--theme-primary)'} : undefined} className={active ? '' : 'text-text-dim'}/>}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      {current && <Fragment key={current.id}>{current.content}</Fragment>}
    </div>
  );
};
