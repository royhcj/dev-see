<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export type TopTab = 'logs' | 'spec';

  export let activeTab: TopTab = 'logs';
  export let variant: 'default' | 'header' = 'default';

  const dispatch = createEventDispatcher<{ change: TopTab }>();

  function selectTab(tab: TopTab) {
    if (tab !== activeTab) {
      dispatch('change', tab);
    }
  }
</script>

<nav class="top-tabs" class:header={variant === 'header'} aria-label="Main viewer tabs">
  <div class="tab-list" role="tablist" aria-label="Viewer selection">
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'logs'}
      class:active={activeTab === 'logs'}
      on:click={() => selectTab('logs')}
    >
      API Log Viewer
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'spec'}
      class:active={activeTab === 'spec'}
      on:click={() => selectTab('spec')}
    >
      API Spec Viewer
    </button>
  </div>
</nav>

<style>
  .top-tabs {
    display: flex;
    align-items: center;
    padding: 0.5rem;
  }

  .top-tabs.header {
    padding: 0;
  }

  .tab-list {
    display: inline-flex;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.625rem;
    overflow: hidden;
    background: var(--bg-secondary, #f5f5f5);
  }

  button {
    border: 0;
    margin: 0;
    padding: 0.5rem 0.9rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-secondary, #666);
    background: transparent;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  button:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  button.active {
    color: #fff;
    background: var(--primary-color, #2196f3);
  }

  .top-tabs.header .tab-list {
    border-color: rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.12);
  }

  .top-tabs.header button {
    color: rgba(255, 255, 255, 0.9);
  }

  .top-tabs.header button:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  .top-tabs.header button.active {
    background: rgba(255, 255, 255, 0.32);
    color: #fff;
  }

  @media (max-width: 768px) {
    button {
      font-size: 0.82rem;
      padding: 0.45rem 0.7rem;
    }
  }
</style>
