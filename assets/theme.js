'use strict';
(() => {
  const key = 'music-atlas-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  let toggle;
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch { /* Theme switching also works when storage is unavailable. */ }
  function apply() {
    const theme = preference || (system.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    if (toggle) {
      toggle.textContent = theme === 'dark' ? '☀ 切換亮色' : '☾ 切換暗色';
      toggle.setAttribute('aria-label', theme === 'dark' ? '切換為亮色模式' : '切換為暗色模式');
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }
  // Apply before the stylesheet paints to avoid a light flash in dark mode.
  apply();
  system.addEventListener('change', () => { if (!preference) apply(); });
  document.addEventListener('DOMContentLoaded', () => {
    toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.hidden = false;
    apply();
    toggle.addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { /* Keep the session choice. */ }
      apply();
    });
  });
})();
