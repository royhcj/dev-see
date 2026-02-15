<script lang="ts">
  /**
   * Search Component - Search and filter logs
   *
   * Provides real-time search functionality to filter logs by:
   * - URL (partial match)
   * - HTTP method (GET, POST, etc.)
   *
   * The search updates the store's searchQuery state,
   * which automatically filters the logs shown in LogList
   */

  import { logsStore } from '../stores/logs.svelte';

  // Local state for input value
  // We use bind:value to keep it in sync with the input
  let searchValue = $state(logsStore.searchQuery);

  /**
   * Handles search input changes
   * Updates the store's search query, which triggers reactive filtering
   */
  function handleSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    searchValue = input.value;
    logsStore.setSearchQuery(searchValue);
  }

  /**
   * Clears the search input and filter
   */
  function clearSearch() {
    searchValue = '';
    logsStore.setSearchQuery('');
  }
</script>

<div class="search">
  <div class="search-input-wrapper">
    <span class="search-icon">🔍</span>
    <input
      type="text"
      class="search-input"
      placeholder="Search by URL or method (e.g., 'users', 'POST')..."
      value={searchValue}
      oninput={handleSearch}
    />
    {#if searchValue}
      <button class="clear-button" onclick={clearSearch} title="Clear search">
        ✕
      </button>
    {/if}
  </div>

  {#if searchValue}
    <div class="search-results-info">
      Found {logsStore.filteredLogs.length} of {logsStore.logs.length} logs
    </div>
  {/if}
</div>

<style>
  .search {
    padding: 1rem;
    background: var(--bg-primary, #fff);
    border-bottom: 1px solid var(--border-color, #ddd);
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    font-size: 1.1rem;
    pointer-events: none;
    opacity: 0.5;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 2.5rem;
    border: 2px solid var(--border-color, #ddd);
    border-radius: 0.5rem;
    font-size: 0.95rem;
    font-family: inherit;
    transition: all 0.2s;
    background: var(--bg-secondary, #f9f9f9);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary-color, #2196f3);
    background: var(--bg-primary, #fff);
  }

  .search-input::placeholder {
    color: var(--text-secondary, #999);
  }

  .clear-button {
    position: absolute;
    right: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    color: var(--text-secondary, #999);
    transition: color 0.2s;
    border-radius: 0.25rem;
  }

  .clear-button:hover {
    color: var(--text-primary, #333);
    background: var(--bg-hover, #f0f0f0);
  }

  .search-results-info {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary, #666);
    text-align: center;
  }
</style>
