import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    let query = supabaseAdmin
      .from("messages")
      .select("*, recipient_partner:recipient_partner_id(id, username, nickname, level), recipient_member:recipient_member_id(id, username, nickname)")
      .order("created_at", { ascending: false })
      .limit(limit);

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
        return (
          item.title?.toLowerCase().includes(lower) ||
          item.recipient_partner?.nickname?.toLowerCase().includes(lower) ||
          item.recipient_partner?.username?.toLowerCase().includes(lower) ||
          item.recipient_member?.nickname?.toLowerCase().includes(lower) ||
          item.recipient_member?.username?.toLowerCase().includes(lower)
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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, recipient_partner_id, recipient_member_id, is_broadcast, broadcast_target } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용은 필수입니다." },
        { status: 400 }
      );
    }

    if (!recipient_partner_id && !recipient_member_id && !is_broadcast) {
      return NextResponse.json(
        { error: "수신 대상을 선택해주세요." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({
        sender_id: user.id,
        title,
        content,
        recipient_partner_id: recipient_partner_id || null,
        recipient_member_id: recipient_member_id || null,
        is_broadcast: is_broadcast || false,
        broadcast_target: broadcast_target || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
