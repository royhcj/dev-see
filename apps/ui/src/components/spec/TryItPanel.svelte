<script lang="ts">
  import { buildCurlCommand } from '../../lib/http/curl.js';
  import {
    buildTryItRequest,
    executeTryItRequest,
    normalizeContentType,
    TryItExecutionError,
    type TryItAuthOption,
    type TryItAuthSelection,
    type TryItParamLocation,
    type TryItParameterDefinition,
  } from '../../lib/http/request-builder.js';
  import { specViewerStore } from '../../stores/spec-viewer.svelte.js';

  interface RequestBodyContentMeta {
    contentType: string;
  }

  interface RequestBodyMeta {
    required: boolean;
    contents: RequestBodyContentMeta[];
  }

  interface ResponseMeta {
    statusCode: string;
    contents: Array<{ contentType: string }>;
  }

  interface ParameterGroups {
    path: TryItParameterDefinition[];
    query: TryItParameterDefinition[];
    header: TryItParameterDefinition[];
    cookie: TryItParameterDefinition[];
  }

  interface AuthDraft {
    selectedId: string;
    bearerToken: string;
    basicUsername: string;
    basicPassword: string;
    apiKeyValue: string;
  }

  let {
    method,
    pathTemplate,
    resolvedPath,
    parameters,
    requestBody,
    responses,
    authOptions,
  }: {
    method: string;
    pathTemplate: string;
    resolvedPath: string;
    parameters: TryItParameterDefinition[];
    requestBody: RequestBodyMeta | null;
    responses: ResponseMeta[];
    authOptions: TryItAuthOption[];
  } = $props();

  let timeoutMs = $state(30_000);
  let executing = $state(false);
  let executionError = $state<string | null>(null);
  let responseRawMode = $state(false);
  let copyState = $state<'idle' | 'copied' | 'error'>('idle');
  let authDraft = $state<AuthDraft>({
    selectedId: 'none',
    bearerToken: '',
    basicUsername: '',
    basicPassword: '',
    apiKeyValue: '',
  });

  const groupedParameters = $derived(groupParameters(parameters));
  const availableContentTypes = $derived(requestBody?.contents.map((content) => content.contentType) ?? []);
  const acceptHeader = $derived(buildAcceptHeader(responses));
  const selectedAuthOption = $derived(
    authOptions.find((option) => option.id === authDraft.selectedId) ?? null
  );
  const curlCommand = $derived(buildCurlCommandSafe());
  const formattedResponseBody = $derived(
    formatResponseBody(
      specViewerStore.tryIt.lastResponse?.bodyText ?? '',
      specViewerStore.tryIt.lastResponse?.contentType,
      responseRawMode
    )
  );

  $effect(() => {
    if (availableContentTypes.length === 0) {
      if (specViewerStore.tryIt.contentType) {
        specViewerStore.setTryItDraft({ contentType: undefined });
      }
      return;
    }

    if (!specViewerStore.tryIt.contentType || !availableContentTypes.includes(specViewerStore.tryIt.contentType)) {
      specViewerStore.setTryItDraft({ contentType: availableContentTypes[0] });
    }
  });

  $effect(() => {
    const hasSelectedAuth = authOptions.some((option) => option.id === authDraft.selectedId);
    if (!hasSelectedAuth && authDraft.selectedId !== 'none') {
      authDraft = {
        selectedId: 'none',
        bearerToken: '',
        basicUsername: '',
        basicPassword: '',
        apiKeyValue: '',
      };
    }
  });

  function handleTryItToggle(event: Event): void {
    const enabled = (event.currentTarget as HTMLInputElement).checked;
    specViewerStore.setTryItDraft({
      enabled,
    });

    executionError = null;
    if (!enabled) {
      executing = false;
    }
  }

  function updateTimeout(event: Event): void {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    timeoutMs = Number.isFinite(value) && value > 0 ? Math.floor(value) : 30_000;
  }

  function updateParameterDraft(
    location: TryItParamLocation,
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

  function readParameterDraft(location: TryItParamLocation, parameterName: string): string {
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

  function handleRequestBodyInput(event: Event): void {
    specViewerStore.setTryItDraft({
      requestBodyText: (event.currentTarget as HTMLTextAreaElement).value,
    });
  }

  function handleContentTypeChange(event: Event): void {
    const contentType = (event.currentTarget as HTMLSelectElement).value;
    specViewerStore.setTryItDraft({ contentType });
  }

  function handleAuthModeChange(event: Event): void {
    const selectedId = (event.currentTarget as HTMLSelectElement).value;
    authDraft = {
      ...authDraft,
      selectedId,
    };
  }

  async function handleSend(): Promise<void> {
    executionError = null;
    responseRawMode = false;

    if (!specViewerStore.tryIt.enabled) {
      executionError = 'Enable Try It Out before sending a request.';
      return;
    }

    let request;
    try {
      request = buildTryItRequest({
        method,
        pathTemplate,
        baseUrl: specViewerStore.tryIt.baseUrl,
        parameters,
        pathParams: specViewerStore.tryIt.pathParams,
        queryParams: specViewerStore.tryIt.queryParams,
        headerParams: specViewerStore.tryIt.headerParams,
        cookieParams: specViewerStore.tryIt.cookieParams,
        bodyText: specViewerStore.tryIt.requestBodyText,
        contentType: specViewerStore.tryIt.contentType,
        acceptHeader,
        auth: buildAuthSelection(authDraft, selectedAuthOption),
      });
    } catch (error) {
      executionError = formatExecutionError(error);
      return;
    }

    executing = true;
    specViewerStore.clearTryItResponse();

    try {
      const response = await executeTryItRequest(request, timeoutMs);
      specViewerStore.setTryItDraft({
        lastResponse: response,
      });
    } catch (error) {
      executionError = formatExecutionError(error);
    } finally {
      executing = false;
    }
  }

  async function copyCurl(): Promise<void> {
    if (!curlCommand) {
      return;
    }

    try {
      await navigator.clipboard.writeText(curlCommand);
      copyState = 'copied';
    } catch {
      copyState = 'error';
    }
  }

  function buildCurlCommandSafe(): string {
    try {
      const request = buildTryItRequest({
        method,
        pathTemplate,
        baseUrl: specViewerStore.tryIt.baseUrl,
        parameters,
        pathParams: specViewerStore.tryIt.pathParams,
        queryParams: specViewerStore.tryIt.queryParams,
        headerParams: specViewerStore.tryIt.headerParams,
        cookieParams: specViewerStore.tryIt.cookieParams,
        bodyText: specViewerStore.tryIt.requestBodyText,
        contentType: specViewerStore.tryIt.contentType,
        acceptHeader,
        auth: buildAuthSelection(authDraft, selectedAuthOption),
      });
      return buildCurlCommand(request);
    } catch {
      return '';
    }
  }

  function formatExecutionError(error: unknown): string {
    if (!(error instanceof TryItExecutionError)) {
      return error instanceof Error ? error.message : 'Request failed.';
    }

    if (error.kind === 'validation') {
      return (error.issues ?? [error.message]).join('\n');
    }

    if (error.details) {
      return `${error.message}\n${error.details}`;
    }

    return error.message;
  }

  function formatResponseBody(bodyText: string, contentType: string | undefined, rawMode: boolean): string {
    if (!bodyText) {
      return '(empty body)';
    }

    if (rawMode) {
      return bodyText;
    }

    const normalized = normalizeContentType(contentType);
    if (normalized === 'application/json' || normalized.endsWith('+json')) {
      try {
        return JSON.stringify(JSON.parse(bodyText), null, 2);
      } catch {
        return bodyText;
      }
    }

    if (normalized === 'application/x-www-form-urlencoded') {
      const params = new URLSearchParams(bodyText);
      if ([...params.keys()].length > 0) {
        return Array.from(params.entries())
          .map(([key, value]) => `${key} = ${value}`)
          .join('\n');
      }
    }

    return bodyText;
  }

  function groupParameters(parametersToGroup: TryItParameterDefinition[]): ParameterGroups {
    return {
      path: parametersToGroup.filter((parameter) => parameter.location === 'path'),
      query: parametersToGroup.filter((parameter) => parameter.location === 'query'),
      header: parametersToGroup.filter((parameter) => parameter.location === 'header'),
      cookie: parametersToGroup.filter((parameter) => parameter.location === 'cookie'),
    };
  }

  function buildAcceptHeader(responseDocs: ResponseMeta[]): string | null {
    const types = new Set<string>();
    for (const response of responseDocs) {
      for (const content of response.contents) {
        if (content.contentType.trim()) {
          types.add(content.contentType.trim());
        }
      }
    }
    return types.size > 0 ? Array.from(types).join(', ') : null;
  }

  function buildAuthSelection(
    draft: AuthDraft,
    selectedOption: TryItAuthOption | null
  ): TryItAuthSelection {
    if (!selectedOption) {
      return { kind: 'none' };
    }

    if (selectedOption.kind === 'bearer') {
      return {
        kind: 'bearer',
        bearerToken: draft.bearerToken,
      };
    }

    if (selectedOption.kind === 'basic') {
      return {
        kind: 'basic',
        username: draft.basicUsername,
        password: draft.basicPassword,
      };
    }

    return {
      kind: 'apiKey',
      apiKeyName: selectedOption.apiKeyName,
      apiKeyIn: selectedOption.apiKeyIn,
      apiKeyValue: draft.apiKeyValue,
    };
  }

  function responseStatusClass(status: number): string {
    if (status >= 500) return 'response-error';
    if (status >= 400) return 'response-fail';
    if (status >= 300) return 'response-redirect';
    if (status >= 200) return 'response-success';
    return 'response-other';
  }
</script>

<div class="try-it-panel">
  <div class="try-it-toolbar">
    <label class="toggle">
      <input
        type="checkbox"
        checked={specViewerStore.tryIt.enabled}
        onchange={handleTryItToggle}
      />
      Try It Out
    </label>

    <label class="timeout-input">
      Timeout (ms)
      <input
        type="number"
        min="100"
        step="100"
        value={timeoutMs}
        oninput={updateTimeout}
        disabled={!specViewerStore.tryIt.enabled || executing}
      />
    </label>

    <div class="toolbar-actions">
      <button type="button" class="send-button" onclick={handleSend} disabled={!specViewerStore.tryIt.enabled || executing}>
        {executing ? 'Sending...' : 'Send'}
      </button>
      <button type="button" onclick={copyCurl} disabled={!specViewerStore.tryIt.enabled || !curlCommand}>
        {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy Failed' : 'Copy cURL'}
      </button>
    </div>
  </div>

  <p class="resolved-url">
    <strong>Resolved URL</strong>
    <code>{specViewerStore.tryIt.baseUrl || '(base URL not set)'}{resolvedPath}</code>
  </p>

  {#if !specViewerStore.tryIt.enabled}
    <p class="hint">Enable Try It Out to edit values and execute this operation.</p>
  {:else}
    {#if groupedParameters.path.length > 0}
      <div class="group-card">
        <h3>Path Parameters</h3>
        <div class="inputs-grid">
          {#each groupedParameters.path as parameter (parameter.name)}
            <label>
              {parameter.name}
              {#if parameter.required}<span class="required-chip">required</span>{/if}
              <input
                type="text"
                value={readParameterDraft(parameter.location, parameter.name)}
                oninput={(event) =>
                  updateParameterDraft(
                    parameter.location,
                    parameter.name,
                    (event.currentTarget as HTMLInputElement).value
                  )}
                disabled={executing}
              />
            </label>
          {/each}
        </div>
      </div>
    {/if}

    {#if groupedParameters.query.length > 0}
      <div class="group-card">
        <h3>Query Parameters</h3>
        <div class="inputs-grid">
          {#each groupedParameters.query as parameter (parameter.name)}
            <label>
              {parameter.name}
              {#if parameter.required}<span class="required-chip">required</span>{/if}
              <input
                type="text"
                value={readParameterDraft(parameter.location, parameter.name)}
                oninput={(event) =>
                  updateParameterDraft(
                    parameter.location,
                    parameter.name,
                    (event.currentTarget as HTMLInputElement).value
                  )}
                disabled={executing}
              />
            </label>
          {/each}
        </div>
      </div>
    {/if}

    {#if groupedParameters.header.length > 0}
      <div class="group-card">
        <h3>Header Parameters</h3>
        <div class="inputs-grid">
          {#each groupedParameters.header as parameter (parameter.name)}
            <label>
              {parameter.name}
              {#if parameter.required}<span class="required-chip">required</span>{/if}
              <input
                type="text"
                value={readParameterDraft(parameter.location, parameter.name)}
                oninput={(event) =>
                  updateParameterDraft(
                    parameter.location,
                    parameter.name,
                    (event.currentTarget as HTMLInputElement).value
                  )}
                disabled={executing}
              />
            </label>
          {/each}
        </div>
      </div>
    {/if}

    {#if groupedParameters.cookie.length > 0}
      <div class="group-card">
        <h3>Cookie Parameters</h3>
        <div class="inputs-grid">
          {#each groupedParameters.cookie as parameter (parameter.name)}
            <label>
              {parameter.name}
              {#if parameter.required}<span class="required-chip">required</span>{/if}
              <input
                type="text"
                value={readParameterDraft(parameter.location, parameter.name)}
                oninput={(event) =>
                  updateParameterDraft(
                    parameter.location,
                    parameter.name,
                    (event.currentTarget as HTMLInputElement).value
                  )}
                disabled={executing}
              />
            </label>
          {/each}
        </div>
      </div>
    {/if}

    {#if requestBody && requestBody.contents.length > 0}
      <div class="group-card">
        <h3>Request Body</h3>
        {#if requestBody.required}
          <p class="hint">Body is required by this operation.</p>
        {/if}

        <label class="content-type">
          Content Type
          <select
            value={specViewerStore.tryIt.contentType}
            onchange={handleContentTypeChange}
            disabled={executing}
          >
            {#each availableContentTypes as contentType (contentType)}
              <option value={contentType}>{contentType}</option>
            {/each}
          </select>
        </label>

        <label class="body-editor">
          Body Payload
          <textarea
            value={specViewerStore.tryIt.requestBodyText}
            spellcheck="false"
            oninput={handleRequestBodyInput}
            disabled={executing}
          ></textarea>
        </label>
      </div>
    {/if}

    <div class="group-card">
      <h3>Authorization</h3>
      {#if authOptions.length === 0}
        <p class="hint">No Bearer, Basic, or API key security scheme is defined for this operation.</p>
      {:else}
        <label>
          Auth Mode
          <select value={authDraft.selectedId} onchange={handleAuthModeChange} disabled={executing}>
            <option value="none">No auth</option>
            {#each authOptions as option (option.id)}
              <option value={option.id}>{option.label}</option>
            {/each}
          </select>
        </label>

        {#if selectedAuthOption?.description}
          <p class="hint">{selectedAuthOption.description}</p>
        {/if}

        {#if selectedAuthOption?.kind === 'bearer'}
          <label>
            Bearer Token
            <input
              type="password"
              value={authDraft.bearerToken}
              oninput={(event) => (authDraft = { ...authDraft, bearerToken: (event.currentTarget as HTMLInputElement).value })}
              disabled={executing}
            />
          </label>
        {/if}

        {#if selectedAuthOption?.kind === 'basic'}
          <div class="inputs-grid two-columns">
            <label>
              Username
              <input
                type="text"
                value={authDraft.basicUsername}
                oninput={(event) => (authDraft = { ...authDraft, basicUsername: (event.currentTarget as HTMLInputElement).value })}
                disabled={executing}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authDraft.basicPassword}
                oninput={(event) => (authDraft = { ...authDraft, basicPassword: (event.currentTarget as HTMLInputElement).value })}
                disabled={executing}
              />
            </label>
          </div>
        {/if}

        {#if selectedAuthOption?.kind === 'apiKey'}
          <p class="hint">
            API key target:
            <code>{selectedAuthOption.apiKeyIn ?? 'header'}:{selectedAuthOption.apiKeyName ?? '(name missing)'}</code>
          </p>
          <label>
            API Key Value
            <input
              type="password"
              value={authDraft.apiKeyValue}
              oninput={(event) => (authDraft = { ...authDraft, apiKeyValue: (event.currentTarget as HTMLInputElement).value })}
              disabled={executing}
            />
          </label>
        {/if}
      {/if}
    </div>
  {/if}

  <div class="group-card curl-preview">
    <h3>Generated cURL</h3>
    {#if curlCommand}
      <pre>{curlCommand}</pre>
    {:else}
      <p class="hint">Request is incomplete. Fill required fields to generate cURL.</p>
    {/if}
  </div>

  {#if executionError}
    <div class="error-card">
      <h3>Request Error</h3>
      <pre>{executionError}</pre>
    </div>
  {/if}

  {#if specViewerStore.tryIt.lastResponse}
    <div class="group-card response-card">
      <h3>Response</h3>
      <div class="response-meta">
        <div>
          <strong>Status</strong>
          <span class={responseStatusClass(specViewerStore.tryIt.lastResponse.status)}>
            {specViewerStore.tryIt.lastResponse.status} {specViewerStore.tryIt.lastResponse.statusText}
          </span>
        </div>
        <div>
          <strong>Duration</strong>
          <span>{specViewerStore.tryIt.lastResponse.durationMs} ms</span>
        </div>
        <div>
          <strong>Content Type</strong>
          <span>{specViewerStore.tryIt.lastResponse.contentType ?? '(none)'}</span>
        </div>
      </div>

      <h4>Headers</h4>
      {#if Object.keys(specViewerStore.tryIt.lastResponse.headers).length === 0}
        <p class="hint">No response headers were returned.</p>
      {:else}
        <div class="response-headers">
          {#each Object.entries(specViewerStore.tryIt.lastResponse.headers) as [name, value] (`${name}:${value}`)}
            <div>
              <code>{name}</code>
              <code>{value}</code>
            </div>
          {/each}
        </div>
      {/if}

      <div class="response-body-head">
        <h4>Body</h4>
        <label>
          <input type="checkbox" bind:checked={responseRawMode} />
          Raw payload
        </label>
      </div>
      <pre>{formattedResponseBody}</pre>
    </div>
  {/if}
</div>

<style>
  .try-it-panel {
    display: grid;
    gap: 0.75rem;
  }

  .try-it-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    align-items: end;
  }

  .toggle {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.86rem;
    color: var(--text-primary, #333);
    font-weight: 600;
  }

  .timeout-input {
    display: grid;
    gap: 0.25rem;
    font-size: 0.77rem;
    color: var(--text-secondary, #666);
  }

  .timeout-input input {
    width: 120px;
  }

  .toolbar-actions {
    display: inline-flex;
    gap: 0.4rem;
  }

  .send-button {
    border-color: var(--primary-dark, #1976d2);
    background: var(--primary-dark, #1976d2);
    color: #fff;
  }

  .send-button:disabled {
    background: #90caf9;
    border-color: #90caf9;
    color: #f6f9fd;
  }

  button {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.45rem;
    padding: 0.4rem 0.6rem;
    font: inherit;
    font-size: 0.82rem;
    color: var(--text-primary, #333);
    background: var(--bg-primary, #fff);
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .resolved-url {
    margin: 0;
    display: grid;
    gap: 0.25rem;
    font-size: 0.82rem;
    color: var(--text-secondary, #666);
  }

  .resolved-url code {
    font-size: 0.78rem;
    overflow-wrap: anywhere;
    color: var(--text-primary, #333);
  }

  .group-card {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.55rem;
    padding: 0.7rem;
    background: var(--bg-secondary, #f5f5f5);
    display: grid;
    gap: 0.5rem;
  }

  .group-card h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  .hint {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
    white-space: pre-wrap;
  }

  .inputs-grid {
    display: grid;
    gap: 0.5rem;
  }

  .inputs-grid.two-columns {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  label {
    display: grid;
    gap: 0.25rem;
    font-size: 0.78rem;
    color: var(--text-secondary, #666);
  }

  input,
  select,
  textarea {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.45rem;
    padding: 0.4rem 0.5rem;
    font: inherit;
    font-size: 0.83rem;
    color: var(--text-primary, #333);
    background: var(--bg-primary, #fff);
  }

  .required-chip {
    margin-left: 0.35rem;
    border-radius: 999px;
    border: 1px solid #f8bbd0;
    color: #ad1457;
    background: #fff0f6;
    font-size: 0.66rem;
    font-weight: 700;
    padding: 0.02rem 0.3rem;
    text-transform: uppercase;
  }

  .content-type {
    max-width: 320px;
  }

  .body-editor textarea {
    width: 100%;
    min-height: 160px;
    resize: vertical;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.79rem;
  }

  pre {
    margin: 0;
    padding: 0.55rem;
    border: 1px solid var(--code-border, #e0e0e0);
    border-radius: 0.45rem;
    background: var(--code-bg, #f5f5f5);
    color: var(--text-primary, #333);
    font-size: 0.78rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .error-card {
    border: 1px solid #ef9a9a;
    border-radius: 0.55rem;
    background: #fff5f5;
    padding: 0.7rem;
    display: grid;
    gap: 0.45rem;
  }

  .error-card h3 {
    margin: 0;
    font-size: 0.88rem;
    color: #b71c1c;
  }

  .response-card h4 {
    margin: 0.2rem 0 0;
    font-size: 0.83rem;
  }

  .response-meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(140px, 1fr));
    gap: 0.45rem;
  }

  .response-meta > div {
    display: grid;
    gap: 0.2rem;
  }

  .response-meta strong {
    color: var(--text-secondary, #666);
    text-transform: uppercase;
    font-size: 0.68rem;
    letter-spacing: 0.02em;
  }

  .response-success {
    color: #2e7d32;
    font-weight: 700;
  }

  .response-redirect {
    color: #6d4c41;
    font-weight: 700;
  }

  .response-fail {
    color: #ef6c00;
    font-weight: 700;
  }

  .response-error {
    color: #c62828;
    font-weight: 700;
  }

  .response-other {
    color: var(--text-primary, #333);
    font-weight: 700;
  }

  .response-headers {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.45rem;
    overflow: hidden;
  }

  .response-headers > div {
    display: grid;
    grid-template-columns: minmax(150px, 1fr) 1.6fr;
    gap: 0.5rem;
    padding: 0.45rem 0.6rem;
    border-bottom: 1px solid var(--border-light, #eee);
    font-size: 0.78rem;
  }

  .response-headers > div:last-child {
    border-bottom: 0;
  }

  .response-body-head {
    margin-top: 0.3rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .response-body-head label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  @media (max-width: 760px) {
    .response-meta {
      grid-template-columns: 1fr;
    }

    .response-headers > div {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }

    .inputs-grid.two-columns {
      grid-template-columns: 1fr;
    }
  }
</style>
