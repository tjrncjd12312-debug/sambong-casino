import { NextRequest, NextResponse } from "next/server";
import { verifyMemberToken } from "@/lib/member-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { honorlink } from "@/lib/honorlink";
import { sendTelegramNotification } from "@/lib/telegram";

const MEMBER_COOKIE_NAME = "member_token";

// GET: List member's own withdraw requests
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
      .from("withdraw_requests")
      .select("id, amount, status, bank_name, bank_account, bank_holder, created_at, processed_at, memo")
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

// POST: Create new withdraw request
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

    const { amount } = await request.json();

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "환전 금액을 올바르게 입력해주세요." },
        { status: 400 }
      );
    }

    // Get member info
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, username, store_id, balance, status, bank_name, bank_account, bank_holder")
      .eq("id", payload.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (member.status !== "active") {
      return NextResponse.json({ error: "비활성화된 계정입니다." }, { status: 403 });
    }

    // First, retrieve balance from HonorLink (game-exit)
    let retrievedAmount = 0;
    try {
      const result = await honorlink.subBalanceAll(member.username);
      retrievedAmount = Number(result.data?.amount) || 0;
    } catch {
      // OK - may not have HonorLink balance
    }

    // If retrieved money from HonorLink, add to DB balance
    if (retrievedAmount > 0) {
      const currentBalance = Number(member.balance) || 0;
      await supabaseAdmin
        .from("members")
        .update({ balance: currentBalance + retrievedAmount })
        .eq("id", member.id);

      // Record the transfer
      await supabaseAdmin.from("money_transfers").insert({
        transfer_type: "from_honorlink",
        amount: retrievedAmount,
        to_member_id: member.id,
        to_balance_before: currentBalance,
        to_balance_after: currentBalance + retrievedAmount,
        memo: "환전 신청 시 잔액 회수",
        processed_by: member.id,
      });
    }

    // Re-fetch fresh balance
    const { data: freshMember } = await supabaseAdmin
      .from("members")
      .select("balance")
      .eq("id", member.id)
      .single();

    const currentBalance = Number(freshMember?.balance) || 0;
    const requestAmount = Number(amount);

    if (currentBalance < requestAmount) {
      return NextResponse.json(
        { error: `잔액이 부족합니다. 현재 잔액: ${currentBalance.toLocaleString()}원` },
        { status: 400 }
      );
    }

    // Check for pending requests (prevent spam)
    const { data: pendingRequests } = await supabaseAdmin
      .from("withdraw_requests")
      .select("id")
      .eq("member_id", payload.id)
      .eq("status", "pending");

    if (pendingRequests && pendingRequests.length >= 3) {
      return NextResponse.json(
        { error: "처리 대기 중인 환전 신청이 3건 이상입니다. 처리 완료 후 다시 신청해주세요." },
        { status: 400 }
      );
    }

    // 환전 신청 시 즉시 잔액 차감 (홀드)
    const newBalance = currentBalance - requestAmount;
    const { data: balanceUpdated, error: balanceError } = await supabaseAdmin
      .from("members")
      .update({ balance: newBalance })
      .eq("id", payload.id)
      .eq("balance", currentBalance) // optimistic lock
      .select("id")
      .single();

    if (balanceError || !balanceUpdated) {
      return NextResponse.json({ error: "잔액이 변경되었습니다. 다시 시도해주세요." }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from("withdraw_requests")
      .insert({
        member_id: payload.id,
        store_id: member.store_id,
        amount: requestAmount,
        status: "pending",
        bank_name: member.bank_name || null,
        bank_account: member.bank_account || null,
        bank_holder: member.bank_holder || null,
      })
      .select()
      .single();

    if (error) {
      // 롤백 - optimistic lock으로 안전하게
      await supabaseAdmin.from("members").update({ balance: currentBalance }).eq("id", payload.id).eq("balance", newBalance);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 머니 이동 기록
    await supabaseAdmin.from("money_transfers").insert({
      transfer_type: "member_withdraw",
      from_member_id: payload.id,
      amount: requestAmount,
      from_balance_before: currentBalance,
      from_balance_after: newBalance,
      memo: "환전 신청 (대기 중)",
    });

    // Send telegram notification (non-blocking)
    sendTelegramNotification(
      "withdraw_request",
      `회원: ${member.username}\n금액: ${requestAmount.toLocaleString()}원\n은행: ${member.bank_name || "-"}\n계좌: ${member.bank_account || "-"}\n예금주: ${member.bank_holder || "-"}`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      data,
      balance: newBalance,
      retrieved_from_game: retrievedAmount,
    }, { status: 201 });
  } catch (err: any) {
    console.error("[API] /user/withdraw error:", err.message);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
