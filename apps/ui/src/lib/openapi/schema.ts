import type { OpenApiDocument } from './parse.js';

export interface OpenApiRefObject {
  $ref: string;
}

export interface OpenApiSchemaObject {
  title?: string;
  type?: string | string[];
  format?: string;
  description?: string;
  nullable?: boolean;
  deprecated?: boolean;
  enum?: unknown[];
  default?: unknown;
  required?: string[];
  properties?: Record<string, unknown>;
  additionalProperties?: boolean | unknown;
  items?: unknown;
  oneOf?: unknown[];
  anyOf?: unknown[];
  allOf?: unknown[];
  example?: unknown;
  examples?: unknown;
  [key: string]: unknown;
}

export interface ResolvedSchema {
  schema: OpenApiSchemaObject | null;
  refPath?: string;
  missingRef?: boolean;
  circularRef?: boolean;
}

export interface SchemaChildNode {
  key: string;
  label: string;
  schema: unknown;
  required: boolean;
  source: 'property' | 'items' | 'allOf' | 'anyOf' | 'oneOf' | 'additionalProperties';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isOpenApiRef(value: unknown): value is OpenApiRefObject {
  return isRecord(value) && typeof value.$ref === 'string';
}

export function asSchemaObject(value: unknown): OpenApiSchemaObject | null {
  return isRecord(value) ? (value as OpenApiSchemaObject) : null;
}

export function resolveOpenApiRef<T = unknown>(ref: string, document: OpenApiDocument): T | null {
  if (!ref.startsWith('#/')) {
    return null;
  }

  const segments = ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  let cursor: unknown = document;
  for (const segment of segments) {
    if (!isRecord(cursor)) {
      return null;
    }
    cursor = cursor[segment];
    if (cursor === undefined) {
      return null;
    }
  }

  return cursor as T;
}

export function dereferenceOpenApiValue(value: unknown, document: OpenApiDocument): unknown {
  if (!isOpenApiRef(value)) {
    return value;
  }

  return resolveOpenApiRef(value.$ref, document);
}

export function resolveSchema(
  value: unknown,
  document: OpenApiDocument,
  seenRefs: Set<string> = new Set()
): ResolvedSchema {
  if (isOpenApiRef(value)) {
    const refPath = value.$ref;
    if (seenRefs.has(refPath)) {
      return {
        schema: null,
        refPath,
        circularRef: true,
      };
    }

    const next = resolveOpenApiRef(refPath, document);
    if (!next) {
      return {
        schema: null,
        refPath,
        missingRef: true,
      };
    }

    const nextSeen = new Set(seenRefs);
    nextSeen.add(refPath);
    const resolved = resolveSchema(next, document, nextSeen);
    return {
      ...resolved,
      refPath: resolved.refPath ?? refPath,
    };
  }

  const schema = asSchemaObject(value);
  if (!schema) {
    return {
      schema: null,
    };
  }

  return { schema };
}

export function getSchemaChildren(schema: OpenApiSchemaObject): SchemaChildNode[] {
  const children: SchemaChildNode[] = [];

  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((entry): entry is string => typeof entry === 'string')
      : []
  );

  if (isRecord(schema.properties)) {
    for (const [key, value] of Object.entries(schema.properties)) {
      children.push({
        key: `property:${key}`,
        label: key,
        schema: value,
        required: required.has(key),
        source: 'property',
      });
    }
  }

  if (schema.items !== undefined) {
    children.push({
      key: 'items',
      label: 'items',
      schema: schema.items,
      required: false,
      source: 'items',
    });
  }

  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach((value, index) => {
      children.push({
        key: `allOf:${index}`,
        label: `allOf[${index}]`,
        schema: value,
        required: false,
        source: 'allOf',
      });
    });
  }

  if (Array.isArray(schema.anyOf)) {
    schema.anyOf.forEach((value, index) => {
      children.push({
        key: `anyOf:${index}`,
        label: `anyOf[${index}]`,
        schema: value,
        required: false,
        source: 'anyOf',
      });
    });
  }

  if (Array.isArray(schema.oneOf)) {
    schema.oneOf.forEach((value, index) => {
      children.push({
        key: `oneOf:${index}`,
        label: `oneOf[${index}]`,
        schema: value,
        required: false,
        source: 'oneOf',
      });
    });
  }

  if (schema.additionalProperties && schema.additionalProperties !== true) {
    children.push({
      key: 'additionalProperties',
      label: 'additionalProperties',
      schema: schema.additionalProperties,
      required: false,
      source: 'additionalProperties',
    });
  }

  return children;
}

export function getSchemaTypeLabel(schema: OpenApiSchemaObject): string {
  const explicitType = schema.type;
  if (typeof explicitType === 'string') {
    return explicitType;
  }
  if (Array.isArray(explicitType) && explicitType.length > 0) {
    const names = explicitType.filter((entry): entry is string => typeof entry === 'string');
    if (names.length > 0) {
      return names.join(' | ');
    }
  }

  if (isRecord(schema.properties)) {
    return 'object';
  }
  if (schema.items !== undefined) {
    return 'array';
  }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return 'oneOf';
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return 'anyOf';
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    return 'allOf';
  }

  return 'unknown';
}
