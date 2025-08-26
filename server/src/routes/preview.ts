// src/routes/preview.ts
import { Router, Request, Response } from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
// import { resolveHost, isPrivateIP } from "../utils/ssrf";

const router = Router();

const MAX_HTML_SIZE = 512 * 1024; // 512 KB
const FETCH_TIMEOUT_MS = 5000; // 5s
const MAX_REDIRECTS = 3;

/**
 * Extract price & currency with multiple strategies
 */
function extractPriceAndCurrency($: cheerio.CheerioAPI, html: string) {
  // 1. Open Graph product tags
  const ogPrice = $("meta[property='product:price:amount']").attr("content");
  const ogCurrency = $("meta[property='product:price:currency']").attr(
    "content"
  );

  if (ogPrice) {
    return {
      price: ogCurrency ? `${ogCurrency} ${ogPrice}` : ogPrice,
      currency: ogCurrency || null,
    };
  }

  // 2. JSON-LD schema (Product with offers)
  const ldJson: string[] = [];
  $("script[type='application/ld+json']").each((_, el) => {
    const text = $(el).html();
    if (text) ldJson.push(text);
  });

  for (const json of ldJson) {
    try {
      const data = JSON.parse(json);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product" && item.offers) {
          const offer = Array.isArray(item.offers)
            ? item.offers[0]
            : item.offers;
          if (offer.price) {
            return {
              price: offer.priceCurrency
                ? `${offer.priceCurrency} ${offer.price}`
                : offer.price,
              currency: offer.priceCurrency || null,
            };
          }
        }
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  // 3. Regex fallback ($499.00, €199, £120)
  const priceRegex = /([£€$])\s?([\d,]+(?:\.\d{1,2})?)/;
  const priceMatch = html.match(priceRegex);
  if (priceMatch) {
    return {
      price: `${priceMatch[1]}${priceMatch[2]}`,
      currency: priceMatch[1],
    };
  }

  return { price: null, currency: null };
}

/**
 * Extract metadata (title, image, price, siteName)
 */
function extractMeta(html: string, baseUrl: string) {
  const $ = cheerio.load(html);

  const getMeta = (prop: string, attr = "property") =>
    $(`meta[${attr}='${prop}']`).attr("content") ||
    $(`meta[name='${prop}']`).attr("content");

  // Title
  const title =
    getMeta("og:title") ||
    getMeta("twitter:title", "name") ||
    $("title").first().text().trim() ||
    "Untitled";

  // Image
  let image =
    getMeta("og:image") ||
    getMeta("twitter:image", "name") ||
    $("img").first().attr("src") ||
    null;
  if (image && baseUrl && !/^https?:\/\//i.test(image)) {
    try {
      image = new URL(image, baseUrl).href;
    } catch {
      /* ignore invalid */
    }
  }

  // Price + currency
  const { price, currency } = extractPriceAndCurrency($, html);

  // Site name
  const siteName =
    getMeta("og:site_name") ||
    (() => {
      try {
        return new URL(baseUrl).hostname;
      } catch {
        return baseUrl;
      }
    })();

  return { title, image, price, currency, siteName };
}

/**
 * POST /api/preview
 */
router.post("/preview", async (req: Request, res: Response) => {
  const { url, raw_html } = req.body ?? {};

  if (!url && !raw_html) {
    return res.status(400).json({ error: "url or raw_html is required" });
  }

  // Case 1: Client provides raw_html directly (tests / offline mode)
  if (raw_html) {
    try {
      const parsed = extractMeta(raw_html, url || "");
      return res.json({ ...parsed, sourceUrl: url || null });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Parse failed" });
    }
  }

  // Case 2: Fetch from remote URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Invalid URL protocol" });
  }

  // SSRF guard
  // try {
  //   const addrs = await resolveHost(parsedUrl.hostname);
  //   for (const ip of addrs) {
  //     if (isPrivateIP(ip)) {
  //       return res
  //         .status(400)
  //         .json({ error: "URL resolves to a private/loopback IP (blocked)" });
  //     }
  //   }
  // } catch {
  //   return res.status(400).json({ error: "DNS lookup failed" });
  // }

  // Fetch with timeout, redirects, size limit
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.href, {
      headers: { "User-Agent": "CentscapeBot/1.0" },
      redirect: "follow",
      follow: MAX_REDIRECTS,
      signal: controller.signal as any,
    });

    const contentType = String(
      response.headers.get("content-type") || ""
    ).toLowerCase();
    if (!contentType.includes("text/html")) {
      clearTimeout(timeout);
      return res.status(400).json({ error: "Content-Type is not text/html" });
    }

    const body = response.body as any;
    if (!body) {
      clearTimeout(timeout);
      return res.status(400).json({ error: "Empty response body" });
    }

    let total = 0;
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      body.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_HTML_SIZE) {
          controller.abort();
          reject(new Error("MAX_HTML_SIZE_EXCEEDED"));
          return;
        }
        chunks.push(chunk);
      });
      body.on("end", () => resolve());
      body.on("error", (err: Error) => reject(err));
    });

    clearTimeout(timeout);
    const html = Buffer.concat(chunks).toString("utf8");

    const parsed = extractMeta(html, parsedUrl.href);
    return res.json({ ...parsed, sourceUrl: parsedUrl.href });
  } catch (err: any) {
    clearTimeout(timeout);

    if (
      err.name === "AbortError" ||
      err.message === "The user aborted a request."
    ) {
      return res.status(504).json({ error: "Fetch timed out" });
    }
    if (err.message === "MAX_HTML_SIZE_EXCEEDED") {
      return res.status(413).json({ error: "Max HTML size exceeded" });
    }
    if (err.type === "max-redirect") {
      return res.status(400).json({ error: "Too many redirects" });
    }

    return res.status(400).json({ error: err.message || "Fetch failed" });
  }
});

export default router;
