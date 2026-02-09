import { Layout } from '../../components/Layout';
import { Tabs, type TabItem } from '../../components/Tabs';
import { SecurityTab } from './tabs/SecurityTab';
import { Lock, UserCog, Bell } from 'lucide-react';

const PlaceholderTab = ({ title, description }: { title: string; description: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
      <span className="text-3xl text-primary/50">...</span>
    </div>
    <h3 className="text-lg font-semibold text-accent mb-2">{title}</h3>
    <p className="text-sm text-secondary">{description}</p>
    <span className="mt-4 text-xs text-secondary/50 border border-primary/10 rounded-full px-3 py-1">Coming soon</span>
  </div>
);

const TABS: TabItem[] = [
  {
    id: 'security',
    label: 'Security',
    icon: Lock,
    content: (
      <div className="max-w-2xl">
        <SecurityTab />
      </div>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: UserCog,
    content: <PlaceholderTab title="Profile" description="Manage your personal information" />,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    content: <PlaceholderTab title="Notifications" description="Configure your notification preferences" />,
  },
];

export const Parametres = () => {
  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-accent mb-2">Settings</h1>
        <p className="text-secondary mb-6">Account configuration</p>

        <Tabs tabs={TABS} defaultTab="security" />
      </div>
    </Layout>
  );
};
