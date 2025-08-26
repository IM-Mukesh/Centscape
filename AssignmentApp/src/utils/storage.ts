// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WishlistItem } from '../types';
import { normalizeUrl } from './url';

const DB_KEY = 'WISHLIST_DB';
type DBShapeV1 = { version: 1; items: Omit<WishlistItem, 'normalizedUrl'>[] };
type DBShapeV2 = { version: 2; items: WishlistItem[] };

async function readRaw(): Promise<DBShapeV1 | DBShapeV2 | null> {
  const raw = await AsyncStorage.getItem(DB_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function write(db: DBShapeV2) {
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
}

export async function initAndMigrate(): Promise<void> {
  const db = await readRaw();
  if (!db) {
    // nothing — create v2 empty
    await write({ version: 2, items: [] });
    return;
  }
  if ((db as any).version === 2) return;
  // migrate v1 -> v2
  if ((db as any).version === 1) {
    const v1 = db as DBShapeV1;
    const itemsV2: WishlistItem[] = v1.items.map((it: any) => {
      const normalizedUrl = it.sourceUrl ? normalizeUrl(it.sourceUrl) : null;
      return {
        ...it,
        normalizedUrl,
        createdAt: it.createdAt || new Date().toISOString(),
      };
    });
    await write({ version: 2, items: itemsV2 });
  } else {
    // unknown shape: reset
    await write({ version: 2, items: [] });
  }
}

export async function getAllItems(): Promise<WishlistItem[]> {
  const db = (await readRaw()) as DBShapeV2 | null;
  return db?.items ?? [];
}

export async function saveItem(
  item: Omit<WishlistItem, 'id' | 'createdAt'> & { id?: string },
): Promise<WishlistItem | null> {
  const db = (await readRaw()) as DBShapeV2 | null;
  const list: WishlistItem[] = db?.items ?? [];
  // compute id + createdAt + normalizedUrl
  const id =
    item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = new Date().toISOString();
  const normalizedUrl =
    item.normalizedUrl ??
    (item.sourceUrl ? normalizeUrl(item.sourceUrl) : null);

  // dedupe by normalizedUrl if available
  if (normalizedUrl) {
    const exists = list.find(x => x.normalizedUrl === normalizedUrl);
    if (exists) return null; // already exists -> signal to caller
  }

  const toSave: WishlistItem = {
    id,
    title: item.title,
    image: item.image ?? null,
    price: item.price ?? null,
    currency: item.currency ?? null,
    siteName: item.siteName ?? null,
    sourceUrl: item.sourceUrl ?? null,
    normalizedUrl,
    createdAt,
  };

  const newList = [toSave, ...list];
  await write({ version: 2, items: newList });
  return toSave;
}

export async function clearAll() {
  await write({ version: 2, items: [] });
}
