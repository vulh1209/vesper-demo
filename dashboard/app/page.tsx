'use client';

import { useState, useEffect } from 'react';
import { SearchBar } from '@/components/search-bar';
import { AssetCard } from '@/components/asset-card';
import { searchAssets, type AssetQueryResult } from '@/lib/api';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssetQueryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchAssets(query);
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Asset Search</h2>
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {isLoading && (
        <p className="text-muted-foreground">Searching...</p>
      )}

      {!isLoading && query && results.length === 0 && (
        <p className="text-muted-foreground">
          No assets found matching "{query}"
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}
