export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const res = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers,
    body: options.body && !isFormData && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error HTTP ${res.status}`);
  }
  return data;
}