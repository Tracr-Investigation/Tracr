import { Layout } from '../../components/Layout';
import { Tabs, type TabItem } from '../../components/Tabs';
import { UsersTab } from './tabs/UsersTab';
import { LogsTab } from './tabs/LogsTab';
import { Users, ScrollText } from 'lucide-react';

const TABS: TabItem[] = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    content: <UsersTab />,
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: ScrollText,
    content: <LogsTab />,
  },
];

export const Admin = () => {
  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-accent mb-2">Administration</h1>
        <p className="text-secondary mb-6">User management and activity logs</p>

        <Tabs tabs={TABS} defaultTab="users" />
      </div>
    </Layout>
  );
};
