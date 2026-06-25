import { useEffect, useState } from 'react';
import { api, API_URL, type SourceData } from '../../../services/api';

// Companion media (video/audio/large images) are stored as `tracr-media:<id>:<sig>`
// placeholders in the archived HTML. We rewrite them here into signed API URLs
// (auth-free reading) so the iframe loads/plays them from Tracr.
const rewriteMedia = (html: string) =>
  html.replace(
    /tracr-media:(\d+):([a-f0-9]+)/g,
    (_m, id, sig) => `${API_URL}/sources/${id}/view?sig=${sig}`,
  );

// Render a "self-contained" HTML snapshot (SingleFile-style) captured by the
// extension directly in a sandboxed iframe (no script run, no replay engine).
export const ArchivedPageViewer = ({ source }: { source: SourceData }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    api.downloadSource(source.id_source)
      .then(({ blob }) => blob.text())
      .then((text) => { if (active) setHtml(rewriteMedia(text)); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [source.id_source]);

  if (error) {
    return <p className="text-text-dim text-sm py-16 text-center">Archive illisible.</p>;
  }
  if (html === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-text-dim">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm">Chargement de la page archivée…</span>
      </div>
    );
  }

  // empty sandbox: renders HTML/CSS but blocks scripts, forms, navigation.
  return (
    <iframe
      srcDoc={html}
      sandbox=""
      title={source.title}
      style={{ width: '100%', height: '72vh', display: 'block', border: '0', borderRadius: '8px', background: '#fff' }}
    />
  );
};
