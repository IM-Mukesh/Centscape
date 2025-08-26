import { Router, Request, Response } from "express";
import * as cheerio from "cheerio";

const router = Router();

const MAX_HTML_SIZE = 512 * 1024; // 512 KB
const FETCH_TIMEOUT_MS = 5000; // 5s

function extractPriceAndCurrency($: cheerio.CheerioAPI, html: string) {
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
          if (offer?.price) {
            return {
              price: offer.priceCurrency
                ? `${offer.priceCurrency} ${offer.price}`
                : offer.price,
              currency: offer.priceCurrency || null,
            };
          }
        }
      }
    } catch {}
  }

  const priceRegex = /([£€$])\s?([\d,]+(?:\.\d{1,2})?)/;
  const m = html.match(priceRegex);
  if (m) return { price: `${m[1]}${m[2]}`, currency: m[1] };

  return { price: null, currency: null };
}

function extractMeta(html: string, baseUrl: string) {
  const $ = cheerio.load(html);

  const getMeta = (prop: string, attr = "property") =>
    $(`meta[${attr}='${prop}']`).attr("content") ||
    $(`meta[name='${prop}']`).attr("content");

  const title =
    getMeta("og:title") ||
    getMeta("twitter:title", "name") ||
    $("title").first().text().trim() ||
    "Untitled";

  let image =
    getMeta("og:image") ||
    getMeta("twitter:image", "name") ||
    $("img").first().attr("src") ||
    null;

  if (image && baseUrl && !/^https?:\/\//i.test(image)) {
    try {
      image = new URL(image, baseUrl).href;
    } catch {}
  }

  const { price, currency } = extractPriceAndCurrency($, html);

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

/** POST /api/preview */
router.post("/preview", async (req: Request, res: Response) => {
  const { url, raw_html } = req.body ?? {};

  if (!url && !raw_html) {
    return res.status(400).json({ error: "url or raw_html is required" });
  }

  if (raw_html) {
    try {
      const parsed = extractMeta(raw_html, url || "");
      return res.json({ ...parsed, sourceUrl: url || null });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Parse failed" });
    }
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Invalid URL protocol" });
  }

  // fetch with timeout + size cap using native fetch
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.href, {
      headers: { "User-Agent": "CentscapeBot/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });

    const contentType = String(
      response.headers.get("content-type") || ""
    ).toLowerCase();
    if (!contentType.includes("text/html")) {
      clearTimeout(timeout);
      return res.status(400).json({ error: "Content-Type is not text/html" });
    }

    const body = response.body;
    if (!body) {
      clearTimeout(timeout);
      return res.status(400).json({ error: "Empty response body" });
    }

    // stream & cap size
    const reader = body.getReader();
    let total = 0;
    const parts: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        if (total > MAX_HTML_SIZE) {
          controller.abort();
          throw new Error("MAX_HTML_SIZE_EXCEEDED");
        }
        parts.push(value);
      }
    }

    clearTimeout(timeout);
    const html = Buffer.concat(parts.map((p) => Buffer.from(p))).toString(
      "utf8"
    );

    const parsed = extractMeta(html, parsedUrl.href);
    return res.json({ ...parsed, sourceUrl: parsedUrl.href });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError")
      return res.status(504).json({ error: "Fetch timed out" });
    if (err?.message === "MAX_HTML_SIZE_EXCEEDED")
      return res.status(413).json({ error: "Max HTML size exceeded" });
    return res.status(400).json({ error: err?.message || "Fetch failed" });
  }
});

export default router;
