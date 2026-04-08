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

export function uploadRequest(path, { method = 'POST', body, headers, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(method, path);
    Object.entries(headers || {}).forEach(([name, value]) => {
      xhr.setRequestHeader(name, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function' || event.total <= 0) return;
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress(percent);
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader('content-type') || '';
      let payload = null;

      if (contentType.includes('application/json')) {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } else {
        payload = xhr.responseText || null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
        return;
      }

      const error = new Error('Request failed');
      error.status = xhr.status;
      error.payload = payload;
      reject(error);
    };

    xhr.onerror = () => {
      const error = new Error('Upload failed');
      error.status = 0;
      error.payload = null;
      reject(error);
    };

    xhr.send(body);
  });
}

export function formatTimecode(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const whole = Math.floor(value);
  const h = String(Math.floor(whole / 3600)).padStart(2, '0');
  const m = String(Math.floor((whole % 3600) / 60)).padStart(2, '0');
  const s = String(whole % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
