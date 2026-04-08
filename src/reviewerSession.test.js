import { beforeEach, describe, expect, it } from 'vitest';
import { loadReviewerName, saveReviewerName } from './reviewerSession.js';

describe('reviewerSession', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('returns an empty string when no reviewer name has been stored', () => {
    expect(loadReviewerName()).toBe('');
  });

  it('stores and reloads the reviewer name from sessionStorage', () => {
    saveReviewerName('Anna');
    expect(loadReviewerName()).toBe('Anna');
  });
});
