import { Layout } from '../../components/Layout';
import { Tabs, type TabItem } from '../../components/Tabs';
import { SecurityTab } from './tabs/SecurityTab';
import { Lock, UserCog, Bell } from 'lucide-react';

const PlaceholderTab = ({ title, description }: { title: string; description: string }) => (
  <div className="bg-dark/50 backdrop-blur-sm border border-primary/20 rounded-2xl p-6">
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-3xl text-primary/50">...</span>
      </div>
      <h3 className="text-lg font-semibold text-accent mb-2">{title}</h3>
      <p className="text-sm text-secondary">{description}</p>
      <span className="mt-4 text-xs text-secondary/50 border border-primary/10 rounded-full px-3 py-1">Bientôt disponible</span>
    </div>
  </div>
);

const TABS: TabItem[] = [
  {
    id: 'security',
    label: 'Sécurité',
    icon: Lock,
    content: (
      <div className="max-w-2xl">
        <div className="bg-dark/50 backdrop-blur-sm border border-primary/20 rounded-2xl p-6">
          <SecurityTab />
        </div>
      </div>
    ),
  },
  {
    id: 'profile',
    label: 'Profil',
    icon: UserCog,
    content: <div className="max-w-2xl"><PlaceholderTab title="Profil" description="Gérez vos informations personnelles" /></div>,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    content: <div className="max-w-2xl"><PlaceholderTab title="Notifications" description="Configurez vos préférences de notification" /></div>,
  },
];

export const Parametres = () => {
  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-accent mb-2">Paramètres</h1>
        <p className="text-secondary mb-6">Configuration de votre compte</p>

        <Tabs tabs={TABS} defaultTab="security" />
      </div>
    </Layout>
  );
};
