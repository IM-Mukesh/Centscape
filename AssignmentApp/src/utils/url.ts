// src/utils/url.ts
/**
 * Utility functions for URL parsing and cleanup
 */

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);

    // Clean up tracking parameters (example: remove utm params)
    const params = url.searchParams;
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
    ];

    trackingParams.forEach(p => {
      if (params.has(p)) {
        params.delete(p);
      }
    });

    // Rebuild the URL
    return url.toString();
  } catch (err) {
    console.warn('Invalid URL passed to normalizeUrl:', raw);
    return raw;
  }
}

export function getDomain(raw: string): string {
  try {
    const url = new URL(raw);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return raw;
  }
}

export function getPath(raw: string): string {
  try {
    const url = new URL(raw);
    return url.pathname || '/';
  } catch {
    return '/';
  }
}
