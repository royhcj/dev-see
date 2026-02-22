import { parse as parseYaml } from 'yaml';

export type HttpMethodLower =
  | 'get'
  | 'put'
  | 'post'
  | 'delete'
  | 'options'
  | 'head'
  | 'patch'
  | 'trace';

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
}

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface OpenApiOperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  servers?: OpenApiServer[];
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OpenApiPathItemObject {
  get?: OpenApiOperationObject;
  put?: OpenApiOperationObject;
  post?: OpenApiOperationObject;
  delete?: OpenApiOperationObject;
  options?: OpenApiOperationObject;
  head?: OpenApiOperationObject;
  patch?: OpenApiOperationObject;
  trace?: OpenApiOperationObject;
  parameters?: unknown[];
  summary?: string;
  description?: string;
  [key: string]: unknown;
}

export interface OpenApiDocument {
  openapi: string;
  info: OpenApiInfo;
  servers?: OpenApiServer[];
  paths: Record<string, OpenApiPathItemObject>;
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

export type OpenApiParseErrorKind = 'parse' | 'validation';

interface OpenApiParseErrorOptions {
  kind: OpenApiParseErrorKind;
  sourceLabel?: string;
  line?: number;
  column?: number;
  cause?: unknown;
}

export class OpenApiParseError extends Error {
  readonly kind: OpenApiParseErrorKind;
  readonly sourceLabel?: string;
  readonly line?: number;
  readonly column?: number;

  constructor(message: string, options: OpenApiParseErrorOptions) {
    super(message);
    this.name = 'OpenApiParseError';
    this.kind = options.kind;
    this.sourceLabel = options.sourceLabel;
    this.line = options.line;
    this.column = options.column;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface ParseOpenApiOptions {
  sourceLabel?: string;
  preferYaml?: boolean;
}

export interface ParseOpenApiResult {
  document: OpenApiDocument;
  format: 'json' | 'yaml';
}

export function parseOpenApiDocument(
  rawSpec: string,
  options: ParseOpenApiOptions = {}
): ParseOpenApiResult {
  const sourceLabel = options.sourceLabel;
  const trimmed = rawSpec.trim();

  if (!trimmed) {
    throw new OpenApiParseError('Spec is empty. Provide JSON or YAML OpenAPI content.', {
      kind: 'validation',
      sourceLabel,
    });
  }

  const shouldTryJsonFirst = !options.preferYaml && /^[{\[]/.test(trimmed);
  const strategies = shouldTryJsonFirst
    ? [
        { format: 'json' as const, fn: parseJsonSpec },
        { format: 'yaml' as const, fn: parseYamlSpec },
      ]
    : [
        { format: 'yaml' as const, fn: parseYamlSpec },
        { format: 'json' as const, fn: parseJsonSpec },
      ];

  const parseErrors: OpenApiParseError[] = [];

  for (const strategy of strategies) {
    try {
      const parsed = strategy.fn(rawSpec, sourceLabel);
      const document = validateOpenApiDocument(parsed, sourceLabel);
      return { document, format: strategy.format };
    } catch (error) {
      if (error instanceof OpenApiParseError) {
        if (error.kind === 'validation') {
          throw error;
        }
        parseErrors.push(error);
      } else {
        parseErrors.push(
          new OpenApiParseError('Failed to parse specification content.', {
            kind: 'parse',
            sourceLabel,
            cause: error,
          })
        );
      }
    }
  }

  const primaryError = parseErrors[0];
  const fallbackMessage = `Unable to parse spec from ${sourceLabel ?? 'input'} as JSON or YAML.`;
  throw new OpenApiParseError(primaryError?.message ?? fallbackMessage, {
    kind: 'parse',
    sourceLabel,
    line: primaryError?.line,
    column: primaryError?.column,
    cause: primaryError,
  });
}

export function formatOpenApiError(error: unknown): string {
  if (error instanceof OpenApiParseError) {
    const location =
      typeof error.line === 'number' && typeof error.column === 'number'
        ? ` (line ${error.line}, column ${error.column})`
        : '';
    return `${error.message}${location}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred while loading the OpenAPI spec.';
}

function parseJsonSpec(rawSpec: string, sourceLabel?: string): unknown {
  try {
    return JSON.parse(rawSpec);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON.';
    const { line, column } = getJsonErrorLocation(rawSpec, message);
    throw new OpenApiParseError(`Invalid JSON: ${message}`, {
      kind: 'parse',
      sourceLabel,
      line,
      column,
      cause: error,
    });
  }
}

function parseYamlSpec(rawSpec: string, sourceLabel?: string): unknown {
  try {
    return parseYaml(rawSpec);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid YAML.';
    const { line, column } = getYamlErrorLocation(error);
    throw new OpenApiParseError(`Invalid YAML: ${message}`, {
      kind: 'parse',
      sourceLabel,
      line,
      column,
      cause: error,
    });
  }
}

function validateOpenApiDocument(value: unknown, sourceLabel?: string): OpenApiDocument {
  assertRecord(value, 'OpenAPI root must be an object.', sourceLabel);

  if (typeof value.openapi !== 'string') {
    throw new OpenApiParseError('Missing required `openapi` version string.', {
      kind: 'validation',
      sourceLabel,
    });
  }

  if (!value.openapi.startsWith('3.')) {
    throw new OpenApiParseError(
      `Unsupported OpenAPI version "${value.openapi}". Only OpenAPI 3.x is supported.`,
      {
        kind: 'validation',
        sourceLabel,
      }
    );
  }

  assertRecord(value.info, 'Missing required `info` object.', sourceLabel);
  if (typeof value.info.title !== 'string' || !value.info.title.trim()) {
    throw new OpenApiParseError('`info.title` must be a non-empty string.', {
      kind: 'validation',
      sourceLabel,
    });
  }
  if (typeof value.info.version !== 'string' || !value.info.version.trim()) {
    throw new OpenApiParseError('`info.version` must be a non-empty string.', {
      kind: 'validation',
      sourceLabel,
    });
  }

  assertRecord(value.paths, 'Missing required `paths` object.', sourceLabel);
  for (const [pathKey, pathValue] of Object.entries(value.paths)) {
    if (typeof pathKey !== 'string' || !pathKey.startsWith('/')) {
      throw new OpenApiParseError(`Path key "${pathKey}" must start with "/".`, {
        kind: 'validation',
        sourceLabel,
      });
    }
    assertRecord(pathValue, `Path item for "${pathKey}" must be an object.`, sourceLabel);
  }

  return value as OpenApiDocument;
}

function assertRecord(value: unknown, message: string, sourceLabel?: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new OpenApiParseError(message, {
      kind: 'validation',
      sourceLabel,
    });
  }
}

function getJsonErrorLocation(rawSpec: string, errorMessage: string): { line?: number; column?: number } {
  const match = /position (\d+)/i.exec(errorMessage);
  if (!match) {
    return {};
  }

  const index = Number(match[1]);
  if (!Number.isFinite(index) || index < 0) {
    return {};
  }

  let line = 1;
  let column = 1;

  for (let i = 0; i < index && i < rawSpec.length; i++) {
    if (rawSpec[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function getYamlErrorLocation(error: unknown): { line?: number; column?: number } {
  const linePos = (
    error as {
      linePos?: Array<{
        line?: number;
        col?: number;
      }>;
    }
  )?.linePos;

  const first = linePos?.[0];
  if (typeof first?.line === 'number' && typeof first?.col === 'number') {
    return { line: first.line, column: first.col };
  }

  return {};
}
