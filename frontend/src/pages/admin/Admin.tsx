import { Layout } from '../../components/Layout';
import { Tabs, type TabItem } from '../../components/Tabs';
import { UsersTab } from './tabs/UsersTab';
import { LogsTab } from './tabs/LogsTab';
import { StatusesTab } from './tabs/StatusesTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { Users, ScrollText, CircleDot, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Admin = () => {
  const { t } = useTranslation();

  const TABS: TabItem[] = [
    {
      id: 'users',
      label: t('admin.tabs.users'),
      icon: Users,
      content: <UsersTab />,
    },
    {
      id: 'logs',
      label: t('admin.tabs.logs'),
      icon: ScrollText,
      content: <LogsTab />,
    },
    {
      id: 'statuses',
      label: t('admin.tabs.statuses'),
      icon: CircleDot,
      content: <StatusesTab />,
    },
    {
      id: 'categories',
      label: t('admin.tabs.categories'),
      icon: Tag,
      content: <CategoriesTab />,
    },
  ];

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-accent mb-2">{t('admin.title')}</h1>
        <p className="text-secondary mb-6">{t('admin.subtitle')}</p>

        <Tabs tabs={TABS} defaultTab="users" />
      </div>
    </Layout>
  );
};
