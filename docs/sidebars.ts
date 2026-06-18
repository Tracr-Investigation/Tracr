import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'tableau-de-bord',
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Fonctionnalités',
      collapsed: false,
      items: [
        'investigations',
        'documents',
        'tasks',
        'entities-graph',
        'map',
        'osint',
        'templates',
        'calendar',
      ],
    },
    {
      type: 'category',
      label: 'Interface',
      collapsed: false,
      items: [
        'settings',
        'notifications',
        'shortcuts',
      ],
    },
    'administration',
  ],
};

export default sidebars;
