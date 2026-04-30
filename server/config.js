const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_VIDEO_RETENTION_MS = 90 * DAY_MS;

function parsePositiveNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseVideoRetentionMs(env = process.env) {
  const explicitMs = parsePositiveNumber(env.VIDEO_RETENTION_MS);
  if (explicitMs !== null) {
    return explicitMs <= 0 ? Infinity : explicitMs;
  }

  const explicitDays = parsePositiveNumber(env.VIDEO_RETENTION_DAYS);
  if (explicitDays !== null) {
    return explicitDays <= 0 ? Infinity : explicitDays * DAY_MS;
  }

  return DEFAULT_VIDEO_RETENTION_MS;
}
