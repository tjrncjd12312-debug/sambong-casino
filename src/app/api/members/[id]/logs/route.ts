import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "login";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (type === "login") {
      const { data, error } = await supabaseAdmin
        .from("login_logs")
        .select("*")
        .eq("member_id", id)
        .order("logged_at", { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [] });
    }

    if (type === "deposit") {
      const { data, error } = await supabaseAdmin
        .from("deposit_requests")
        .select("*")
        .eq("member_id", id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [] });
    }

    if (type === "withdraw") {
      const { data, error } = await supabaseAdmin
        .from("withdraw_requests")
        .select("*")
        .eq("member_id", id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [] });
    }

    if (type === "money_transfer") {
      const { data, error } = await supabaseAdmin
        .from("money_transfers")
        .select("*")
        .or(`from_member_id.eq.${id},to_member_id.eq.${id}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [] });
    }

    if (type === "slot_bet") {
      const { data, error } = await supabaseAdmin
        .from("slot_bet_history")
        .select("*")
        .eq("member_id", id)
        .order("bet_at", { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [] });
    }

    if (type === "casino_bet") {
      const { data, error } = await supabaseAdmin
        .from("casino_bet_history")
        .select("*")
        .eq("member_id", id)
        .order("bet_at", { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [] });
    }

    return NextResponse.json({ data: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
