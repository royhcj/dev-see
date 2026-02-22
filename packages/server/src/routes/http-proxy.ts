import type { FastifyInstance } from 'fastify';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_URL_LENGTH = 4096;

interface ProxyRequestBody {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  body?:
    | { kind: 'none' }
    | { kind: 'raw'; value: string }
    | { kind: 'multipart'; entries: Array<{ name: string; value: string }> };
}

/**
 * Generic HTTP proxy route used by Try It Out.
 * Allows requests to third-party APIs when browser CORS blocks direct fetch.
 */
export async function httpProxyRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: ProxyRequestBody }>('/api/http/proxy', async (request, reply) => {
    const method = request.body?.method?.trim().toUpperCase();
    const urlInput = request.body?.url?.trim();
    const timeoutMs = clampTimeout(request.body?.timeoutMs);

    if (!method) {
      return reply.code(400).send({ error: 'Missing required field: method' });
    }

    if (!urlInput) {
      return reply.code(400).send({ error: 'Missing required field: url' });
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

    const headers = new Headers();
    for (const [name, value] of Object.entries(request.body?.headers ?? {})) {
      if (!name.trim()) {
        continue;
      }

      const normalized = name.toLowerCase();
      if (normalized === 'host' || normalized === 'content-length') {
        continue;
      }

      headers.set(name, value);
    }

    let body: FormData | string | undefined;
    const proxyBody = request.body?.body;
    if (proxyBody?.kind === 'raw') {
      body = proxyBody.value ?? '';
    } else if (proxyBody?.kind === 'multipart') {
      const form = new FormData();
      for (const entry of proxyBody.entries ?? []) {
        if (!entry.name?.trim()) {
          continue;
        }
        form.append(entry.name, entry.value ?? '');
      }
      body = form;
      headers.delete('content-type');
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();

    try {
      const upstream = await fetch(url.toString(), {
        method,
        headers,
        body,
        signal: controller.signal,
        redirect: 'follow',
      });

      const bodyText = await upstream.text();
      return reply.send({
        method,
        url: url.toString(),
        status: upstream.status,
        statusText: upstream.statusText,
        durationMs: Math.max(0, Date.now() - started),
        headers: headersToRecord(upstream.headers),
        bodyText,
        contentType: upstream.headers.get('content-type') ?? undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return reply.code(504).send({
          error: `Proxy request timed out after ${timeoutMs} ms.`,
        });
      }

      return reply.code(502).send({
        error: `Proxy request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  });
}

function clampTimeout(timeoutMs: number | undefined): number {
  if (!Number.isFinite(timeoutMs) || !timeoutMs) {
    return DEFAULT_TIMEOUT_MS;
  }

  const normalized = Math.floor(timeoutMs);
  return Math.min(Math.max(normalized, 1), MAX_TIMEOUT_MS);
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}
