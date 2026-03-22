import { NextRequest, NextResponse } from "next/server";
import { verifyMemberToken } from "@/lib/member-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { honorlink } from "@/lib/honorlink";

const MEMBER_COOKIE_NAME = "member_token";

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

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, username, balance")
      .eq("id", payload.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    // HL 잔액 전액 회수
    let hlAmount = 0;
    try {
      const result = await honorlink.subBalanceAll(member.username);
      hlAmount = Math.abs(Number(result.data?.amount) || 0);
      console.log("[game-exit] Retrieved from HL:", hlAmount);
    } catch (err: any) {
      console.log("[game-exit] subBalanceAll error:", err.message);
    }

    // HL 잔액으로 DB 덮어쓰기 (배팅 결과 반영)
    // HL 잔액이 0이면 이미 회수됨 or 게임 안 하는 중 → DB 건드리지 않음
    if (hlAmount > 0) {
      const dbBefore = Number(member.balance) || 0;

      await supabaseAdmin
        .from("members")
        .update({ balance: hlAmount })
        .eq("id", member.id);

      console.log("[game-exit] DB balance: ", dbBefore, "→", hlAmount);

      // 차이가 있으면 기록 (배팅으로 인한 변동)
      if (hlAmount !== dbBefore) {
        const isProfit = hlAmount > dbBefore;
        await supabaseAdmin.from("money_transfers").insert({
          transfer_type: "game_settlement",
          amount: Math.abs(hlAmount - dbBefore),
          to_member_id: member.id,
          to_balance_before: dbBefore,
          to_balance_after: hlAmount,
          memo: `게임 종료 정산 (${isProfit ? "수익" : "손실"}: ${Math.abs(hlAmount - dbBefore).toLocaleString()})`,
        });
      }
    }

    const { data: updated } = await supabaseAdmin
      .from("members")
      .select("balance")
      .eq("id", member.id)
      .single();

    return NextResponse.json({
      success: true,
      retrieved: hlAmount,
      balance: Number(updated?.balance) || 0,
    });
  } catch (err: any) {
    console.error("[API] /user/game-exit error:", err.message);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
