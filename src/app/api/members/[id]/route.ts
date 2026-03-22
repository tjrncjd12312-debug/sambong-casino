import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from("members")
      .select("*, partners:store_id(id, username, nickname, level, parent_id)")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Allowed fields to update
    const allowedFields = [
      "nickname",
      "phone",
      "status",
      "bank_name",
      "bank_account",
      "bank_holder",
      "memo",
      "balance",
      "point_rolling",
      "is_bet_blocked",
      "max_win_amount",
    ];

    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "수정할 항목이 없습니다." },
        { status: 400 }
      );
    }

    // Validate balance doesn't go negative
    if (updateData.balance !== undefined && Number(updateData.balance) < 0) {
      return NextResponse.json(
        { error: "보유머니는 0 미만이 될 수 없습니다." },
        { status: 400 }
      );
    }

    // Validate point_rolling doesn't go negative
    if (updateData.point_rolling !== undefined && Number(updateData.point_rolling) < 0) {
      return NextResponse.json(
        { error: "포인트롤링은 0 미만이 될 수 없습니다." },
        { status: 400 }
      );
    }

    // When blocking, check if already in blocked_accounts
    if (updateData.status === "blocked") {
      const { data: blocked } = await supabaseAdmin
        .from("blocked_accounts")
        .select("id")
        .eq("member_id", id)
        .single();

      if (!blocked) {
        // Add to blocked_accounts table
        await supabaseAdmin.from("blocked_accounts").insert({
          member_id: id,
          blocked_at: new Date().toISOString(),
        });
      }
    }

    // Set updated_at
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("members")
      .update(updateData)
      .eq("id", id)
      .select("*, partners:store_id(id, username, nickname, level)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
