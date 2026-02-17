<script lang="ts">
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  import { marked } from 'marked';
  import type { EndpointNavItem } from '../../lib/openapi/normalize.js';
  import type { OpenApiDocument } from '../../lib/openapi/parse.js';
  import {
    generateSchemaExample,
    pickMediaTypeExample,
    pickOpenApiExample,
    stringifyExample,
  } from '../../lib/openapi/examples.js';
  import {
    dereferenceOpenApiValue,
    isRecord,
  } from '../../lib/openapi/schema.js';
  import { specViewerStore } from '../../stores/spec-viewer.svelte.js';
  import SchemaTree from './SchemaTree.svelte';

  interface ServerOption {
    url: string;
    description?: string;
  }

  interface ParameterDetail {
    key: string;
    name: string;
    location: 'path' | 'query' | 'header' | 'cookie';
    description?: string;
    required: boolean;
    deprecated: boolean;
    schema?: unknown;
    example?: unknown;
  }

  interface RequestBodyContent {
    contentType: string;
    normalizedContentType: string;
    schema?: unknown;
    example?: unknown;
  }

  interface RequestBodyDetail {
    required: boolean;
    description?: string;
    contents: RequestBodyContent[];
  }

  interface ResponseHeaderDetail {
    name: string;
    description?: string;
    required: boolean;
    schema?: unknown;
    example?: unknown;
  }

  interface ResponseContentDetail {
    contentType: string;
    normalizedContentType: string;
    schema?: unknown;
    example?: unknown;
  }

  interface ResponseDetail {
    statusCode: string;
    description?: string;
    headers: ResponseHeaderDetail[];
    contents: ResponseContentDetail[];
  }

  interface OperationDetail {
    endpoint: EndpointNavItem;
    summary?: string;
    description?: string;
    operationId?: string;
    tags: string[];
    deprecated: boolean;
    servers: ServerOption[];
    parameters: ParameterDetail[];
    requestBody: RequestBodyDetail | null;
    responses: ResponseDetail[];
  }

  interface PayloadPreview {
    value: string;
    error?: string;
  }

  interface ResolvedHeaderLine {
    name: string;
    value: string;
    source: string;
  }

  const CONTENT_TYPE_ORDER = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
  ] as const;

  const SECTION_DEFS = [
    { id: 'spec-overview', label: 'Overview' },
    { id: 'spec-parameters', label: 'Parameters' },
    { id: 'spec-request-body', label: 'Request Body' },
    { id: 'spec-responses', label: 'Responses' },
    { id: 'spec-try-it-out', label: 'Try It Out' },
  ] as const;

  let selectedServerUrl = $state('');
  let expandedResponses = $state<Record<string, boolean>>({});
  let initializedEndpointId = $state<string | null>(null);
  let responseExpansionSeed = $state('');

  const currentEndpoint = $derived(specViewerStore.selectedEndpoint);
  const operationDetail = $derived(
    buildOperationDetail(specViewerStore.document, currentEndpoint)
  );
  const selectedRequestContent = $derived(
    pickSelectedRequestContent(operationDetail, specViewerStore.tryIt.contentType)
  );
  const summaryHtml = $derived(renderMarkdown(operationDetail?.summary));
  const descriptionHtml = $derived(renderMarkdown(operationDetail?.description));
  const resolvedPath = $derived(
    operationDetail
      ? resolvePathTemplate(
          operationDetail.endpoint.path,
          operationDetail.parameters,
          specViewerStore.tryIt.pathParams
        )
      : ''
  );
  const payloadPreview = $derived(
    buildPayloadPreview(specViewerStore.tryIt.contentType, specViewerStore.tryIt.requestBodyText)
  );
  const resolvedHeaders = $derived(
    operationDetail
      ? buildResolvedHeaderLines(
          operationDetail,
          specViewerStore.tryIt.headerParams,
          specViewerStore.tryIt.contentType
        )
      : []
  );

  onMount(() => {
    const handleHashChange = (): void => {
      selectEndpointFromHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  });

  $effect(() => {
    const endpointCount = Object.keys(specViewerStore.endpointById).length;
    if (endpointCount > 0) {
      selectEndpointFromHash(window.location.hash);
    }
  });

  $effect(() => {
    if (!operationDetail) {
      return;
    }

    const key = getOperationHashKey(operationDetail.endpoint);
    const nextHash = `#op/${encodeURIComponent(key)}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  });

  $effect(() => {
    const detail = operationDetail;
    if (!detail) {
      initializedEndpointId = null;
      return;
    }

    if (initializedEndpointId === detail.endpoint.id) {
      return;
    }
    initializedEndpointId = detail.endpoint.id;

    const initialServerUrl = detail.servers[0]?.url ?? '';
    selectedServerUrl = initialServerUrl;

    const initialDrafts = buildInitialParamDrafts(detail, specViewerStore.document);
    const preferredContentType = pickPreferredContentType(detail.requestBody?.contents ?? []);
    const initialBodyText = preferredContentType
      ? buildInitialRequestBodyText(preferredContentType, detail.requestBody?.contents ?? [], specViewerStore.document)
      : '';

    specViewerStore.setTryItDraft({
      baseUrl: initialServerUrl,
      pathParams: initialDrafts.pathParams,
      queryParams: initialDrafts.queryParams,
      headerParams: initialDrafts.headerParams,
      cookieParams: initialDrafts.cookieParams,
      contentType: preferredContentType ?? undefined,
      requestBodyText: initialBodyText,
      lastResponse: null,
    });
  });

  $effect(() => {
    const detail = operationDetail;
    if (!detail) {
      responseExpansionSeed = '';
      expandedResponses = {};
      return;
    }

    const seed = `${detail.endpoint.id}:${detail.responses.map((response) => response.statusCode).join('|')}`;
    if (responseExpansionSeed === seed) {
      return;
    }
    responseExpansionSeed = seed;

    const defaultExpandedStatus = pickDefaultExpandedStatus(detail.responses);
    expandedResponses = Object.fromEntries(
      detail.responses.map((response) => [response.statusCode, response.statusCode === defaultExpandedStatus])
    );
  });

  function getMethodClass(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'method-get';
      case 'POST':
        return 'method-post';
      case 'PUT':
      case 'PATCH':
        return 'method-put';
      case 'DELETE':
        return 'method-delete';
      default:
        return 'method-other';
    }
  }

  function scrollToSection(sectionId: string): void {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function updateBaseUrl(value: string): void {
    specViewerStore.setTryItDraft({
      baseUrl: value,
    });
  }

  function handleServerChange(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    selectedServerUrl = value;
    if (value) {
      updateBaseUrl(value);
    }
  }

  function handleBaseUrlInput(event: Event): void {
    const value = (event.currentTarget as HTMLInputElement).value;
    updateBaseUrl(value);

    const detail = operationDetail;
    if (!detail) {
      selectedServerUrl = '';
      return;
    }

    const matching = detail.servers.find((server) => server.url === value);
    selectedServerUrl = matching?.url ?? '';
  }

  function updateParameterDraft(
    location: ParameterDetail['location'],
    parameterName: string,
    value: string
  ): void {
    switch (location) {
      case 'path':
        specViewerStore.setTryItDraft({
          pathParams: {
            ...specViewerStore.tryIt.pathParams,
            [parameterName]: value,
          },
        });
        return;
      case 'query':
        specViewerStore.setTryItDraft({
          queryParams: {
            ...specViewerStore.tryIt.queryParams,
            [parameterName]: value,
          },
        });
        return;
      case 'header':
        specViewerStore.setTryItDraft({
          headerParams: {
            ...specViewerStore.tryIt.headerParams,
            [parameterName]: value,
          },
        });
        return;
      case 'cookie':
        specViewerStore.setTryItDraft({
          cookieParams: {
            ...specViewerStore.tryIt.cookieParams,
            [parameterName]: value,
          },
        });
    }
  }

  function readParameterDraft(location: ParameterDetail['location'], parameterName: string): string {
    switch (location) {
      case 'path':
        return specViewerStore.tryIt.pathParams[parameterName] ?? '';
      case 'query':
        return specViewerStore.tryIt.queryParams[parameterName] ?? '';
      case 'header':
        return specViewerStore.tryIt.headerParams[parameterName] ?? '';
      case 'cookie':
        return specViewerStore.tryIt.cookieParams[parameterName] ?? '';
    }
  }

  function selectRequestBodyContent(contentType: string): void {
    const detail = operationDetail;
    const apiDocument = specViewerStore.document;
    if (!detail || !apiDocument) {
      return;
    }

    const bodyText = buildInitialRequestBodyText(
      contentType,
      detail.requestBody?.contents ?? [],
      apiDocument
    );
    specViewerStore.setTryItDraft({
      contentType,
      requestBodyText: bodyText,
    });
  }

  function handleRequestBodyInput(event: Event): void {
    specViewerStore.setTryItDraft({
      requestBodyText: (event.currentTarget as HTMLTextAreaElement).value,
    });
  }

  function toggleResponse(statusCode: string): void {
    expandedResponses = {
      ...expandedResponses,
      [statusCode]: !expandedResponses[statusCode],
    };
  }

  function parameterGroups(parameters: ParameterDetail[]): Record<ParameterDetail['location'], ParameterDetail[]> {
    return {
      path: parameters.filter((parameter) => parameter.location === 'path'),
      query: parameters.filter((parameter) => parameter.location === 'query'),
      header: parameters.filter((parameter) => parameter.location === 'header'),
      cookie: parameters.filter((parameter) => parameter.location === 'cookie'),
    };
  }

  function selectEndpointFromHash(hash: string): void {
    const key = parseHashKey(hash);
    if (!key) {
      return;
    }

    const endpointId = matchEndpointIdFromHashKey(key, specViewerStore.endpointById);
    if (!endpointId || endpointId === specViewerStore.selectedEndpointId) {
      return;
    }

    specViewerStore.selectEndpoint(endpointId);
  }

  function buildOperationDetail(
    apiDocument: OpenApiDocument | null,
    endpoint: EndpointNavItem | null
  ): OperationDetail | null {
    if (!apiDocument || !endpoint) {
      return null;
    }

    const pathItem = apiDocument.paths[endpoint.path];
    if (!isRecord(pathItem)) {
      return null;
    }

    const operation = pathItem[endpoint.methodLower];
    if (!isRecord(operation)) {
      return null;
    }

    const operationId = asOptionalString(operation.operationId) ?? endpoint.operationId;
    const summary = asOptionalString(operation.summary) ?? endpoint.summary;
    const description = asOptionalString(operation.description) ?? endpoint.description;
    const tags = normalizeStringArray(operation.tags, endpoint.tags);
    const deprecated = Boolean(operation.deprecated ?? endpoint.deprecated);

    const parameters = collectOperationParameters(pathItem.parameters, operation.parameters, apiDocument);
    const requestBody = resolveRequestBodyDetail(operation.requestBody, apiDocument);
    const responses = resolveResponseDetails(operation.responses, apiDocument);
    const servers = pickServerOptions(operation.servers, apiDocument.servers);

    return {
      endpoint,
      summary,
      description,
      operationId,
      tags,
      deprecated,
      servers,
      parameters,
      requestBody,
      responses,
    };
  }

  function collectOperationParameters(
    pathParametersInput: unknown,
    operationParametersInput: unknown,
    apiDocument: OpenApiDocument
  ): ParameterDetail[] {
    const merged = new Map<string, ParameterDetail>();

    const addParameter = (value: unknown): void => {
      const parameter = resolveParameter(value, apiDocument);
      if (!parameter) {
        return;
      }
      merged.set(parameter.key, parameter);
    };

    if (Array.isArray(pathParametersInput)) {
      pathParametersInput.forEach(addParameter);
    }
    if (Array.isArray(operationParametersInput)) {
      operationParametersInput.forEach(addParameter);
    }

    return Array.from(merged.values()).sort(compareParameters);
  }

  function resolveParameter(value: unknown, apiDocument: OpenApiDocument): ParameterDetail | null {
    const resolved = dereferenceOpenApiValue(value, apiDocument);
    if (!isRecord(resolved)) {
      return null;
    }

    const location = resolved.in;
    if (location !== 'path' && location !== 'query' && location !== 'header' && location !== 'cookie') {
      return null;
    }

    const name = asOptionalString(resolved.name);
    if (!name) {
      return null;
    }

    return {
      key: `${location}:${name.toLowerCase()}`,
      name,
      location,
      description: asOptionalString(resolved.description),
      required: location === 'path' ? true : Boolean(resolved.required),
      deprecated: Boolean(resolved.deprecated),
      schema: resolved.schema,
      example: pickOpenApiExample(resolved),
    };
  }

  function resolveRequestBodyDetail(value: unknown, apiDocument: OpenApiDocument): RequestBodyDetail | null {
    const resolved = dereferenceOpenApiValue(value, apiDocument);
    if (!isRecord(resolved)) {
      return null;
    }

    const content = isRecord(resolved.content) ? resolved.content : null;
    const contents: RequestBodyContent[] = [];

    if (content) {
      for (const [contentType, mediaType] of Object.entries(content)) {
        if (!isRecord(mediaType)) {
          continue;
        }
        contents.push({
          contentType,
          normalizedContentType: normalizeContentType(contentType),
          schema: mediaType.schema,
          example: pickMediaTypeExample(mediaType),
        });
      }
    }

    contents.sort(compareRequestContentTypes);

    return {
      required: Boolean(resolved.required),
      description: asOptionalString(resolved.description),
      contents,
    };
  }

  function resolveResponseDetails(value: unknown, apiDocument: OpenApiDocument): ResponseDetail[] {
    if (!isRecord(value)) {
      return [];
    }

    const responses: ResponseDetail[] = [];
    for (const [statusCode, rawResponse] of Object.entries(value)) {
      const resolvedResponse = dereferenceOpenApiValue(rawResponse, apiDocument);
      if (!isRecord(resolvedResponse)) {
        continue;
      }

      const headers = resolveResponseHeaders(resolvedResponse.headers, apiDocument);
      const contents = resolveResponseContents(resolvedResponse.content);

      responses.push({
        statusCode,
        description: asOptionalString(resolvedResponse.description),
        headers,
        contents,
      });
    }

    responses.sort((left, right) => compareStatusCodes(left.statusCode, right.statusCode));
    return responses;
  }

  function resolveResponseHeaders(value: unknown, apiDocument: OpenApiDocument): ResponseHeaderDetail[] {
    if (!isRecord(value)) {
      return [];
    }

    const headers: ResponseHeaderDetail[] = [];
    for (const [headerName, headerValue] of Object.entries(value)) {
      const resolved = dereferenceOpenApiValue(headerValue, apiDocument);
      if (!isRecord(resolved)) {
        continue;
      }

      headers.push({
        name: headerName,
        description: asOptionalString(resolved.description),
        required: Boolean(resolved.required),
        schema: resolved.schema,
        example: pickOpenApiExample(resolved),
      });
    }

    return headers.sort((left, right) => left.name.localeCompare(right.name));
  }

  function resolveResponseContents(value: unknown): ResponseContentDetail[] {
    if (!isRecord(value)) {
      return [];
    }

    const contents: ResponseContentDetail[] = [];
    for (const [contentType, mediaType] of Object.entries(value)) {
      if (!isRecord(mediaType)) {
        continue;
      }

      contents.push({
        contentType,
        normalizedContentType: normalizeContentType(contentType),
        schema: mediaType.schema,
        example: pickMediaTypeExample(mediaType),
      });
    }

    contents.sort(compareRequestContentTypes);
    return contents;
  }

  function pickServerOptions(operationServersValue: unknown, globalServersValue: unknown): ServerOption[] {
    const operationServers = normalizeServers(operationServersValue);
    if (operationServers.length > 0) {
      return operationServers;
    }

    return normalizeServers(globalServersValue);
  }

  function normalizeServers(value: unknown): ServerOption[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const servers: ServerOption[] = [];
    for (const entry of value) {
      if (!isRecord(entry)) {
        continue;
      }
      const url = asOptionalString(entry.url);
      if (!url) {
        continue;
      }
      servers.push({
        url,
        description: asOptionalString(entry.description),
      });
    }

    return servers;
  }

  function buildInitialParamDrafts(
    detail: OperationDetail,
    apiDocument: OpenApiDocument | null
  ): {
    pathParams: Record<string, string>;
    queryParams: Record<string, string>;
    headerParams: Record<string, string>;
    cookieParams: Record<string, string>;
  } {
    const pathParams: Record<string, string> = {};
    const queryParams: Record<string, string> = {};
    const headerParams: Record<string, string> = {};
    const cookieParams: Record<string, string> = {};

    for (const parameter of detail.parameters) {
      const initialValue = inferParameterInitialValue(parameter, apiDocument);
      switch (parameter.location) {
        case 'path':
          pathParams[parameter.name] = initialValue;
          break;
        case 'query':
          queryParams[parameter.name] = initialValue;
          break;
        case 'header':
          headerParams[parameter.name] = initialValue;
          break;
        case 'cookie':
          cookieParams[parameter.name] = initialValue;
          break;
      }
    }

    return { pathParams, queryParams, headerParams, cookieParams };
  }

  function inferParameterInitialValue(parameter: ParameterDetail, apiDocument: OpenApiDocument | null): string {
    if (parameter.example !== undefined) {
      return stringifyParamValue(parameter.example);
    }

    if (parameter.schema && apiDocument) {
      return stringifyParamValue(generateSchemaExample(parameter.schema, apiDocument));
    }

    return '';
  }

  function stringifyParamValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return stringifyExample(value, 'application/json');
  }

  function pickPreferredContentType(contents: RequestBodyContent[]): string | null {
    if (contents.length === 0) {
      return null;
    }

    for (const preferred of CONTENT_TYPE_ORDER) {
      const found = contents.find((entry) => entry.normalizedContentType === preferred);
      if (found) {
        return found.contentType;
      }
    }

    return contents[0]?.contentType ?? null;
  }

  function pickSelectedRequestContent(
    detail: OperationDetail | null,
    activeContentType?: string
  ): RequestBodyContent | null {
    if (!detail?.requestBody || detail.requestBody.contents.length === 0) {
      return null;
    }

    if (activeContentType) {
      const match = detail.requestBody.contents.find(
        (entry) => entry.contentType === activeContentType
      );
      if (match) {
        return match;
      }
    }

    return detail.requestBody.contents[0] ?? null;
  }

  function buildInitialRequestBodyText(
    contentType: string,
    contents: RequestBodyContent[],
    apiDocument: OpenApiDocument | null
  ): string {
    const content = contents.find((entry) => entry.contentType === contentType);
    if (!content) {
      return '';
    }

    const example = content.example ?? (content.schema && apiDocument
      ? generateSchemaExample(content.schema, apiDocument)
      : undefined);
    return stringifyExample(example, contentType);
  }

  function buildPayloadPreview(contentType: string | undefined, bodyText: string): PayloadPreview {
    const normalizedContentType = normalizeContentType(contentType ?? '');

    if (!bodyText.trim()) {
      return {
        value: '',
      };
    }

    if (normalizedContentType === 'application/json' || normalizedContentType.endsWith('+json')) {
      try {
        const parsed = JSON.parse(bodyText);
        return {
          value: JSON.stringify(parsed, null, 2),
        };
      } catch (error) {
        return {
          value: bodyText,
          error: error instanceof Error ? error.message : 'Invalid JSON body',
        };
      }
    }

    if (normalizedContentType === 'application/x-www-form-urlencoded') {
      const record = parseLooseObject(bodyText);
      if (record) {
        return {
          value: new URLSearchParams(
            Object.entries(record).map(([key, value]) => [key, String(value ?? '')])
          ).toString(),
        };
      }

      return {
        value: bodyText,
      };
    }

    if (normalizedContentType === 'multipart/form-data') {
      const record = parseLooseObject(bodyText);
      if (record) {
        return {
          value: Object.entries(record)
            .map(([key, value]) => `${key}: ${String(value ?? '')}`)
            .join('\n'),
        };
      }

      return {
        value: bodyText,
      };
    }

    return {
      value: bodyText,
    };
  }

  function parseLooseObject(value: string): Record<string, unknown> | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }

    try {
      const parsed = JSON.parse(trimmed);
      return isRecord(parsed) ? parsed : null;
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
          const delimiter = line.includes('=') ? '=' : ':';
          const index = line.indexOf(delimiter);
          if (index <= 0) {
            return null;
          }
          const key = line.slice(0, index).trim();
          const rawValue = line.slice(index + 1).trim();
          return [key, rawValue] as const;
        })
        .filter((entry): entry is readonly [string, string] => entry !== null);

      if (entries.length === 0) {
        return null;
      }

      return Object.fromEntries(entries);
    }
  }

  function responseExampleText(
    content: ResponseContentDetail,
    apiDocument: OpenApiDocument | null
  ): string {
    const example =
      content.example ??
      (content.schema && apiDocument ? generateSchemaExample(content.schema, apiDocument) : undefined);

    return example !== undefined
      ? stringifyExample(example, content.contentType)
      : '(no example provided)';
  }

  function buildResolvedHeaderLines(
    detail: OperationDetail,
    draftHeaderParams: Record<string, string>,
    contentType: string | undefined
  ): ResolvedHeaderLine[] {
    const lines: ResolvedHeaderLine[] = [];
    const seen = new Set<string>();

    const add = (name: string, value: string, source: string): void => {
      const key = name.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      lines.push({ name, value, source });
    };

    for (const parameter of detail.parameters) {
      if (parameter.location !== 'header') {
        continue;
      }

      const value = draftHeaderParams[parameter.name] ?? '';
      add(parameter.name, value || '(unset)', 'parameter');
    }

    const normalized = normalizeContentType(contentType ?? '');
    if (normalized && detail.requestBody) {
      add('Content-Type', contentType ?? normalized, 'request body');
    }

    const accept = pickAcceptHeader(detail.responses);
    if (accept) {
      add('Accept', accept, 'response docs');
    }

    return lines;
  }

  function pickAcceptHeader(responses: ResponseDetail[]): string | null {
    const allTypes = new Set<string>();
    for (const response of responses) {
      for (const content of response.contents) {
        allTypes.add(content.contentType);
      }
    }

    return allTypes.size > 0 ? Array.from(allTypes).join(', ') : null;
  }

  function pickDefaultExpandedStatus(responses: ResponseDetail[]): string | null {
    const success = responses.find((response) => is2xxStatus(response.statusCode));
    if (success) {
      return success.statusCode;
    }

    return responses[0]?.statusCode ?? null;
  }

  function is2xxStatus(statusCode: string): boolean {
    return /^2\d\d$/.test(statusCode) || statusCode === '2XX';
  }

  function compareStatusCodes(left: string, right: string): number {
    return statusSortValue(left) - statusSortValue(right);
  }

  function statusSortValue(statusCode: string): number {
    if (statusCode === 'default') {
      return 100000;
    }

    const wildcard = /^(\d)XX$/.exec(statusCode);
    if (wildcard) {
      return Number(wildcard[1]) * 100 + 50;
    }

    const numeric = Number.parseInt(statusCode, 10);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    return 100001;
  }

  function compareRequestContentTypes(left: { normalizedContentType: string }, right: { normalizedContentType: string }): number {
    const leftIndex = CONTENT_TYPE_ORDER.indexOf(left.normalizedContentType as (typeof CONTENT_TYPE_ORDER)[number]);
    const rightIndex = CONTENT_TYPE_ORDER.indexOf(right.normalizedContentType as (typeof CONTENT_TYPE_ORDER)[number]);

    const normalizedLeft = leftIndex >= 0 ? leftIndex : CONTENT_TYPE_ORDER.length;
    const normalizedRight = rightIndex >= 0 ? rightIndex : CONTENT_TYPE_ORDER.length;
    if (normalizedLeft !== normalizedRight) {
      return normalizedLeft - normalizedRight;
    }

    return left.normalizedContentType.localeCompare(right.normalizedContentType);
  }

  function compareParameters(left: ParameterDetail, right: ParameterDetail): number {
    const order: Record<ParameterDetail['location'], number> = {
      path: 0,
      query: 1,
      header: 2,
      cookie: 3,
    };

    if (order[left.location] !== order[right.location]) {
      return order[left.location] - order[right.location];
    }

    return left.name.localeCompare(right.name);
  }

  function normalizeStringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) {
      return fallback;
    }

    const entries = value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);

    return entries.length > 0 ? entries : fallback;
  }

  function resolvePathTemplate(
    pathTemplate: string,
    parameters: ParameterDetail[],
    pathDrafts: Record<string, string>
  ): string {
    const pathParams = parameters.filter((parameter) => parameter.location === 'path');
    let resolved = pathTemplate;

    for (const parameter of pathParams) {
      const rawValue = pathDrafts[parameter.name];
      const safeValue =
        typeof rawValue === 'string' && rawValue.trim() ? encodeURIComponent(rawValue.trim()) : `{${parameter.name}}`;
      resolved = resolved.replaceAll(`{${parameter.name}}`, safeValue);
    }

    return resolved;
  }

  function parseHashKey(hash: string): string | null {
    if (!hash.startsWith('#op/')) {
      return null;
    }

    const encoded = hash.slice(4);
    if (!encoded) {
      return null;
    }

    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  function matchEndpointIdFromHashKey(
    key: string,
    endpointById: Record<string, EndpointNavItem>
  ): string | null {
    const endpoints = Object.values(endpointById);

    const operationIdMatch = endpoints.find(
      (endpoint) => endpoint.operationId && endpoint.operationId === key
    );
    if (operationIdMatch) {
      return operationIdMatch.id;
    }

    const methodPathMatch = endpoints.find((endpoint) => `${endpoint.method} ${endpoint.path}` === key);
    if (methodPathMatch) {
      return methodPathMatch.id;
    }

    return endpointById[key] ? key : null;
  }

  function getOperationHashKey(endpoint: EndpointNavItem): string {
    const operationId = endpoint.operationId?.trim();
    if (operationId) {
      return operationId;
    }

    return `${endpoint.method} ${endpoint.path}`;
  }

  function renderMarkdown(value: string | undefined): string {
    if (!value || !value.trim()) {
      return '';
    }

    const parsed = marked.parse(value, {
      async: false,
      gfm: true,
      breaks: true,
    });

    return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
  }

  function asOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    return undefined;
  }

  function normalizeContentType(contentType: string): string {
    return contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  }

  function isSupportedRequestType(contentType: string): boolean {
    return CONTENT_TYPE_ORDER.includes(
      normalizeContentType(contentType) as (typeof CONTENT_TYPE_ORDER)[number]
    );
  }
</script>

{#if operationDetail}
  {@const groupedParameters = parameterGroups(operationDetail.parameters)}

  <article class="endpoint-detail" aria-label="Selected endpoint details">
    <nav class="section-nav" aria-label="Endpoint detail sections">
      {#each SECTION_DEFS as section (section.id)}
        <button type="button" onclick={() => scrollToSection(section.id)}>{section.label}</button>
      {/each}
    </nav>

    <section id="spec-overview" class="detail-section">
      <h2>Overview</h2>

      <div class="operation-title">
        <span class="method {getMethodClass(operationDetail.endpoint.method)}">
          {operationDetail.endpoint.method}
        </span>
        <code class="operation-path">{resolvedPath}</code>
      </div>

      {#if summaryHtml}
        <div class="markdown-block" aria-label="Operation summary">
          {@html summaryHtml}
        </div>
      {/if}

      {#if descriptionHtml}
        <div class="markdown-block description" aria-label="Operation description">
          {@html descriptionHtml}
        </div>
      {/if}

      <div class="overview-grid">
        <div class="overview-row">
          <strong>operationId</strong>
          <span>{operationDetail.operationId ?? 'Not defined'}</span>
        </div>
        <div class="overview-row">
          <strong>tags</strong>
          <span>{operationDetail.tags.join(', ')}</span>
        </div>
        <div class="overview-row">
          <strong>deprecated</strong>
          <span class:deprecated-text={operationDetail.deprecated}>
            {operationDetail.deprecated ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div class="server-panel">
        <h3>Base URL</h3>
        <p class="server-help">
          Server precedence: operation-level servers first, then global servers.
        </p>

        <div class="server-row">
          <label for="server-selector">Server selector</label>
          <select
            id="server-selector"
            bind:value={selectedServerUrl}
            onchange={handleServerChange}
          >
            <option value="">Custom override</option>
            {#each operationDetail.servers as server (server.url)}
              <option value={server.url}>
                {server.url}
                {#if server.description} ({server.description}){/if}
              </option>
            {/each}
          </select>
        </div>

        <div class="server-row">
          <label for="manual-base-url">Manual base URL override</label>
          <input
            id="manual-base-url"
            type="text"
            value={specViewerStore.tryIt.baseUrl}
            placeholder="https://api.example.com"
            oninput={handleBaseUrlInput}
          />
        </div>

        <p class="resolved-url-preview">
          Resolved request URL:
          <code>{specViewerStore.tryIt.baseUrl || '(base URL not set)'}{resolvedPath}</code>
        </p>
      </div>
    </section>

    <section id="spec-parameters" class="detail-section">
      <h2>Parameters</h2>

      {#if operationDetail.parameters.length === 0}
        <p class="placeholder">No parameters are defined for this operation.</p>
      {:else}
        {#if groupedParameters.path.length > 0}
          <div class="parameter-group">
            <h3>Path Parameters</h3>
            {#each groupedParameters.path as parameter (parameter.key)}
              <div class="parameter-card">
                <div class="parameter-topline">
                  <code>{parameter.name}</code>
                  {#if parameter.required}
                    <span class="required-chip">required</span>
                  {/if}
                  {#if parameter.deprecated}
                    <span class="deprecated-chip">deprecated</span>
                  {/if}
                </div>
                {#if parameter.description}
                  <p>{parameter.description}</p>
                {/if}

                <label>
                  Value
                  <input
                    type="text"
                    value={readParameterDraft(parameter.location, parameter.name)}
                    oninput={(event) =>
                      updateParameterDraft(
                        parameter.location,
                        parameter.name,
                        (event.currentTarget as HTMLInputElement).value
                      )}
                  />
                </label>

                {#if parameter.schema && specViewerStore.document}
                  <SchemaTree
                    schema={parameter.schema}
                    document={specViewerStore.document}
                    name={`${parameter.name} schema`}
                    required={parameter.required}
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if groupedParameters.query.length > 0}
          <div class="parameter-group">
            <h3>Query Parameters</h3>
            {#each groupedParameters.query as parameter (parameter.key)}
              <div class="parameter-card">
                <div class="parameter-topline">
                  <code>{parameter.name}</code>
                  {#if parameter.required}
                    <span class="required-chip">required</span>
                  {/if}
                  {#if parameter.deprecated}
                    <span class="deprecated-chip">deprecated</span>
                  {/if}
                </div>
                {#if parameter.description}
                  <p>{parameter.description}</p>
                {/if}

                <label>
                  Value
                  <input
                    type="text"
                    value={readParameterDraft(parameter.location, parameter.name)}
                    oninput={(event) =>
                      updateParameterDraft(
                        parameter.location,
                        parameter.name,
                        (event.currentTarget as HTMLInputElement).value
                      )}
                  />
                </label>

                {#if parameter.schema && specViewerStore.document}
                  <SchemaTree
                    schema={parameter.schema}
                    document={specViewerStore.document}
                    name={`${parameter.name} schema`}
                    required={parameter.required}
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if groupedParameters.header.length > 0}
          <div class="parameter-group">
            <h3>Header Parameters</h3>
            {#each groupedParameters.header as parameter (parameter.key)}
              <div class="parameter-card">
                <div class="parameter-topline">
                  <code>{parameter.name}</code>
                  {#if parameter.required}
                    <span class="required-chip">required</span>
                  {/if}
                  {#if parameter.deprecated}
                    <span class="deprecated-chip">deprecated</span>
                  {/if}
                </div>
                {#if parameter.description}
                  <p>{parameter.description}</p>
                {/if}

                <label>
                  Value
                  <input
                    type="text"
                    value={readParameterDraft(parameter.location, parameter.name)}
                    oninput={(event) =>
                      updateParameterDraft(
                        parameter.location,
                        parameter.name,
                        (event.currentTarget as HTMLInputElement).value
                      )}
                  />
                </label>

                {#if parameter.schema && specViewerStore.document}
                  <SchemaTree
                    schema={parameter.schema}
                    document={specViewerStore.document}
                    name={`${parameter.name} schema`}
                    required={parameter.required}
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if groupedParameters.cookie.length > 0}
          <div class="parameter-group">
            <h3>Cookie Parameters</h3>
            {#each groupedParameters.cookie as parameter (parameter.key)}
              <div class="parameter-card">
                <div class="parameter-topline">
                  <code>{parameter.name}</code>
                  {#if parameter.required}
                    <span class="required-chip">required</span>
                  {/if}
                  {#if parameter.deprecated}
                    <span class="deprecated-chip">deprecated</span>
                  {/if}
                </div>
                {#if parameter.description}
                  <p>{parameter.description}</p>
                {/if}

                <label>
                  Value
                  <input
                    type="text"
                    value={readParameterDraft(parameter.location, parameter.name)}
                    oninput={(event) =>
                      updateParameterDraft(
                        parameter.location,
                        parameter.name,
                        (event.currentTarget as HTMLInputElement).value
                      )}
                  />
                </label>

                {#if parameter.schema && specViewerStore.document}
                  <SchemaTree
                    schema={parameter.schema}
                    document={specViewerStore.document}
                    name={`${parameter.name} schema`}
                    required={parameter.required}
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      {/if}

      <div class="headers-panel">
        <h3>Resolved Request Headers</h3>
        {#if resolvedHeaders.length === 0}
          <p class="placeholder">No outgoing headers are currently defined.</p>
        {:else}
          <div class="headers-table">
            <div class="headers-head">
              <span>Header</span>
              <span>Value</span>
              <span>Source</span>
            </div>
            {#each resolvedHeaders as header (`${header.name}:${header.source}`)}
              <div class="headers-row">
                <code>{header.name}</code>
                <code>{header.value}</code>
                <span>{header.source}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <section id="spec-request-body" class="detail-section">
      <h2>Request Body</h2>

      {#if !operationDetail.requestBody}
        <p class="placeholder">Request body is not defined in this OpenAPI operation.</p>
      {:else}
        {#if operationDetail.requestBody.description}
          <p>{operationDetail.requestBody.description}</p>
        {/if}
        <p class="request-body-required">
          Required: <strong>{operationDetail.requestBody.required ? 'Yes' : 'No'}</strong>
        </p>

        {#if operationDetail.requestBody.contents.length === 0}
          <p class="placeholder">No request body content entries are defined.</p>
        {:else}
          <div class="content-type-tabs">
            {#each operationDetail.requestBody.contents as content (content.contentType)}
              <button
                type="button"
                class:active={specViewerStore.tryIt.contentType === content.contentType}
                onclick={() => selectRequestBodyContent(content.contentType)}
              >
                {content.contentType}
                {#if !isSupportedRequestType(content.contentType)}
                  <span class="unsupported-note">raw only</span>
                {/if}
              </button>
            {/each}
          </div>

          {#if selectedRequestContent}
            <div class="request-body-grid">
              <div class="request-body-pane">
                <h3>Schema</h3>
                {#if selectedRequestContent.schema && specViewerStore.document}
                  <SchemaTree
                    schema={selectedRequestContent.schema}
                    document={specViewerStore.document}
                    name={selectedRequestContent.contentType}
                    initiallyExpanded={true}
                  />
                {:else}
                  <p class="placeholder">Schema is not defined for this content type.</p>
                {/if}
              </div>

              <div class="request-body-pane">
                <h3>Example Payload Editor</h3>
                <textarea
                  value={specViewerStore.tryIt.requestBodyText}
                  spellcheck="false"
                  oninput={handleRequestBodyInput}
                ></textarea>

                <h3>Generated Payload Preview</h3>
                {#if payloadPreview.error}
                  <p class="error-text">{payloadPreview.error}</p>
                {/if}
                <pre>{payloadPreview.value || '(empty payload)'}</pre>
              </div>
            </div>
          {/if}
        {/if}
      {/if}
    </section>

    <section id="spec-responses" class="detail-section">
      <h2>Responses</h2>

      {#if operationDetail.responses.length === 0}
        <p class="placeholder">No responses are documented for this operation.</p>
      {:else}
        <div class="response-list">
          {#each operationDetail.responses as response (response.statusCode)}
            <article class="response-card">
              <button
                type="button"
                class="response-toggle"
                onclick={() => toggleResponse(response.statusCode)}
                aria-expanded={expandedResponses[response.statusCode] ? 'true' : 'false'}
              >
                <span class="response-status">{response.statusCode}</span>
                <span>{response.description ?? 'No description provided'}</span>
                <span class="response-chevron">{expandedResponses[response.statusCode] ? '▾' : '▸'}</span>
              </button>

              {#if expandedResponses[response.statusCode]}
                <div class="response-content">
                  <h4>Headers</h4>
                  {#if response.headers.length === 0}
                    <p class="placeholder">No response headers are documented.</p>
                  {:else}
                    {#each response.headers as header (header.name)}
                      <div class="response-header-card">
                        <div class="parameter-topline">
                          <code>{header.name}</code>
                          {#if header.required}
                            <span class="required-chip">required</span>
                          {/if}
                        </div>
                        {#if header.description}
                          <p>{header.description}</p>
                        {/if}
                        {#if header.schema && specViewerStore.document}
                          <SchemaTree
                            schema={header.schema}
                            document={specViewerStore.document}
                            name={`${header.name} header`}
                            required={header.required}
                          />
                        {:else}
                          <p class="placeholder">Header schema is not defined.</p>
                        {/if}
                      </div>
                    {/each}
                  {/if}

                  <h4>Content</h4>
                  {#if response.contents.length === 0}
                    <p class="placeholder">No response body content is documented.</p>
                  {:else}
                    {#each response.contents as content (content.contentType)}
                      <div class="response-body-card">
                        <h5>{content.contentType}</h5>

                        {#if content.schema && specViewerStore.document}
                          <SchemaTree
                            schema={content.schema}
                            document={specViewerStore.document}
                            name={`${response.statusCode} body`}
                          />
                        {:else}
                          <p class="placeholder">Response body schema is not defined.</p>
                        {/if}

                        <h6>Example</h6>
                        <pre>{responseExampleText(content, specViewerStore.document)}</pre>
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    </section>

    <section id="spec-try-it-out" class="detail-section">
      <h2>Try It Out</h2>
      <p>
        Inputs above are ready for request execution. Send/cURL actions will be added in the
        next phase.
      </p>

      <div class="try-it-preview">
        <div>
          <strong>Method</strong>
          <span>{operationDetail.endpoint.method}</span>
        </div>
        <div>
          <strong>Resolved URL</strong>
          <code>{specViewerStore.tryIt.baseUrl || '(base URL not set)'}{resolvedPath}</code>
        </div>
        <div>
          <strong>Content Type</strong>
          <span>{specViewerStore.tryIt.contentType ?? 'Not selected'}</span>
        </div>
      </div>
    </section>
  </article>
{/if}

<style>
  .endpoint-detail {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 1050px;
  }

  .section-nav {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--bg-primary, #fff) 92%, #d8e7f8);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.7rem;
  }

  .section-nav button {
    border: 1px solid var(--border-color, #ddd);
    background: var(--bg-primary, #fff);
    color: var(--text-secondary, #666);
    border-radius: 0.45rem;
    padding: 0.3rem 0.65rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }

  .section-nav button:hover {
    background: var(--bg-hover, #f0f0f0);
    color: var(--text-primary, #333);
  }

  .detail-section {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.8rem;
    padding: 1rem;
    background: var(--bg-primary, #fff);
  }

  .detail-section h2 {
    margin-bottom: 0.8rem;
    font-size: 1.1rem;
  }

  .operation-title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-bottom: 0.7rem;
  }

  .method {
    display: inline-block;
    min-width: 3.2rem;
    text-align: center;
    border-radius: 0.3rem;
    padding: 0.2rem 0.35rem;
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    font-family: 'Courier New', Courier, monospace;
  }

  .method-get {
    background: #4caf50;
  }

  .method-post {
    background: #2196f3;
  }

  .method-put {
    background: #ff9800;
  }

  .method-delete {
    background: #f44336;
  }

  .method-other {
    background: #9e9e9e;
  }

  .operation-path {
    font-size: 0.9rem;
    background: var(--code-bg, #f5f5f5);
    border: 1px solid var(--code-border, #e0e0e0);
    border-radius: 0.35rem;
    padding: 0.25rem 0.45rem;
    overflow-wrap: anywhere;
  }

  .markdown-block {
    color: var(--text-primary, #333);
  }

  .markdown-block.description {
    margin-top: 0.55rem;
    color: var(--text-secondary, #666);
  }

  .markdown-block :global(p + p) {
    margin-top: 0.45rem;
  }

  .markdown-block :global(ul),
  .markdown-block :global(ol) {
    margin: 0.35rem 0 0 1.25rem;
    padding: 0;
  }

  .overview-grid {
    margin-top: 0.9rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .overview-row {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 0.65rem;
    padding: 0.6rem 0.8rem;
    border-bottom: 1px solid var(--border-light, #eee);
    font-size: 0.88rem;
  }

  .overview-row:last-child {
    border-bottom: 0;
  }

  .overview-row strong {
    color: var(--text-secondary, #666);
    text-transform: uppercase;
    font-size: 0.77rem;
  }

  .deprecated-text {
    color: #c62828;
    font-weight: 600;
  }

  .server-panel {
    margin-top: 1rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.6rem;
    padding: 0.75rem;
    background: var(--bg-secondary, #f5f5f5);
    display: grid;
    gap: 0.65rem;
  }

  .server-panel h3 {
    font-size: 0.95rem;
  }

  .server-help {
    margin: 0;
    color: var(--text-secondary, #666);
    font-size: 0.82rem;
  }

  .server-row {
    display: grid;
    gap: 0.35rem;
  }

  .server-row label {
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
  }

  .server-row input,
  .server-row select {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.45rem;
    padding: 0.45rem 0.55rem;
    font: inherit;
    font-size: 0.88rem;
    color: var(--text-primary, #333);
    background: var(--bg-primary, #fff);
  }

  .resolved-url-preview {
    margin: 0;
    font-size: 0.82rem;
    color: var(--text-secondary, #666);
    overflow-wrap: anywhere;
  }

  .resolved-url-preview code {
    font-size: 0.78rem;
    color: var(--text-primary, #333);
  }

  .placeholder {
    margin: 0;
    color: var(--text-secondary, #666);
    font-size: 0.9rem;
  }

  .parameter-group + .parameter-group {
    margin-top: 0.8rem;
  }

  .parameter-group h3 {
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
  }

  .parameter-card {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.55rem;
    background: var(--bg-secondary, #f5f5f5);
    padding: 0.7rem;
    display: grid;
    gap: 0.45rem;
  }

  .parameter-card + .parameter-card {
    margin-top: 0.55rem;
  }

  .parameter-topline {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .parameter-topline code {
    font-size: 0.8rem;
    background: var(--code-bg, #f5f5f5);
    border: 1px solid var(--code-border, #e0e0e0);
    border-radius: 0.3rem;
    padding: 0.1rem 0.3rem;
  }

  .required-chip,
  .deprecated-chip {
    border-radius: 999px;
    padding: 0.08rem 0.35rem;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .required-chip {
    border: 1px solid #f8bbd0;
    color: #ad1457;
    background: #fff0f6;
  }

  .deprecated-chip {
    border: 1px solid #ffccbc;
    color: #bf360c;
    background: #fff3ef;
  }

  .parameter-card p {
    color: var(--text-secondary, #666);
    font-size: 0.86rem;
  }

  .parameter-card label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
  }

  .parameter-card input {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.45rem;
    padding: 0.4rem 0.5rem;
    font: inherit;
    font-size: 0.85rem;
    color: var(--text-primary, #333);
    background: var(--bg-primary, #fff);
  }

  .headers-panel {
    margin-top: 1rem;
  }

  .headers-panel h3 {
    margin-bottom: 0.45rem;
    font-size: 0.95rem;
  }

  .headers-table {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.55rem;
    overflow: hidden;
  }

  .headers-head,
  .headers-row {
    display: grid;
    grid-template-columns: 1fr 1.7fr auto;
    gap: 0.55rem;
    padding: 0.5rem 0.65rem;
    font-size: 0.82rem;
    align-items: center;
  }

  .headers-head {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-secondary, #666);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .headers-row + .headers-row {
    border-top: 1px solid var(--border-light, #eee);
  }

  .headers-row code {
    font-size: 0.76rem;
    overflow-wrap: anywhere;
  }

  .request-body-required {
    margin-top: 0.4rem;
    color: var(--text-secondary, #666);
    font-size: 0.84rem;
  }

  .content-type-tabs {
    margin-top: 0.65rem;
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .content-type-tabs button {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.45rem;
    background: var(--bg-primary, #fff);
    color: var(--text-secondary, #666);
    font: inherit;
    font-size: 0.8rem;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .content-type-tabs button.active {
    border-color: var(--primary-light, #64b5f6);
    color: var(--primary-dark, #1976d2);
    background: #eaf4ff;
  }

  .unsupported-note {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: #b26a00;
  }

  .request-body-grid {
    margin-top: 0.7rem;
    display: grid;
    grid-template-columns: minmax(250px, 1fr) minmax(280px, 1fr);
    gap: 0.7rem;
  }

  .request-body-pane {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.55rem;
    padding: 0.65rem;
    background: var(--bg-secondary, #f5f5f5);
    min-width: 0;
  }

  .request-body-pane h3 {
    margin-bottom: 0.45rem;
    font-size: 0.9rem;
  }

  .request-body-pane textarea {
    width: 100%;
    min-height: 180px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.45rem;
    padding: 0.5rem;
    background: var(--bg-primary, #fff);
    color: var(--text-primary, #333);
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8rem;
    resize: vertical;
  }

  .request-body-pane pre,
  .response-body-card pre {
    margin: 0.45rem 0 0;
    padding: 0.55rem;
    background: var(--code-bg, #f5f5f5);
    border: 1px solid var(--code-border, #e0e0e0);
    border-radius: 0.45rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 0.78rem;
    color: var(--text-primary, #333);
  }

  .error-text {
    margin: 0.35rem 0 0;
    color: #bf360c;
    font-size: 0.8rem;
  }

  .response-list {
    display: grid;
    gap: 0.65rem;
  }

  .response-card {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.6rem;
    overflow: hidden;
  }

  .response-toggle {
    width: 100%;
    border: 0;
    background: var(--bg-secondary, #f5f5f5);
    padding: 0.6rem 0.75rem;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.6rem;
    align-items: center;
    text-align: left;
    font: inherit;
    color: var(--text-primary, #333);
    cursor: pointer;
  }

  .response-status {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8rem;
    font-weight: 700;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.3rem;
    padding: 0.05rem 0.35rem;
    background: var(--bg-primary, #fff);
  }

  .response-chevron {
    color: var(--text-secondary, #666);
  }

  .response-content {
    padding: 0.75rem;
    display: grid;
    gap: 0.65rem;
    border-top: 1px solid var(--border-light, #eee);
    background: var(--bg-primary, #fff);
  }

  .response-content h4 {
    font-size: 0.9rem;
  }

  .response-header-card,
  .response-body-card {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.5rem;
    padding: 0.6rem;
    background: var(--bg-secondary, #f5f5f5);
  }

  .response-body-card h5 {
    font-size: 0.85rem;
    margin-bottom: 0.45rem;
    color: var(--text-primary, #333);
  }

  .response-body-card h6 {
    margin-top: 0.45rem;
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
  }

  .try-it-preview {
    margin-top: 0.6rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.55rem;
    overflow: hidden;
  }

  .try-it-preview > div {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 0.6rem;
    padding: 0.55rem 0.7rem;
    border-bottom: 1px solid var(--border-light, #eee);
    align-items: start;
  }

  .try-it-preview > div:last-child {
    border-bottom: 0;
  }

  .try-it-preview strong {
    color: var(--text-secondary, #666);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    font-size: 0.74rem;
  }

  .try-it-preview code {
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }

  @media (max-width: 860px) {
    .request-body-grid {
      grid-template-columns: 1fr;
    }

    .overview-row {
      grid-template-columns: 1fr;
      gap: 0.3rem;
    }

    .headers-head,
    .headers-row {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }

    .try-it-preview > div {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }
  }
</style>
