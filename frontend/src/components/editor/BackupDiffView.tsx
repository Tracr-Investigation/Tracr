import { useMemo } from 'react';
import { diffLines } from 'diff';

interface Props {
  backupHtml: string;
  currentHtml: string;
}

const CONTEXT_LINES = 2;

const htmlToLines = (html: string): string[] => {
  const div = window.document.createElement('div');
  div.innerHTML = html;
  const text = div.innerText || div.textContent || '';
  return text.split('\n').filter((l) => l.trim().length > 0);
};

interface DiffChunk {
  lines: { text: string; type: 'added' | 'removed' | 'context' }[];
}

const buildChunks = (backupHtml: string, currentHtml: string): { chunks: DiffChunk[]; added: number; removed: number } => {
  const backupLines = htmlToLines(backupHtml).join('\n');
  const currentLines = htmlToLines(currentHtml).join('\n');
  const parts = diffLines(backupLines, currentLines);

  type RawLine = { text: string; type: 'added' | 'removed' | 'context' };
  const flat: RawLine[] = [];
  for (const part of parts) {
    const lines = part.value.split('\n').filter((l) => l.length > 0);
    for (const line of lines) {
      if (part.added) flat.push({ text: line, type: 'added' });
      else if (part.removed) flat.push({ text: line, type: 'removed' });
      else flat.push({ text: line, type: 'context' });
    }
  }

  let added = 0;
  let removed = 0;
  for (const l of flat) {
    if (l.type === 'added') added++;
    if (l.type === 'removed') removed++;
  }

  // find indices of changed lines
  const changedIndices = flat
    .map((l, i) => (l.type !== 'context' ? i : -1))
    .filter((i) => i !== -1);

  if (changedIndices.length === 0) return { chunks: [], added, removed };

  // build windows around changed lines
  const included = new Set<number>();
  for (const idx of changedIndices) {
    for (let i = Math.max(0, idx - CONTEXT_LINES); i <= Math.min(flat.length - 1, idx + CONTEXT_LINES); i++) {
      included.add(i);
    }
  }

  const sortedIncluded = [...included].sort((a, b) => a - b);

  // group into contiguous chunks
  const chunks: DiffChunk[] = [];
  let current: DiffChunk | null = null;
  let prev = -2;

  for (const idx of sortedIncluded) {
    if (idx !== prev + 1) {
      if (current) chunks.push(current);
      current = { lines: [] };
    }
    current!.lines.push(flat[idx]);
    prev = idx;
  }
  if (current) chunks.push(current);

  return { chunks, added, removed };
};

export const BackupDiffView = ({ backupHtml, currentHtml }: Props) => {
  const { chunks, added, removed } = useMemo(
    () => buildChunks(backupHtml, currentHtml),
    [backupHtml, currentHtml],
  );

  const hasChanges = added > 0 || removed > 0;

  if (!hasChanges) {
    return (
      <p className="text-secondary italic text-center py-4 text-sm">
        Aucune différence avec la version actuelle.
      </p>
    );
  }

  return (
    <div className="text-xs font-mono leading-relaxed">
      <div className="flex gap-3 mb-3 text-secondary">
        <span className="text-green-400">+{added} ajout{added > 1 ? 's' : ''}</span>
        <span className="text-red-400">-{removed} suppression{removed > 1 ? 's' : ''}</span>
      </div>
      {chunks.map((chunk, ci) => (
        <div key={ci}>
          {ci > 0 && (
            <div className="text-secondary text-center py-1 select-none">···</div>
          )}
          <div className="rounded border border-primary/20 overflow-hidden">
            {chunk.lines.map((line, li) => {
              if (line.type === 'added') {
                return (
                  <div key={li} className="bg-green-500/10 border-l-2 border-green-500 px-2 py-0.5 text-green-300 whitespace-pre-wrap break-words">
                    +&nbsp;{line.text}
                  </div>
                );
              }
              if (line.type === 'removed') {
                return (
                  <div key={li} className="bg-red-500/10 border-l-2 border-red-500 px-2 py-0.5 text-red-400 whitespace-pre-wrap break-words line-through">
                    -&nbsp;{line.text}
                  </div>
                );
              }
              return (
                <div key={li} className="px-2 py-0.5 text-secondary whitespace-pre-wrap break-words border-l-2 border-transparent">
                  &nbsp;&nbsp;{line.text}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
