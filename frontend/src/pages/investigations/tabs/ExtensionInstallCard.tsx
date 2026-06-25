import { useState } from 'react';
import { Puzzle, Download, ChevronDown } from 'lucide-react';

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-input-bg border border-border-subtle">{children}</code>
);

/** Help card: download the Tracr browser extension + install it. */
export const ExtensionInstallCard = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border-subtle bg-card/30 p-4 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}
        >
          <Puzzle size={17} style={{ color: 'var(--theme-primary)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-default">Extension navigateur Tracr</p>
          <p className="text-xs text-text-dim">
            Capturez pages, captures d'écran et médias directement depuis votre navigateur.
          </p>
        </div>
        <a
          href="/tracr-extension.zip"
          download
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all"
          style={{ background: 'var(--theme-primary)' }}
        >
          <Download size={14} /> Télécharger
        </a>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-text-dim hover:text-text-default transition-colors"
        >
          Installer <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-border-subtle/60">
          <ol className="text-xs text-text-muted space-y-1.5 list-decimal list-inside">
            <li>Décompressez le fichier <Code>tracr-extension.zip</Code>.</li>
            <li>Ouvrez <Code>chrome://extensions</Code> (ou <Code>edge://extensions</Code>).</li>
            <li>Activez le <strong className="text-text-default">Mode développeur</strong> (en haut à droite).</li>
            <li>Cliquez <strong className="text-text-default">« Charger l'extension non empaquetée »</strong> et sélectionnez le dossier décompressé.</li>
            <li>Épinglez l'icône Tracr, connectez-vous avec votre compte, et capturez.</li>
          </ol>
          <p className="mt-2 text-[11px] text-text-dim">
            Navigateurs Chromium (Chrome, Edge, Brave). Non compatible Firefox.
          </p>
        </div>
      )}
    </div>
  );
};
