/* background.js - MV3 service worker.
 * "Tracr: archive this media" context menu on images and videos.
 * Uses the last investigation selected in the popup.
 */
importScripts('api.js');
const { store, uploadSource } = self.TracrAPI;

const MENU_ID = 'tracr-archive-media';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Tracr : archiver ce média',
    contexts: ['image', 'video', 'audio'],
  });
});

/** Show a colored badge on the toolbar icon for 4s (transient status feedback). */
function flashBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
}

/** Show a desktop notification (best-effort; swallows errors). */
function notify(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#0a0a0b"/><text x="32" y="44" font-size="40" text-anchor="middle" fill="#f59e0b">◆</text></svg>'),
      title,
      message,
    }, () => void chrome.runtime.lastError); // avale l'erreur si iconUrl refusée
  } catch (_) { /* ignore */ }
}

/** Derive a file name from a URL path, falling back to 'media'. */
function basename(url) {
  try {
    const path = new URL(url).pathname;
    const name = path.substring(path.lastIndexOf('/') + 1);
    return decodeURIComponent(name) || 'media';
  } catch { return 'media'; }
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;
  const mediaUrl = info.srcUrl;
  if (!mediaUrl) return;

  const cfg = await store.get();
  if (!cfg.token) {
    flashBadge('!', '#ef4444');
    notify('Tracr', "Connectez-vous d'abord via l'extension.");
    return;
  }
  if (!cfg.lastInvestigationId) {
    flashBadge('!', '#ef4444');
    notify('Tracr', "Ouvrez l'extension et choisissez une enquête.");
    return;
  }

  flashBadge('…', '#f59e0b');
  try {
    const res = await fetch(mediaUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    await uploadSource(cfg.apiUrl, cfg.token, {
      investigationId: cfg.lastInvestigationId,
      title: basename(mediaUrl),
      sourceUrl: info.pageUrl || mediaUrl,
      sourceType: 'media',
      mime: blob.type || 'application/octet-stream',
      blob,
      capturedAt: new Date().toISOString(),
      pageMetadata: { media_url: mediaUrl, page_url: info.pageUrl || null },
    });

    flashBadge('✓', '#10b981');
    notify('Tracr', `Média archivé dans « ${cfg.lastInvestigationTitle || 'enquête'} ».`);
  } catch (err) {
    flashBadge('!', '#ef4444');
    const msg = err.message === 'SESSION_EXPIRED'
      ? 'Session expirée, reconnectez-vous via l\'extension.'
      : `Échec : ${err.message}`;
    notify('Tracr', msg);
  }
});

// ── Region-selection capture (triggered from region.js) ──────────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'TRACR_REGION') handleRegion(msg, sender);
  else if (msg && msg.type === 'TRACR_REGION_CANCEL') chrome.storage.local.remove('pendingCapture');
});

/** Capture the visible tab, crop it to the selected rectangle, and upload it as a screenshot. */
async function handleRegion(msg, sender) {
  const cfg = await store.get();
  const { pendingCapture } = await chrome.storage.local.get('pendingCapture');
  await chrome.storage.local.remove('pendingCapture');

  if (!cfg.token || !pendingCapture) {
    flashBadge('!', '#ef4444');
    notify('Tracr', "Session introuvable, rouvrez l'extension.");
    return;
  }

  flashBadge('…', '#8b5cf6');
  try {
    await sleep(150); // laisse l'overlay de sélection disparaître avant la capture
    const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
    const fullBlob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(fullBlob);

    const dpr = msg.dpr || 1;
    const { x, y, w, h } = msg.rect;
    const sx = Math.round(x * dpr), sy = Math.round(y * dpr);
    const sw = Math.round(w * dpr), sh = Math.round(h * dpr);

    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await canvas.convertToBlob({ type: 'image/png' });

    await uploadSource(cfg.apiUrl, cfg.token, {
      investigationId: pendingCapture.investigationId,
      title: pendingCapture.title,
      sourceUrl: pendingCapture.sourceUrl || msg.pageUrl,
      sourceType: 'page_screenshot',
      mime: 'image/png',
      blob,
      capturedAt: new Date().toISOString(),
      pageMetadata: { page_title: pendingCapture.pageTitle, region: msg.rect },
    });

    flashBadge('✓', '#22c55e');
    notify('Tracr', `Sélection archivée dans « ${pendingCapture.investigationTitle || 'enquête'} ».`);
  } catch (err) {
    flashBadge('!', '#ef4444');
    notify('Tracr', err.message === 'SESSION_EXPIRED' ? 'Session expirée.' : `Échec : ${err.message}`);
  }
}
