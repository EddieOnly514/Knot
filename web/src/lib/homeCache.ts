/**
 * Home page cache: rides, requests, suggested matches.
 * Invalidating from other pages (e.g. after completing a ride) forces a refetch
 * so completed pairs don’t keep showing as pending/suggested.
 */

export const HOME_CACHE_TTL_MS = 60_000;

export type HomeCache = {
  profileId: string;
  fetchedAt: number;
  rides: unknown[];
  requests: unknown[];
  suggestedMatches: Record<string, unknown[]>;
};

let homeCache: HomeCache | null = null;

export function getHomeCache(): HomeCache | null {
  return homeCache;
}

export function setHomeCache(cache: HomeCache | null): void {
  homeCache = cache;
}

export function invalidateHomeCache(): void {
  homeCache = null;
}
