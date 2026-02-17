<script lang="ts">
  import SpecSourceBar from './SpecSourceBar.svelte';
  import EndpointNav from './EndpointNav.svelte';
  import EndpointDetail from './EndpointDetail.svelte';
  import { specViewerStore } from '../../stores/spec-viewer.svelte.js';
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
          <EndpointNav />
        </aside>

        <section class="right-pane" aria-label="Selected endpoint preview">
          {#if specViewerStore.selectedEndpoint}
            <EndpointDetail />
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
    overflow: hidden;
    background: var(--bg-secondary, #f5f5f5);
  }

  .right-pane {
    padding: 1.5rem;
    overflow-y: auto;
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
  }
</style>
