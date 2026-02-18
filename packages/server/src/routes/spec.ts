import type { FastifyInstance } from 'fastify';

const FETCH_TIMEOUT_MS = 15000;
const MAX_URL_LENGTH = 4096;

/**
 * Spec fetch proxy route.
 * Allows the UI to load third-party OpenAPI URLs that are blocked by browser CORS.
 */
export async function specRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { url?: string } }>(
    '/api/spec/fetch',
    async (request, reply) => {
      const urlInput = request.query.url?.trim();
      if (!urlInput) {
        return reply.code(400).send({ error: 'Missing required query parameter: url' });
      }

      if (urlInput.length > MAX_URL_LENGTH) {
        return reply.code(400).send({ error: 'URL is too long.' });
      }

      let url: URL;
      try {
        url = new URL(urlInput);
      } catch {
        return reply.code(400).send({ error: `Invalid URL: "${urlInput}"` });
      }

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return reply.code(400).send({ error: 'Only http and https URLs are supported.' });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
        });

        if (!response.ok) {
          return reply.code(502).send({
            error: `Upstream responded with HTTP ${response.status} ${response.statusText}.`,
          });
        }

        const content = await response.text();
        if (!content.trim()) {
          return reply.code(422).send({ error: 'Fetched spec content is empty.' });
        }

        return reply.send({
          url: url.toString(),
          contentType: response.headers.get('content-type') ?? undefined,
          content,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return reply.code(504).send({ error: `Fetching spec timed out after ${FETCH_TIMEOUT_MS}ms.` });
        }

        const message = error instanceof Error ? error.message : 'Unknown fetch failure.';
        return reply.code(502).send({ error: `Failed to fetch upstream spec: ${message}` });
      } finally {
        clearTimeout(timeoutId);
      }
    }
  );
}
