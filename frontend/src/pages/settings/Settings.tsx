import { useTranslation } from 'react-i18next';
import { Layout } from '../../components/Layout';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Tabs, type TabItem } from '../../components/Tabs';
import { SecurityTab } from './tabs/SecurityTab';
import { LanguageTab } from './tabs/LanguageTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { Lock, UserCog, Bell, Globe, Palette } from 'lucide-react';

const PlaceholderTab = ({ title, description }: { title: string; description: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-input-bg rounded-2xl flex items-center justify-center mb-4">
        <span className="text-2xl text-text-dim">…</span>
      </div>
      <h3 className="text-base font-semibold text-text-default mb-1">{title}</h3>
      <p className="text-sm text-text-muted mb-4">{description}</p>
      <span className="text-xs text-text-dim border border-border rounded-full px-3 py-1">{t('settings.comingSoon')}</span>
    </div>
  );
};

export const Settings = () => {
  const { t } = useTranslation();
  usePageTitle(t('sidebar.settings'));

  const TABS: TabItem[] = [
    {
      id: 'security',
      label: t('settings.tabs.security'),
      icon: Lock,
      content: (
        <div className="max-w-2xl">
          <SecurityTab />
        </div>
      ),
    },
    {
      id: 'language',
      label: t('settings.tabs.language'),
      icon: Globe,
      content: <LanguageTab />,
    },
    {
      id: 'appearance',
      label: 'Apparence',
      icon: Palette,
      content: <AppearanceTab />,
    },
    {
      id: 'profile',
      label: t('settings.tabs.profile'),
      icon: UserCog,
      content: <PlaceholderTab title={t('settings.profile.title')} description={t('settings.profile.description')} />,
    },
    {
      id: 'notifications',
      label: t('settings.tabs.notifications'),
      icon: Bell,
      content: <PlaceholderTab title={t('settings.notifications.title')} description={t('settings.notifications.description')} />,
    },
  ];

  return (
    <Layout>
      <div className="px-6 pt-6 pb-8">
        <h1 className="text-2xl font-bold text-text-default mb-1">{t('settings.title')}</h1>
        <p className="text-text-muted text-sm mb-6">{t('settings.subtitle')}</p>

        <Tabs tabs={TABS} defaultTab="security" />
      </div>
    </Layout>
  );
};
