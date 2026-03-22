import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // transfer_type filter
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const partnerId = searchParams.get("partner_id"); // filter by specific partner

    let query = supabaseAdmin
      .from("money_transfers")
      .select(
        `*,
        from_partner:from_partner_id(id, username, nickname, level),
        to_partner:to_partner_id(id, username, nickname, level),
        from_member:from_member_id(id, username, nickname),
        to_member:to_member_id(id, username, nickname)`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by transfer_type (supports comma-separated list)
    if (type) {
      const types = type.split(",").map((t) => t.trim());
      if (types.length === 1) {
        query = query.eq("transfer_type", types[0]);
      } else {
        query = query.in("transfer_type", types);
      }
    }

    // Date range filter
    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
    }

    // Partner filter (either from or to)
    if (partnerId) {
      query = query.or(
        `from_partner_id.eq.${partnerId},to_partner_id.eq.${partnerId}`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If search term, filter results by username/nickname
    let results = data ?? [];
    if (search) {
      const lower = search.toLowerCase();
      results = results.filter((row: Record<string, unknown>) => {
        const fp = row.from_partner as Record<string, string> | null;
        const tp = row.to_partner as Record<string, string> | null;
        const fm = row.from_member as Record<string, string> | null;
        const tm = row.to_member as Record<string, string> | null;
        return (
          fp?.username?.toLowerCase().includes(lower) ||
          fp?.nickname?.toLowerCase().includes(lower) ||
          tp?.username?.toLowerCase().includes(lower) ||
          tp?.nickname?.toLowerCase().includes(lower) ||
          fm?.username?.toLowerCase().includes(lower) ||
          fm?.nickname?.toLowerCase().includes(lower) ||
          tm?.username?.toLowerCase().includes(lower) ||
          tm?.nickname?.toLowerCase().includes(lower) ||
          (row.memo as string)?.toLowerCase().includes(lower)
        );
      });
    }

    return NextResponse.json({ data: results });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
