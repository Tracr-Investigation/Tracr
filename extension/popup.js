/* popup.js - extension UI: login, investigation selection, captures. */
const { store, login, loginMfa, listInvestigations, uploadSource } = self.TracrAPI;

const $ = (id) => document.getElementById(id);
const els = {
  loginView: $('loginView'), captureView: $('captureView'),
  apiUrl: $('apiUrl'), pseudo: $('pseudo'), password: $('password'),
  loginBtn: $('loginBtn'), loginError: $('loginError'), logoutBtn: $('logoutBtn'),
  mfaStep: $('mfaStep'), mfaCode: $('mfaCode'), mfaBtn: $('mfaBtn'), mfaCancel: $('mfaCancel'),
  whoPseudo: $('whoPseudo'), investigationSelect: $('investigationSelect'),
  titleInput: $('titleInput'), metaHost: $('metaHost'), metaTime: $('metaTime'),
  captureFull: $('captureFull'), captureVisible: $('captureVisible'),
  captureRegion: $('captureRegion'), captureMhtml: $('captureMhtml'),
  captureBoth: $('captureBoth'), captureHtml: $('captureHtml'),
  embedMedia: $('embedMedia'),
  captureStatus: $('captureStatus'),
};

let activeTab = null;
let cfg = null;
// Contexte de l'étape MFA en cours (entre /login et /login/mfa).
let pendingMfa = null; // { apiUrl, mfaToken }

/** Return the currently active tab in the current window. */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/** Extract the hostname from a URL, falling back to the raw string. */
function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url || ''; }
}

/** Convert a data: URL into a Blob. */
function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then((r) => r.blob());
}

/** Display a status message under the capture buttons (kind = ok|err|run). */
function setStatus(msg, kind) {
  els.captureStatus.textContent = msg;
  els.captureStatus.className = `status ${kind}`;
  els.captureStatus.classList.remove('hidden');
}

/** Toggle between the 'login' and 'capture' views. */
function show(view) {
  els.loginView.classList.toggle('hidden', view !== 'login');
  els.captureView.classList.toggle('hidden', view !== 'capture');
  els.logoutBtn.classList.toggle('hidden', view !== 'capture');
}

// ── Login ────────────────────────────────────────────────────────────────────

/** Show/hide the MFA step and toggle the initial credentials inputs accordingly. */
function showMfaStep(on) {
  els.mfaStep.classList.toggle('hidden', !on);
  els.loginBtn.classList.toggle('hidden', on);
  els.pseudo.disabled = on;
  els.password.disabled = on;
  els.apiUrl.disabled = on;
  if (on) { els.mfaCode.value = ''; els.mfaCode.focus(); }
}

/** Persist the full token then switch to capture mode. */
async function finishLogin(apiUrl, data) {
  await store.set({ apiUrl, token: data.token, pseudo: data.pseudo });
  cfg = await store.get();
  pendingMfa = null;
  showMfaStep(false);
  await enterCaptureMode();
}

/** Submit credentials; either finish login or move to the MFA step. */
async function handleLogin() {
  els.loginError.classList.add('hidden');
  const apiUrl = els.apiUrl.value.trim().replace(/\/$/, '') || self.TracrAPI.DEFAULT_API_URL;
  const pseudo = els.pseudo.value.trim();
  const password = els.password.value;
  if (!pseudo || !password) return;

  els.loginBtn.disabled = true;
  els.loginBtn.textContent = 'Connexion…';
  try {
    const data = await login(apiUrl, pseudo, password);
    if (data.mfa_required) {
      // Compte protégé par double authentification : on demande le code TOTP.
      pendingMfa = { apiUrl, mfaToken: data.mfa_token };
      showMfaStep(true);
      return;
    }
    await finishLogin(apiUrl, data);
  } catch (err) {
    els.loginError.textContent = err.message || 'Échec de la connexion';
    els.loginError.classList.remove('hidden');
  } finally {
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = 'Se connecter';
  }
}

