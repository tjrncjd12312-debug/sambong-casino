import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { honorlink } from "@/lib/honorlink";

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

    // Get the deposit request
    const { data: depositReq, error: fetchError } = await supabaseAdmin
      .from("deposit_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !depositReq) {
      return NextResponse.json(
        { error: "충전 신청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (depositReq.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다." },
        { status: 400 }
      );
    }

    if (status === "approved") {
      // Get member's current balance atomically
      const { data: member, error: memberError } = await supabaseAdmin
        .from("members")
        .select("id, balance, username")
        .eq("id", depositReq.member_id)
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: "회원을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      let currentBalance = Number(member.balance) || 0;
      const depositAmount = Number(depositReq.amount) || 0;
      const bonusAmount = Number(depositReq.bonus_amount) || 0;
      const totalAdd = depositAmount + bonusAmount;
      let newBalance = currentBalance + totalAdd;

      // Update member balance with retry on optimistic lock failure
      let balanceUpdated = false;
      let retryBalance = currentBalance;
      let retryNewBalance = newBalance;

      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: updated, error: balanceError } = await supabaseAdmin
          .from("members")
          .update({ balance: retryNewBalance })
          .eq("id", depositReq.member_id)
          .eq("balance", retryBalance)
          .select("id")
          .single();

        if (!balanceError && updated) {
          balanceUpdated = true;
          currentBalance = retryBalance;
          newBalance = retryNewBalance;
          break;
        }

        // Re-fetch balance and retry
        const { data: fresh } = await supabaseAdmin
          .from("members")
          .select("balance")
          .eq("id", depositReq.member_id)
          .single();

        if (fresh) {
          retryBalance = Number(fresh.balance) || 0;
          retryNewBalance = retryBalance + totalAdd;
        }
      }

      if (!balanceUpdated) {
        return NextResponse.json(
          { error: "잔고 업데이트에 실패했습니다. 다시 시도해주세요." },
          { status: 409 }
        );
      }

      // Create money_transfer record
      const { error: transferError } = await supabaseAdmin
        .from("money_transfers")
        .insert({
          transfer_type: "member_deposit",
          to_member_id: depositReq.member_id,
          amount: totalAdd,
          to_balance_before: currentBalance,
          to_balance_after: newBalance,
          processed_by: ADMIN_ID,
          memo: depositReq.memo || `충전 승인 (금액: ${depositAmount.toLocaleString()}, 보너스: ${bonusAmount.toLocaleString()})`,
        });

      if (transferError) {
        // Rollback balance
        await supabaseAdmin
          .from("members")
          .update({ balance: currentBalance })
          .eq("id", depositReq.member_id);

        return NextResponse.json(
          { error: "머니 이동 기록 생성에 실패했습니다." },
          { status: 500 }
        );
      }

      // Update deposit request status
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("deposit_requests")
        .update({
          status: "approved",
          processed_by: ADMIN_ID,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending") // Only update if still pending
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: "신청 상태 업데이트에 실패했습니다." },
          { status: 500 }
        );
      }

      // 게임 중이면 HL에도 추가 지급
      if (member.username) {
        try {
          const hlUser = await honorlink.getUser(member.username);
          if (Number(hlUser.data?.balance) > 0) {
            await honorlink.addBalance(member.username, totalAdd);
          }
        } catch {}
      }

      return NextResponse.json({ data: updated, newBalance });
    } else {
      // Rejected
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("deposit_requests")
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
        return NextResponse.json(
          { error: "신청 상태 업데이트에 실패했습니다." },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: updated });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
