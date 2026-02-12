import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (differenceInDays(new Date(), date) > 30) {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}
