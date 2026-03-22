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

    const { vendor, game_id } = await request.json();
    if (!vendor || !game_id) {
      return NextResponse.json({ error: "게임 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, username, nickname, balance, status")
      .eq("id", payload.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    if (member.status !== "active") {
      return NextResponse.json({ error: "비활성화된 계정입니다." }, { status: 403 });
    }

    const dbBalance = Number(member.balance) || 0;

    // HL 현재 잔액 확인
    let hlBalance = 0;
    try {
      const hlUser = await honorlink.getUser(member.username);
      hlBalance = Number(hlUser.data?.balance) || 0;
    } catch {}

    // DB 잔액이 HL보다 크면 차액만큼 HL에 추가 (DB 잔액 유지)
    const diff = dbBalance - hlBalance;
    if (diff > 0) {
      try {
        await honorlink.addBalance(member.username, diff);
        console.log(`[game-launch] HL addBalance: ${diff} (DB:${dbBalance}, HL:${hlBalance})`);
      } catch (err: any) {
        console.error("[game-launch] HL addBalance error:", err.message);
      }
    }

    // 게임 실행 링크 발급
    const result = await honorlink.getGameLaunchLink(member.username, game_id, vendor, member.nickname);
    const launchUrl = result.data?.link || result.data?.url;

    if (!launchUrl) {
      return NextResponse.json({ error: "게임 실행에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: launchUrl });
  } catch (err: any) {
    console.error("[API] /user/game-launch error:", err.message);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
