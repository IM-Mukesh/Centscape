// src/utils/ssrf.ts
import { lookup } from "dns/promises";

export async function resolveHost(host: string): Promise<string[]> {
  // returns list of resolved IPs for a host
  try {
    const records = await lookup(host, { all: true });
    return records.map((r) => r.address);
  } catch (err) {
    throw new Error("DNS_LOOKUP_FAILED");
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  if (parts[0] === 10) return true; // 10.0.0.0/8
  if (parts[0] === 127) return true; // loopback
  if (parts[0] === 169 && parts[1] === 254) return true; // link-local
  if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.x.x
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
  return false;
}

export function isPrivateIP(ip: string): boolean {
  if (!ip) return false;
  // IPv6 checks (simple)
  const low = ip.toLowerCase();
  if (low === "::1") return true;
  if (low.startsWith("fe80:")) return true; // link-local
  if (low.startsWith("fc") || low.startsWith("fd")) return true; // unique local (fc00::/7)
  if (low.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 => ::ffff:127.0.0.1
    const mapped = low.split("::ffff:")[1];
    return isPrivateIPv4(mapped);
  }
  // IPv4
  if (ip.indexOf(".") !== -1) return isPrivateIPv4(ip);
  return false;
}
