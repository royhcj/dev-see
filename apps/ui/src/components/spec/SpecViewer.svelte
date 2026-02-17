<script lang="ts">
  import SpecSourceBar from './SpecSourceBar.svelte';
  import { specViewerStore } from '../../stores/spec-viewer.svelte.js';

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

  function selectEndpoint(endpointId: string): void {
    specViewerStore.selectEndpoint(endpointId);
  }
</script>

<section class="spec-viewer" aria-label="API Spec Viewer">
  <SpecSourceBar />

  <div class="spec-panel">
    {#if specViewerStore.loading}
      <div class="state-card">
        <h2>Loading OpenAPI Spec</h2>
        <p>Fetching and parsing specification content...</p>
      </div>
    {:else if specViewerStore.error}
      <div class="state-card error">
        <h2>Invalid Spec</h2>
        <p>{specViewerStore.error}</p>
      </div>
    {:else if !specViewerStore.document}
      <div class="state-card">
        <h2>No Spec Loaded</h2>
        <p>Load a JSON or YAML OpenAPI 3.x document from URL or file upload.</p>
      </div>
    {:else}
      <div class="spec-layout">
        <aside class="left-pane" aria-label="OpenAPI endpoint index">
          {#if specViewerStore.metadata}
            <header class="spec-meta">
              <h2>{specViewerStore.metadata.title}</h2>
              <p class="version">Version {specViewerStore.metadata.version}</p>
              {#if specViewerStore.metadata.description}
                <p class="description">{specViewerStore.metadata.description}</p>
              {/if}
            </header>
          {/if}

          <div class="groups">
            <div class="groups-header">
              <h3>Endpoints</h3>
              <span>{specViewerStore.operationCount}</span>
            </div>

            {#if specViewerStore.endpointGroups.length === 0}
              <p class="group-empty">No operations were found in `paths`.</p>
            {:else}
              {#each specViewerStore.endpointGroups as group (group.tag)}
                <section class="group">
                  <h4>{group.tag} ({group.endpoints.length})</h4>
                  <div class="endpoint-list">
                    {#each group.endpoints as endpoint (`${group.tag}:${endpoint.id}`)}
                      <button
                        type="button"
                        class="endpoint-row"
                        class:selected={specViewerStore.selectedEndpointId === endpoint.id}
                        onclick={() => selectEndpoint(endpoint.id)}
                      >
                        <span class="method {getMethodClass(endpoint.method)}">{endpoint.method}</span>
                        <span class="path">{endpoint.path}</span>
                        {#if endpoint.summary}
                          <small>{endpoint.summary}</small>
                        {/if}
                      </button>
                    {/each}
                  </div>
                </section>
              {/each}
            {/if}
          </div>
        </aside>

        <section class="right-pane" aria-label="Selected endpoint preview">
          {#if specViewerStore.selectedEndpoint}
            {@const endpoint = specViewerStore.selectedEndpoint}

            <div class="selected-header">
              <span class="method {getMethodClass(endpoint.method)}">{endpoint.method}</span>
              <code>{endpoint.path}</code>
            </div>

            {#if endpoint.summary}
              <p class="summary">{endpoint.summary}</p>
            {/if}

            {#if endpoint.description}
              <p class="description">{endpoint.description}</p>
            {/if}

            <div class="details-grid">
              <div class="detail">
                <strong>operationId</strong>
                <span>{endpoint.operationId ?? 'Not defined'}</span>
              </div>
              <div class="detail">
                <strong>Tags</strong>
                <span>{endpoint.tags.join(', ')}</span>
              </div>
              <div class="detail">
                <strong>Deprecated</strong>
                <span>{endpoint.deprecated ? 'Yes' : 'No'}</span>
              </div>
              <div class="detail">
                <strong>Try-It Base URL</strong>
                <span>{specViewerStore.tryIt.baseUrl || 'Not defined in spec servers'}</span>
              </div>
            </div>
          {:else}
            <div class="state-card">
              <h2>No Endpoint Selected</h2>
              <p>Select an endpoint from the left pane to continue.</p>
            </div>
          {/if}
        </section>
      </div>
    {/if}
  </div>
</section>

<style>
  .spec-viewer {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary, #fff);
  }

  .spec-panel {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .state-card {
    margin: auto;
    max-width: 640px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.75rem;
    background: var(--bg-secondary, #f5f5f5);
    padding: 1.5rem;
    text-align: center;
  }

  .state-card.error {
    border-color: #ef9a9a;
    background: #fff5f5;
  }

  .state-card h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  .state-card p {
    margin-top: 0.75rem;
    color: var(--text-secondary, #666);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .spec-layout {
    display: grid;
    grid-template-columns: minmax(280px, 390px) 1fr;
    flex: 1;
    min-height: 0;
  }

  .left-pane {
    border-right: 1px solid var(--border-color, #ddd);
    overflow-y: auto;
    background: var(--bg-secondary, #f5f5f5);
  }

  .spec-meta {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #ddd);
    background: var(--bg-primary, #fff);
  }

  .spec-meta h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .version {
    margin-top: 0.35rem;
    font-size: 0.82rem;
    color: var(--text-secondary, #666);
  }

  .description {
    margin-top: 0.65rem;
    color: var(--text-secondary, #666);
    white-space: pre-wrap;
  }

  .groups {
    padding: 0.75rem;
  }

  .groups-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary, #666);
  }

  .groups-header h3 {
    margin: 0;
    font-size: inherit;
    font-weight: 700;
  }

  .group-empty {
    margin: 0;
    padding: 0.75rem;
    color: var(--text-secondary, #666);
    font-size: 0.9rem;
  }

  .group + .group {
    margin-top: 0.75rem;
  }

  .group h4 {
    margin: 0 0 0.5rem;
    font-size: 0.83rem;
    color: var(--text-secondary, #666);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .endpoint-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .endpoint-row {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.5rem;
    background: var(--bg-primary, #fff);
    padding: 0.5rem 0.6rem;
    cursor: pointer;
    text-align: left;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.45rem;
  }

  .endpoint-row:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  .endpoint-row.selected {
    border-color: var(--primary-color, #2196f3);
    box-shadow: inset 0 0 0 1px var(--primary-color, #2196f3);
  }

  .endpoint-row .path {
    font-family: 'Courier New', Courier, monospace;
    color: var(--text-primary, #333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .endpoint-row small {
    grid-column: 1 / -1;
    color: var(--text-secondary, #666);
    font-size: 0.8rem;
    line-height: 1.35;
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

  .right-pane {
    padding: 1.5rem;
    overflow-y: auto;
  }

  .selected-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.85rem;
  }

  .selected-header code {
    font-size: 0.95rem;
    background: var(--code-bg, #f5f5f5);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.35rem;
    padding: 0.35rem 0.55rem;
  }

  .summary {
    font-size: 1rem;
    color: var(--text-primary, #333);
  }

  .details-grid {
    margin-top: 1rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.6rem;
    overflow: hidden;
    max-width: 720px;
  }

  .detail {
    padding: 0.75rem 0.9rem;
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 0.75rem;
    border-bottom: 1px solid var(--border-light, #eee);
    font-size: 0.9rem;
  }

  .detail:last-child {
    border-bottom: none;
  }

  .detail strong {
    color: var(--text-secondary, #666);
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .detail span {
    color: var(--text-primary, #333);
    overflow-wrap: anywhere;
  }

  @media (max-width: 1100px) {
    .spec-layout {
      grid-template-columns: 330px 1fr;
    }
  }

  @media (max-width: 900px) {
    .spec-layout {
      grid-template-columns: 1fr;
    }

    .left-pane {
      max-height: 45vh;
      border-right: 0;
      border-bottom: 1px solid var(--border-color, #ddd);
    }
  }

  @media (max-width: 640px) {
    .right-pane {
      padding: 1rem;
    }

    .detail {
      grid-template-columns: 1fr;
      gap: 0.3rem;
    }
  }
</style>
