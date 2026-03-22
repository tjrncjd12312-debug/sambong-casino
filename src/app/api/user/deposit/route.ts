import { NextRequest, NextResponse } from "next/server";
import { verifyMemberToken } from "@/lib/member-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendTelegramNotification } from "@/lib/telegram";

const MEMBER_COOKIE_NAME = "member_token";

// GET: List member's own deposit requests
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(MEMBER_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const payload = verifyMemberToken(token);
    if (!payload) {
      return NextResponse.json({ error: "세션이 만료되었습니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const { data, error } = await supabaseAdmin
      .from("deposit_requests")
      .select("id, amount, bonus_amount, status, depositor_name, created_at, processed_at, memo")
      .eq("member_id", payload.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST: Create new deposit request
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(MEMBER_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const payload = verifyMemberToken(token);
    if (!payload) {
      return NextResponse.json({ error: "세션이 만료되었습니다." }, { status: 401 });
    }

    const { amount, depositor_name } = await request.json();

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "충전 금액을 올바르게 입력해주세요." },
        { status: 400 }
      );
    }

    if (!depositor_name || !depositor_name.trim()) {
      return NextResponse.json(
        { error: "입금자명을 입력해주세요." },
        { status: 400 }
      );
    }

    // Get member info for store_id
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, store_id, status")
      .eq("id", payload.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (member.status !== "active") {
      return NextResponse.json({ error: "비활성화된 계정입니다." }, { status: 403 });
    }

    // Check for pending requests (prevent spam)
    const { data: pendingRequests } = await supabaseAdmin
      .from("deposit_requests")
      .select("id")
      .eq("member_id", payload.id)
      .eq("status", "pending");

    if (pendingRequests && pendingRequests.length >= 3) {
      return NextResponse.json(
        { error: "처리 대기 중인 충전 신청이 3건 이상입니다. 처리 완료 후 다시 신청해주세요." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("deposit_requests")
      .insert({
        member_id: payload.id,
        store_id: member.store_id,
        amount: Number(amount),
        bonus_amount: 0,
        status: "pending",
        depositor_name: depositor_name.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send telegram notification (non-blocking)
    sendTelegramNotification(
      "deposit_request",
      `회원: ${payload.username}\n금액: ${Number(amount).toLocaleString()}원\n입금자명: ${depositor_name.trim()}`
    ).catch(() => {});

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
