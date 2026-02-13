/**
 * WebSocket Client - Real-time Log Streaming
 *
 * This module manages the WebSocket connection to the server for receiving
 * real-time log updates. It handles connection lifecycle, reconnection logic,
 * and message parsing.
 *
 * Why WebSocket for logs?
 * - HTTP polling is inefficient (constant requests even when no new logs)
 * - Server-Sent Events (SSE) are one-way only
 * - WebSocket provides full-duplex, real-time communication
 *
 * Connection Lifecycle:
 * 1. Connect to server using configured URL
 * 2. Listen for log messages
 * 3. Auto-reconnect if connection drops
 * 4. Clean up on app unmount
 */

import { config } from './config';
import { logsStore, type LogEntry } from '../stores/logs.svelte';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000; // 3 seconds

  // Reactive status - becomes reactive when used in Svelte components
  status: WebSocketStatus = 'disconnected';

  /**
   * Connects to the WebSocket server
   * Automatically called on initialization
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    try {
      this.status = 'connecting';
      console.log(`🔌 Connecting to WebSocket: ${config.wsUrl}`);

      this.ws = new WebSocket(config.wsUrl);

      // Connection opened successfully
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.status = 'connected';
        this.reconnectAttempts = 0; // Reset reconnection counter
      };

      // Message received from server
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          if (data.type === 'log') {
            // Server sent a new log entry
            this.handleLogMessage(data.payload);
          } else if (data.type === 'ping') {
            // Server sent a keepalive ping, respond with pong
            this.send({ type: 'pong' });
          } else {
            console.warn('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Connection closed
      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.status = 'disconnected';
        this.ws = null;

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      // Connection error
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.status = 'error';
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.status = 'error';
      this.scheduleReconnect();
    }
  }

  /**
   * Schedules a reconnection attempt after a delay
   */
  private scheduleReconnect() {
    if (this.reconnectTimeout !== null) return;

    this.reconnectAttempts++;
    console.log(
      `⏰ Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`
    );

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Handles incoming log messages from the server
   */
  private handleLogMessage(payload: Omit<LogEntry, 'id' | 'timestamp'>) {
    // Add the log to the store
    // The store will automatically generate id and timestamp
    logsStore.addLog(payload);
  }

  /**
   * Sends a message to the server
   */
  send(message: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Disconnects from the WebSocket server
   * Call this when the app is unmounted
   */
  disconnect() {
    console.log('🔌 Disconnecting WebSocket');

    // Clear reconnection timeout
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close the connection
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting'); // 1000 = normal closure
      this.ws = null;
    }

    this.status = 'disconnected';
    this.reconnectAttempts = 0;
  }

  /**
   * Manually triggers a reconnection
   * Useful for user-initiated reconnect button
   */
  reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

// Export a single instance of the WebSocket client
// This ensures we have only one connection to the server
export const wsClient = new WebSocketClient();

/**
 * Initializes the WebSocket connection
 * Call this in your app's main component (App.svelte)
 */
export function initWebSocket() {
  wsClient.connect();

  // Return cleanup function for Svelte's onDestroy or $effect cleanup
  return () => wsClient.disconnect();
}
