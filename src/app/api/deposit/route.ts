import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const storeId = searchParams.get("store_id");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    let query = supabaseAdmin
      .from("deposit_requests")
      .select("*, member:member_id(id, username, nickname, balance, store_id, bank_name, bank_account, bank_holder, partners:store_id(id, username, nickname, level))")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      if (status === "processed") {
        query = query.in("status", ["approved", "rejected"]);
      } else {
        query = query.eq("status", status);
      }
    }

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    if (search) {
      // Search by member username or depositor name
      // We need to filter after fetch since we're joining
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

    // Client-side search filter for joined fields
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter((item: any) => {
        const member = item.member;
        return (
          member?.username?.toLowerCase().includes(lower) ||
          member?.nickname?.toLowerCase().includes(lower) ||
          item.depositor_name?.toLowerCase().includes(lower)
        );
      });
    }

    // Calculate totals
    const totalAmount = filtered.reduce((sum: number, item: any) => {
      if (item.status === "approved") return sum + (item.amount || 0);
      return sum;
    }, 0);
    const totalCount = filtered.filter((item: any) => item.status === "approved").length;

    return NextResponse.json({
      data: filtered,
      summary: { totalAmount, totalCount },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { member_id, amount, bonus_amount, depositor_name, bank_name, memo } = body;

    if (!member_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "회원 ID와 충전 금액은 필수입니다." },
        { status: 400 }
      );
    }

    // Get member info for store_id
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, store_id")
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "회원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("deposit_requests")
      .insert({
        member_id,
        store_id: member.store_id,
        amount,
        bonus_amount: bonus_amount || 0,
        status: "pending",
        depositor_name: depositor_name || null,
        bank_name: bank_name || null,
        memo: memo || null,
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
