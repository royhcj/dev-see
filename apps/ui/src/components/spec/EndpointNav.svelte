<script lang="ts">
  import { onMount } from 'svelte';
  import type { EndpointNavItem, EndpointTagGroup } from '../../lib/openapi/normalize.js';
  import { specViewerStore } from '../../stores/spec-viewer.svelte.js';

  interface VirtualTagRow {
    kind: 'tag';
    key: string;
    tag: string;
    count: number;
    top: number;
    height: number;
  }

  interface VirtualEndpointRow {
    kind: 'endpoint';
    key: string;
    endpoint: EndpointNavItem;
    top: number;
    height: number;
  }

  interface VirtualLayout {
    rows: Array<VirtualTagRow | VirtualEndpointRow>;
    endpointPositionById: Record<string, { top: number; bottom: number }>;
    totalHeight: number;
  }

  const SEARCH_DEBOUNCE_MS = 150;
  const LARGE_SPEC_THRESHOLD = 300;
  const VIRTUAL_TAG_ROW_HEIGHT = 36;
  const VIRTUAL_ENDPOINT_ROW_HEIGHT = 70;
  const VIRTUAL_OVERSCAN_PX = 280;

  let searchInput = $state('');
  let searchTerm = $state('');
  let expandedByTag = $state<Record<string, boolean>>({});
  let activeEndpointId = $state<string | null>(null);
  let virtualScrollTop = $state(0);
  let virtualViewportHeight = $state(0);

  let searchInputElement = $state<HTMLInputElement | null>(null);
  let standardListElement = $state<HTMLDivElement | null>(null);
  let virtualScrollElement = $state<HTMLDivElement | null>(null);

  const filteredGroups = $derived(filterEndpointGroups(specViewerStore.endpointGroups, searchTerm));
  const searchActive = $derived(searchTerm.length > 0);
  const filteredOperationCount = $derived(
    filteredGroups.reduce((total, group) => total + group.endpoints.length, 0)
  );
  const useVirtualizedList = $derived(filteredOperationCount > LARGE_SPEC_THRESHOLD);
  const navigableEndpoints = $derived(
    collectNavigableEndpoints(filteredGroups, expandedByTag, searchActive)
  );
  const virtualLayout = $derived(buildVirtualLayout(filteredGroups, expandedByTag, searchActive));
  const visibleVirtualRows = $derived(
    pickVisibleVirtualRows(
      virtualLayout.rows,
      virtualScrollTop,
      virtualViewportHeight || VIRTUAL_ENDPOINT_ROW_HEIGHT,
      VIRTUAL_OVERSCAN_PX
    )
  );

  $effect(() => {
    const timer = window.setTimeout(() => {
      searchTerm = searchInput.trim().toLowerCase();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  });

  $effect(() => {
    const tags = specViewerStore.endpointGroups.map((group) => group.tag);
    const knownTags = Object.keys(expandedByTag);
    const missingTag = tags.find((tag) => expandedByTag[tag] === undefined);
    const staleTag = knownTags.find((tag) => !tags.includes(tag));

    if (!missingTag && !staleTag) {
      return;
    }

    const next: Record<string, boolean> = {};
    for (const tag of tags) {
      next[tag] = expandedByTag[tag] ?? true;
    }
    expandedByTag = next;
  });

  $effect(() => {
    if (virtualScrollElement && virtualScrollTop !== virtualScrollElement.scrollTop) {
      virtualScrollElement.scrollTop = virtualScrollTop;
    }
  });

  $effect(() => {
    const endpointIds = navigableEndpoints.map((endpoint) => endpoint.id);

    if (endpointIds.length === 0) {
      activeEndpointId = null;
      return;
    }

    const selectedId = specViewerStore.selectedEndpointId;
    if (selectedId && endpointIds.includes(selectedId) && activeEndpointId !== selectedId) {
      activeEndpointId = selectedId;
      return;
    }

    if (!activeEndpointId || !endpointIds.includes(activeEndpointId)) {
      activeEndpointId = endpointIds[0] ?? null;
    }
  });

  onMount(() => {
    const handleWindowKeydown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusSearchInput();
      }
    };

    window.addEventListener('keydown', handleWindowKeydown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeydown);
    };
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

  function isTagExpanded(tag: string): boolean {
    if (searchActive) {
      return true;
    }

    return expandedByTag[tag] ?? true;
  }

  function toggleGroup(tag: string): void {
    if (searchActive) {
      return;
    }

    expandedByTag = {
      ...expandedByTag,
      [tag]: !isTagExpanded(tag),
    };
  }

  function clearSearch(): void {
    searchInput = '';
    focusSearchInput();
  }

  function focusSearchInput(): void {
    searchInputElement?.focus();
    searchInputElement?.select();
  }

  function selectEndpoint(endpointId: string): void {
    activeEndpointId = endpointId;
    specViewerStore.selectEndpoint(endpointId);
  }

  function moveSelection(step: number): void {
    const endpointIds = navigableEndpoints.map((endpoint) => endpoint.id);
    if (endpointIds.length === 0) {
      return;
    }

    const selectedId = activeEndpointId ?? specViewerStore.selectedEndpointId;
    const currentIndex = selectedId ? endpointIds.indexOf(selectedId) : -1;
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = clamp(startIndex + step, 0, endpointIds.length - 1);
    const endpointId = endpointIds[nextIndex];
    if (!endpointId) {
      return;
    }

    selectEndpoint(endpointId);
    ensureEndpointVisible(endpointId);
  }

  function commitActiveSelection(): void {
    if (!activeEndpointId) {
      return;
    }

    selectEndpoint(activeEndpointId);
    ensureEndpointVisible(activeEndpointId);
  }

  function ensureEndpointVisible(endpointId: string): void {
    if (useVirtualizedList) {
      const viewport = virtualScrollElement;
      const position = virtualLayout.endpointPositionById[endpointId];
      if (!viewport || !position) {
        return;
      }

      const viewportTop = viewport.scrollTop;
      const viewportBottom = viewportTop + viewport.clientHeight;
      if (position.top < viewportTop) {
        virtualScrollTop = position.top;
      } else if (position.bottom > viewportBottom) {
        virtualScrollTop = position.bottom - viewport.clientHeight;
      }

      return;
    }

    const container = standardListElement;
    if (!container) {
      return;
    }

    const buttons = container.querySelectorAll<HTMLButtonElement>('button[data-endpoint-id]');
    for (const button of buttons) {
      if (button.dataset.endpointId !== endpointId) {
        continue;
      }

      button.scrollIntoView({ block: 'nearest' });
      break;
    }
  }

  function handleListKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveSelection(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveSelection(-1);
        break;
      case 'Enter':
        event.preventDefault();
        commitActiveSelection();
        break;
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      commitActiveSelection();
    }
  }

  function handleVirtualScroll(event: Event): void {
    const target = event.currentTarget as HTMLDivElement;
    virtualScrollTop = target.scrollTop;
    virtualViewportHeight = target.clientHeight;
  }

  function endpointAriaLabel(endpoint: EndpointNavItem): string {
    const summary = endpoint.summary?.trim();
    if (summary) {
      return `${endpoint.method} ${endpoint.path}. ${summary}`;
    }
    return `${endpoint.method} ${endpoint.path}`;
  }

  function clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function filterEndpointGroups(groups: EndpointTagGroup[], query: string): EndpointTagGroup[] {
    if (!query) {
      return groups;
    }

    const filtered: EndpointTagGroup[] = [];
    for (const group of groups) {
      const endpoints = group.endpoints.filter((endpoint) => endpointMatchesSearch(endpoint, query));
      if (endpoints.length > 0) {
        filtered.push({
          tag: group.tag,
          endpoints,
        });
      }
    }

    return filtered;
  }

  function endpointMatchesSearch(endpoint: EndpointNavItem, query: string): boolean {
    if (endpoint.path.toLowerCase().includes(query)) {
      return true;
    }

    if (endpoint.summary?.toLowerCase().includes(query)) {
      return true;
    }

    if (endpoint.operationId?.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  }

  function collectNavigableEndpoints(
    groups: EndpointTagGroup[],
    expandedState: Record<string, boolean>,
    forceExpanded: boolean
  ): EndpointNavItem[] {
    const endpoints: EndpointNavItem[] = [];
    for (const group of groups) {
      const expanded = forceExpanded || (expandedState[group.tag] ?? true);
      if (!expanded) {
        continue;
      }

      endpoints.push(...group.endpoints);
    }

    return endpoints;
  }

  function buildVirtualLayout(
    groups: EndpointTagGroup[],
    expandedState: Record<string, boolean>,
    forceExpanded: boolean
  ): VirtualLayout {
    const rows: Array<VirtualTagRow | VirtualEndpointRow> = [];
    const endpointPositionById: Record<string, { top: number; bottom: number }> = {};
    let top = 0;

    for (const group of groups) {
      rows.push({
        kind: 'tag',
        key: `tag:${group.tag}`,
        tag: group.tag,
        count: group.endpoints.length,
        top,
        height: VIRTUAL_TAG_ROW_HEIGHT,
      });
      top += VIRTUAL_TAG_ROW_HEIGHT;

      const expanded = forceExpanded || (expandedState[group.tag] ?? true);
      if (!expanded) {
        continue;
      }

      for (const endpoint of group.endpoints) {
        const rowTop = top;
        const rowBottom = rowTop + VIRTUAL_ENDPOINT_ROW_HEIGHT;
        rows.push({
          kind: 'endpoint',
          key: `endpoint:${group.tag}:${endpoint.id}`,
          endpoint,
          top: rowTop,
          height: VIRTUAL_ENDPOINT_ROW_HEIGHT,
        });
        endpointPositionById[endpoint.id] = {
          top: rowTop,
          bottom: rowBottom,
        };
        top = rowBottom;
      }
    }

    return {
      rows,
      endpointPositionById,
      totalHeight: top,
    };
  }

  function pickVisibleVirtualRows(
    rows: Array<VirtualTagRow | VirtualEndpointRow>,
    scrollTop: number,
    viewportHeight: number,
    overscanPx: number
  ): Array<VirtualTagRow | VirtualEndpointRow> {
    const minTop = Math.max(0, scrollTop - overscanPx);
    const maxBottom = scrollTop + viewportHeight + overscanPx;

    return rows.filter((row) => row.top + row.height >= minTop && row.top <= maxBottom);
  }
</script>

<section class="endpoint-nav" aria-label="OpenAPI endpoint index">
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
      <span>{filteredOperationCount}</span>
    </div>

    <div class="search-row">
      <label class="sr-only" for="endpoint-search-input">Search endpoints</label>
      <input
        id="endpoint-search-input"
        bind:this={searchInputElement}
        bind:value={searchInput}
        type="search"
        placeholder="Search path, summary, operationId"
        aria-keyshortcuts="Meta+K Control+K"
        onkeydown={handleSearchKeyDown}
      />
      {#if searchInput}
        <button
          type="button"
          class="clear-search"
          onclick={clearSearch}
          aria-label="Clear endpoint search"
        >
          Clear
        </button>
      {/if}
    </div>

    {#if useVirtualizedList}
      <p class="virtualization-note">Virtualized list enabled for large result sets.</p>
    {/if}

    {#if filteredOperationCount === 0}
      <p class="group-empty">No endpoints match your search.</p>
    {:else if useVirtualizedList}
      <div
        class="virtual-scroll"
        bind:this={virtualScrollElement}
        bind:clientHeight={virtualViewportHeight}
        onscroll={handleVirtualScroll}
        onkeydown={handleListKeyDown}
        tabindex="0"
        role="listbox"
        aria-label="Endpoint search results"
      >
        <div class="virtual-inner" style={`height: ${virtualLayout.totalHeight}px;`}>
          {#each visibleVirtualRows as row (row.key)}
            {#if row.kind === 'tag'}
              <div class="virtual-row tag-row-wrapper" style={`top: ${row.top}px; height: ${row.height}px;`}>
                <button
                  type="button"
                  class="tag-toggle"
                  onclick={() => toggleGroup(row.tag)}
                  disabled={searchActive}
                  aria-expanded={isTagExpanded(row.tag)}
                  aria-label={`Toggle ${row.tag} section`}
                >
                  <span class="chevron">{isTagExpanded(row.tag) ? '▾' : '▸'}</span>
                  <span>{row.tag}</span>
                  <span class="count">({row.count})</span>
                </button>
              </div>
            {:else}
              <button
                type="button"
                role="option"
                class="endpoint-row virtual-row"
                class:selected={specViewerStore.selectedEndpointId === row.endpoint.id}
                class:active={activeEndpointId === row.endpoint.id}
                data-endpoint-id={row.endpoint.id}
                style={`top: ${row.top}px; height: ${row.height}px;`}
                aria-selected={specViewerStore.selectedEndpointId === row.endpoint.id}
                aria-label={endpointAriaLabel(row.endpoint)}
                onclick={() => selectEndpoint(row.endpoint.id)}
              >
                <span class="method {getMethodClass(row.endpoint.method)}" aria-label={`Method ${row.endpoint.method}`}>
                  {row.endpoint.method}
                </span>
                <span class="path">{row.endpoint.path}</span>
                {#if row.endpoint.summary}
                  <small>{row.endpoint.summary}</small>
                {/if}
              </button>
            {/if}
          {/each}
        </div>
      </div>
    {:else}
      <div
        class="group-list"
        bind:this={standardListElement}
        onkeydown={handleListKeyDown}
        tabindex="0"
        role="listbox"
        aria-label="Endpoint search results"
      >
        {#each filteredGroups as group (group.tag)}
          <section class="group">
            <button
              type="button"
              class="tag-toggle"
              onclick={() => toggleGroup(group.tag)}
              disabled={searchActive}
              aria-expanded={isTagExpanded(group.tag)}
              aria-label={`Toggle ${group.tag} section`}
            >
              <span class="chevron">{isTagExpanded(group.tag) ? '▾' : '▸'}</span>
              <span>{group.tag}</span>
              <span class="count">({group.endpoints.length})</span>
            </button>

            {#if isTagExpanded(group.tag)}
              <div class="endpoint-list">
                {#each group.endpoints as endpoint (`${group.tag}:${endpoint.id}`)}
                  <button
                    type="button"
                    role="option"
                    class="endpoint-row"
                    class:selected={specViewerStore.selectedEndpointId === endpoint.id}
                    class:active={activeEndpointId === endpoint.id}
                    data-endpoint-id={endpoint.id}
                    aria-selected={specViewerStore.selectedEndpointId === endpoint.id}
                    aria-label={endpointAriaLabel(endpoint)}
                    onclick={() => selectEndpoint(endpoint.id)}
                  >
                    <span class="method {getMethodClass(endpoint.method)}" aria-label={`Method ${endpoint.method}`}>
                      {endpoint.method}
                    </span>
                    <span class="path">{endpoint.path}</span>
                    {#if endpoint.summary}
                      <small>{endpoint.summary}</small>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </section>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .endpoint-nav {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
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
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    flex: 1;
    min-height: 0;
  }

  .groups-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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

  .search-row {
    display: flex;
    gap: 0.45rem;
  }

  .search-row input {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.5rem;
    padding: 0.5rem 0.65rem;
    background: var(--bg-primary, #fff);
    color: var(--text-primary, #333);
    font: inherit;
    font-size: 0.88rem;
  }

  .clear-search {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.5rem;
    background: var(--bg-primary, #fff);
    color: var(--text-secondary, #666);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0 0.6rem;
    cursor: pointer;
  }

  .clear-search:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  .virtualization-note {
    margin: 0;
    color: var(--text-secondary, #666);
    font-size: 0.8rem;
  }

  .group-empty {
    margin: 0;
    padding: 0.75rem;
    color: var(--text-secondary, #666);
    font-size: 0.9rem;
    background: var(--bg-primary, #fff);
    border: 1px dashed var(--border-color, #ddd);
    border-radius: 0.5rem;
  }

  .group-list,
  .virtual-scroll {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.65rem;
    background: var(--bg-primary, #fff);
    min-height: 0;
    flex: 1;
    overflow-y: auto;
  }

  .group-list {
    padding: 0.45rem;
  }

  .group + .group {
    margin-top: 0.45rem;
  }

  .tag-toggle {
    width: 100%;
    border: 0;
    background: transparent;
    color: var(--text-secondary, #666);
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.4rem;
    cursor: pointer;
    font: inherit;
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    text-align: left;
  }

  .tag-toggle:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .tag-toggle .chevron {
    display: inline-flex;
    width: 0.7rem;
    justify-content: center;
  }

  .tag-toggle .count {
    margin-left: auto;
    color: var(--text-tertiary, #999);
  }

  .endpoint-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.1rem 0.2rem 0.35rem;
  }

  .endpoint-row {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.5rem;
    background: var(--bg-primary, #fff);
    padding: 0.45rem 0.6rem;
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

  .endpoint-row.active {
    border-color: var(--primary-light, #64b5f6);
    box-shadow: inset 0 0 0 1px var(--primary-light, #64b5f6);
  }

  .endpoint-row.selected {
    border-color: var(--primary-color, #2196f3);
    box-shadow: inset 0 0 0 1px var(--primary-color, #2196f3);
    background: var(--bg-selected, #e3f2fd);
  }

  .endpoint-row .path {
    font-family: 'Courier New', Courier, monospace;
    color: var(--text-primary, #333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.88rem;
  }

  .endpoint-row small {
    grid-column: 1 / -1;
    color: var(--text-secondary, #666);
    font-size: 0.8rem;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
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

  .virtual-inner {
    position: relative;
    min-height: 100%;
  }

  .virtual-row {
    position: absolute;
    left: 0.35rem;
    right: 0.35rem;
    width: calc(100% - 0.7rem);
    box-sizing: border-box;
  }

  .tag-row-wrapper {
    padding: 0.1rem 0.25rem;
  }

  .tag-row-wrapper .tag-toggle {
    height: 100%;
  }

  .virtual-row.endpoint-row {
    margin: 0;
  }

  @media (max-width: 900px) {
    .groups {
      padding: 0.65rem;
    }
  }
</style>
