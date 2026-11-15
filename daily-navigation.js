/* Navigation only. Cloud's outer bar owns the entry when index is embedded. */
(() => {
  const entry = document.getElementById('kqDailyIndexEntry');
  if (!entry || window === window.top) return;
  try {
    if (window.parent.document.getElementById('kqDailyCloudEntry')) entry.hidden = true;
  } catch { /* Standalone/cross-origin embedding retains its own entry. */ }
})();
