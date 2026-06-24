/* region.js - overlay for selecting an area to capture.
 * Injected on demand by the popup. On completion, sends the rectangle (CSS px,
 * relative to the viewport) to the service worker, which does the capture + crop.
 */
(function () {
  if (window.__tracrRegionActive) return;
  window.__tracrRegionActive = true;

  const overlay = document.createElement('div');
  overlay.setAttribute('style', [
    'position:fixed', 'inset:0', 'z-index:2147483647',
    'cursor:crosshair', 'background:rgba(26,26,26,0.35)',
  ].join(';'));

  const hint = document.createElement('div');
  hint.textContent = 'Glissez pour sélectionner - Échap pour annuler';
  hint.setAttribute('style', [
    'position:fixed', 'top:12px', 'left:50%', 'transform:translateX(-50%)',
    'background:#1e1e2e', 'color:#fff', 'font:600 12px/1.4 Inter,system-ui,sans-serif',
    'padding:7px 14px', 'border-radius:10px', 'border:1px solid rgba(139,92,246,0.4)',
    'box-shadow:0 4px 20px rgba(0,0,0,0.4)', 'pointer-events:none',
  ].join(';'));

  const box = document.createElement('div');
  box.setAttribute('style', [
    'position:fixed', 'border:1.5px solid #8b5cf6',
    'background:rgba(139,92,246,0.12)', 'box-shadow:0 0 0 9999px rgba(26,26,26,0.45)',
    'pointer-events:none', 'display:none',
  ].join(';'));

  overlay.appendChild(box);
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(hint);

  let startX = 0, startY = 0, dragging = false;

  /** Remove the overlay and detach listeners. */
  function cleanup() {
    overlay.remove();
    hint.remove();
    window.removeEventListener('keydown', onKey, true);
    window.__tracrRegionActive = false;
  }

  /** Abort the selection and tell the service worker to drop the pending capture. */
  function cancel() {
    cleanup();
    chrome.runtime.sendMessage({ type: 'TRACR_REGION_CANCEL' });
  }

  /** Cancel on Escape. */
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  }

  overlay.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    box.style.left = startX + 'px';
    box.style.top = startY + 'px';
    box.style.width = '0px';
    box.style.height = '0px';
    box.style.display = 'block';
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.width = Math.abs(e.clientX - startX) + 'px';
    box.style.height = Math.abs(e.clientY - startY) + 'px';
  });

  overlay.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    const rect = {
      x: Math.min(e.clientX, startX),
      y: Math.min(e.clientY, startY),
      w: Math.abs(e.clientX - startX),
      h: Math.abs(e.clientY - startY),
    };
    cleanup();
    if (rect.w < 5 || rect.h < 5) {
      chrome.runtime.sendMessage({ type: 'TRACR_REGION_CANCEL' });
      return;
    }
    // Laisse l'overlay disparaître avant la capture (un repaint).
    chrome.runtime.sendMessage({
      type: 'TRACR_REGION',
      rect,
      dpr: window.devicePixelRatio || 1,
      pageUrl: location.href,
      pageTitle: document.title,
    });
  });

  // Clic droit = annuler.
  overlay.addEventListener('contextmenu', (e) => { e.preventDefault(); cancel(); });
  window.addEventListener('keydown', onKey, true);
})();
