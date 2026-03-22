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

    // Fetch current target balance
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

    // 회원이 게임 중인지 확인
    let isInGame = false;
    let hlBalance = 0;
    if (target_type === "member") {
      try {
        const hlUser = await honorlink.getUser(target.username);
        hlBalance = Number(hlUser.data?.balance) || 0;
        if (hlBalance > 0) isInGame = true;
      } catch {}
    }

    const balanceBefore = Number(target.balance);
    if (balanceBefore < numAmount) {
      return NextResponse.json(
        { error: `잔액이 부족합니다. 현재 잔액: ${balanceBefore.toLocaleString()}` },
        { status: 400 }
      );
    }

    let finalBefore = balanceBefore;
    let finalAfter = balanceBefore - numAmount;
    let lockSuccess = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (finalBefore < numAmount) {
        return NextResponse.json(
          { error: `잔액이 부족합니다. 현재 잔액: ${finalBefore.toLocaleString()}` },
          { status: 400 }
        );
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from(table)
        .update({ balance: finalAfter })
        .eq("id", target_id)
        .eq("balance", finalBefore)
        .select("id, balance")
        .single();

      if (!updateErr && updated) {
        lockSuccess = true;
        break;
      }

      // Re-fetch and retry
      const { data: fresh } = await supabaseAdmin
        .from(table)
        .select("balance")
        .eq("id", target_id)
        .single();

      if (fresh) {
        finalBefore = Number(fresh.balance);
        finalAfter = finalBefore - numAmount;
      }
    }

    if (!lockSuccess) {
      return NextResponse.json(
        { error: "잔액이 변경되었습니다. 다시 시도해주세요." },
        { status: 409 }
      );
    }

    const transferData: Record<string, unknown> = {
      transfer_type: "admin_recover",
      amount: numAmount,
      processed_by: ADMIN_ID,
      memo: memo || null,
      from_balance_before: finalBefore,
      from_balance_after: finalAfter,
    };

    if (target_type === "member") {
      transferData.from_member_id = target_id;
      transferData.to_partner_id = ADMIN_ID;
    } else {
      transferData.from_partner_id = target_id;
      transferData.to_partner_id = ADMIN_ID;
    }

    const { error: transferErr } = await supabaseAdmin
      .from("money_transfers")
      .insert(transferData);

    if (transferErr) {
      await supabaseAdmin.from(table).update({ balance: finalBefore }).eq("id", target_id).eq("balance", finalAfter);
      return NextResponse.json({ error: "이체 기록 생성 실패" }, { status: 500 });
    }

    // 게임 중이면 HL에서도 회수
    if (isInGame && target_type === "member") {
      try {
        const hlTakeAmount = Math.min(numAmount, hlBalance);
        if (hlTakeAmount > 0) {
          await honorlink.subBalance(target.username, hlTakeAmount);
        }
      } catch (err: any) {
        console.error("[take] HL subBalance error:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        target_id,
        target_name: target.nickname || target.username,
        amount: numAmount,
        balance_before: finalBefore,
        balance_after: finalAfter,
        in_game: isInGame,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
