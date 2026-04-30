import { describe, expect, it } from 'vitest';
import { createAdminAuth } from './auth.js';

describe('createAdminAuth', () => {
  it('reports whether a request already carries a valid admin session', () => {
    const auth = createAdminAuth({
      adminPassword: 'secret-password',
      sessionSecret: 'stable-test-secret',
      cookieName: 'test_admin',
    });

    expect(auth.isSignedIn({ headers: {} })).toBe(false);

    const setCookie = auth.signIn('secret-password');
    const cookie = setCookie.split(';')[0];

    expect(auth.isSignedIn({ headers: { cookie } })).toBe(true);
  });
});
