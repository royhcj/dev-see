import { config } from '../config.js';

export type TryItParamLocation = 'path' | 'query' | 'header' | 'cookie';

export interface TryItParameterDefinition {
  name: string;
  location: TryItParamLocation;
  required: boolean;
}

export interface TryItAuthOption {
  id: string;
  label: string;
  description?: string;
  kind: 'bearer' | 'basic' | 'apiKey';
  apiKeyName?: string;
  apiKeyIn?: 'header' | 'query';
}

export interface TryItAuthSelection {
  kind: 'none' | 'bearer' | 'basic' | 'apiKey';
  bearerToken?: string;
  username?: string;
  password?: string;
  apiKeyName?: string;
  apiKeyIn?: 'header' | 'query';
  apiKeyValue?: string;
}

export interface BuildTryItRequestInput {
  method: string;
  pathTemplate: string;
  baseUrl: string;
  parameters: TryItParameterDefinition[];
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headerParams: Record<string, string>;
  cookieParams: Record<string, string>;
  bodyText: string;
  contentType?: string;
  acceptHeader?: string | null;
  auth?: TryItAuthSelection;
}

export interface CurlFormEntry {
  name: string;
  value: string;
}

export type CurlBody =
  | {
      kind: 'raw';
      value: string;
    }
  | {
      kind: 'multipart';
      entries: CurlFormEntry[];
    };

export interface BuiltTryItRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  requestInit: RequestInit;
  curlBody: CurlBody | null;
}

export interface TryItExecutionResult {
  method: string;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  bodyText: string;
  contentType?: string;
}

export type TryItExecutionErrorKind = 'validation' | 'timeout' | 'network' | 'cors';

export class TryItExecutionError extends Error {
  readonly kind: TryItExecutionErrorKind;
  readonly details?: string;
  readonly issues?: string[];

  constructor(
    kind: TryItExecutionErrorKind,
    message: string,
    options: {
      details?: string;
      issues?: string[];
    } = {}
  ) {
    super(message);
    this.name = 'TryItExecutionError';
    this.kind = kind;
    this.details = options.details;
    this.issues = options.issues;
  }
}

const UNRESOLVED_PATH_TOKEN = /\{[^}]+\}/;
const PATH_TOKEN = /\{([^}]+)\}/g;

export function buildTryItRequest(input: BuildTryItRequestInput): BuiltTryItRequest {
  const issues: string[] = [];
  const method = normalizeMethod(input.method);
  const baseUrl = input.baseUrl.trim();

  if (!baseUrl) {
    issues.push('Base URL is required before sending a request.');
  }

  validateRequiredParameters(input.parameters, input.queryParams, input.headerParams, issues);
  const resolvedPath = resolvePath(input.pathTemplate, input.pathParams, issues);

  const base = parseBaseUrl(baseUrl);
  if (!base) {
    issues.push(`"${baseUrl}" is not a valid base URL.`);
  }

  const normalizedContentType = normalizeContentType(input.contentType);
  const headers = new Headers();
  const query = new URLSearchParams();

  addQueryParameters(query, input.queryParams);
  addHeaderParameters(headers, input.headerParams);
  addCookieHeader(headers, input.cookieParams);

  const auth = input.auth ?? { kind: 'none' };
  applyAuth(auth, headers, query, issues);

  let encodedBody: BodyInit | undefined;
  let curlBody: CurlBody | null = null;
  if (input.bodyText.trim()) {
    const encoded = encodeRequestBody(input.bodyText, normalizedContentType, issues);
    encodedBody = encoded.body;
    curlBody = encoded.curlBody;

    if (normalizedContentType && normalizedContentType !== 'multipart/form-data') {
      headers.set('Content-Type', input.contentType ?? normalizedContentType);
    }
  }

  if (input.acceptHeader && input.acceptHeader.trim()) {
    headers.set('Accept', input.acceptHeader.trim());
  }

  if (issues.length > 0) {
    throw new TryItExecutionError('validation', issues[0] ?? 'Request validation failed.', {
      issues,
    });
  }

  const url = buildFinalUrl(base as URL, resolvedPath, query);
  const headersRecord = headersToRecord(headers);
  const requestInit: RequestInit = {
    method,
    headers,
    body: encodedBody,
  };

  return {
    method,
    url,
    headers: headersRecord,
    requestInit,
    curlBody,
  };
}

