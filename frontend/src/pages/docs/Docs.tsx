import { useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../../components/Layout';
import { DocContent } from '../../components/DocContent';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../contexts/AuthContext';
import {
  DOC_TREE, getDoc, docTitle, FIRST_DOC_SLUG,
  type DocLang, type DocNode,
} from '../../docs/registry';

export const Docs = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();

  const lang: DocLang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

  // Hide admin-only pages for other roles.
  const tree = useMemo<DocNode[]>(() => {
    const keep = (n: DocNode) =>
      n.type === 'category' ? true : !n.adminOnly || isAdmin;
    return DOC_TREE
      .filter(keep)
      .map((n) => (n.type === 'category' ? { ...n, items: n.items.filter(keep) } : n))
      .filter((n) => n.type !== 'category' || (n as Extract<DocNode, { type: 'category' }>).items.length > 0);
  }, [isAdmin]);

  const doc = slug ? getDoc(slug, lang) : null;
  const category = DOC_TREE.find(
    (n): n is Extract<DocNode, { type: 'category' }> =>
      n.type === 'category' && n.items.some((i) => i.slug === slug),
  );
  usePageTitle(doc?.title || t('sidebar.help'));

  if (!slug) return <Navigate to={`/docs/${FIRST_DOC_SLUG}`} replace />;

  return (
    <Layout>
      <div className="flex">
        {/* Docs navigation */}
        <nav className="hidden md:block w-64 shrink-0 border-r border-border-subtle min-h-[calc(100vh-0px)] px-4 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-dim mb-3 px-2">
            {t('sidebar.help')}
          </p>
          <ul className="space-y-0.5">
            {tree.map((node, i) =>
              node.type === 'category' ? (
                <li key={`cat-${i}`} className="pt-4">
                  <p className="text-xs font-semibold text-text-dim px-2 mb-1">{t(node.labelKey)}</p>
                  <ul className="space-y-0.5">
                    {node.items.map((it) => (
                      <DocLink key={it.slug} slug={it.slug} lang={lang} active={it.slug === slug} />
                    ))}
                  </ul>
                </li>
              ) : (
                <DocLink key={node.slug} slug={node.slug} lang={lang} active={node.slug === slug} />
              ),
            )}
          </ul>
        </nav>

        {/* Contenu */}
        <div className="flex-1 min-w-0 px-6 md:px-10 py-8">
          <div className="max-w-3xl mx-auto">
            {doc && (
              <nav className="flex items-center gap-1.5 text-xs text-text-dim mb-5 flex-wrap">
                <Link to={`/docs/${FIRST_DOC_SLUG}`} className="hover:text-primary transition-colors">
                  {t('sidebar.help')}
                </Link>
                {category && (
                  <>
                    <ChevronRight size={12} className="text-border" />
                    <span>{t(category.labelKey)}</span>
                  </>
                )}
                <ChevronRight size={12} className="text-border" />
                <span className="text-primary font-medium">{doc.title}</span>
              </nav>
            )}
            {doc ? (
              <DocContent>{doc.body}</DocContent>
            ) : (
              <p className="text-text-muted">{t('docs.notFound')}</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const DocLink = ({ slug, lang, active }: { slug: string; lang: DocLang; active: boolean }) => (
  <li>
    <Link
      to={`/docs/${slug}`}
      className={`block px-2 py-1.5 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-primary/15 text-text-default font-medium'
          : 'text-text-muted hover:bg-card/40 hover:text-text-default'
      }`}
    >
      {docTitle(slug, lang)}
    </Link>
  </li>
);
