import { Layout } from '../../components/Layout';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Tabs, type TabItem } from '../../components/Tabs';
import { UsersTab } from './tabs/UsersTab';
import { LogsTab } from './tabs/LogsTab';
import { StatusesTab } from './tabs/StatusesTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { TemplateCategoriesTab } from './tabs/TemplateCategoriesTab';
import { UpdatesTab } from './tabs/UpdatesTab';
import { Users, ScrollText, CircleDot, Tag, Layers, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

export const Admin = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  usePageTitle(t('sidebar.administration'));

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
    {
      id: 'templateCategories',
      label: t('admin.tabs.templateCategories'),
      icon: Layers,
      content: <TemplateCategoriesTab />,
    },
    // Code updates: super-admin only.
    ...(user?.role === 'super-admin'
      ? [{
          id: 'updates',
          label: t('admin.tabs.updates'),
          icon: RefreshCw,
          content: <UpdatesTab />,
        }]
      : []),
  ];

  return (
    <Layout>
      <div className="px-6 pt-6 pb-8">
        <h1 className="text-2xl font-bold text-text-default mb-1">{t('admin.title')}</h1>
        <p className="text-text-muted text-sm mb-6">{t('admin.subtitle')}</p>

        <Tabs tabs={TABS} defaultTab="users" />
      </div>
    </Layout>
  );
};
