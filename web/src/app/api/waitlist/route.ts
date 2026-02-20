import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendWaitlistThankYou } from "@/lib/waitlistEmail";

const SCHOOLS = ["UCI", "UCLA", "USC", "UCSD", "Cal Poly", "other"] as const;
const AIRPORTS = ["LAX", "SNA", "SAN", "LGB", "ONT", "Other"] as const;

function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { school, email, airport, school_other: schoolOther } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email" },
        { status: 400 }
      );
    }

    if (!school || !SCHOOLS.includes(school)) {
      return NextResponse.json(
        { error: "Please select a school" },
        { status: 400 }
      );
    }

    const schoolOtherTrimmed =
      school === "other" && typeof schoolOther === "string"
        ? schoolOther.trim().slice(0, 200)
        : null;

    if (!airport || !AIRPORTS.includes(airport)) {
      return NextResponse.json(
        { error: "Please select an airport" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAnon();
    const { error } = await supabase.from("waitlist").insert({
      school,
      email: trimmedEmail,
      airport,
      ...(schoolOtherTrimmed !== null && { school_other: schoolOtherTrimmed }),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This email is already on the waitlist." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Could not join waitlist. Please try again." },
        { status: 500 }
      );
    }

    // Send thank-you email (non-blocking; don't fail the request if it fails)
    sendWaitlistThankYou(trimmedEmail).then((result) => {
      if (!result.ok && process.env.NODE_ENV === "development") {
        console.warn("[waitlist] Thank-you email failed:", result.error);
      }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