/** Submit the TOTP/backup code to complete an MFA-protected login. */
async function handleMfaSubmit() {
  els.loginError.classList.add('hidden');
  const code = els.mfaCode.value.trim();
  if (!pendingMfa || code.length < 6) return;

  els.mfaBtn.disabled = true;
  els.mfaBtn.textContent = 'Vérification…';
  try {
    const data = await loginMfa(pendingMfa.apiUrl, pendingMfa.mfaToken, code);
    await finishLogin(pendingMfa.apiUrl, data);
  } catch (err) {
    els.loginError.textContent = err.message || 'Code de vérification invalide';
    els.loginError.classList.remove('hidden');
    els.mfaCode.value = '';
    els.mfaCode.focus();
  } finally {
    els.mfaBtn.disabled = false;
    els.mfaBtn.textContent = 'Vérifier le code';
  }
}

/** Abort the MFA step and return to the credentials form. */
function handleMfaCancel() {
  pendingMfa = null;
  els.loginError.classList.add('hidden');
  showMfaStep(false);
  els.password.value = '';
  els.password.focus();
}

/** Clear stored auth and return to the login view. */
async function handleLogout() {
  await store.clearAuth();
  cfg = await store.get();
  pendingMfa = null;
  showMfaStep(false);
  show('login');
}

// ── Capture mode ─────────────────────────────────────────────────────────────

/** Populate the capture view (pseudo, title, metadata) and load investigations. */
async function enterCaptureMode() {
  els.whoPseudo.textContent = cfg.pseudo || '-';
  els.titleInput.value = activeTab?.title || 'Capture';
  els.metaHost.textContent = hostOf(activeTab?.url);
  els.metaTime.textContent = new Date().toLocaleTimeString('fr-FR');
  show('capture');
  await loadInvestigations();
}

/** Fill the investigation <select>, restoring the last chosen one. */
async function loadInvestigations() {
  els.investigationSelect.innerHTML = '<option>Chargement…</option>';
  try {
    const list = await listInvestigations(cfg.apiUrl, cfg.token);
    if (!list.length) {
      els.investigationSelect.innerHTML = '<option value="">Aucune enquête</option>';
      return;
    }
    els.investigationSelect.innerHTML = list
      .map((i) => `<option value="${i.id_investigation}">${escapeHtml(i.title)}</option>`)
      .join('');
    if (cfg.lastInvestigationId) {
      els.investigationSelect.value = String(cfg.lastInvestigationId);
    }
  } catch (err) {
    if (err.message === 'SESSION_EXPIRED') return handleSessionExpired();
    els.investigationSelect.innerHTML = '<option value="">Erreur</option>';
    setStatus(err.message, 'err');
  }
}

/** Clear auth and bounce back to login with an "expired session" message. */
async function handleSessionExpired() {
  await store.clearAuth();
  cfg = await store.get();
  show('login');
  els.loginError.textContent = 'Session expirée, reconnectez-vous.';
  els.loginError.classList.remove('hidden');
}

/** Escape a string for safe insertion into HTML. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Return {id, title} of the selected investigation, or null if none. */
function currentInvestigation() {
  const id = parseInt(els.investigationSelect.value, 10);
  const title = els.investigationSelect.selectedOptions[0]?.textContent || '';
  return Number.isNaN(id) ? null : { id, title };
}

/** Collect metadata about the active tab (title, viewport, user agent). */
function pageMetadata() {
  return {
    page_title: activeTab?.title || null,
    viewport: { w: activeTab?.width || null, h: activeTab?.height || null },
    user_agent: navigator.userAgent,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Limite de hauteur (px appareil) pour rester sous les limites du canvas.
const MAX_DEVICE_HEIGHT = 16000;

// Archive HTML hybride : images <= ce seuil inlinées en data: URI (1 fichier,
// robuste) ; au-dela (et toute video/audio) stockées en source compagnon liee
// par capture_group et referencee via une URL signee.
const IMG_INLINE_MAX = 2 * 1024 * 1024; // 2 Mo
const MEDIA_FETCH_TIMEOUT = 20000; // ms par media
// Marqueur ecrit dans le HTML pour un media compagnon ; le viewer le reecrit en
// URL d'API reelle au moment de l'affichage (decouple l'URL d'API de capture).
const MEDIA_PLACEHOLDER_PREFIX = 'tracr-media:'; // tracr-media:<id_source>:<view_sig>

/** Derive a media file name from a URL path, falling back to 'media'. */
function mediaBasename(url) {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.substring(path.lastIndexOf('/') + 1)) || 'media';
  } catch { return 'media'; }
}