export async function executeTryItRequest(
  request: BuiltTryItRequest,
  timeoutMs = 30_000,
  fetchFn: typeof fetch = fetch
): Promise<TryItExecutionResult> {
  const resolvedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : 30_000;
  try {
    return await executeTryItRequestInBrowser(request, resolvedTimeoutMs, fetchFn);
  } catch (error) {
    if (!isLikelyCorsError(error, request.url)) {
      if (error instanceof TryItExecutionError) {
        throw error;
      }

      throw new TryItExecutionError('network', 'Network request failed before a response was received.', {
        details: error instanceof Error ? error.message : 'Network request failed.',
      });
    }

    try {
      return await executeTryItRequestViaProxy(request, resolvedTimeoutMs, fetchFn);
    } catch (proxyError) {
      throw new TryItExecutionError(
        'cors',
        'The request was blocked before a response was received.',
        {
          details:
            `Likely CORS issue. Direct browser request was blocked, and proxy retry failed: ${formatProxyError(proxyError)}`,
        }
      );
    }
  }
}

export function normalizeContentType(contentType?: string): string {
  if (!contentType) {
    return '';
  }
  return contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function normalizeMethod(method: string): string {
  const trimmed = method.trim().toUpperCase();
  return trimmed || 'GET';
}

function resolvePath(
  pathTemplate: string,
  pathParams: Record<string, string>,
  issues: string[]
): string {
  let resolvedPath = pathTemplate;

  const seen = new Set<string>();
  PATH_TOKEN.lastIndex = 0;

  for (;;) {
    const match = PATH_TOKEN.exec(pathTemplate);
    if (!match) {
      break;
    }

    const parameterName = match[1]?.trim();
    if (!parameterName || seen.has(parameterName)) {
      continue;
    }
    seen.add(parameterName);

    const providedValue = pathParams[parameterName];
    if (!providedValue || !providedValue.trim()) {
      issues.push(`Path parameter "${parameterName}" is required.`);
      continue;
    }

    resolvedPath = resolvedPath.replaceAll(`{${parameterName}}`, encodeURIComponent(providedValue.trim()));
  }

  if (UNRESOLVED_PATH_TOKEN.test(resolvedPath)) {
    issues.push('Path parameter substitution is incomplete. Fill all template values before sending.');
  }

  return resolvedPath;
}

function validateRequiredParameters(
  parameters: TryItParameterDefinition[],
  queryParams: Record<string, string>,
  headerParams: Record<string, string>,
  issues: string[]
): void {
  for (const parameter of parameters) {
    if (!parameter.required) {
      continue;
    }

    if (parameter.location === 'query') {
      const value = queryParams[parameter.name];
      if (!value || !value.trim()) {
        issues.push(`Query parameter "${parameter.name}" is required.`);
      }
    }

    if (parameter.location === 'header') {
      const value = headerParams[parameter.name];
      if (!value || !value.trim()) {
        issues.push(`Header parameter "${parameter.name}" is required.`);
      }
    }
  }
}

function parseBaseUrl(baseUrl: string): URL | null {
  if (!baseUrl.trim()) {
    return null;
  }

  try {
    return new URL(baseUrl);
  } catch {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return new URL(baseUrl, window.location.origin);
    } catch {
      return null;
    }
  }
}

function buildFinalUrl(base: URL, resolvedPath: string, query: URLSearchParams): string {
  const next = new URL(base.toString());
  const basePath = next.pathname === '/' ? '' : next.pathname.replace(/\/+$/, '');
  const operationPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
  next.pathname = `${basePath}${operationPath}` || '/';
  next.search = query.toString();
  return next.toString();
}

function addQueryParameters(query: URLSearchParams, queryParams: Record<string, string>): void {
  for (const [key, value] of Object.entries(queryParams)) {
    if (value.trim()) {
      query.set(key, value.trim());
    }
  }
}

function addHeaderParameters(headers: Headers, headerParams: Record<string, string>): void {
  for (const [key, value] of Object.entries(headerParams)) {
    if (!value.trim()) {
      continue;
    }

    // Content-Type and Cookie are managed from body/cookie helpers.
    const normalizedKey = key.trim().toLowerCase();
    if (normalizedKey === 'content-type' || normalizedKey === 'cookie') {
      continue;
    }

    headers.set(key, value.trim());
  }
}

