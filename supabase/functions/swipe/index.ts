// Supabase Edge Function: swipe
// Handles swipe actions and creates matches on mutual interest

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

        const { to_user_id, trip_intent_id, action } = await req.json()

        if (!to_user_id || !trip_intent_id || !['interested', 'pass'].includes(action)) {
            return new Response(JSON.stringify({ error: 'Invalid request body' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Rate limiting: max 50 swipes per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const { count: recentSwipes } = await supabase
            .from('swipes')
            .select('*', { count: 'exact', head: true })
            .eq('from_user_id', user.id)
            .gte('created_at', oneHourAgo)

        if ((recentSwipes || 0) >= 50) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Insert the swipe
        const { error: swipeError } = await supabase
            .from('swipes')
            .insert({
                from_user_id: user.id,
                to_user_id,
                trip_intent_id,
                action
            })

        if (swipeError) {
            // Handle duplicate swipe
            if (swipeError.code === '23505') {
                return new Response(JSON.stringify({ error: 'Already swiped on this user' }), {
                    status: 409,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }
            throw swipeError
        }

        // If action is 'pass', we're done
        if (action === 'pass') {
            return new Response(JSON.stringify({ match_created: false }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Check for reciprocal interest
        const { data: reciprocal } = await supabase
            .from('swipes')
            .select('*, trip_intents!inner(id, status)')
            .eq('from_user_id', to_user_id)
            .eq('to_user_id', user.id)
            .eq('action', 'interested')
            .eq('trip_intents.status', 'active')
            .limit(1)
            .single()

        if (!reciprocal) {
            return new Response(JSON.stringify({ match_created: false }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Mutual interest! Create a match
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert({
                user_a: user.id,
                user_b: to_user_id,
                trip_intent_a: trip_intent_id,
                trip_intent_b: reciprocal.trip_intent_id,
                status: 'matched'
            })
            .select()
            .single()

        if (matchError) {
            // Handle duplicate match
            if (matchError.code === '23505') {
                // Match already exists, fetch it
                const { data: existingMatch } = await supabase
                    .from('matches')
                    .select('*')
                    .or(`and(user_a.eq.${user.id},user_b.eq.${to_user_id}),and(user_a.eq.${to_user_id},user_b.eq.${user.id})`)
                    .single()

                return new Response(JSON.stringify({
                    match_created: false,
                    match_id: existingMatch?.id,
                    message: 'Match already exists'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }
            throw matchError
        }

        // TODO: Send push notification to both users
        // await sendPushNotification(to_user_id, 'New Match!', `You matched with someone heading your way!`)

        return new Response(JSON.stringify({
            match_created: true,
            match_id: match.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
