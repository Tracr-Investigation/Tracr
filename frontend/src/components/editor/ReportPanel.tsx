import { useMemo, useState } from 'react';
import { ClipboardList, Loader2, X } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export interface ReportMeta {
  summary: string | null;
  version: string | null;
  reviewer: string | null;
  validated_at: string | null;
  distribution: string | null;
}

interface Props {
  documentId: string;
  meta: ReportMeta;
  authorPseudo: string | null;
  html: string;
  canEdit: boolean;
  onSaved: (meta: ReportMeta) => void;
  onClose: () => void;
}

const WORDS_PER_MINUTE = 200;

interface ReportStats {
  words: number;
  characters: number;
  readingMinutes: number;
  rows: [string, number][];
}

// Count words and report blocks in the editor HTML.
const computeStats = (html: string): ReportStats => {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  const count = (selector: string) => doc.querySelectorAll(selector).length;
  // Archived images (served by /sources/{id}/view) + reference lines of other captures.
  const archivedSources =
    count('img[src*="/sources/"]') +
    Array.from(doc.querySelectorAll('strong')).filter((el) => el.textContent?.trim().startsWith('Source archivée')).length;

  return {
    words,
    characters: text.length,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    rows: [
      ['Titres', count('h1, h2, h3')],
      ['Tableaux', count('table')],
      ['Images', count('img')],
      ['Légendes', count('p[data-caption]')],
      ['Notes de bas de page', count('sup[data-footnote]')],
      ['Sources archivées citées', archivedSources],
      ['Liens', count('a[href]')],
      ['Cotations', count('span[data-rating]')],
      ['Encadrés', count('div[data-type="callout"]')],
      ['Passages caviardés', count('span[data-redacted]')],
      ['Sauts de page', count('div[data-type="page-break"]')],
    ],
  };
};

const inputClass =
  'w-full bg-input-bg border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-default focus:outline-none focus:border-primary disabled:opacity-60';

const SectionTitle = ({ children }: { children: string }) => (
  <p className="text-[10px] uppercase font-semibold tracking-wider text-secondary mb-2">{children}</p>
);

// Side panel: report summary, document control sheet and statistics.
export const ReportPanel = ({ documentId, meta, authorPseudo, html, canEdit, onSaved, onClose }: Props) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<ReportMeta>(meta);
  const [saving, setSaving] = useState(false);
  const stats = useMemo(() => computeStats(html), [html]);

  const setField = (field: keyof ReportMeta, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const changedFields = (Object.keys(draft) as (keyof ReportMeta)[]).filter(
    (field) => (draft[field] || '') !== (meta[field] || ''),
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Partial<Record<keyof ReportMeta, string | null>> = {};
      changedFields.forEach((field) => {
        body[field] = draft[field] || null;
      });
      const updated = await api.updateDocument(documentId, body);
      const saved: ReportMeta = {
        summary: updated.summary,
        version: updated.version,
        reviewer: updated.reviewer,
        validated_at: updated.validated_at,
        distribution: updated.distribution,
      };
      setDraft(saved);
      onSaved(saved);
      toast('success', 'Informations du rapport enregistrées');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-80 flex-shrink-0 border-l border-primary/20 bg-card flex flex-col h-full animate-slide-in">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-primary/20">
        <ClipboardList size={15} className="text-primary" />
        <span className="flex-1 text-sm font-medium text-accent">Rapport</span>
        <button onClick={onClose} className="text-secondary hover:text-accent transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <section>
          <SectionTitle>Statistiques</SectionTitle>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              ['Mots', stats.words],
              ['Caractères', stats.characters],
              ['Lecture', `${stats.readingMinutes} min`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-input-bg px-2 py-1.5 text-center">
                <p className="text-sm font-semibold text-accent">{value}</p>
                <p className="text-[10px] text-secondary">{label}</p>
              </div>
            ))}
          </div>
          <dl className="text-xs space-y-1">
            {stats.rows.map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-secondary">{label}</dt>
                <dd className={value ? 'text-accent font-medium' : 'text-text-dim'}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <SectionTitle>Synthèse</SectionTitle>
          <textarea
            value={draft.summary || ''}
            onChange={(event) => setField('summary', event.target.value)}
            disabled={!canEdit}
            rows={6}
            maxLength={10000}
            placeholder="Résumé du rapport pour le lecteur pressé (page dédiée dans le PDF)"
            className={`${inputClass} resize-y`}
          />
        </section>

        <section className="space-y-2.5">
          <SectionTitle>Gestion du document</SectionTitle>
          <p className="text-[11px] text-text-dim -mt-1">
            Page « Gestion du document » ajoutée après la couverture dès qu'un champ est rempli.
          </p>
          <div>
            <label className="block text-xs text-secondary mb-1">Rédacteur</label>
            <p className="text-sm text-accent">{authorPseudo || '-'}</p>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Version</label>
            <input
              value={draft.version || ''}
              onChange={(event) => setField('version', event.target.value)}
              disabled={!canEdit}
              maxLength={50}
              placeholder="ex. 1.0"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Relecteur</label>
            <input
              value={draft.reviewer || ''}
              onChange={(event) => setField('reviewer', event.target.value)}
              disabled={!canEdit}
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Date de validation</label>
            <input
              type="date"
              value={draft.validated_at || ''}
              onChange={(event) => setField('validated_at', event.target.value)}
              disabled={!canEdit}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Diffusion</label>
            <textarea
              value={draft.distribution || ''}
              onChange={(event) => setField('distribution', event.target.value)}
              disabled={!canEdit}
              rows={3}
              maxLength={2000}
              placeholder="Destinataires, une ligne par destinataire"
              className={`${inputClass} resize-y`}
            />
          </div>
        </section>
      </div>

      {canEdit && changedFields.length > 0 && (
        <div className="px-3 py-3 border-t border-primary/20">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-40"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
};
