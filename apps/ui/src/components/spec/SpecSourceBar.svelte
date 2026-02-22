<script lang="ts">
  import { specViewerStore } from '../../stores/spec-viewer.svelte.js';

  let urlInput = $state('');

  async function handleLoadFromUrl(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await specViewerStore.loadFromUrl(urlInput);
  }

  async function handleFileChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    await specViewerStore.loadFromFile(file);
    input.value = '';
  }

  function clearLoadedSpec(): void {
    specViewerStore.clearSpec();
  }
</script>

<section class="spec-source-bar" aria-label="OpenAPI source controls">
  <form class="url-form" onsubmit={handleLoadFromUrl}>
    <label class="sr-only" for="spec-url-input">OpenAPI spec URL</label>
    <input
      id="spec-url-input"
      type="url"
      placeholder="https://example.com/openapi.yaml"
      bind:value={urlInput}
      disabled={specViewerStore.loading}
    />
    <button type="submit" disabled={specViewerStore.loading || !urlInput.trim()}>
      {specViewerStore.loading ? 'Loading...' : 'Load URL'}
    </button>
  </form>

  <div class="file-actions">
    <label class="file-button">
      <input
        type="file"
        accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml,text/x-yaml"
        disabled={specViewerStore.loading}
        onchange={handleFileChange}
      />
      Upload File
    </label>

    {#if specViewerStore.document || specViewerStore.error}
      <button type="button" class="secondary" onclick={clearLoadedSpec} disabled={specViewerStore.loading}>
        Clear
      </button>
    {/if}
  </div>

  {#if specViewerStore.source}
    <p class="source-label">
      Source: <strong>{specViewerStore.source.label}</strong>
    </p>
  {/if}
</section>

<style>
  .spec-source-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #ddd);
    background: var(--bg-secondary, #f5f5f5);
  }

  .url-form {
    display: flex;
    flex: 1 1 460px;
    min-width: 240px;
    gap: 0.5rem;
  }

  input[type='url'] {
    flex: 1;
    min-width: 0;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.5rem;
    background: var(--bg-primary, #fff);
    color: var(--text-primary, #333);
    font: inherit;
  }

  button,
  .file-button {
    border: 1px solid transparent;
    border-radius: 0.5rem;
    padding: 0.6rem 0.9rem;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    color: #fff;
    background: var(--primary-color, #2196f3);
    transition: background-color 0.15s ease;
  }

  button:hover:not(:disabled),
  .file-button:hover {
    background: var(--primary-dark, #1976d2);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .file-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .file-button {
    position: relative;
    overflow: hidden;
  }

  .file-button input[type='file'] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  button.secondary {
    color: var(--text-primary, #333);
    border-color: var(--border-color, #ddd);
    background: var(--bg-primary, #fff);
  }

  button.secondary:hover:not(:disabled) {
    background: var(--bg-hover, #f0f0f0);
  }

  .source-label {
    margin: 0;
    font-size: 0.86rem;
    color: var(--text-secondary, #666);
  }

  @media (max-width: 900px) {
    .spec-source-bar {
      align-items: stretch;
    }

    .url-form {
      flex-basis: 100%;
    }

    .file-actions {
      width: 100%;
    }
  }
</style>
