const REVIEWER_NAME_KEY = 'video-reviewer-name';

export function loadReviewerName() {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(REVIEWER_NAME_KEY) || '';
}

export function saveReviewerName(name) {
  if (typeof window === 'undefined') return;
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    window.sessionStorage.removeItem(REVIEWER_NAME_KEY);
    return;
  }

  window.sessionStorage.setItem(REVIEWER_NAME_KEY, cleanName);
}
