import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError) {
      console.error("[DeleteAccount] getUser error", getUserError);
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error("[DeleteAccount] Missing SUPABASE_SERVICE_ROLE_KEY env");
      return NextResponse.json(
        { error: "Server not configured for account deletion" },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    // Clean up uploaded avatars from storage
    try {
      const { data: files } = await adminClient.storage
        .from("profile-photos")
        .list("avatars", { search: user.id });
      if (files && files.length > 0) {
        const paths = files.map((f) => `avatars/${f.name}`);
        await adminClient.storage.from("profile-photos").remove(paths);
      }
    } catch (storageErr) {
      // Non-fatal: continue with account deletion even if storage cleanup fails
      console.warn("[DeleteAccount] Storage cleanup failed:", storageErr);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error("[DeleteAccount] deleteUser error", deleteError);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DeleteAccount] Unexpected error", error);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

