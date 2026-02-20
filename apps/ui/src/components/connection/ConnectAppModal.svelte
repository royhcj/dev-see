<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { config } from '../../lib/config';
  import {
    buildConnectionDeepLink,
    buildQrCodeImageUrl,
    parseServerTarget,
    validateBundleId,
    validateServerTarget,
  } from '../../lib/connection/deep-link';

  export let open = false;

  const dispatch = createEventDispatcher<{ close: void }>();

  let bundleId = '';
  let copyState: 'idle' | 'copied' | 'error' = 'idle';
  let qrLoadFailed = false;
  let lastQrImageUrl = '';

  $: parsedTarget = parseServerTarget(config.serverUrl);
  $: serverHost = parsedTarget?.host ?? '';
  $: serverPort = parsedTarget?.port ?? NaN;
  $: bundleIdError = validateBundleId(bundleId);
  $: serverError = validateServerTarget(serverHost, serverPort);
  $: formError = bundleIdError ?? serverError;
  $: deepLink = formError
    ? ''
    : buildConnectionDeepLink({
        bundleId,
        serverHost,
        serverPort,
      });
  $: qrImageUrl = deepLink ? buildQrCodeImageUrl(deepLink) : '';

  $: if (qrImageUrl !== lastQrImageUrl) {
    qrLoadFailed = false;
    lastQrImageUrl = qrImageUrl;
  }

  async function copyDeepLink() {
    if (!deepLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(deepLink);
      copyState = 'copied';
    } catch (error) {
      console.error('Failed to copy deep link:', error);
      copyState = 'error';
    }
  }

  function closeModal() {
    copyState = 'idle';
    dispatch('close');
  }

  function onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function onWindowKeyDown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={onWindowKeyDown} />

{#if open}
  <div class="modal-overlay" role="presentation" on:click={onBackdropClick}>
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-app-title"
    >
      <header class="modal-header">
        <h2 id="connect-app-title">Connect iOS App</h2>
        <button type="button" class="close-button" on:click={closeModal} aria-label="Close">
          ×
        </button>
      </header>

      <div class="modal-content">
        <label class="field">
          <span>Bundle ID</span>
          <input
            type="text"
            bind:value={bundleId}
            placeholder="com.example.app"
            spellcheck="false"
            autocomplete="off"
          />
        </label>

        <label class="field">
          <span>Server host/IP</span>
          <input type="text" readonly value={serverHost} />
        </label>

        <label class="field">
          <span>Server port</span>
          <input type="text" readonly value={Number.isNaN(serverPort) ? '' : String(serverPort)} />
        </label>

        <label class="field">
          <span>Deep link preview</span>
          <textarea readonly value={deepLink || ''}></textarea>
        </label>

        {#if formError}
          <p class="error">{formError}</p>
        {/if}

        <div class="actions">
          <button type="button" on:click={copyDeepLink} disabled={!deepLink}>
            {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy Failed' : 'Copy Deep Link'}
          </button>
        </div>

        <div class="qr-area">
          <h3>Scan QR Code</h3>
          {#if !deepLink}
            <p class="hint">Enter a valid Bundle ID to generate a QR code.</p>
          {:else if qrLoadFailed}
            <p class="error">QR generation failed. Copy and share the deep link manually.</p>
          {:else}
            <img
              src={qrImageUrl}
              alt="QR code for iOS app deep link connection"
              width="220"
              height="220"
              on:error={() => {
                qrLoadFailed = true;
              }}
            />
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(10, 23, 41, 0.5);
    z-index: 1000;
  }

  .modal {
    width: min(620px, 100%);
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    background: #fff;
    border-radius: 0.75rem;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-color, #ddd);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-light, #eee);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .close-button {
    border: 0;
    font-size: 1.5rem;
    line-height: 1;
    background: transparent;
    color: var(--text-secondary, #666);
    cursor: pointer;
  }

  .modal-content {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 1rem 1.25rem 1.25rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field span {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary, #666);
  }

  .field input,
  .field textarea {
    width: 100%;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.5rem;
    padding: 0.55rem 0.7rem;
    font-size: 0.9rem;
    color: var(--text-primary, #333);
    background: #fff;
  }

  .field input[readonly],
  .field textarea[readonly] {
    background: var(--bg-secondary, #f5f5f5);
  }

  .field textarea {
    min-height: 70px;
    resize: vertical;
    font-family: 'Courier New', Courier, monospace;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .actions button {
    border: 0;
    border-radius: 0.5rem;
    padding: 0.55rem 0.9rem;
    font-weight: 600;
    color: #fff;
    background: var(--primary-color, #2196f3);
    cursor: pointer;
  }

  .actions button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .qr-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
    padding: 0.9rem;
    border: 1px dashed var(--border-dark, #ccc);
    border-radius: 0.6rem;
    background: #fafbff;
    text-align: center;
  }

  .qr-area h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  .qr-area img {
    display: block;
    width: 220px;
    height: 220px;
    border-radius: 0.5rem;
    background: #fff;
    border: 1px solid var(--border-light, #eee);
  }

  .hint {
    margin: 0;
    color: var(--text-secondary, #666);
    font-size: 0.9rem;
  }

  .error {
    margin: 0;
    color: var(--status-error, #f44336);
    font-size: 0.85rem;
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal {
      max-height: calc(100vh - 1rem);
    }
  }
</style>
