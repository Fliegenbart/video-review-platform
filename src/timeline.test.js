import { describe, expect, it } from 'vitest';
import { clientXToTime, clampTime, timeToPercent } from './timeline.js';

describe('timeline helpers', () => {
  it('clamps time within the video duration', () => {
    expect(clampTime(-5, 120)).toBe(0);
    expect(clampTime(40, 120)).toBe(40);
    expect(clampTime(999, 120)).toBe(120);
  });

  it('converts a timestamp into a safe percent', () => {
    expect(timeToPercent(30, 120)).toBe(25);
    expect(timeToPercent(200, 120)).toBe(100);
    expect(timeToPercent(10, 0)).toBe(0);
  });

  it('maps a timeline click to a video time', () => {
    expect(
      clientXToTime({
        clientX: 150,
        left: 50,
        width: 200,
        duration: 100,
      })
    ).toBe(50);
  });
});
