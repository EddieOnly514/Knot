/**
 * Google Places Service
 * Handles autocomplete and place resolution
 */

import { Destination, Suggestion, SearchParams, DestinationType, SuggestionCategory } from '../types/destination';

// Use the same API key from app.json
const GOOGLE_PLACES_API_KEY = 'AIzaSyDlmpx0yCgTT9iMmDaJ0RhkbKkfJn50x_k';

const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

// Track in-flight requests for cancellation
let currentAutocompleteController: AbortController | null = null;
let currentDetailsController: AbortController | null = null;

interface AutocompleteResult {
    predictions: Array<{
        place_id: string;
        description: string;
        structured_formatting: {
            main_text: string;
            secondary_text: string;
        };
        types: string[];
        distance_meters?: number;
    }>;
    status: string;
}

interface PlaceDetailsResult {
    result: {
        place_id: string;
        name: string;
        formatted_address: string;
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
        types: string[];
    };
    status: string;
}

/**
 * Map Google place types to our categories
 */
function mapTypesToCategory(types: string[]): SuggestionCategory {
    if (types.includes('airport')) return 'airport';
    if (types.includes('transit_station') || types.includes('train_station') || types.includes('bus_station')) return 'transit';
    if (types.includes('locality') || types.includes('administrative_area_level_1')) return 'city';
    if (types.includes('street_address') || types.includes('route') || types.includes('premise')) return 'address';
    return 'poi';
}

/**
 * Map category to destination type
 */
function categoryToType(category: SuggestionCategory): DestinationType {
    switch (category) {
        case 'airport': return 'airport';
        case 'transit': return 'transit';
        case 'city': return 'city';
        case 'address': return 'address';
        case 'home':
        case 'work': return 'saved';
        default: return 'poi';
    }
}

/**
 * Get autocomplete suggestions
 */
export async function getAutocompleteSuggestions(params: SearchParams): Promise<Suggestion[]> {
    // Cancel previous request
    if (currentAutocompleteController) {
        currentAutocompleteController.abort();
    }
    currentAutocompleteController = new AbortController();

    try {
        const urlParams = new URLSearchParams({
            input: params.query,
            key: GOOGLE_PLACES_API_KEY,
            types: 'geocode|establishment',
        });

        // Add location bias if available
        if (params.userLocation) {
            urlParams.append('location', `${params.userLocation.latitude},${params.userLocation.longitude}`);
            urlParams.append('radius', String(params.biasRadius || 50000));
        }

        const response = await fetch(`${AUTOCOMPLETE_URL}?${urlParams.toString()}`, {
            signal: currentAutocompleteController.signal,
        });

        if (!response.ok) {
            throw new Error(`Places API error: ${response.status}`);
        }

        const data: AutocompleteResult = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.warn('[Places] API status:', data.status);
            return [];
        }

        // Transform to suggestions
        const suggestions: Suggestion[] = data.predictions.map((prediction) => {
            const category = mapTypesToCategory(prediction.types);
            return {
                id: prediction.place_id,
                placeId: prediction.place_id,
                primaryText: prediction.structured_formatting.main_text,
                secondaryText: prediction.structured_formatting.secondary_text || '',
                category,
                source: 'live' as const,
                distance: prediction.distance_meters,
            };
        });

        return suggestions;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('[Places] Autocomplete request cancelled');
            return [];
        }
        console.error('[Places] Autocomplete error:', error);
        throw error;
    } finally {
        currentAutocompleteController = null;
    }
}

/**
 * Resolve a place ID to full destination details
 */
export async function resolvePlaceDetails(placeId: string): Promise<Destination | null> {
    // Cancel previous request
    if (currentDetailsController) {
        currentDetailsController.abort();
    }
    currentDetailsController = new AbortController();

    try {
        const urlParams = new URLSearchParams({
            place_id: placeId,
            fields: 'place_id,name,formatted_address,geometry,types',
            key: GOOGLE_PLACES_API_KEY,
        });

        const response = await fetch(`${PLACE_DETAILS_URL}?${urlParams.toString()}`, {
            signal: currentDetailsController.signal,
        });

        if (!response.ok) {
            throw new Error(`Places API error: ${response.status}`);
        }

        const data: PlaceDetailsResult = await response.json();

        if (data.status !== 'OK') {
            console.warn('[Places] Details API status:', data.status);
            return null;
        }

        const result = data.result;
        const category = mapTypesToCategory(result.types);

        const destination: Destination = {
            id: result.place_id,
            name: result.name,
            address: result.formatted_address,
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            type: categoryToType(category),
        };

        // Add entry hint for airports
        if (destination.type === 'airport') {
            destination.entryHint = 'Departures / Arrivals';
        }

        return destination;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('[Places] Details request cancelled');
            return null;
        }
        console.error('[Places] Details error:', error);
        throw error;
    } finally {
        currentDetailsController = null;
    }
}

/**
 * Cancel any in-flight requests
 */
export function cancelAllRequests() {
    if (currentAutocompleteController) {
        currentAutocompleteController.abort();
        currentAutocompleteController = null;
    }
    if (currentDetailsController) {
        currentDetailsController.abort();
        currentDetailsController = null;
    }
}
