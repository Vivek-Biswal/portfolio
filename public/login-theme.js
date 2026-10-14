(function () {
  const key = 'vivek-admin-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { const value = localStorage.getItem(key); if (value === 'dark' || value === 'light') preference = value; } catch {}
  function apply(theme) {
    document.documentElement.dataset.adminTheme = theme;
    const button = document.getElementById('admin-theme-toggle');
    if (!button) return;
    const dark = theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', 'Switch to ' + (dark ? 'light' : 'dark') + ' theme');
    button.querySelector('[data-theme-label]').textContent = dark ? 'Light' : 'Dark';
  }
  apply(preference || (system.matches ? 'dark' : 'light'));
  document.addEventListener('DOMContentLoaded', function () {
    apply(document.documentElement.dataset.adminTheme);
    document.getElementById('admin-theme-toggle')?.addEventListener('click', function () {
      preference = document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch {}
      apply(preference);
    });
  }, { once: true });
  system.addEventListener('change', function () { if (!preference) apply(system.matches ? 'dark' : 'light'); });
  window.addEventListener('storage', function (event) {
    if (event.key !== key) return;
    preference = event.newValue === 'dark' || event.newValue === 'light' ? event.newValue : undefined;
    apply(preference || (system.matches ? 'dark' : 'light'));
  });
})();
