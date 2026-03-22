import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

const ADMIN_ID = "00000000-0000-0000-0000-000000000001";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reject_reason } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "유효한 상태값이 필요합니다. (approved/rejected)" },
        { status: 400 }
      );
    }

    // Get the withdraw request
    const { data: withdrawReq, error: fetchError } = await supabaseAdmin
      .from("withdraw_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !withdrawReq) {
      return NextResponse.json(
        { error: "환전 신청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (withdrawReq.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다." },
        { status: 400 }
      );
    }

    const withdrawAmount = Number(withdrawReq.amount) || 0;

    if (status === "approved") {
      // 승인: 이미 신청 시 차감되었으므로 상태만 변경
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("withdraw_requests")
        .update({
          status: "approved",
          processed_by: ADMIN_ID,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending")
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: "신청 상태 업데이트에 실패했습니다." },
          { status: 500 }
        );
      }

      // 머니 이동 기록 (승인 완료)
      await supabaseAdmin.from("money_transfers").insert({
        transfer_type: "member_withdraw",
        from_member_id: withdrawReq.member_id,
        amount: withdrawAmount,
        processed_by: ADMIN_ID,
        memo: `환전 승인 완료 (금액: ${withdrawAmount.toLocaleString()})`,
      });

      return NextResponse.json({ data: updated });
    } else {
      // 거절: 차감했던 금액을 회원에게 돌려줌
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("id, balance")
        .eq("id", withdrawReq.member_id)
        .single();

      if (!member) {
        return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
      }

      const currentBalance = Number(member.balance) || 0;
      const newBalance = currentBalance + withdrawAmount;

      // 잔액 복구
      const { error: balanceError } = await supabaseAdmin
        .from("members")
        .update({ balance: newBalance })
        .eq("id", withdrawReq.member_id);

      if (balanceError) {
        return NextResponse.json(
          { error: "잔액 복구에 실패했습니다." },
          { status: 500 }
        );
      }

      // 환전 상태 거절로 변경
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("withdraw_requests")
        .update({
          status: "rejected",
          processed_by: ADMIN_ID,
          processed_at: new Date().toISOString(),
          reject_reason: reject_reason || null,
        })
        .eq("id", id)
        .eq("status", "pending")
        .select()
        .single();

      if (updateError) {
        // 롤백
        await supabaseAdmin.from("members").update({ balance: currentBalance }).eq("id", withdrawReq.member_id);
        return NextResponse.json(
          { error: "신청 상태 업데이트에 실패했습니다." },
          { status: 500 }
        );
      }

      // 머니 이동 기록 (환불)
      await supabaseAdmin.from("money_transfers").insert({
        transfer_type: "member_deposit",
        to_member_id: withdrawReq.member_id,
        amount: withdrawAmount,
        to_balance_before: currentBalance,
        to_balance_after: newBalance,
        processed_by: ADMIN_ID,
        memo: `환전 거절 환불 (사유: ${reject_reason || "없음"})`,
      });

      return NextResponse.json({ data: updated, newBalance });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
