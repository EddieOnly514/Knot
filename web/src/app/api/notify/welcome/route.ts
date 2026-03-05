import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/matchEmail";

/**
 * Send "Welcome to Knot" email to the currently signed-in user.
 * Called after signup so we don't block the flow; uses session to get email.
 */
export async function POST() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized or no email" }, { status: 401 });
    }

    const result = await sendWelcomeEmail(user.email);
    if (!result.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[notify/welcome] send failed:", result.error);
      }
      return NextResponse.json({ error: result.error ?? "Failed to send" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[notify/welcome]", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
