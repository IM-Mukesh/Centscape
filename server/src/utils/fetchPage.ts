import fetch from "node-fetch";

export async function fetchPage(
  url: string,
  timeoutMs = 5000
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(url, {
    signal: controller.signal,
    redirect: "follow",
    headers: { "User-Agent": "CentscapeBot/1.0" },
  });

  clearTimeout(timeout);

  if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) {
    throw new Error("Invalid response");
  }

  return await res.text();
}
