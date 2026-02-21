import { getSupabaseClientOrThrow } from "@/lib/supabase/client";

export interface BlockedUser {
  id: string;
  blocked_profile_id: string;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
}

/**
 * Block another user by their profile id.
 */
export async function blockUser(blockedProfileId: string) {
  const supabase = getSupabaseClientOrThrow();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!myProfile) {
    throw new Error("Profile not found");
  }

  if (myProfile.id === blockedProfileId) {
    throw new Error("You cannot block yourself");
  }

  const { error } = await supabase.from("blocked_users").upsert(
    {
      blocker_profile_id: myProfile.id,
      blocked_profile_id: blockedProfileId,
    },
    {
      onConflict: "blocker_profile_id,blocked_profile_id",
    },
  );

  if (error) {
    throw error;
  }
}

/**
 * Unblock a previously blocked user by their profile id.
 */
export async function unblockUser(blockedProfileId: string) {
  const supabase = getSupabaseClientOrThrow();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!myProfile) {
    throw new Error("Profile not found");
  }

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_profile_id", myProfile.id)
    .eq("blocked_profile_id", blockedProfileId);

  if (error) {
    throw error;
  }
}

/**
 * Check if the current user has blocked the given profile id.
 */
export async function isUserBlocked(blockedProfileId: string): Promise<boolean> {
  const supabase = getSupabaseClientOrThrow();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!myProfile) {
    return false;
  }

  const { data, error } = await supabase
    .from("blocked_users")
    .select("id")
    .eq("blocker_profile_id", myProfile.id)
    .eq("blocked_profile_id", blockedProfileId)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    // ignore "row not found", surface other errors
    throw error;
  }

  return !!data;
}

/**
 * Get the current user's blocked users with basic profile info.
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const supabase = getSupabaseClientOrThrow();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!myProfile) {
    return [];
  }

  const { data, error } = await supabase
    .from("blocked_users")
    .select(
      `
        id,
        blocked_profile_id,
        profiles:blocked_profile_id (
          first_name,
          last_name,
          photo_url
        )
      `,
    )
    .eq("blocker_profile_id", myProfile.id);

  if (error) {
    throw error;
  }

  if (!data) return [];

  type BlockedUsersRow = {
    id: string;
    blocked_profile_id: string;
    profiles:
      | {
          first_name: string | null;
          last_name: string | null;
          photo_url: string | null;
        }
      | null;
  };

  return (data as unknown as BlockedUsersRow[]).map((row) => ({
    id: row.id as string,
    blocked_profile_id: row.blocked_profile_id as string,
    first_name: row.profiles?.first_name ?? "Unknown",
    last_name: row.profiles?.last_name ?? null,
    photo_url: row.profiles?.photo_url ?? null,
  }));
}

/**
 * Report another user by their profile id, with an optional reason and ride_request context.
 */
export async function reportUser(
  reportedProfileId: string,
  reason: string | null,
  rideRequestId?: string,
) {
  const supabase = getSupabaseClientOrThrow();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!myProfile) {
    throw new Error("Profile not found");
  }

  if (myProfile.id === reportedProfileId) {
    throw new Error("You cannot report yourself");
  }

  const { error } = await supabase.from("user_reports").insert({
    reporter_profile_id: myProfile.id,
    reported_profile_id: reportedProfileId,
    ride_request_id: rideRequestId ?? null,
    reason: reason && reason.trim().length > 0 ? reason.trim() : null,
  });

  if (error) {
    throw error;
  }
}

