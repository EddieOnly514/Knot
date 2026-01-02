// Supabase Edge Function: confirm-meetup
// Handles meetup confirmation and destination reveal logic

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Default meetup suggestions per airport
const AIRPORT_MEETUP_POINTS: Record<string, { label: string; lat: number; lng: number }[]> = {
    'LAX': [
        { label: 'LAX-it Rideshare Pickup Zone', lat: 33.9416, lng: -118.4085 },
        { label: 'Terminal 1 Baggage Claim', lat: 33.9425, lng: -118.4081 },
    ],
    'SFO': [
        { label: 'SFO Rideshare Pickup Zone', lat: 37.6213, lng: -122.3790 },
        { label: 'International Terminal Arrivals', lat: 37.6145, lng: -122.3900 },
    ],
    'JFK': [
        { label: 'JFK Terminal 4 Arrivals', lat: 40.6413, lng: -73.7781 },
        { label: 'JFK Rideshare Pickup', lat: 40.6400, lng: -73.7786 },
    ],
    'DEFAULT': [
        { label: 'Rideshare Pickup Zone', lat: 0, lng: 0 },
        { label: 'Baggage Claim Area', lat: 0, lng: 0 },
    ]
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const { match_id, meetup_label, meetup_lat, meetup_lng } = await req.json()

        if (!match_id) {
            return new Response(JSON.stringify({ error: 'match_id is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Fetch the match
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .select(`
        *,
        trip_intent_a:trip_intents!trip_intent_a(*),
        trip_intent_b:trip_intents!trip_intent_b(*)
      `)
            .eq('id', match_id)
            .single()

        if (matchError || !match) {
            return new Response(JSON.stringify({ error: 'Match not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Verify user is part of this match
        if (match.user_a !== user.id && match.user_b !== user.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Determine which user is confirming
        const isUserA = match.user_a === user.id
        const confirmField = isUserA ? 'meetup_confirm_a' : 'meetup_confirm_b'
        const otherConfirmed = isUserA ? match.meetup_confirm_b : match.meetup_confirm_a

        // Build update object
        const updateData: Record<string, any> = {
            [confirmField]: true
        }

        // If meetup location provided, set it
        if (meetup_label && meetup_lat && meetup_lng) {
            updateData.meetup_label = meetup_label
            updateData.meetup_lat = meetup_lat
            updateData.meetup_lng = meetup_lng
        } else if (!match.meetup_label) {
            // Auto-suggest meetup point based on airport code
            const airportCode = match.trip_intent_a?.origin_airport_code ||
                match.trip_intent_b?.origin_airport_code
            const suggestions = AIRPORT_MEETUP_POINTS[airportCode] || AIRPORT_MEETUP_POINTS['DEFAULT']
            const suggested = suggestions[0]

            updateData.meetup_label = suggested.label
            if (suggested.lat !== 0) {
                updateData.meetup_lat = suggested.lat
                updateData.meetup_lng = suggested.lng
            }
        }

        // Check if both users have now confirmed
        const bothConfirmed = otherConfirmed === true
        if (bothConfirmed) {
            updateData.status = 'meetup_confirmed'
            updateData.destination_revealed = true
        }

        // Update the match
        const { data: updatedMatch, error: updateError } = await supabase
            .from('matches')
            .update(updateData)
            .eq('id', match_id)
            .select()
            .single()

        if (updateError) {
            throw updateError
        }

        // Prepare response
        const response: Record<string, any> = {
            confirmed: true,
            both_confirmed: bothConfirmed,
            meetup_label: updatedMatch.meetup_label,
            meetup_lat: updatedMatch.meetup_lat,
            meetup_lng: updatedMatch.meetup_lng,
        }

        // Only reveal destinations if both confirmed
        if (bothConfirmed) {
            response.destination_revealed = true
            response.destination_a = {
                label: match.trip_intent_a?.destination_label,
                lat: match.trip_intent_a?.destination_lat,
                lng: match.trip_intent_a?.destination_lng,
            }
            response.destination_b = {
                label: match.trip_intent_b?.destination_label,
                lat: match.trip_intent_b?.destination_lat,
                lng: match.trip_intent_b?.destination_lng,
            }

            // TODO: Send push notification
            // const otherUserId = isUserA ? match.user_b : match.user_a
            // await sendPushNotification(otherUserId, 'Meetup Confirmed!', 'Your destination has been revealed.')
        }

        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
