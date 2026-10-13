// Les URLs ne portent que des UUID opaques : ni titre d'enquete, ni identifiant sequentiel.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): value is string {
  return !!value && UUID_PATTERN.test(value);
}

export function investigationPath(investigationId: string): string {
  return `/investigations/${investigationId}`;
}

export function documentPath(investigationId: string, documentId: string): string {
  return `${investigationPath(investigationId)}/documents/${documentId}`;
}
