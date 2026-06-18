import React, { useEffect } from 'react';

function getRole(): string | null {
  const match = document.cookie.match(/(?:^|; )tracr_role=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function Root({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const role = getRole();
    const isAdmin = role === 'admin' || role === 'super-admin';

    document.documentElement.classList.toggle('tracr-admin', isAdmin);
    document.documentElement.classList.toggle('tracr-user', !isAdmin);

    if (!isAdmin && /\/administration(\/|$)/.test(window.location.pathname)) {
      window.location.replace(window.location.pathname.replace(/\/administration.*$/, '/'));
    }
  }, []);

  return <>{children}</>;
}
