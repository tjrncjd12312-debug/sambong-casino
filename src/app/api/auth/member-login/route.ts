import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";
import { signToken } from "@/lib/auth";

const MEMBER_COOKIE_NAME = "member_token";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // Query member from database
    const { data: member, error } = await supabaseAdmin
      .from("members")
      .select("id, username, nickname, password_hash, status, store_id, balance")
      .eq("username", username)
      .single();

    if (error || !member) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    if (member.status !== "active") {
      return NextResponse.json(
        { error: "비활성화된 계정입니다. 관리자에게 문의하세요." },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(password, member.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // Generate JWT with member info
    const token = signToken({
      id: member.id,
      username: member.username,
      level: "member",
    });

    // Update last_login_at
    await supabaseAdmin
      .from("members")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", member.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: member.id,
        username: member.username,
        nickname: member.nickname,
        balance: member.balance,
      },
    });

    response.cookies.set(MEMBER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Member login error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
