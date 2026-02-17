import type {
  HttpMethodLower,
  OpenApiDocument,
  OpenApiOperationObject,
  OpenApiPathItemObject,
} from './parse.js';

export interface SpecMetadata {
  title: string;
  version: string;
  description?: string;
}

export interface EndpointNavItem {
  id: string;
  operationId?: string;
  method: string;
  methodLower: HttpMethodLower;
  path: string;
  summary?: string;
  description?: string;
  tag: string;
  tags: string[];
  deprecated: boolean;
}

export interface EndpointTagGroup {
  tag: string;
  endpoints: EndpointNavItem[];
}

export interface NormalizedOpenApi {
  metadata: SpecMetadata;
  endpoints: EndpointNavItem[];
  endpointById: Record<string, EndpointNavItem>;
  endpointGroups: EndpointTagGroup[];
}

const HTTP_METHODS: HttpMethodLower[] = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
];

const METHOD_ORDER = new Map<string, number>(
  HTTP_METHODS.map((method, index) => [method.toUpperCase(), index])
);

export function normalizeOpenApiDocument(document: OpenApiDocument): NormalizedOpenApi {
  const metadata: SpecMetadata = {
    title: document.info.title,
    version: document.info.version,
    description:
      typeof document.info.description === 'string' ? document.info.description : undefined,
  };

  const endpointById: Record<string, EndpointNavItem> = {};
  const grouped = new Map<string, EndpointNavItem[]>();
  const usedIds = new Set<string>();

  for (const [path, pathItemValue] of Object.entries(document.paths)) {
    const pathItem = pathItemValue as OpenApiPathItemObject;

    for (const methodLower of HTTP_METHODS) {
      const operation = pathItem[methodLower];
      if (!isOperationObject(operation)) {
        continue;
      }

      const method = methodLower.toUpperCase();
      const rawOperationId =
        typeof operation.operationId === 'string' && operation.operationId.trim()
          ? operation.operationId.trim()
          : undefined;
      const id = buildOperationId(rawOperationId ?? `${method} ${path}`, usedIds);
      const tags = normalizeTags(operation);

      for (const tag of tags) {
        const endpoint: EndpointNavItem = {
          id,
          operationId: rawOperationId,
          method,
          methodLower,
          path,
          summary: asOptionalString(operation.summary),
          description: asOptionalString(operation.description),
          tag,
          tags,
          deprecated: Boolean(operation.deprecated),
        };

        if (!endpointById[id]) {
          endpointById[id] = endpoint;
        }

        const existingGroup = grouped.get(tag);
        if (existingGroup) {
          existingGroup.push(endpoint);
        } else {
          grouped.set(tag, [endpoint]);
        }
      }
    }
  }

  const endpointGroups = Array.from(grouped.entries())
    .sort((a, b) => compareTags(a[0], b[0]))
    .map(([tag, endpoints]) => ({
      tag,
      endpoints: [...endpoints].sort(compareEndpoints),
    }));

  const endpoints = Object.values(endpointById).sort(compareEndpoints);

  return {
    metadata,
    endpoints,
    endpointById,
    endpointGroups,
  };
}

function normalizeTags(operation: OpenApiOperationObject): string[] {
  const tags = operation.tags
    ?.filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags && tags.length > 0 ? tags : ['Untagged'];
}

function buildOperationId(candidate: string, usedIds: Set<string>): string {
  const base = candidate.trim();
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }

  let suffix = 2;
  let nextId = `${base} (${suffix})`;
  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${base} (${suffix})`;
  }

  usedIds.add(nextId);
  return nextId;
}

function compareTags(a: string, b: string): number {
  if (a === 'Untagged') return 1;
  if (b === 'Untagged') return -1;
  return a.localeCompare(b);
}

function compareEndpoints(a: EndpointNavItem, b: EndpointNavItem): number {
  const pathCompare = a.path.localeCompare(b.path);
  if (pathCompare !== 0) {
    return pathCompare;
  }

  const methodA = METHOD_ORDER.get(a.method) ?? Number.MAX_SAFE_INTEGER;
  const methodB = METHOD_ORDER.get(b.method) ?? Number.MAX_SAFE_INTEGER;
  if (methodA !== methodB) {
    return methodA - methodB;
  }

  return a.id.localeCompare(b.id);
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return undefined;
}

function isOperationObject(value: unknown): value is OpenApiOperationObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
