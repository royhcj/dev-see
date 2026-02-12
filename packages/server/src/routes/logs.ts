import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import type { LogEntry, IncomingLogEntry } from '../models.js';
import type { RingBuffer } from '../storage/ring-buffer.js';
import { validateLogEntry } from '../utils/validation.js';

/**
 * Logs API routes
 *
 * This module defines the REST API endpoints for submitting and retrieving logs
 */
export async function logsRoutes(
  fastify: FastifyInstance,
  options: { buffer: RingBuffer }
) {
  const { buffer } = options;

  /**
   * POST /api/logs
   * Submit a new log entry
   *
   * How it works:
   * 1. Validate the incoming data
   * 2. Generate a unique ID and timestamp
   * 3. Store in the ring buffer
   * 4. Broadcast to WebSocket clients (handled by WS route)
   * 5. Return the created log entry
   */
  fastify.post<{ Body: IncomingLogEntry }>('/api/logs', async (request, reply) => {
    // Validate the request body
    const validation = validateLogEntry(request.body);

    if (!validation.valid) {
      // Return 400 Bad Request with validation errors
      return reply.code(400).send({
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    // Create the complete log entry with server-generated fields
    const logEntry: LogEntry = {
      id: nanoid(), // Generate short unique ID (e.g., "V1StGXR8_Z5jdHi6B")
      timestamp: new Date().toISOString(), // Current time in ISO format
      ...request.body, // Spread the validated incoming data
    };

    // Store in buffer
    buffer.add(logEntry);

    // Broadcast to all connected WebSocket clients
    // Note: The WebSocket route will handle this via fastify.websocketServer
    fastify.websocketServer.clients.forEach((client) => {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(JSON.stringify({ type: 'new-log', data: logEntry }));
      }
    });

    // Return the created log entry (201 Created)
    return reply.code(201).send(logEntry);
  });

  /**
   * GET /api/logs
   * Retrieve all logs (or recent N logs)
   *
   * Query parameters:
   * - limit: number (optional) - return only the most recent N logs
   */
  fastify.get<{ Querystring: { limit?: string } }>(
    '/api/logs',
    async (request, reply) => {
      const { limit } = request.query;

      if (limit) {
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum <= 0) {
          return reply.code(400).send({
            error: 'Invalid limit parameter',
            details: ['limit must be a positive number'],
          });
        }

        const logs = buffer.getRecent(limitNum);
        return reply.send({ logs, count: logs.length });
      }

      // Return all logs
      const logs = buffer.getAll();
      return reply.send({ logs, count: logs.length });
    }
  );

  /**
   * GET /api/logs/:id
   * Retrieve a specific log by ID
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/logs/:id',
    async (request, reply) => {
      const { id } = request.params;
      const log = buffer.findById(id);

      if (!log) {
        return reply.code(404).send({
          error: 'Log not found',
          details: [`No log found with id: ${id}`],
        });
      }

      return reply.send(log);
    }
  );

  /**
   * DELETE /api/logs
   * Clear all logs (useful for testing)
   */
  fastify.delete('/api/logs', async (request, reply) => {
    buffer.clear();
    return reply.send({ message: 'All logs cleared' });
  });
}
