import { useEffect, useState } from 'react';
import { api, type SourceData } from '../../../services/api';

/**
 * Affiche une « page autonome » (snapshot HTML SingleFile-style) capturée par
 * l'extension : tout le CSS est inliné, les URLs absolutisées → on rend le HTML
 * directement dans une iframe sandbox (aucun script exécuté, aucun moteur de rejeu).
 */
export const ArchivedPageViewer = ({ source }: { source: SourceData }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    api.downloadSource(source.id_source)
      .then(({ blob }) => blob.text())
      .then((text) => { if (active) setHtml(text); })
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

  // sandbox vide : rend le HTML/CSS mais bloque scripts, formulaires, navigation.
  return (
    <iframe
      srcDoc={html}
      sandbox=""
      title={source.title}
      style={{ width: '100%', height: '72vh', display: 'block', border: '0', borderRadius: '8px', background: '#fff' }}
    />
  );
};
