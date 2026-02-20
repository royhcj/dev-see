import { networkInterfaces } from 'node:os';
import type { FastifyInstance } from 'fastify';

/**
 * Connection helper routes for QR/deep-link flows.
 * Exposes LAN-reachable host candidates so UI can avoid localhost in QR payloads.
 */
export async function connectionRoutes(fastify: FastifyInstance) {
  fastify.get('/api/connection/target', async () => {
    const hosts = getLanIpv4Candidates();
    return {
      preferredHost: hosts[0] ?? null,
      hosts,
    };
  });
}

function getLanIpv4Candidates(): string[] {
  const interfaces = networkInterfaces();
  const candidates = new Set<string>();

  for (const details of Object.values(interfaces)) {
    for (const address of details ?? []) {
      if (address.family !== 'IPv4' || address.internal) {
        continue;
      }
      candidates.add(address.address);
    }
  }

  const all = [...candidates];
  const lan = all.filter(isPrivateIpv4);
  const publicOrOther = all.filter(ip => !isPrivateIpv4(ip));
  return [...lan, ...publicOrOther];
}

function isPrivateIpv4(ip: string): boolean {
  const octets = ip.split('.').map(part => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some(value => Number.isNaN(value) || value < 0 || value > 255)) {
    return false;
  }

  if (octets[0] === 10) {
    return true;
  }

  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
    return true;
  }

  return octets[0] === 192 && octets[1] === 168;
}
