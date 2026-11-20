export async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? { ...(options.headers || {}) }
    : { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const config = {
    credentials: 'same-origin',
    ...options,
    headers
  };

  if (options.body && !isFormData && typeof options.body !== 'string') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(endpoint, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Error del servidor (HTTP ${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function notifyCartUpdated(totalItems) {
  window.dispatchEvent(
    new CustomEvent('fc:cart-updated', {
      detail: { totalItems }
    })
  );
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-SV');
}

export function getFallbackCover(title = 'Fernet & Colocho') {
  const clean = String(title)
    .slice(0, 22)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#151922"/><stop offset="100%" stop-color="#311b47"/></linearGradient></defs><rect width="460" height="215" fill="url(#g)"/><text x="50%" y="46%" fill="#f59e0b" font-family="Orbitron,sans-serif" font-size="18" font-weight="bold" text-anchor="middle">FERNET &amp; COLOCHO</text><text x="50%" y="62%" fill="#f3f4f6" font-family="Inter,sans-serif" font-size="14" text-anchor="middle">${clean}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/'/g, '%27');

}
