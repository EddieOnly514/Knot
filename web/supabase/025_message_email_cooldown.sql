-- Track how often we send \"new message\" emails so we don't spam users.
-- Each row records the last time we emailed a given profile for a
-- specific 1:1 conversation (ride_request) or group chat (ride_group).

CREATE TABLE IF NOT EXISTS public.message_email_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  ride_group_id UUID REFERENCES public.ride_groups(id) ON DELETE CASCADE,
  recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (conversation_id IS NOT NULL AND ride_group_id IS NULL)
    OR (conversation_id IS NULL AND ride_group_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_email_cooldowns_conversation_recipient
  ON public.message_email_cooldowns(conversation_id, recipient_profile_id)
  WHERE conversation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_email_cooldowns_group_recipient
  ON public.message_email_cooldowns(ride_group_id, recipient_profile_id)
  WHERE ride_group_id IS NOT NULL;

COMMENT ON TABLE public.message_email_cooldowns IS
  'Per-profile cooldown for \"new message\" notification emails, keyed by conversation or group.';

