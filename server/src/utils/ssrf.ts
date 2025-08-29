import { lookup } from "dns/promises";

export async function resolveHost(host: string): Promise<string[]> {
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
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

export function isPrivateIP(ip: string): boolean {
  if (!ip) return false;
  const low = ip.toLowerCase();
  if (low === "::1") return true;
  if (low.startsWith("fe80:")) return true;
  if (low.startsWith("fc") || low.startsWith("fd")) return true;
  if (low.startsWith("::ffff:")) {
    const mapped = low.split("::ffff:")[1];
    return isPrivateIPv4(mapped);
  }
  if (ip.indexOf(".") !== -1) return isPrivateIPv4(ip);
  return false;
}
