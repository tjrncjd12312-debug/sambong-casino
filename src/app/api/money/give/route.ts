import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { honorlink } from "@/lib/honorlink";

const ADMIN_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target_type, target_id, amount, memo } = body;

    if (!target_type || !target_id || !amount) {
      return NextResponse.json(
        { error: "필수 항목을 입력해주세요." },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "금액은 0보다 커야 합니다." },
        { status: 400 }
      );
    }

    const table = target_type === "member" ? "members" : "partners";
    const transferType =
      target_type === "member" ? "partner_to_member" : "admin_to_partner";

    // Fetch current target balance (optimistic locking)
    const { data: target, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select("id, balance, username, nickname")
      .eq("id", target_id)
      .single();

    if (fetchErr || !target) {
      return NextResponse.json(
        { error: "대상을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 회원이 게임 중이면 HonorLink에도 지급
    let isInGame = false;
    if (target_type === "member") {
      try {
        const hlUser = await honorlink.getUser(target.username);
        const hlBalance = Number(hlUser.data?.balance) || 0;
        if (hlBalance > 0) isInGame = true;
      } catch {}
    }

    const balanceBefore = Number(target.balance);

    const balanceAfter = balanceBefore + numAmount;

    // Optimistic locking: update only if balance hasn't changed
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from(table)
      .update({ balance: balanceAfter })
      .eq("id", target_id)
      .eq("balance", balanceBefore)
      .select("id, balance")
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { error: "잔액이 변경되었습니다. 다시 시도해주세요." },
        { status: 409 }
      );
    }

    // Create money_transfer record
    const transferData: Record<string, unknown> = {
      transfer_type: transferType,
      amount: numAmount,
      processed_by: ADMIN_ID,
      memo: memo || null,
      to_balance_before: balanceBefore,
      to_balance_after: balanceAfter,
    };

    if (target_type === "member") {
      transferData.to_member_id = target_id;
      transferData.from_partner_id = ADMIN_ID;
      transferData.from_balance_before = 0;
      transferData.from_balance_after = 0;
    } else {
      transferData.to_partner_id = target_id;
      transferData.from_partner_id = ADMIN_ID;
      transferData.from_balance_before = 0;
      transferData.from_balance_after = 0;
    }

    const { error: transferErr } = await supabaseAdmin
      .from("money_transfers")
      .insert(transferData);

    if (transferErr) {
      // Rollback balance
      await supabaseAdmin
        .from(table)
        .update({ balance: balanceBefore })
        .eq("id", target_id);

      return NextResponse.json(
        { error: "이체 기록 생성 실패: " + transferErr.message },
        { status: 500 }
      );
    }

    // 게임 중이면 HL에도 추가 지급
    if (isInGame && target_type === "member") {
      try {
        await honorlink.addBalance(target.username, numAmount);
      } catch (err: any) {
        console.error("[give] HL addBalance error:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        target_id,
        target_name: target.nickname || target.username,
        amount: numAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        in_game: isInGame,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
