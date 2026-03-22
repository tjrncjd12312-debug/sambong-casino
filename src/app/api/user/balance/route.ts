import { NextRequest, NextResponse } from "next/server";
import { verifyMemberToken } from "@/lib/member-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { honorlink } from "@/lib/honorlink";

const MEMBER_COOKIE_NAME = "member_token";

export async function GET(request: NextRequest) {
  try {
    // 1. Get member from JWT cookie
    const token = request.cookies.get(MEMBER_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const payload = verifyMemberToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "세션이 만료되었습니다." },
        { status: 401 }
      );
    }

    // 2. Get balance from our DB
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, username, nickname, balance")
      .eq("id", payload.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "회원 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 3. Also get balance from HonorLink (with timeout)
    let honorlinkBalance = 0;
    try {
      const hlPromise = honorlink.getUser(member.username);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000));
      const hlUser = await Promise.race([hlPromise, timeoutPromise]) as any;
      honorlinkBalance = Number(hlUser.data?.balance) || 0;
    } catch {
      // User may not exist on HonorLink yet or timeout
    }

    // 4. Return both balances
    return NextResponse.json({
      success: true,
      username: member.username,
      nickname: member.nickname,
      balance: Number(member.balance) || 0,
      honorlink_balance: honorlinkBalance,
      total_balance: (Number(member.balance) || 0) + honorlinkBalance,
    });
  } catch (err: any) {
    console.error("[API] /user/balance error:", err.message);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
