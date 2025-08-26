// src/types.ts
export type WishlistItem = {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  currency: string | null;
  siteName: string | null;
  sourceUrl: string | null;
  normalizedUrl: string | null;
  createdAt: string; // ISO date
};