/** Read a Blob as a data: URL. */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Fetch a media URL as a Blob, aborting after MEDIA_FETCH_TIMEOUT. */
async function fetchMediaBlob(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), MEDIA_FETCH_TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.blob();
  } finally {
    clearTimeout(t);
  }
}

/** Pick the best srcset candidate (largest `w` width, else the last/highest-res). */
function pickFromSrcset(srcset) {
  let best = null, bestW = -1;
  for (const part of srcset.split(',')) {
    const [u, d] = part.trim().split(/\s+/);
    if (!u) continue;
    const w = d && d.endsWith('w') ? parseInt(d, 10) : 0;
    if (w >= bestW) { bestW = w; best = u; }
  }
  return best;
}

// Toutes les facons de referencer une image de fond en CSS : on capture l'URL.
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

/** Embed a page's media into its HTML: inline small images as data: URIs, upload the
 * rest as companion sources (placeholders). @returns {Promise<{html, stats}>} */
async function embedPageMedia(html, ctx) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const stats = { inlined: 0, companion: 0, failed: 0 };
  const base = ctx.sourceUrl || undefined;
  const abs = (u) => { try { return new URL(u, base).href; } catch { return u; } };

  // Resolveur a cache : une URL n'est telechargee/uploadee qu'une fois, quel que
  // soit le nombre d'elements ou de regles CSS qui la referencent. Retourne le
  // remplacement (data: URI ou placeholder) ou null si echec.
  const cache = new Map();
  async function resolve(rawUrl) {
    const url = abs(rawUrl);
    if (!/^https?:/i.test(url)) return null; // data:/blob:/non resoluble
    if (cache.has(url)) return cache.get(url);
    let repl = null;
    try {
      const blob = await fetchMediaBlob(url);
      const mime = blob.type || 'application/octet-stream';
      if (mime.startsWith('image/') && blob.size <= IMG_INLINE_MAX) {
        repl = await blobToDataUrl(blob);
        stats.inlined += 1;
      } else {
        const res = await uploadSource(cfg.apiUrl, cfg.token, {
          investigationId: ctx.investigationId,
          title: mediaBasename(url),
          sourceUrl: ctx.sourceUrl || url,
          sourceType: 'media',
          mime,
          blob,
          capturedAt: ctx.capturedAt,
          captureGroup: ctx.captureGroup,
          role: 'page_media',
          pageMetadata: { role: 'page_media', media_url: url, page_url: ctx.sourceUrl || null },
        });
        repl = `${MEDIA_PLACEHOLDER_PREFIX}${res.id_source}:${res.view_sig}`;
        stats.companion += 1;
      }
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') throw err;
      stats.failed += 1; // injoignable / upload raté : on garde l'URL d'origine
    }
    cache.set(url, repl);
    return repl;
  }

  // 1) Normalise <img> (lazy-load + srcset) en un seul `src` exploitable hors-ligne.
  doc.querySelectorAll('img').forEach((im) => {
    if (!im.getAttribute('src')) {
      const lazy = im.getAttribute('data-src') || im.getAttribute('data-original')
        || im.getAttribute('data-lazy-src') || im.getAttribute('data-lazy');
      if (lazy) im.setAttribute('src', abs(lazy));
    }
    if (!im.getAttribute('src')) {
      const ss = im.getAttribute('srcset') || im.getAttribute('data-srcset');
      const pick = ss && pickFromSrcset(ss);
      if (pick) im.setAttribute('src', abs(pick));
    }
    im.removeAttribute('srcset');
    im.removeAttribute('sizes');
    im.removeAttribute('loading');
  });
  doc.querySelectorAll('picture source').forEach((s) => s.remove()); // art-direction externe

  // 2) Elements media : (element, attribut, url). Toutes ces URLs sont a embarquer.
  const elementOps = [];
  const pushEl = (el, attr) => {
    const u = el.getAttribute(attr);
    if (u && !u.startsWith('data:')) elementOps.push({ el, attr, url: u });
  };
  doc.querySelectorAll('img[src]').forEach((el) => pushEl(el, 'src'));
  doc.querySelectorAll('video[poster]').forEach((el) => pushEl(el, 'poster'));
  doc.querySelectorAll('video[src], audio[src]').forEach((el) => pushEl(el, 'src'));
  doc.querySelectorAll('video source[src], audio source[src]').forEach((el) => pushEl(el, 'src'));

  for (const op of elementOps) {
    const repl = await resolve(op.url);
    if (repl) op.el.setAttribute(op.attr, repl);
  }

  // 3) Fonds CSS : attributs style="...url()..." + contenu des <style>. On reecrit
  //    chaque url() par son data: URI / placeholder (resolu via le meme cache).
  const rewriteCssUrls = async (css) => {
    const urls = new Set();
    let m;
    CSS_URL_RE.lastIndex = 0;
    while ((m = CSS_URL_RE.exec(css)) !== null) {
      if (!m[2].startsWith('data:')) urls.add(m[2]);
    }
    const map = new Map();
    for (const u of urls) {
      const repl = await resolve(u);
      if (repl) map.set(u, repl);
    }
    if (!map.size) return css;
    return css.replace(CSS_URL_RE, (full, q, u) => (map.has(u) ? `url("${map.get(u)}")` : full));
  };

  for (const styled of doc.querySelectorAll('[style*="url("]')) {
    styled.setAttribute('style', await rewriteCssUrls(styled.getAttribute('style')));
  }
  for (const styleEl of doc.querySelectorAll('style')) {
    if (styleEl.textContent.includes('url(')) {
      styleEl.textContent = await rewriteCssUrls(styleEl.textContent);
    }
  }

  return { html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML, stats };
}

