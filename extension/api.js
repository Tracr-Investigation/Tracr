/* api.js - shared layer for popup + service worker.
 * Exposes self.TracrAPI. Loaded via <script src> (popup) and importScripts (background).
 */
(function (root) {
  const DEFAULT_API_URL = 'http://localhost:8000';

  // Thin wrapper over chrome.storage.local for config + auth state.
  const store = {
    /** Read config + auth from chrome.storage.local, applying defaults. @returns {Promise<object>} */
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
    /** Persist the given keys to chrome.storage.local. */
    async set(obj) { await chrome.storage.local.set(obj); },
    /** Drop the stored token + pseudo (logout). */
    async clearAuth() { await chrome.storage.local.remove(['token', 'pseudo']); },
  };

  /** Extract the API error message (detail) from a response, or return the fallback. */
  async function parseError(response, fallback) {
    try {
      const data = await response.json();
      if (typeof data.detail === 'string') return data.detail;
    } catch (_) { /* ignore */ }
    return fallback;
  }

  /** Authenticate; returns {token, pseudo, ...} or {mfa_required, mfa_token} if MFA is on. */
  async function login(apiUrl, pseudo, password) {
    const res = await fetch(`${apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, password }),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Identifiants invalides'));
    // { token, pseudo, ... } OU, si MFA actif, { mfa_required: true, mfa_token }
    return res.json();
  }

  /** MFA 2nd step: exchange mfa_token + TOTP (or backup) code for the full access token. */
  async function loginMfa(apiUrl, mfaToken, code) {
    const res = await fetch(`${apiUrl}/login/mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Code de vérification invalide'));
    return res.json(); // { token, pseudo, ... }
  }

  /** List the user's investigations; throws 'SESSION_EXPIRED' on 401. @returns {Promise<Array>} */
  async function listInvestigations(apiUrl, token) {
    const res = await fetch(`${apiUrl}/investigations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    if (!res.ok) throw new Error(await parseError(res, 'Erreur de chargement des enquêtes'));
    const data = await res.json();
    return data.investigations || [];
  }

  /** Upload a captured source (multipart) to an investigation; throws 'SESSION_EXPIRED' on 401.
   * @param {object} opts { investigationId, title, sourceUrl, sourceType, mime, blob,
   *                         capturedAt, captureGroup?, role?, pageMetadata? } */
  async function uploadSource(apiUrl, token, opts) {
    const fd = new FormData();
    const ext = (opts.mime && opts.mime.split('/')[1]) || 'bin';
    fd.append('file', opts.blob, `${opts.title || 'capture'}.${ext}`);
    fd.append('title', opts.title);
    fd.append('source_url', opts.sourceUrl);
    fd.append('source_type', opts.sourceType);
    fd.append('captured_at', opts.capturedAt);
    if (opts.captureGroup) fd.append('capture_group', opts.captureGroup);
    if (opts.role) fd.append('role', opts.role);
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

  root.TracrAPI = { DEFAULT_API_URL, store, login, loginMfa, listInvestigations, uploadSource };
})(self);
