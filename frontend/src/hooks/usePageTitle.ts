import { useEffect } from 'react';

const BASE_TITLE = 'Tracr';

// Set the browser tab title as "Tracr - <page>"; an empty/null value keeps the
// base "Tracr" title (useful while a page's dynamic data is still loading).
export function usePageTitle(title?: string | null) {
    useEffect(() => {
        document.title = title ? `${BASE_TITLE} - ${title}` : BASE_TITLE;
        return () => {
            document.title = BASE_TITLE;
        };
    }, [title]);
}