/** Load a data: URL into an HTMLImageElement. */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Capture the FULL page by scrolling and stitching screenshots onto a canvas. */
async function captureFullPage(captureGroup) {
  const [{ result: m }] = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: () => {
      const e = document.documentElement, b = document.body;
      return {
        scrollWidth: Math.max(b.scrollWidth, e.scrollWidth, e.clientWidth),
        scrollHeight: Math.max(b.scrollHeight, e.scrollHeight, e.clientHeight),
        clientHeight: e.clientHeight,
        dpr: window.devicePixelRatio || 1,
        originalScrollY: window.scrollY,
      };
    },
  });

  const dpr = m.dpr;
  const maxCssHeight = Math.floor(MAX_DEVICE_HEIGHT / dpr);
  const totalHeight = Math.min(m.scrollHeight, maxCssHeight);
  const step = m.clientHeight;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let canvasReady = false;

  try {
    for (let y = 0; y < totalHeight; y += step) {
      // Défile et récupère la position réelle (peut être bridée en bas de page)
      const [{ result: actualY }] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (yy) => { window.scrollTo(0, yy); return window.scrollY; },
        args: [y],
      });
      await sleep(550); // rendu + quota captureVisibleTab (~2/s)

      const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' });
      const img = await loadImage(dataUrl);

      if (!canvasReady) {
        canvas.width = img.width;
        canvas.height = Math.min(Math.round(totalHeight * dpr), MAX_DEVICE_HEIGHT);
        canvasReady = true;
      }
      ctx.drawImage(img, 0, Math.round(actualY * dpr));
    }
  } finally {
    // Restaure la position d'origine
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (yy) => window.scrollTo(0, yy),
      args: [m.originalScrollY],
    }).catch(() => {});
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return { blob, sourceType: 'page_screenshot', mime: 'image/png', captureGroup };
}

