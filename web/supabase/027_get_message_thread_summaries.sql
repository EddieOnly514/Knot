-- =============================================
-- 027_get_message_thread_summaries.sql
-- Fast inbox: last message + unread count per 1:1 (ride_request id) or group thread
-- without loading every message row over the wire.
-- =============================================

CREATE OR REPLACE FUNCTION get_message_thread_summaries(
    p_reader_profile_id UUID,
    p_conversation_ids UUID[],
    p_group_ids UUID[]
)
RETURNS TABLE (
    thread_id UUID,
    is_group BOOLEAN,
    last_content TEXT,
    last_created_at TIMESTAMPTZ,
    last_message_type TEXT,
    unread_count BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT
        m.conversation_id AS thread_id,
        FALSE AS is_group,
        m.content AS last_content,
        m.created_at AS last_created_at,
        m.message_type::TEXT AS last_message_type,
        COALESCE(u.cnt, 0)::BIGINT AS unread_count
    FROM (
        SELECT DISTINCT ON (conversation_id)
            conversation_id,
            content,
            created_at,
            message_type
        FROM messages
        WHERE conversation_id = ANY(p_conversation_ids)
        ORDER BY conversation_id, created_at DESC
    ) m
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT AS cnt
        FROM messages msg
        WHERE msg.conversation_id = m.conversation_id
          AND msg.read_at IS NULL
          AND msg.sender_id <> p_reader_profile_id
    ) u ON TRUE

    UNION ALL

    SELECT
        m.ride_group_id AS thread_id,
        TRUE AS is_group,
        m.content AS last_content,
        m.created_at AS last_created_at,
        m.message_type::TEXT AS last_message_type,
        COALESCE(u.cnt, 0)::BIGINT AS unread_count
    FROM (
        SELECT DISTINCT ON (ride_group_id)
            ride_group_id,
            content,
            created_at,
            message_type
        FROM messages
        WHERE ride_group_id = ANY(p_group_ids)
        ORDER BY ride_group_id, created_at DESC
    ) m
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT AS cnt
        FROM messages msg
        WHERE msg.ride_group_id = m.ride_group_id
          AND msg.read_at IS NULL
          AND msg.sender_id <> p_reader_profile_id
    ) u ON TRUE;
$$;

GRANT EXECUTE ON FUNCTION get_message_thread_summaries(UUID, UUID[], UUID[]) TO authenticated;
