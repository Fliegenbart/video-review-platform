import crypto from 'node:crypto';

function base64UrlEncode(buffer) {
  return buffer
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function base64UrlDecodeToBuffer(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  return Buffer.from(padded, 'base64');
}

function getHmac(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest();
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function parseCookies(headerValue) {
  const header = typeof headerValue === 'string' ? headerValue : '';
  const result = {};

  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (!rawName) continue;
    const name = rawName.trim();
    const value = rest.join('=').trim();
    if (!name) continue;
    result[name] = decodeURIComponent(value);
  }

  return result;
}

export function createAdminAuth({ adminPassword, sessionSecret, cookieName }) {
  const COOKIE = cookieName || 'vrp_admin';
  const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

  function signSession(expiresAtMs) {
    const payload = String(expiresAtMs);
    const sig = base64UrlEncode(getHmac(sessionSecret, payload));
    return `${payload}.${sig}`;
  }

  function verifySession(token) {
    if (typeof token !== 'string') return false;
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return false;
    if (!/^\d+$/.test(payload)) return false;
    const expected = base64UrlEncode(getHmac(sessionSecret, payload));
    if (!safeEqual(expected, sig)) return false;
    const expiresAtMs = Number(payload);
    if (!Number.isFinite(expiresAtMs)) return false;
    return Date.now() < expiresAtMs;
  }

  function buildSetCookie(value, { maxAgeMs } = {}) {
    const attrs = [
      `${COOKIE}=${encodeURIComponent(value)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
    ];

    // In production the app is expected to be behind HTTPS.
    if (process.env.NODE_ENV === 'production') attrs.push('Secure');

    if (typeof maxAgeMs === 'number') {
      attrs.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
    }

    return attrs.join('; ');
  }

  return {
    cookieName: COOKIE,

    requireAdmin(req, res, next) {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies[COOKIE];
      if (!verifySession(token)) {
        res.status(401).json({ error: 'not_authenticated' });
        return;
      }
      next();
    },

    signIn(password) {
      if (typeof password !== 'string' || password.length === 0) return null;
      if (!safeEqual(password, adminPassword)) return null;
      const expiresAtMs = Date.now() + TTL_MS;
      const token = signSession(expiresAtMs);
      return buildSetCookie(token, { maxAgeMs: TTL_MS });
    },

    signOut() {
      return buildSetCookie('', { maxAgeMs: 0 });
    },
  };
}

