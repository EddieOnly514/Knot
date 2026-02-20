import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase.rpc("get_waitlist_stats");

    if (error) {
      return NextResponse.json(
        { total: 146, bySchool: {} },
        { status: 200 }
      );
    }

    return NextResponse.json(data ?? { total: 146, bySchool: {} });
  } catch {
    return NextResponse.json(
      { total: 146, bySchool: {} },
      { status: 200 }
    );
  }
}
