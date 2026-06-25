// Registry of the docs embedded in the site.
// Content lives in src/docs/{fr,en}/*.md; the structure (order + categories) is
// defined here, and page labels are taken from the `title` frontmatter.

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
  labelKey: string; // i18n key
  items: DocEntry[];
}

export type DocNode = DocEntry | DocCategory;

// Structure taken from the original Docusaurus sidebar.
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

// Flat list of all entries (in display order).
export const DOC_ENTRIES: DocEntry[] = DOC_TREE.flatMap((n) =>
  n.type === 'category' ? n.items : [n],
);

export const FIRST_DOC_SLUG = DOC_ENTRIES[0].slug;

const TITLE_RE = /title:\s*(.+)\s*/;

function parse(raw: string): ParsedDoc {
  let title = '';
  let body = raw;

  // Strip the leading `--- ... ---` frontmatter and extract the title from it.
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fm) {
    const titleLine = fm[1].split(/\r?\n/).find((l) => TITLE_RE.test(l));
    if (titleLine) title = titleLine.replace(TITLE_RE, '$1').trim().replace(/^["']|["']$/g, '');
    body = raw.slice(fm[0].length);
  }

  // Docusaurus admonitions (:::note …) aren't standard markdown: strip the marker
  // lines so we don't render raw "::: ".
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