/** Capture only the visible area (fast, no scrolling). */
async function doVisibleScreenshot(captureGroup) {
  const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' });
  const blob = await dataUrlToBlob(dataUrl);
  return { blob, sourceType: 'page_screenshot', mime: 'image/png', captureGroup };
}

/** Start region selection: stash the pending capture, inject region.js, close the popup. */
async function startRegionSelection() {
  const inv = currentInvestigation();
  if (!inv) { setStatus('Sélectionnez une enquête', 'err'); return; }
  const title = els.titleInput.value.trim() || 'Sélection';
  await chrome.storage.local.set({
    pendingCapture: {
      investigationId: inv.id, investigationTitle: inv.title, title,
      sourceUrl: activeTab?.url || '', pageTitle: activeTab?.title || null,
    },
  });
  try {
    await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['region.js'] });
    window.close(); // l'overlay de sélection prend le relais dans la page
  } catch (_) {
    setStatus('Sélection impossible sur cette page', 'err');
  }
}

/** Inline ONLY what saveAsMHTML misses (adoptedStyleSheets + <style> filled by JS via
 * insertRule). Plain <style>/<link> are already captured by MHTML, so they are left
 * untouched: fast, single pass, no network fetch. */
async function inlineMissingCss() {
  await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: () => {
      const MARK = 'data-tracr-inlined';
      const head = document.head || document.documentElement;
      const add = (css) => {
        if (!css || !css.trim()) return;
        const el = document.createElement('style');
        el.setAttribute(MARK, '1');
        el.textContent = css;
        head.appendChild(el);
      };
      const serialize = (sheet) => {
        let c = '';
        try { for (const r of sheet.cssRules) c += r.cssText + '\n'; } catch (e) { /* cross-origin: déjà géré par MHTML */ }
        return c;
      };
      // 1) Feuilles « constructables » (adoptedStyleSheets) : aucun nœud DOM.
      try { for (const s of (document.adoptedStyleSheets || [])) add(serialize(s)); } catch (e) { /* ignore */ }
      // 2) <style> remplis par CSSOM (insertRule) : texte vide mais règles présentes.
      for (const s of document.styleSheets) {
        const node = s.ownerNode;
        if (!node || node.tagName !== 'STYLE') continue;
        let hasText = false, ruleCount = 0;
        try { hasText = !!node.textContent.trim(); } catch (e) { /* ignore */ }
        try { ruleCount = s.cssRules.length; } catch (e) { /* ignore */ }
        if (!hasText && ruleCount) add(serialize(s));
      }
    },
  });
}

/** Remove the <style> elements injected by inlineMissingCss. */
async function cleanupInlinedCss() {
  await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: () => document.querySelectorAll('style[data-tracr-inlined]').forEach((n) => n.remove()),
  }).catch(() => {});
}

/** Rewrite relative url(...) references in a stylesheet to absolute URLs. */
function absolutizeCss(cssText, baseUrl) {
  return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
    if (/^(data:|https?:|\/\/|#)/i.test(u)) return m;
    try { return `url("${new URL(u, baseUrl).href}")`; } catch { return m; }
  });
}

/** Self-contained ("SingleFile-style") capture: one HTML file with all CSS inlined and
 * URLs absolutized, so it renders directly in an iframe without a replay engine.
 * Cross-origin CSS is fetched from the extension side (host perms). */