function addCookieHeader(headers: Headers, cookieParams: Record<string, string>): void {
  const entries = Object.entries(cookieParams)
    .map(([name, value]) => [name.trim(), value.trim()] as const)
    .filter(([name, value]) => Boolean(name) && Boolean(value));

  if (entries.length === 0) {
    return;
  }

  const cookieText = entries
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('; ');
  headers.set('Cookie', cookieText);
}

function applyAuth(
  auth: TryItAuthSelection,
  headers: Headers,
  query: URLSearchParams,
  issues: string[]
): void {
  switch (auth.kind) {
    case 'none':
      return;
    case 'bearer': {
      const token = auth.bearerToken?.trim();
      if (!token) {
        issues.push('Bearer token is required for the selected auth mode.');
        return;
      }
      headers.set('Authorization', `Bearer ${token}`);
      return;
    }
    case 'basic': {
      const username = auth.username ?? '';
      const password = auth.password ?? '';
      if (!username.trim() && !password.trim()) {
        issues.push('Username or password is required for Basic auth.');
        return;
      }
      const encoded = encodeBase64(`${username}:${password}`);
      headers.set('Authorization', `Basic ${encoded}`);
      return;
    }
    case 'apiKey': {
      const keyName = auth.apiKeyName?.trim();
      const keyValue = auth.apiKeyValue?.trim();
      const placement = auth.apiKeyIn;

      if (!keyName) {
        issues.push('API key name is missing for the selected auth mode.');
        return;
      }
      if (!keyValue) {
        issues.push('API key value is required for the selected auth mode.');
        return;
      }
      if (placement !== 'header' && placement !== 'query') {
        issues.push('API key auth must target either header or query.');
        return;
      }

      if (placement === 'header') {
        headers.set(keyName, keyValue);
      } else {
        query.set(keyName, keyValue);
      }
      return;
    }
  }
}

