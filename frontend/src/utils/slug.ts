export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function toInvestigationSlug(title: string, id: number): string {
  return `${slugify(title)}-${id}`;
}

export function extractIdFromSlug(slug: string): number | null {
  const match = slug.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
