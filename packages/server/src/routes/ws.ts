import type { FastifyInstance } from 'fastify';
import type { RingBuffer } from '../storage/ring-buffer.js';

/**
 * WebSocket routes
 *
 * WebSockets provide real-time bidirectional communication between server and clients.
 * This is how we push new log entries to the UI instantly without the UI having to poll.
 *
 * Protocol:
 * - Client connects to /ws
 * - Server sends initial state: all existing logs
 * - Server pushes new logs as they arrive
 * - Client can request specific actions (future: filtering, search)
 */
export async function wsRoutes(
  fastify: FastifyInstance,
  options: { buffer: RingBuffer }
) {
  const { buffer } = options;

  /**
   * WebSocket endpoint: /ws
   *
   * Message types from server to client:
   * - { type: 'connected', data: { message, count } } - Initial connection
   * - { type: 'initial-logs', data: [...logs] } - All existing logs on connect
   * - { type: 'new-log', data: {...log} } - New log entry (sent from POST /api/logs)
   */
  fastify.get('/ws', { websocket: true }, (socket, request) => {
    // Log new connection
    fastify.log.info('WebSocket client connected');

    /**
     * On connection, send initial state
     * This ensures the client has all existing logs immediately
     */
    socket.on('open', () => {
      // Send welcome message
      socket.send(
        JSON.stringify({
          type: 'connected',
          data: {
            message: 'Connected to dev-see log server',
            count: buffer.getSize(),
          },
        })
      );

      // Send all existing logs
      const allLogs = buffer.getAll();
      socket.send(
        JSON.stringify({
          type: 'initial-logs',
          data: allLogs,
        })
      );
    });

    /**
     * Handle incoming messages from client
     * Future: Could implement filtering, search, etc.
     */
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.info({ data }, 'WebSocket message received');

        // Handle different message types
        switch (data.type) {
          case 'ping':
            // Respond to ping with pong (heartbeat)
            socket.send(JSON.stringify({ type: 'pong' }));
            break;

          case 'get-logs':
            // Client requests current logs (useful after reconnection)
            const logs = buffer.getAll();
            socket.send(
              JSON.stringify({
                type: 'initial-logs',
                data: logs,
              })
            );
            break;

          default:
            fastify.log.warn({ type: data.type }, 'Unknown message type');
        }
      } catch (error) {
        fastify.log.error({ error }, 'Error parsing WebSocket message');
      }
    });

    /**
     * Handle connection close
     */
    socket.on('close', () => {
      fastify.log.info('WebSocket client disconnected');
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      fastify.log.error({ error }, 'WebSocket error');
    });
  });
}
