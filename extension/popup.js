/* popup.js - UI de l'extension : connexion, sélection d'enquête, captures. */
const { store, login, listInvestigations, uploadSource } = self.TracrAPI;

const $ = (id) => document.getElementById(id);
const els = {
  loginView: $('loginView'), captureView: $('captureView'),
  apiUrl: $('apiUrl'), pseudo: $('pseudo'), password: $('password'),
  loginBtn: $('loginBtn'), loginError: $('loginError'), logoutBtn: $('logoutBtn'),
  whoPseudo: $('whoPseudo'), investigationSelect: $('investigationSelect'),
  titleInput: $('titleInput'), metaHost: $('metaHost'), metaTime: $('metaTime'),
  captureFull: $('captureFull'), captureVisible: $('captureVisible'),
  captureRegion: $('captureRegion'), captureMhtml: $('captureMhtml'),
  captureBoth: $('captureBoth'), captureHtml: $('captureHtml'),
  captureStatus: $('captureStatus'),
};

let activeTab = null;
let cfg = null;

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url || ''; }
}

function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then((r) => r.blob());
}

function setStatus(msg, kind) {
  els.captureStatus.textContent = msg;
  els.captureStatus.className = `status ${kind}`;
  els.captureStatus.classList.remove('hidden');
}

function show(view) {
  els.loginView.classList.toggle('hidden', view !== 'login');
  els.captureView.classList.toggle('hidden', view !== 'capture');
  els.logoutBtn.classList.toggle('hidden', view !== 'capture');
}

// ── Connexion ────────────────────────────────────────────────────────────────

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
    await store.set({ apiUrl, token: data.token, pseudo: data.pseudo });
    cfg = await store.get();
    await enterCaptureMode();
  } catch (err) {
    els.loginError.textContent = err.message || 'Échec de la connexion';
    els.loginError.classList.remove('hidden');
  } finally {
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = 'Se connecter';
  }
}

async function handleLogout() {
  await store.clearAuth();
  cfg = await store.get();
  show('login');
}

// ── Mode capture ─────────────────────────────────────────────────────────────

async function enterCaptureMode() {
  els.whoPseudo.textContent = cfg.pseudo || '-';
  els.titleInput.value = activeTab?.title || 'Capture';
  els.metaHost.textContent = hostOf(activeTab?.url);
  els.metaTime.textContent = new Date().toLocaleTimeString('fr-FR');
  show('capture');
  await loadInvestigations();
}

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

async function handleSessionExpired() {
  await store.clearAuth();
  cfg = await store.get();
  show('login');
  els.loginError.textContent = 'Session expirée, reconnectez-vous.';
  els.loginError.classList.remove('hidden');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function currentInvestigation() {
  const id = parseInt(els.investigationSelect.value, 10);
  const title = els.investigationSelect.selectedOptions[0]?.textContent || '';
  return Number.isNaN(id) ? null : { id, title };
}

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

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Capture la page ENTIÈRE par défilement + assemblage sur un canvas.
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

// Capture de la zone visible uniquement (rapide, pas de défilement).
async function doVisibleScreenshot(captureGroup) {
  const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' });
  const blob = await dataUrlToBlob(dataUrl);
  return { blob, sourceType: 'page_screenshot', mime: 'image/png', captureGroup };
}

// Sélection d'une zone : délègue au content script + service worker (le popup
// doit se fermer pour laisser l'utilisateur interagir avec la page).
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

// Inline UNIQUEMENT ce que saveAsMHTML rate (adoptedStyleSheets + <style> remplis
// par JS via insertRule). Les <style>/<link> classiques sont déjà capturés par le
// MHTML : on ne les retouche pas → rapide, un seul passage, aucun fetch réseau.
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

async function cleanupInlinedCss() {
  await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: () => document.querySelectorAll('style[data-tracr-inlined]').forEach((n) => n.remove()),
  }).catch(() => {});
}

// Réécrit les url(...) relatives d'une feuille CSS en URL absolues.
function absolutizeCss(cssText, baseUrl) {
  return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
    if (/^(data:|https?:|\/\/|#)/i.test(u)) return m;
    try { return `url("${new URL(u, baseUrl).href}")`; } catch { return m; }
  });
}

// Capture « page autonome » (SingleFile-style) : un seul fichier HTML avec tout le
// CSS inliné, les URLs absolutisées → s'affiche directement dans une iframe, sans
// moteur de rejeu. Le CSS cross-origin est récupéré côté extension (host perms).
async function doSelfContainedHtml(captureGroup) {
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

  const blob = new Blob([html], { type: 'text/html' });
  return { blob, sourceType: 'web_archive', mime: 'text/html', captureGroup };
}

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

async function runCapture(kinds) {
  const inv = currentInvestigation();
  if (!inv) { setStatus('Sélectionnez une enquête', 'err'); return; }
  const title = els.titleInput.value.trim() || 'Capture';
  const sourceUrl = activeTab?.url || '';
  const capturedAt = new Date().toISOString();
  const captureGroup = kinds.length > 1 ? crypto.randomUUID() : null;

  const KIND_LABEL = { full: 'capture', visible: 'capture', mhtml: 'MHTML', html: 'page' };

  setBusy(true);
  setStatus(kinds.includes('full') ? 'Capture de la page entière…' : 'Capture en cours…', 'run');
  try {
    for (const kind of kinds) {
      let part;
      if (kind === 'full') part = await captureFullPage(captureGroup);
      else if (kind === 'visible') part = await doVisibleScreenshot(captureGroup);
      else if (kind === 'html') part = await doSelfContainedHtml(captureGroup);
      else part = await doMhtml(captureGroup);
      await uploadSource(cfg.apiUrl, cfg.token, {
        investigationId: inv.id,
        title: kinds.length > 1 ? `${title} (${KIND_LABEL[kind]})` : title,
        sourceUrl,
        sourceType: part.sourceType,
        mime: part.mime,
        blob: part.blob,
        capturedAt,
        captureGroup: part.captureGroup,
        pageMetadata: pageMetadata(),
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

function setBusy(b) {
  els.captureFull.disabled = b;
  els.captureVisible.disabled = b;
  els.captureRegion.disabled = b;
  els.captureMhtml.disabled = b;
  els.captureBoth.disabled = b;
  els.captureHtml.disabled = b;
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  cfg = await store.get();
  activeTab = await getActiveTab();
  els.apiUrl.value = cfg.apiUrl;

  els.loginBtn.addEventListener('click', handleLogin);
  els.password.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
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
