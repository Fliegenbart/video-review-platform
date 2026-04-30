import { describe, expect, it } from 'vitest';

import { DEFAULT_VIDEO_RETENTION_MS, parseVideoRetentionMs } from './config.js';

describe('parseVideoRetentionMs', () => {
  it('keeps uploaded videos for 90 days by default', () => {
    expect(DEFAULT_VIDEO_RETENTION_MS).toBe(90 * 24 * 60 * 60 * 1000);
    expect(parseVideoRetentionMs({})).toBe(DEFAULT_VIDEO_RETENTION_MS);
  });

  it('accepts explicit millisecond or day based retention settings', () => {
    expect(parseVideoRetentionMs({ VIDEO_RETENTION_MS: '60000' })).toBe(60000);
    expect(parseVideoRetentionMs({ VIDEO_RETENTION_DAYS: '14' })).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('can disable automatic video expiry', () => {
    expect(parseVideoRetentionMs({ VIDEO_RETENTION_DAYS: '0' })).toBe(Infinity);
    expect(parseVideoRetentionMs({ VIDEO_RETENTION_MS: '0' })).toBe(Infinity);
  });
});
