import { describe, expect, it } from 'vitest';
import { shouldRenderTimeSeparator } from './log-list-separators.js';

describe('shouldRenderTimeSeparator', () => {
  it('returns false when one of the logs is missing', () => {
    expect(shouldRenderTimeSeparator(undefined, { timestamp: 1000 })).toBe(false);
    expect(shouldRenderTimeSeparator({ timestamp: 1000 }, undefined)).toBe(false);
  });

  it('returns false for gaps below 5 seconds', () => {
    expect(shouldRenderTimeSeparator({ timestamp: 10_000 }, { timestamp: 5_001 })).toBe(false);
  });

  it('returns true for exactly 5-second gaps', () => {
    expect(shouldRenderTimeSeparator({ timestamp: 10_000 }, { timestamp: 5_000 })).toBe(true);
  });

  it('returns true for gaps above 5 seconds', () => {
    expect(shouldRenderTimeSeparator({ timestamp: 20_000 }, { timestamp: 10_000 })).toBe(true);
  });

  it('uses absolute difference for out-of-order timestamps', () => {
    expect(shouldRenderTimeSeparator({ timestamp: 2_000 }, { timestamp: 8_000 })).toBe(true);
  });
});
