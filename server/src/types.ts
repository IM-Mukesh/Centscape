export interface PreviewRequest {
  url: string;
  raw_html?: string;
}

export interface PreviewResponse {
  title: string;
  image: string | null;
  price: string | null;
  currency: string | null;
  siteName: string;
  sourceUrl: string;
}
