// Registre de la documentation intégrée au site.
// Le contenu vit dans src/docs/{fr,en}/*.md ; la structure (ordre + catégories)
// est définie ici, et les libellés des pages sont tirés du frontmatter `title`.

const frFiles = import.meta.glob('./fr/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const enFiles = import.meta.glob('./en/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export type DocLang = 'fr' | 'en';

export interface ParsedDoc {
  title: string;
  body: string;
}

export interface DocEntry {
  type: 'doc';
  slug: string;
  adminOnly?: boolean;
}

export interface DocCategory {
  type: 'category';
  labelKey: string; // clé i18n
  items: DocEntry[];
}

export type DocNode = DocEntry | DocCategory;

// Structure reprise du sidebar Docusaurus d'origine.
export const DOC_TREE: DocNode[] = [
  { type: 'doc', slug: 'tableau-de-bord' },
  { type: 'doc', slug: 'intro' },
  { type: 'doc', slug: 'getting-started' },
  {
    type: 'category',
    labelKey: 'docs.categories.features',
    items: [
      { type: 'doc', slug: 'investigations' },
      { type: 'doc', slug: 'documents' },
      { type: 'doc', slug: 'tasks' },
      { type: 'doc', slug: 'entities-graph' },
      { type: 'doc', slug: 'map' },
      { type: 'doc', slug: 'osint' },
      { type: 'doc', slug: 'templates' },
      { type: 'doc', slug: 'calendar' },
    ],
  },
  {
    type: 'category',
    labelKey: 'docs.categories.interface',
    items: [
      { type: 'doc', slug: 'settings' },
      { type: 'doc', slug: 'notifications' },
      { type: 'doc', slug: 'shortcuts' },
    ],
  },
  { type: 'doc', slug: 'administration', adminOnly: true },
];

// Liste à plat de toutes les entrées (dans l'ordre d'affichage).
export const DOC_ENTRIES: DocEntry[] = DOC_TREE.flatMap((n) =>
  n.type === 'category' ? n.items : [n],
);

export const FIRST_DOC_SLUG = DOC_ENTRIES[0].slug;

const TITLE_RE = /title:\s*(.+)\s*/;

function parse(raw: string): ParsedDoc {
  let title = '';
  let body = raw;

  // Retire le frontmatter `--- ... ---` en tête et en extrait le titre.
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fm) {
    const titleLine = fm[1].split(/\r?\n/).find((l) => TITLE_RE.test(l));
    if (titleLine) title = titleLine.replace(TITLE_RE, '$1').trim().replace(/^["']|["']$/g, '');
    body = raw.slice(fm[0].length);
  }

  // Les admonitions Docusaurus (:::note …) ne sont pas du markdown standard :
  // on retire les lignes de balise pour ne pas afficher « ::: » brut.
  body = body.replace(/^:::.*$/gm, '').trim();

  return { title, body };
}

export function getDoc(slug: string, lang: DocLang): ParsedDoc | null {
  const files = lang === 'en' ? enFiles : frFiles;
  const raw = files[`./${lang}/${slug}.md`] ?? frFiles[`./fr/${slug}.md`]; // repli FR
  return raw ? parse(raw) : null;
}

export function docTitle(slug: string, lang: DocLang): string {
  return getDoc(slug, lang)?.title || slug;
}
