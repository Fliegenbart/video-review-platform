function toSafeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

export function clampTime(timeSec, duration) {
  const safeDuration = toSafeNumber(duration);
  const safeTime = toSafeNumber(timeSec);

  if (safeDuration <= 0) {
    return 0;
  }

  return Math.min(Math.max(safeTime, 0), safeDuration);
}

export function timeToPercent(timeSec, duration) {
  const safeDuration = toSafeNumber(duration);

  if (safeDuration <= 0) {
    return 0;
  }

  const clampedTime = clampTime(timeSec, safeDuration);
  return (clampedTime / safeDuration) * 100;
}

export function clientXToTime({ clientX, left, width, duration }) {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(left) ||
    !Number.isFinite(width) ||
    !Number.isFinite(duration)
  ) {
    return 0;
  }

  const safeDuration = toSafeNumber(duration);
  const safeWidth = toSafeNumber(width);

  if (safeDuration <= 0 || safeWidth <= 0) {
    return 0;
  }

  const safeClientX = toSafeNumber(clientX);
  const safeLeft = toSafeNumber(left);
  const percent = Math.min(Math.max((safeClientX - safeLeft) / safeWidth, 0), 1);

  return clampTime(percent * safeDuration, safeDuration);
}
