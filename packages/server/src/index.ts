import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { ServerConfig } from './models.js';
import { RingBuffer } from './storage/ring-buffer.js';
import { httpProxyRoutes } from './routes/http-proxy.js';
import { logsRoutes } from './routes/logs.js';
import { specRoutes } from './routes/spec.js';
import { wsRoutes } from './routes/ws.js';

/**
 * Load configuration from environment variables
 * Uses process.env (Node.js global) with fallback defaults
 */
function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '9090', 10),
    host: process.env.HOST || '0.0.0.0',
    maxLogs: parseInt(process.env.MAX_LOGS || '1000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
    corsEnabled: process.env.CORS_ENABLED !== 'false', // Default true
    uiDistPath: process.env.UI_DIST_PATH || '../../apps/ui/dist',
  };
}

/**
 * Main server initialization
 */
async function startServer() {
  // Load configuration
  const config = loadConfig();

  /**
   * Create Fastify instance
   * Fastify is the web framework that handles HTTP requests
   *
   * Options:
   * - logger: Enables request/error logging
   * - disableRequestLogging: We'll log manually for cleaner output
   */
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
    },
    disableRequestLogging: false,
  });

  /**
   * Register CORS plugin
   * CORS = Cross-Origin Resource Sharing
   * Allows the UI (running on a different port in dev) to make requests to this server
   *
   * Without CORS, browsers block requests from http://localhost:5173 to http://localhost:9090
   */
  if (config.corsEnabled) {
    await fastify.register(fastifyCors, {
      origin: true, // Allow all origins (restrict in production!)
      credentials: true,
    });
    fastify.log.info('CORS enabled');
  }

  /**
   * Register WebSocket plugin
   * Enables real-time bidirectional communication
   */
  await fastify.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB max message size
    },
  });
  fastify.log.info('WebSocket support enabled');

  /**
   * Create the ring buffer for storing logs in memory
   * This is shared across all routes via dependency injection
   */
  const buffer = new RingBuffer(config.maxLogs);
  fastify.log.info({ maxLogs: config.maxLogs }, 'Ring buffer initialized');

  /**
   * Register API routes
   * We pass the buffer as an option so routes can access it
   */
  await fastify.register(logsRoutes, { buffer, prefix: '' });
  fastify.log.info('Logs API routes registered');

  await fastify.register(specRoutes);
  fastify.log.info('Spec proxy routes registered');

  await fastify.register(httpProxyRoutes);
  fastify.log.info('HTTP proxy routes registered');

  /**
   * Register WebSocket routes
   */
  await fastify.register(wsRoutes, { buffer });
  fastify.log.info('WebSocket routes registered');

  /**
   * Register static file serving
   * This serves the built Svelte UI (HTML, CSS, JS files)
   *
   * In development: UI runs separately on Vite dev server (port 5173)
   * In production: UI is built to dist/ and served from here
   */
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const uiPath = join(__dirname, config.uiDistPath);

  try {
    await fastify.register(fastifyStatic, {
      root: uiPath,
      prefix: '/', // Serve from root path
    });
    fastify.log.info({ path: uiPath }, 'Static file serving enabled');

    /**
     * SPA (Single Page Application) fallback route
     * For any route not matching /api/* or /ws, serve index.html
     *
     * This allows client-side routing (e.g., /logs/123 is handled by Svelte, not server)
     */
    fastify.setNotFoundHandler((request, reply) => {
      // Don't serve index.html for API or WebSocket routes
      if (
        request.url.startsWith('/api/') ||
        request.url.startsWith('/ws')
      ) {
        reply.code(404).send({ error: 'Not Found' });
        return;
      }

      // Serve index.html for all other routes (SPA routing)
      reply.sendFile('index.html');
    });
  } catch (error) {
    fastify.log.warn(
      { error, path: uiPath },
      'Static file serving not available (UI not built yet?)'
    );
  }

  /**
   * Start the server
   * Fastify will listen on the configured host and port
   */
  try {
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(
      `Server ready at http://${config.host}:${config.port}`
    );
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

/**
 * Run the server
 * Top-level await is supported in ES modules
 */
startServer();
