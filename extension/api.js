/* api.js — couche partagée popup + service worker.
 * Expose self.TracrAPI. Chargé via <script src> (popup) et importScripts (background).
 */
(function (root) {
  const DEFAULT_API_URL = 'http://localhost:8000';

  const store = {
    async get() {
      const d = await chrome.storage.local.get([
        'apiUrl', 'token', 'pseudo', 'lastInvestigationId', 'lastInvestigationTitle',
      ]);
      return {
        apiUrl: d.apiUrl || DEFAULT_API_URL,
        token: d.token || null,
        pseudo: d.pseudo || null,
        lastInvestigationId: d.lastInvestigationId || null,
        lastInvestigationTitle: d.lastInvestigationTitle || null,
      };
    },
    async set(obj) { await chrome.storage.local.set(obj); },
    async clearAuth() { await chrome.storage.local.remove(['token', 'pseudo']); },
  };

  async function parseError(response, fallback) {
    try {
      const data = await response.json();
      if (typeof data.detail === 'string') return data.detail;
    } catch (_) { /* ignore */ }
    return fallback;
  }

  async function login(apiUrl, pseudo, password) {
    const res = await fetch(`${apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, password }),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Identifiants invalides'));
    return res.json(); // { token, pseudo, ... }
  }

  async function listInvestigations(apiUrl, token) {
    const res = await fetch(`${apiUrl}/investigations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    if (!res.ok) throw new Error(await parseError(res, 'Erreur de chargement des enquêtes'));
    const data = await res.json();
    return data.investigations || [];
  }

  // opts: { investigationId, title, sourceUrl, sourceType, mime, blob,
  //         capturedAt, captureGroup?, pageMetadata? }
  async function uploadSource(apiUrl, token, opts) {
    const fd = new FormData();
    const ext = (opts.mime && opts.mime.split('/')[1]) || 'bin';
    fd.append('file', opts.blob, `${opts.title || 'capture'}.${ext}`);
    fd.append('title', opts.title);
    fd.append('source_url', opts.sourceUrl);
    fd.append('source_type', opts.sourceType);
    fd.append('captured_at', opts.capturedAt);
    if (opts.captureGroup) fd.append('capture_group', opts.captureGroup);
    if (opts.pageMetadata) fd.append('page_metadata', JSON.stringify(opts.pageMetadata));

    const res = await fetch(`${apiUrl}/investigations/${opts.investigationId}/sources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // pas de Content-Type : boundary auto
      body: fd,
    });
    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    if (!res.ok) throw new Error(await parseError(res, "Échec de l'envoi"));
    return res.json();
  }

  root.TracrAPI = { DEFAULT_API_URL, store, login, listInvestigations, uploadSource };
})(self);
