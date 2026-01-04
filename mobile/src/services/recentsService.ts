/**
 * Recents Service
 * Manages recent destination searches in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Destination, RecentDestination, Suggestion } from '../types/destination';

const RECENTS_KEY = '@knot/recent_destinations';
const MAX_RECENTS = 20;

/**
 * Get all recent destinations
 */
export async function getRecentDestinations(): Promise<RecentDestination[]> {
    try {
        const data = await AsyncStorage.getItem(RECENTS_KEY);
        if (!data) return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('[Recents] Error getting recents:', error);
        return [];
    }
}

/**
 * Add a destination to recents
 * - Deduplicates by ID
 * - Moves existing to top if reselected
 * - Limits to MAX_RECENTS
 */
export async function addToRecents(destination: Destination): Promise<void> {
    try {
        const recents = await getRecentDestinations();

        // Remove if already exists (will re-add at top)
        const filtered = recents.filter(r => r.destination.id !== destination.id);

        // Add to beginning
        const newEntry: RecentDestination = {
            destination,
            timestamp: Date.now(),
        };

        const updated = [newEntry, ...filtered].slice(0, MAX_RECENTS);

        await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('[Recents] Error saving recent:', error);
    }
}

/**
 * Clear all recents
 */
export async function clearRecents(): Promise<void> {
    try {
        await AsyncStorage.removeItem(RECENTS_KEY);
    } catch (error) {
        console.error('[Recents] Error clearing recents:', error);
    }
}

/**
 * Convert recents to suggestions (for display)
 */
export function recentsToSuggestions(recents: RecentDestination[]): Suggestion[] {
    return recents.map(r => ({
        id: `recent_${r.destination.id}`,
        placeId: r.destination.id,
        primaryText: r.destination.name,
        secondaryText: r.destination.address,
        category: 'recent' as const,
        source: 'recent' as const,
    }));
}

/**
 * Filter recents by query
 */
export function filterRecents(recents: RecentDestination[], query: string): RecentDestination[] {
    const lowerQuery = query.toLowerCase();
    return recents.filter(r =>
        r.destination.name.toLowerCase().includes(lowerQuery) ||
        r.destination.address.toLowerCase().includes(lowerQuery)
    );
}
