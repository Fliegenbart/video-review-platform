export async function apiRequest(path, { method = 'GET', json, body, headers } = {}) {
  const init = { method, headers: { ...(headers || {}) } };

  if (json !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(json);
  } else if (body !== undefined) {
    init.body = body;
  }

  const res = await fetch(path, init);
  const contentType = res.headers.get('content-type') || '';

  let payload = null;
  if (contentType.includes('application/json')) {
    payload = await res.json().catch(() => null);
  } else {
    payload = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const error = new Error('Request failed');
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function formatTimecode(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const whole = Math.floor(value);
  const h = String(Math.floor(whole / 3600)).padStart(2, '0');
  const m = String(Math.floor((whole % 3600) / 60)).padStart(2, '0');
  const s = String(whole % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

