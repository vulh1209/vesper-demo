const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AssetQueryResult {
  id: string;
  name: string;
  normalizedName: string;
  category: string | null;
  latestVersion: string | null;
  updatedAt: string;
}

export interface AssetDetailResult extends AssetQueryResult {
  versions: {
    version: string;
    author: string | null;
    authorName: string | null;
    createdAt: string;
    slackPermalink: string | null;
  }[];
}

export async function searchAssets(
  query: string,
  category?: string,
  limit = 10
): Promise<AssetQueryResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (category) params.set('category', category);

  const res = await fetch(`${API_BASE}/api/assets/search?${params}`);
  const data = await res.json();

  if (!data.ok) {
    console.error('Search failed:', data.error);
    return [];
  }

  return data.data;
}

export async function getAsset(id: string): Promise<AssetDetailResult | null> {
  const res = await fetch(`${API_BASE}/api/assets/${id}`, {
    cache: 'no-store',
  });
  const data = await res.json();

  if (!data.ok) {
    return null;
  }

  return data.data;
}
