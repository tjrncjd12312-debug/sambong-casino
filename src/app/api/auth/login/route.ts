import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";
import { signToken, COOKIE_NAME } from "@/lib/auth";

async function logLogin(data: Record<string, unknown>) {
  try {
    await supabaseAdmin.from("login_logs").insert(data);
  } catch {
    // ignore logging errors
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    const ua = request.headers.get("user-agent") || "unknown";

    // Query partner from database
    const { data: partner, error } = await supabaseAdmin
      .from("partners")
      .select("id, username, password_hash, level, status")
      .eq("username", username)
      .single();

    if (error || !partner) {
      await logLogin({ username, result: "fail", ip_address: ip, user_agent: ua, fail_reason: "사용자를 찾을 수 없습니다" });
      return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    if (partner.status !== "active") {
      await logLogin({ username, partner_id: partner.id, result: "blocked", ip_address: ip, user_agent: ua, fail_reason: "비활성화된 계정" });
      return NextResponse.json({ error: "비활성화된 계정입니다. 관리자에게 문의하세요." }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, partner.password_hash);

    if (!isValid) {
      await logLogin({ username, partner_id: partner.id, result: "fail", ip_address: ip, user_agent: ua, fail_reason: "비밀번호 불일치" });
      return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    // Generate JWT
    const token = signToken({
      id: partner.id,
      username: partner.username,
      level: partner.level,
    });

    // Log successful login
    await logLogin({ username, partner_id: partner.id, result: "success", ip_address: ip, user_agent: ua });

    // Update last_login_at
    await supabaseAdmin.from("partners").update({ last_login_at: new Date().toISOString() }).eq("id", partner.id);

    const response = NextResponse.json({
      success: true,
      user: { id: partner.id, username: partner.username, level: partner.level },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
