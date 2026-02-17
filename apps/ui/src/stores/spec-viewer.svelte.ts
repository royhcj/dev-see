import {
  formatOpenApiError,
  parseOpenApiDocument,
  type OpenApiDocument,
} from '../lib/openapi/parse.js';
import {
  normalizeOpenApiDocument,
  type EndpointNavItem,
  type EndpointTagGroup,
  type SpecMetadata,
} from '../lib/openapi/normalize.js';

export type SpecSourceType = 'url' | 'file';

export interface SpecSource {
  type: SpecSourceType;
  label: string;
}

export interface TryItOutResponse {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  bodyText: string;
  contentType?: string;
}

export interface TryItOutDraftState {
  enabled: boolean;
  baseUrl: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headerParams: Record<string, string>;
  cookieParams: Record<string, string>;
  requestBodyText: string;
  contentType?: string;
  lastResponse: TryItOutResponse | null;
}

interface SpecViewerState {
  source: SpecSource | null;
  loading: boolean;
  error: string | null;
  document: OpenApiDocument | null;
  rawSpec: string | null;
  metadata: SpecMetadata | null;
  endpointGroups: EndpointTagGroup[];
  endpointById: Record<string, EndpointNavItem>;
  selectedEndpointId: string | null;
  tryIt: TryItOutDraftState;
}

function createDefaultTryItDraft(baseUrl = ''): TryItOutDraftState {
  return {
    enabled: false,
    baseUrl,
    pathParams: {},
    queryParams: {},
    headerParams: {},
    cookieParams: {},
    requestBodyText: '',
    contentType: undefined,
    lastResponse: null,
  };
}

class SpecViewerStore {
  private state: SpecViewerState = $state({
    source: null,
    loading: false,
    error: null,
    document: null,
    rawSpec: null,
    metadata: null,
    endpointGroups: [],
    endpointById: {},
    selectedEndpointId: null,
    tryIt: createDefaultTryItDraft(),
  });

  async loadFromUrl(urlInput: string): Promise<void> {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      this.setFailure('Enter a spec URL to load.');
      return;
    }

    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      this.setFailure(`"${trimmed}" is not a valid URL.`);
      return;
    }

    this.state.loading = true;
    this.state.error = null;

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to load spec from URL (HTTP ${response.status} ${response.statusText}).`);
      }

      const rawSpec = await response.text();
      this.applyLoadedSpec(rawSpec, {
        type: 'url',
        label: url.toString(),
      });
    } catch (error) {
      this.setFailure(formatOpenApiError(error), {
        type: 'url',
        label: url.toString(),
      });
    } finally {
      this.state.loading = false;
    }
  }

  async loadFromFile(file: File): Promise<void> {
    this.state.loading = true;
    this.state.error = null;

    try {
      const rawSpec = await file.text();
      this.applyLoadedSpec(rawSpec, {
        type: 'file',
        label: file.name,
      });
    } catch (error) {
      this.setFailure(formatOpenApiError(error), {
        type: 'file',
        label: file.name,
      });
    } finally {
      this.state.loading = false;
    }
  }

  clearSpec(): void {
    this.state.source = null;
    this.state.error = null;
    this.state.document = null;
    this.state.rawSpec = null;
    this.state.metadata = null;
    this.state.endpointGroups = [];
    this.state.endpointById = {};
    this.state.selectedEndpointId = null;
    this.state.tryIt = createDefaultTryItDraft();
  }

  selectEndpoint(endpointId: string | null): void {
    if (!endpointId) {
      this.state.selectedEndpointId = null;
      return;
    }

    if (!this.state.endpointById[endpointId]) {
      return;
    }

    this.state.selectedEndpointId = endpointId;
  }

  setTryItDraft(patch: Partial<TryItOutDraftState>): void {
    this.state.tryIt = {
      ...this.state.tryIt,
      ...patch,
    };
  }

  clearTryItResponse(): void {
    this.state.tryIt = {
      ...this.state.tryIt,
      lastResponse: null,
    };
  }

  get source(): SpecSource | null {
    return this.state.source;
  }

  get loading(): boolean {
    return this.state.loading;
  }

  get error(): string | null {
    return this.state.error;
  }

  get document(): OpenApiDocument | null {
    return this.state.document;
  }

  get metadata(): SpecMetadata | null {
    return this.state.metadata;
  }

  get endpointGroups(): EndpointTagGroup[] {
    return this.state.endpointGroups;
  }

  get endpointById(): Record<string, EndpointNavItem> {
    return this.state.endpointById;
  }

  get selectedEndpointId(): string | null {
    return this.state.selectedEndpointId;
  }

  get selectedEndpoint(): EndpointNavItem | null {
    if (!this.state.selectedEndpointId) {
      return null;
    }

    return this.state.endpointById[this.state.selectedEndpointId] ?? null;
  }

  get operationCount(): number {
    return Object.keys(this.state.endpointById).length;
  }

  get tryIt(): TryItOutDraftState {
    return this.state.tryIt;
  }

  private applyLoadedSpec(rawSpec: string, source: SpecSource): void {
    const parsed = parseOpenApiDocument(rawSpec, {
      sourceLabel: source.label,
      preferYaml: shouldPreferYaml(source.label),
    });
    const normalized = normalizeOpenApiDocument(parsed.document);
    const selectedEndpointId = normalized.endpoints[0]?.id ?? null;
    const preferredBaseUrl = parsed.document.servers?.[0]?.url ?? '';

    this.state.source = source;
    this.state.error = null;
    this.state.rawSpec = rawSpec;
    this.state.document = parsed.document;
    this.state.metadata = normalized.metadata;
    this.state.endpointGroups = normalized.endpointGroups;
    this.state.endpointById = normalized.endpointById;
    this.state.selectedEndpointId = selectedEndpointId;
    this.state.tryIt = createDefaultTryItDraft(preferredBaseUrl);
  }

  private setFailure(message: string, source?: SpecSource): void {
    if (source) {
      this.state.source = source;
    }

    this.state.error = message;
    this.state.document = null;
    this.state.rawSpec = null;
    this.state.metadata = null;
    this.state.endpointGroups = [];
    this.state.endpointById = {};
    this.state.selectedEndpointId = null;
    this.state.tryIt = createDefaultTryItDraft();
  }
}

function shouldPreferYaml(sourceLabel: string): boolean {
  const normalized = sourceLabel.toLowerCase();
  return normalized.endsWith('.yaml') || normalized.endsWith('.yml');
}

export const specViewerStore = new SpecViewerStore();
