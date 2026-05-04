import { useState, type ReactNode } from 'react';
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

export const Tabs = ({ tabs, defaultTab }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id);

  const current = tabs.find((t) => t.id === activeTab);

  return (
    <div>
      <div className="border-b border-border-subtle mb-8">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2
                  ${active
                    ? 'border-primary text-text-default'
                    : 'border-transparent text-text-muted hover:text-text-default hover:border-primary/30'
                  }
                `}
              >
                {Icon && <Icon size={16} className={active ? 'text-primary' : ''} />}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {current?.content}
    </div>
  );
};
