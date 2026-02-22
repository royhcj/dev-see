import type { LogEntry } from '../stores/logs.svelte.js';

export const LOG_TIME_SEPARATOR_THRESHOLD_MS = 2_000;

type TimestampedLog = Pick<LogEntry, 'timestamp'>;

/**
 * Returns true when two adjacent log items should have a visual time separator.
 */
export function shouldRenderTimeSeparator(
  previousLog?: TimestampedLog,
  currentLog?: TimestampedLog,
  thresholdMs = LOG_TIME_SEPARATOR_THRESHOLD_MS
): boolean {
  if (!previousLog || !currentLog) return false;
  return Math.abs(previousLog.timestamp - currentLog.timestamp) >= thresholdMs;
}
