(function (window) {
  const global = window || {};

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function truncate(text, maxLength = 120, suffix = '...') {
    const value = String(text ?? '');
    const limit = Number.parseInt(maxLength, 10);
    if (!Number.isFinite(limit) || limit <= 0 || value.length <= limit) {
      return value;
    }
    return value.slice(0, Math.max(0, limit - suffix.length)).trimEnd() + suffix;
  }

  function formatDate(value, options = {}) {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const defaults = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    return date.toLocaleDateString(options.locale || 'zh-CN', options.format || defaults);
  }

  function getBackendBaseUrl() {
    return global.AUTH_BACKEND_BASE_URL
      || global.API_CONFIG?.BASE_URL?.replace(/\/api\/v1\/?$/, '')
      || global.AuthUI?.BACKEND_BASE_URL
      || 'http://localhost:5000';
  }

  function getAvatar(avatar, username = 'User') {
    const fallback = `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(username || 'User')}`;
    if (!avatar) return fallback;
    if (/^https?:\/\//i.test(avatar)) return avatar;

    const normalized = avatar.startsWith('/') ? avatar : `/${avatar}`;
    return `${getBackendBaseUrl()}${normalized}`;
  }

  function showToast(message, type = 'info', duration = 3000) {
    const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
    let container = document.getElementById('toast-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = [
        'position:fixed',
        'top:1rem',
        'right:1rem',
        'z-index:9999',
        'display:flex',
        'flex-direction:column',
        'gap:0.75rem'
      ].join(';');
      document.body.appendChild(container);
    }

    const palette = {
      success: ['#dcfce7', '#166534', '#86efac'],
      error: ['#fee2e2', '#991b1b', '#fecaca'],
      warning: ['#fef3c7', '#92400e', '#fde68a'],
      info: ['#e0f2fe', '#075985', '#bae6fd']
    }[safeType];

    const toast = document.createElement('div');
    toast.setAttribute('role', safeType === 'error' ? 'alert' : 'status');
    toast.style.cssText = [
      `background:${palette[0]}`,
      `color:${palette[1]}`,
      `border:1px solid ${palette[2]}`,
      'border-radius:8px',
      'box-shadow:0 10px 25px rgba(15,23,42,0.12)',
      'font-size:0.875rem',
      'font-weight:500',
      'line-height:1.4',
      'max-width:24rem',
      'padding:0.75rem 1rem'
    ].join(';');
    toast.textContent = String(message ?? '');

    container.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 180ms ease';
      window.setTimeout(() => toast.remove(), 200);
    }, duration);

    return toast;
  }

  global.Utils = Object.freeze({
    escapeHtml,
    truncate,
    formatDate,
    getAvatar,
    getBackendBaseUrl,
    showToast
  });
})(window);