async function doSelfContainedHtml(captureGroup, ctx) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: () => {
      const baseHref = document.baseURI;
      const abs = (u) => { try { return new URL(u, baseHref).href; } catch { return u; } };

      // 1) Consolide tout le CSS appliqué (CSSOM same-origin + adoptedStyleSheets).
      const crossOrigin = [];
      let css = '';
      for (const s of document.styleSheets) {
        try { for (const r of s.cssRules) css += r.cssText + '\n'; }
        catch (e) { if (s.href) crossOrigin.push(s.href); }
      }
      try { for (const s of (document.adoptedStyleSheets || [])) for (const r of s.cssRules) css += r.cssText + '\n'; }
      catch (e) { /* ignore */ }

      // 2) Clone le DOM (état post-JS), retire scripts + styles d'origine.
      const docEl = document.documentElement.cloneNode(true);
      docEl.querySelectorAll('script, link[rel~="stylesheet" i], style, link[rel~="preload" i], link[rel~="modulepreload" i]')
        .forEach((n) => n.remove());

      let head = docEl.querySelector('head');
      if (!head) { head = document.createElement('head'); docEl.insertBefore(head, docEl.firstChild); }
      const base = document.createElement('base');
      base.setAttribute('href', baseHref);
      head.insertBefore(base, head.firstChild);
      const styleEl = document.createElement('style');
      styleEl.textContent = css;
      head.appendChild(styleEl);

      // 3) Absolutise images / srcset / liens.
      const absSrcset = (ss) => ss.split(',').map((p) => {
        const [u, d] = p.trim().split(/\s+/);
        return abs(u) + (d ? ' ' + d : '');
      }).join(', ');
      docEl.querySelectorAll('img').forEach((im) => {
        const s = im.getAttribute('src'); if (s) im.setAttribute('src', abs(s));
        const ss = im.getAttribute('srcset'); if (ss) im.setAttribute('srcset', absSrcset(ss));
        im.removeAttribute('loading');
      });
      docEl.querySelectorAll('source[srcset]').forEach((so) => so.setAttribute('srcset', absSrcset(so.getAttribute('srcset'))));
      // Medias temporels : on absolutise pour qu'embedPageMedia puisse les telecharger.
      docEl.querySelectorAll('video[poster]').forEach((v) => {
        const p = v.getAttribute('poster'); if (p) v.setAttribute('poster', abs(p));
      });
      docEl.querySelectorAll('video[src], audio[src], video source[src], audio source[src]').forEach((m) => {
        const s = m.getAttribute('src'); if (s) m.setAttribute('src', abs(s));
      });
      docEl.querySelectorAll('a[href]').forEach((a) => {
        const h = a.getAttribute('href');
        if (h && !h.startsWith('#')) a.setAttribute('href', abs(h));
        a.setAttribute('target', '_blank');
      });

      return { html: '<!DOCTYPE html>\n' + docEl.outerHTML, crossOrigin, pageUrl: location.href };
    },
  });

  // CSS cross-origin : récupéré côté extension puis injecté avant </head>.
  let extra = '';
  for (const href of (result.crossOrigin || [])) {
    try {
      const r = await fetch(href);
      if (r.ok) extra += `\n/* ${href} */\n` + absolutizeCss(await r.text(), href);
    } catch (_) { /* ignore */ }
  }
  let html = result.html;
  if (extra) html = html.replace(/<\/head>/i, `<style>${extra}</style></head>`);

  // Si l'option est decochee, les medias restent en lien externe.
  let stats = null;
  if (ctx.embedMedia) {
    ({ html, stats } = await embedPageMedia(html, { ...ctx, captureGroup }));
  }

  const blob = new Blob([html], { type: 'text/html' });
  return { blob, sourceType: 'web_archive', mime: 'text/html', captureGroup, mediaStats: stats };
}

/** Capture the page as MHTML (after inlining CSS that MHTML would miss). */
async function doMhtml(captureGroup) {
  let inlined = false;
  try { await inlineMissingCss(); inlined = true; } catch (_) { /* pages protégées */ }
  try {
    const blob = await chrome.pageCapture.saveAsMHTML({ tabId: activeTab.id });
    return { blob, sourceType: 'page_mhtml', mime: 'multipart/related', captureGroup };
  } finally {
    if (inlined) await cleanupInlinedCss();
  }
}

