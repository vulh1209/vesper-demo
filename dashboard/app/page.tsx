'use client';

import { useState, useEffect } from 'react';
import { SearchBar } from '@/components/search-bar';
import { AssetCard } from '@/components/asset-card';
import { StatsCards } from '@/components/home/stats-cards';
import { searchAssets, getStats, type AssetQueryResult, type DashboardStats } from '@/lib/api';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssetQueryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch stats on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Debounced search
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
      {/* Stats section */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="h-32 bg-muted/40 rounded-xl animate-pulse" />
          <div className="h-32 bg-muted/40 rounded-xl animate-pulse" />
          <div className="h-32 bg-muted/40 rounded-xl animate-pulse md:col-span-2 lg:col-span-1" />
        </div>
      ) : stats ? (
        <StatsCards {...stats} />
      ) : null}

      {/* Search section */}
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
