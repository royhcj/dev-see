import type { OpenApiDocument } from './parse.js';
import {
  asSchemaObject,
  getSchemaTypeLabel,
  isRecord,
  resolveSchema,
} from './schema.js';

const MAX_SAMPLE_DEPTH = 6;

export function pickOpenApiExample(value: unknown): unknown | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.example !== undefined) {
    return value.example;
  }

  if (value.examples !== undefined) {
    return pickFromExamplesField(value.examples);
  }

  return undefined;
}

export function pickMediaTypeExample(mediaType: unknown): unknown | undefined {
  if (!isRecord(mediaType)) {
    return undefined;
  }

  const direct = pickOpenApiExample(mediaType);
  if (direct !== undefined) {
    return direct;
  }

  if (mediaType.schema !== undefined) {
    return pickOpenApiExample(mediaType.schema);
  }

  return undefined;
}

export function generateSchemaExample(schemaInput: unknown, document: OpenApiDocument): unknown {
  return buildSchemaExample(schemaInput, document, 0, new Set());
}

export function stringifyExample(value: unknown, contentType?: string): string {
  if (value === undefined) {
    return '';
  }

  const normalizedType = normalizeContentType(contentType);

  if (normalizedType === 'application/json') {
    if (typeof value === 'string') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    return JSON.stringify(value, null, 2);
  }

  if (normalizedType === 'application/x-www-form-urlencoded') {
    const record = asRecordForForm(value);
    if (record) {
      return new URLSearchParams(
        Object.entries(record).map(([key, entry]) => [key, String(entry ?? '')])
      ).toString();
    }
  }

  if (normalizedType === 'multipart/form-data') {
    const record = asRecordForForm(value);
    if (record) {
      return Object.entries(record)
        .map(([key, entry]) => `${key}: ${String(entry ?? '')}`)
        .join('\n');
    }
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    Array.isArray(value) ||
    isRecord(value)
  ) {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function buildSchemaExample(
  schemaInput: unknown,
  document: OpenApiDocument,
  depth: number,
  seenRefs: Set<string>
): unknown {
  if (depth > MAX_SAMPLE_DEPTH) {
    return null;
  }

  const resolved = resolveSchema(schemaInput, document, seenRefs);
  if (!resolved.schema) {
    return null;
  }

  if (resolved.refPath) {
    seenRefs = new Set(seenRefs);
    seenRefs.add(resolved.refPath);
  }

  const schema = resolved.schema;
  const explicit = pickOpenApiExample(schema);
  if (explicit !== undefined) {
    return explicit;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  const typeLabel = getSchemaTypeLabel(schema);
  switch (typeLabel) {
    case 'object':
      return sampleObject(schema, document, depth, seenRefs);
    case 'array':
      return [buildSchemaExample(schema.items, document, depth + 1, seenRefs)];
    case 'integer':
      return 0;
    case 'number':
      return 0;
    case 'boolean':
      return true;
    case 'string':
      return sampleString(schema.format);
    case 'oneOf':
      return buildSchemaExample(schema.oneOf?.[0], document, depth + 1, seenRefs);
    case 'anyOf':
      return buildSchemaExample(schema.anyOf?.[0], document, depth + 1, seenRefs);
    case 'allOf':
      return buildSchemaExample(schema.allOf?.[0], document, depth + 1, seenRefs);
    default:
      return null;
  }
}

function sampleObject(
  schema: Record<string, unknown>,
  document: OpenApiDocument,
  depth: number,
  seenRefs: Set<string>
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  const properties = isRecord(schema.properties) ? schema.properties : undefined;
  if (properties) {
    const required = new Set(
      Array.isArray(schema.required)
        ? schema.required.filter((entry): entry is string => typeof entry === 'string')
        : []
    );
    const keys = Object.keys(properties);

    const includeKeys = required.size > 0 ? keys.filter((key) => required.has(key)) : keys;
    includeKeys.forEach((key) => {
      next[key] = buildSchemaExample(properties[key], document, depth + 1, seenRefs);
    });
  }

  const additionalProperties = schema.additionalProperties;
  if (Object.keys(next).length === 0 && additionalProperties && additionalProperties !== true) {
    next.additionalProp = buildSchemaExample(additionalProperties, document, depth + 1, seenRefs);
  }

  return next;
}

function sampleString(format: unknown): string {
  switch (format) {
    case 'date':
      return '2024-01-01';
    case 'date-time':
      return '2024-01-01T00:00:00Z';
    case 'uuid':
      return '00000000-0000-4000-8000-000000000000';
    case 'email':
      return 'user@example.com';
    case 'uri':
    case 'url':
      return 'https://example.com';
    case 'byte':
    case 'binary':
      return '<binary>';
    default:
      return 'string';
  }
}

function pickFromExamplesField(examples: unknown): unknown | undefined {
  if (Array.isArray(examples) && examples.length > 0) {
    return examples[0];
  }

  if (!isRecord(examples)) {
    return undefined;
  }

  for (const value of Object.values(examples)) {
    if (isRecord(value) && value.value !== undefined) {
      return value.value;
    }
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function normalizeContentType(contentType?: string): string {
  if (!contentType) {
    return '';
  }

  return contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function asRecordForForm(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return asSchemaObject(parsed) ?? null;
    } catch {
      return null;
    }
  }

  return null;
}
