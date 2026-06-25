import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Plain text of a React node (used to build a heading id).
const toText = (node: ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return toText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
};

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Heading with a `#` anchor (direct link to the section).
const Anchored = ({ tag: Tag, className, children }: {
  tag: 'h2' | 'h3'; className: string; children: ReactNode;
}) => {
  const id = slugify(toText(children));
  return (
    <Tag id={id} className={`group scroll-mt-24 ${className}`}>
      {children}
      <a
        href={`#${id}`}
        aria-label="Lien direct vers cette section"
        className="ml-2 align-middle text-primary opacity-0 group-hover:opacity-100 transition-opacity"
      >
        #
      </a>
    </Tag>
  );
};

// Render a markdown document styled with the design system.
export const DocContent = ({ children }: { children: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ ...p }) => (
        <h1 className="text-3xl font-bold mb-5 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent" {...p} />
      ),
      h2: ({ children }) => (
        <Anchored tag="h2" className="text-xl font-bold text-text-default mt-10 mb-3 pl-3 border-l-4 border-primary">
          {children}
        </Anchored>
      ),
      h3: ({ children }) => (
        <Anchored tag="h3" className="text-lg font-semibold text-primary mt-6 mb-2">
          {children}
        </Anchored>
      ),
      h4: ({ ...p }) => <h4 className="text-base font-semibold text-text-default mt-4 mb-2" {...p} />,
      p: ({ ...p }) => <p className="text-text-muted leading-relaxed my-3" {...p} />,
      a: ({ ...p }) => <a className="text-primary font-medium hover:underline" {...p} />,
      strong: ({ ...p }) => <strong className="font-semibold text-text-default" {...p} />,
      ul: ({ ...p }) => <ul className="list-disc marker:text-primary pl-6 my-3 space-y-1.5 text-text-muted" {...p} />,
      ol: ({ ...p }) => <ol className="list-decimal marker:text-primary marker:font-semibold pl-6 my-3 space-y-1.5 text-text-muted" {...p} />,
      li: ({ ...p }) => <li className="leading-relaxed pl-1" {...p} />,
      hr: () => <hr className="my-8 h-px border-0 bg-gradient-to-r from-primary/50 via-border to-transparent" />,
      blockquote: ({ ...p }) => (
        <blockquote className="border-l-4 border-amber-500/60 bg-amber-500/10 pl-4 py-2 my-4 text-text-muted rounded-r-lg" {...p} />
      ),
      code: ({ ...p }) => (
        <code className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-mono text-[0.85em]" {...p} />
      ),
      table: ({ ...p }) => (
        <div className="my-5 overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full text-sm" {...p} />
        </div>
      ),
      thead: ({ ...p }) => <thead className="bg-primary/10" {...p} />,
      th: ({ ...p }) => <th className="text-left px-4 py-2.5 font-semibold text-primary border-b border-primary/20" {...p} />,
      td: ({ ...p }) => <td className="px-4 py-2.5 text-text-muted border-b border-border-subtle align-top" {...p} />,
      tr: ({ ...p }) => <tr className="even:bg-card/20" {...p} />,
    }}
  >
    {children}
  </ReactMarkdown>
);