function encodeRequestBody(
  bodyText: string,
  normalizedContentType: string,
  issues: string[]
): {
  body: BodyInit;
  curlBody: CurlBody;
} {
  if (!normalizedContentType) {
    return {
      body: bodyText,
      curlBody: {
        kind: 'raw',
        value: bodyText,
      },
    };
  }

  if (normalizedContentType === 'application/json' || normalizedContentType.endsWith('+json')) {
    try {
      const parsed = JSON.parse(bodyText);
      const encoded = JSON.stringify(parsed);
      return {
        body: encoded,
        curlBody: {
          kind: 'raw',
          value: encoded,
        },
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Invalid JSON';
      issues.push(`Request body must be valid JSON: ${detail}`);
      return {
        body: bodyText,
        curlBody: {
          kind: 'raw',
          value: bodyText,
        },
      };
    }
  }

  if (normalizedContentType === 'application/x-www-form-urlencoded') {
    const formRecord = parseFormLikeInput(bodyText);
    if (!formRecord) {
      issues.push(
        'Form URL-encoded request body must be a JSON object, query string, or key/value lines.'
      );
      return {
        body: bodyText,
        curlBody: {
          kind: 'raw',
          value: bodyText,
        },
      };
    }

    const params = new URLSearchParams(
      Object.entries(formRecord).map(([key, value]) => [key, String(value ?? '')])
    );
    const encoded = params.toString();
    return {
      body: encoded,
      curlBody: {
        kind: 'raw',
        value: encoded,
      },
    };
  }

  if (normalizedContentType === 'multipart/form-data') {
    const formRecord = parseFormLikeInput(bodyText);
    if (!formRecord) {
      issues.push('Multipart request body must be a JSON object or key/value lines.');
      return {
        body: bodyText,
        curlBody: {
          kind: 'raw',
          value: bodyText,
        },
      };
    }

    const formData = new FormData();
    const entries: CurlFormEntry[] = [];
    for (const [name, value] of Object.entries(formRecord)) {
      const normalizedValue = String(value ?? '');
      formData.append(name, normalizedValue);
      entries.push({ name, value: normalizedValue });
    }

    return {
      body: formData,
      curlBody: {
        kind: 'multipart',
        entries,
      },
    };
  }

  return {
    body: bodyText,
    curlBody: {
      kind: 'raw',
      value: bodyText,
    },
  };
}

function parseFormLikeInput(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (isRecord(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    const params = new URLSearchParams(trimmed);
    if ([...params.keys()].length > 0) {
      return Object.fromEntries(params.entries());
    }

    const lines = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return {};
    }

    const entries = lines
      .map((line) => {
        const separator = line.includes('=') ? '=' : ':';
        const index = line.indexOf(separator);
        if (index <= 0) {
          return null;
        }
        const key = line.slice(0, index).trim();
        const rawValue = line.slice(index + 1).trim();
        if (!key) {
          return null;
        }
        return [key, rawValue] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null);

    if (entries.length === 0) {
      return null;
    }

    return Object.fromEntries(entries);
  }
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function isLikelyCorsError(error: unknown, requestUrl: string): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const target = new URL(requestUrl, window.location.origin);
    return target.origin !== window.location.origin;
  } catch {
    return false;
  }
}

async function executeTryItRequestInBrowser(
  request: BuiltTryItRequest,
  timeoutMs: number,
  fetchFn: typeof fetch
): Promise<TryItExecutionResult> {
  const controller = new AbortController();
  const started = performance.now();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(request.url, {
      ...request.requestInit,
      signal: controller.signal,
    });

    const durationMs = Math.max(0, Math.round(performance.now() - started));
    const bodyText = await response.text();
    const contentType = response.headers.get('content-type') ?? undefined;

    return {
      method: request.method,
      url: request.url,
      status: response.status,
      statusText: response.statusText,
      durationMs,
      headers: headersToRecord(response.headers),
      bodyText,
      contentType,
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new TryItExecutionError(
        'timeout',
        `Request timed out after ${timeoutMs} ms. Increase timeout and try again.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

interface ProxyTryItResponse {
  method: string;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  bodyText: string;
  contentType?: string;
}

function isProxyTryItResponse(value: unknown): value is ProxyTryItResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.method === 'string' &&
    typeof candidate.url === 'string' &&
    typeof candidate.status === 'number' &&
    typeof candidate.statusText === 'string' &&
    typeof candidate.durationMs === 'number' &&
    typeof candidate.bodyText === 'string' &&
    candidate.headers !== null &&
    typeof candidate.headers === 'object' &&
    !Array.isArray(candidate.headers)
  );
}

async function executeTryItRequestViaProxy(
  request: BuiltTryItRequest,
  timeoutMs: number,
  fetchFn: typeof fetch
): Promise<TryItExecutionResult> {
  const proxyUrl = new URL('/api/http/proxy', config.serverUrl);
  const proxyResponse = await fetchFn(proxyUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: request.method,
      url: request.url,
      headers: request.headers,
      timeoutMs,
      body: buildProxyRequestBody(request),
    }),
  });

  let payload: unknown = null;
  try {
    payload = await proxyResponse.json();
  } catch {
    // Ignore JSON parse errors and use fallback error below.
  }

  if (!proxyResponse.ok) {
    const errorMessage =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Proxy request failed (HTTP ${proxyResponse.status} ${proxyResponse.statusText}).`;
    throw new Error(errorMessage);
  }

  if (!isProxyTryItResponse(payload)) {
    throw new Error('Proxy returned an invalid response.');
  }

  return payload;
}

function buildProxyRequestBody(
  request: BuiltTryItRequest
): { kind: 'none' } | { kind: 'raw'; value: string } | { kind: 'multipart'; entries: CurlFormEntry[] } {
  if (!request.curlBody) {
    return { kind: 'none' };
  }

  if (request.curlBody.kind === 'raw') {
    return {
      kind: 'raw',
      value: request.curlBody.value,
    };
  }

  return {
    kind: 'multipart',
    entries: request.curlBody.entries,
  };
}

function formatProxyError(error: unknown): string {
  if (error instanceof TryItExecutionError) {
    return error.details ? `${error.message} ${error.details}` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown proxy error.';
}

function encodeBase64(value: string): string {
  if (typeof btoa === 'function') {
    return btoa(value);
  }

  const maybeBuffer = (
    globalThis as {
      Buffer?: {
        from(input: string, encoding: string): {
          toString(encoding: string): string;
        };
      };
    }
  ).Buffer;

  if (maybeBuffer) {
    return maybeBuffer.from(value, 'utf-8').toString('base64');
  }

  throw new Error('Base64 encoding is unavailable in this runtime.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
