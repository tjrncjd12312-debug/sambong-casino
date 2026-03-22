import { NextRequest, NextResponse } from "next/server";
import { verifyMemberToken } from "@/lib/member-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";

const MEMBER_COOKIE_NAME = "member_token";

// GET: Return member profile
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

    const { data: member, error } = await supabaseAdmin
      .from("members")
      .select(
        "id, username, nickname, phone, bank_name, bank_account, bank_holder, balance, point_rolling, status, created_at, last_login_at"
      )
      .eq("id", payload.id)
      .single();

    if (error || !member) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: member });
  } catch (err: any) {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// PATCH: Update member profile
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get(MEMBER_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const payload = verifyMemberToken(token);
    if (!payload) {
      return NextResponse.json({ error: "세션이 만료되었습니다." }, { status: 401 });
    }

    const body = await request.json();
    const { nickname, phone, bank_name, bank_account, bank_holder, current_password, new_password } = body;

    const updateData: Record<string, any> = {};

    // Password change
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ error: "현재 비밀번호를 입력해주세요." }, { status: 400 });
      }

      // Verify current password
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("password_hash")
        .eq("id", payload.id)
        .single();

      if (!member) {
        return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
      }

      const isValid = await bcrypt.compare(current_password, member.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
      }

      if (new_password.length < 6) {
        return NextResponse.json({ error: "새 비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
      }

      updateData.password_hash = await bcrypt.hash(new_password, 12);
      updateData.password_plain = new_password;
    }

    // Profile fields
    if (nickname !== undefined) updateData.nickname = nickname;
    if (phone !== undefined) updateData.phone = phone;
    if (bank_name !== undefined) updateData.bank_name = bank_name;
    if (bank_account !== undefined) updateData.bank_account = bank_account;
    if (bank_holder !== undefined) updateData.bank_holder = bank_holder;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("members")
      .update(updateData)
      .eq("id", payload.id)
      .select(
        "id, username, nickname, phone, bank_name, bank_account, bank_holder, balance, point_rolling"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
