import type { BuiltTryItRequest } from './request-builder.js';

export function buildCurlCommand(request: BuiltTryItRequest): string {
  const parts: string[] = ['curl', '-X', shellQuote(request.method.toUpperCase()), shellQuote(request.url)];

  const headerEntries = Object.entries(request.headers).sort((left, right) =>
    left[0].localeCompare(right[0])
  );
  for (const [name, value] of headerEntries) {
    parts.push('-H', shellQuote(`${name}: ${value}`));
  }

  if (request.curlBody) {
    if (request.curlBody.kind === 'raw') {
      parts.push('--data-raw', shellQuote(request.curlBody.value));
    } else {
      request.curlBody.entries.forEach((entry) => {
        parts.push('-F', shellQuote(`${entry.name}=${entry.value}`));
      });
    }
  }

  return parts.join(' ');
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}
