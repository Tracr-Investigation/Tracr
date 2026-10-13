// Affichage des logs : les UUID stockes dans le texte ("Investigation #<uuid>") sont masques,
// seul le libelle lisible est montre. Le log en base reste intact.

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

// "(Investigation #<uuid>)", "(tâche #<uuid>)" : la parenthese entiere disparait
const PARENTHESIZED_REF = new RegExp(`\\s*\\([^()#]*#${UUID}\\)`, 'gi');
// " #<uuid>" accole a un libelle
const HASH_REF = new RegExp(`\\s*#${UUID}`, 'gi');
// UUID isole restant
const BARE_UUID = new RegExp(UUID, 'gi');

export function formatLogDetail(detail: string): string {
  return detail
    .replace(PARENTHESIZED_REF, '')
    .replace(HASH_REF, '')
    .replace(BARE_UUID, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
