import type { IncomingLogEntry } from '../models.js';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate an incoming log entry
 *
 * This function checks that:
 * 1. All required fields are present
 * 2. Fields have the correct type
 * 3. Values are in valid ranges
 */
export function validateLogEntry(data: unknown): ValidationResult {
  const errors: string[] = [];

  // Check if data is an object
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Request body must be a valid JSON object'],
    };
  }

  const entry = data as Partial<IncomingLogEntry>;

  // Validate required fields
  if (!entry.method || typeof entry.method !== 'string') {
    errors.push('Field "method" is required and must be a string');
  }

  if (!entry.url || typeof entry.url !== 'string') {
    errors.push('Field "url" is required and must be a string');
  }

  if (entry.statusCode === undefined || typeof entry.statusCode !== 'number') {
    errors.push('Field "statusCode" is required and must be a number');
  } else if (entry.statusCode < 100 || entry.statusCode > 599) {
    errors.push('Field "statusCode" must be between 100 and 599');
  }

  if (entry.duration === undefined || typeof entry.duration !== 'number') {
    errors.push('Field "duration" is required and must be a number');
  } else if (entry.duration < 0) {
    errors.push('Field "duration" must be >= 0');
  }

  // Validate optional fields (if provided)
  if (
    entry.requestHeaders !== undefined &&
    typeof entry.requestHeaders !== 'object'
  ) {
    errors.push('Field "requestHeaders" must be an object');
  }

  if (
    entry.responseHeaders !== undefined &&
    typeof entry.responseHeaders !== 'object'
  ) {
    errors.push('Field "responseHeaders" must be an object');
  }

  if (entry.error !== undefined && typeof entry.error !== 'string') {
    errors.push('Field "error" must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard: checks if data is a valid IncomingLogEntry
 * This is useful for TypeScript type narrowing
 */
export function isValidLogEntry(data: unknown): data is IncomingLogEntry {
  return validateLogEntry(data).valid;
}
