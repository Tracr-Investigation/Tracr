import { useEffect } from 'react';

const BASE_TITLE = 'Tracr';

/**
 * Met à jour le titre de l'onglet du navigateur au format « Tracr - <page> ».
 * Passer une valeur vide/null laisse le titre de base « Tracr » (utile tant que
 * la donnée dynamique d'une page n'est pas encore chargée).
 */
export function usePageTitle(title?: string | null) {
    useEffect(() => {
        document.title = title ? `${BASE_TITLE} - ${title}` : BASE_TITLE;
        return () => {
            document.title = BASE_TITLE;
        };
    }, [title]);
}
