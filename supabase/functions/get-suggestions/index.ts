// Supabase Edge Function: get-suggestions
// Returns suggested matches based on trip intent compatibility

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Haversine formula to calculate distance between two points in miles
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

// Calculate luggage score for ride compatibility
function getLuggageScore(luggage: string): number {
    const scores: Record<string, number> = {
        'none': 0,
        'carry_on': 1,
        'one_suitcase': 2,
        'two_plus': 3
    }
    return scores[luggage] || 0
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get the authenticated user
        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const { trip_intent_id } = await req.json()

        // Get the user's trip intent
        const { data: myIntent, error: intentError } = await supabase
            .from('trip_intents')
            .select('*')
            .eq('id', trip_intent_id)
            .eq('user_id', user.id)
            .single()

        if (intentError || !myIntent) {
            return new Response(JSON.stringify({ error: 'Trip intent not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Get user's blocks
        const { data: blocks } = await supabase
            .from('blocks')
            .select('blocked_id, blocker_id')
            .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)

        const blockedUserIds = new Set(
            blocks?.flatMap(b => [b.blocker_id, b.blocked_id]).filter(id => id !== user.id) || []
        )

        // Get users already swiped on for this intent
        const { data: existingSwipes } = await supabase
            .from('swipes')
            .select('to_user_id')
            .eq('from_user_id', user.id)
            .eq('trip_intent_id', trip_intent_id)

        const swipedUserIds = new Set(existingSwipes?.map(s => s.to_user_id) || [])

        // Get all active trip intents from other users
        const { data: otherIntents, error: searchError } = await supabase
            .from('trip_intents')
            .select(`
        *,
        profiles (
          user_id,
          name,
          photo_url,
          bio,
          phone_verified
        )
      `)
            .eq('status', 'active')
            .neq('user_id', user.id)

        if (searchError) {
            throw searchError
        }

        // Filter and score matches
        const suggestions = (otherIntents || [])
            .filter(intent => {
                // Exclude blocked users
                if (blockedUserIds.has(intent.user_id)) return false

                // Exclude already swiped users
                if (swipedUserIds.has(intent.user_id)) return false

                // HARD CONSTRAINT 1: Time windows must overlap by at least 10 minutes
                const myStart = new Date(myIntent.time_start).getTime()
                const myEnd = new Date(myIntent.time_end).getTime()
                const theirStart = new Date(intent.time_start).getTime()
                const theirEnd = new Date(intent.time_end).getTime()

                const overlapStart = Math.max(myStart, theirStart)
                const overlapEnd = Math.min(myEnd, theirEnd)
                const overlapMinutes = (overlapEnd - overlapStart) / 60000

                if (overlapMinutes < 10) return false

                // HARD CONSTRAINT 2: Origin distance check
                if (myIntent.mode === 'now') {
                    const originDistance = haversineDistance(
                        myIntent.origin_lat, myIntent.origin_lng,
                        intent.origin_lat, intent.origin_lng
                    )
                    if (originDistance > 2) return false // 2 miles threshold
                } else if (myIntent.mode === 'arrival') {
                    // Must match same airport code
                    if (myIntent.origin_airport_code !== intent.origin_airport_code) return false
                }

                // HARD CONSTRAINT 3: Destination distance <= 5 miles
                const destDistance = haversineDistance(
                    myIntent.destination_lat, myIntent.destination_lng,
                    intent.destination_lat, intent.destination_lng
                )
                if (destDistance > 5) return false

                // HARD CONSTRAINT 4: Ride compatibility
                const totalParty = myIntent.party_size + intent.party_size
                if (totalParty > 4) return false // UberX capacity

                // XL requirement check
                const totalLuggage = getLuggageScore(myIntent.luggage) + getLuggageScore(intent.luggage)
                const requiresXL = totalParty >= 4 || totalLuggage >= 3
                // For MVP, we just flag this but don't reject

                return true
            })
            .map(intent => {
                // Calculate score for sorting
                const myStart = new Date(myIntent.time_start).getTime()
                const myEnd = new Date(myIntent.time_end).getTime()
                const theirStart = new Date(intent.time_start).getTime()
                const theirEnd = new Date(intent.time_end).getTime()

                const overlapStart = Math.max(myStart, theirStart)
                const overlapEnd = Math.min(myEnd, theirEnd)
                const overlapMinutes = (overlapEnd - overlapStart) / 60000

                const originDistance = haversineDistance(
                    myIntent.origin_lat, myIntent.origin_lng,
                    intent.origin_lat, intent.origin_lng
                )

                const destDistance = haversineDistance(
                    myIntent.destination_lat, myIntent.destination_lng,
                    intent.destination_lat, intent.destination_lng
                )

                const trustScore = intent.profiles?.phone_verified ? 1 : 0

                // Weighted score (higher is better)
                const score =
                    (overlapMinutes * 0.5) +     // Time overlap weight
                    (10 - originDistance) * 2 +   // Closer origin is better
                    (10 - destDistance) * 1.5 +   // Closer destination is better
                    (trustScore * 10)             // Verified bonus

                return {
                    trip_intent_id: intent.id,
                    user_id: intent.user_id,
                    profile: {
                        name: intent.profiles?.name,
                        photo_url: intent.profiles?.photo_url,
                        bio: intent.profiles?.bio,
                        phone_verified: intent.profiles?.phone_verified
                    },
                    mode: intent.mode,
                    destination_label: intent.destination_label,
                    origin_airport_code: intent.origin_airport_code,
                    time_start: intent.time_start,
                    time_end: intent.time_end,
                    party_size: intent.party_size,
                    luggage: intent.luggage,
                    overlap_minutes: Math.round(overlapMinutes),
                    origin_distance_miles: Math.round(originDistance * 10) / 10,
                    score
                }
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 20) // Top 20 suggestions

        return new Response(JSON.stringify({ suggestions }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
