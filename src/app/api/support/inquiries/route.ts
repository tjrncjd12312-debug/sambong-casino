import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, in_progress, done
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    let query = supabaseAdmin
      .from("inquiries")
      .select("*, member:member_id(id, username, nickname, bank_holder, bank_account, store_id, partners:store_id(id, username, nickname, level))")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      if (status === "pending") {
        query = query.in("status", ["pending", "in_progress"]);
      } else if (status === "done") {
        query = query.eq("status", "done");
      } else {
        query = query.eq("status", status);
      }
    }

    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let filtered = data ?? [];

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter((item: any) => {
        const member = item.member;
        return (
          member?.username?.toLowerCase().includes(lower) ||
          member?.nickname?.toLowerCase().includes(lower) ||
          item.title?.toLowerCase().includes(lower)
        );
      });
    }

    return NextResponse.json({ data: filtered });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