/** Run one or more capture kinds and upload each as a source to the selected investigation. */
async function runCapture(kinds) {
  const inv = currentInvestigation();
  if (!inv) { setStatus('Sélectionnez une enquête', 'err'); return; }
  const title = els.titleInput.value.trim() || 'Capture';
  const sourceUrl = activeTab?.url || '';
  const capturedAt = new Date().toISOString();
  const embedMedia = els.embedMedia.checked;
  // Un groupe est requis si plusieurs captures, ou si l'archive HTML embarque des
  // medias compagnons a rattacher.
  const needsGroup = kinds.length > 1 || (kinds.includes('html') && embedMedia);
  const captureGroup = needsGroup ? crypto.randomUUID() : null;

  const KIND_LABEL = { full: 'capture', visible: 'capture', mhtml: 'MHTML', html: 'page' };

  setBusy(true);
  setStatus(kinds.includes('full') ? 'Capture de la page entière…' : 'Capture en cours…', 'run');
  try {
    for (const kind of kinds) {
      let part;
      if (kind === 'full') part = await captureFullPage(captureGroup);
      else if (kind === 'visible') part = await doVisibleScreenshot(captureGroup);
      else if (kind === 'html') part = await doSelfContainedHtml(captureGroup, { investigationId: inv.id, sourceUrl, capturedAt, embedMedia });
      else part = await doMhtml(captureGroup);
      const meta = pageMetadata();
      if (part.mediaStats) meta.media = part.mediaStats;
      await uploadSource(cfg.apiUrl, cfg.token, {
        investigationId: inv.id,
        title: kinds.length > 1 ? `${title} (${KIND_LABEL[kind]})` : title,
        sourceUrl,
        sourceType: part.sourceType,
        mime: part.mime,
        blob: part.blob,
        capturedAt,
        captureGroup: part.captureGroup,
        pageMetadata: meta,
      });
    }
    await store.set({ lastInvestigationId: inv.id, lastInvestigationTitle: inv.title });
    setStatus(`✓ Envoyé vers « ${inv.title} »`, 'ok');
  } catch (err) {
    if (err.message === 'SESSION_EXPIRED') return handleSessionExpired();
    setStatus(err.message || 'Échec', 'err');
  } finally {
    setBusy(false);
  }
}

/** Enable/disable the capture buttons while a capture is running. */
function setBusy(b) {
  els.captureFull.disabled = b;
  els.captureVisible.disabled = b;
  els.captureRegion.disabled = b;
  els.captureMhtml.disabled = b;
  els.captureBoth.disabled = b;
  els.captureHtml.disabled = b;
}

// ── Init ─────────────────────────────────────────────────────────────────────

/** Wire up DOM event listeners and show the initial view based on stored auth. */
async function init() {
  cfg = await store.get();
  activeTab = await getActiveTab();
  els.apiUrl.value = cfg.apiUrl;

  els.loginBtn.addEventListener('click', handleLogin);
  els.password.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
  els.mfaBtn.addEventListener('click', handleMfaSubmit);
  els.mfaCode.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleMfaSubmit(); });
  els.mfaCancel.addEventListener('click', handleMfaCancel);
  els.logoutBtn.addEventListener('click', handleLogout);
  els.investigationSelect.addEventListener('change', () => {
    const inv = currentInvestigation();
    if (inv) store.set({ lastInvestigationId: inv.id, lastInvestigationTitle: inv.title });
  });
  els.captureFull.addEventListener('click', () => runCapture(['full']));
  els.captureVisible.addEventListener('click', () => runCapture(['visible']));
  els.captureRegion.addEventListener('click', startRegionSelection);
  els.captureMhtml.addEventListener('click', () => runCapture(['mhtml']));
  els.captureBoth.addEventListener('click', () => runCapture(['full', 'mhtml']));
  els.captureHtml.addEventListener('click', () => runCapture(['html']));

  if (cfg.token) await enterCaptureMode();
  else show('login');
}

init();
