import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parent_id");

    let query = supabaseAdmin
      .from("partners")
      .select("*")
      .order("created_at", { ascending: true });

    if (parentId) {
      query = query.eq("parent_id", parentId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, nickname, password, level, parent_id, phone, slot_rolling_pct, casino_rolling_pct, slot_losing_pct, casino_losing_pct, bank_name, bank_account, bank_holder } = body;

    if (!username || !password || !level || !parent_id) {
      return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
    }

    if (username.length < 4 || username.length > 14 || /[^a-zA-Z0-9]/.test(username)) {
      return NextResponse.json({ error: "접속ID는 4~14자 영문/숫자만 가능합니다." }, { status: 400 });
    }

    // Check duplicate username
    const { data: existing } = await supabaseAdmin
      .from("partners")
      .select("id")
      .eq("username", username)
      .single();

    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 접속ID입니다." }, { status: 409 });
    }

    // 상부 파트너 존재 및 레벨 검증
    const { data: parent } = await supabaseAdmin
      .from("partners")
      .select("id, level, slot_rolling_pct, casino_rolling_pct, slot_losing_pct, casino_losing_pct")
      .eq("id", parent_id)
      .single();

    if (!parent) {
      return NextResponse.json({ error: "상부 파트너를 찾을 수 없습니다." }, { status: 404 });
    }

    // 레벨 계층 검증
    const levelHierarchy: Record<string, string[]> = {
      admin: ["head"],
      head: ["sub_head"],
      sub_head: ["distributor"],
      distributor: ["store"],
    };
    const allowedChildren = levelHierarchy[parent.level] || [];
    if (!allowedChildren.includes(level)) {
      return NextResponse.json({ error: `${parent.level} 하위에 ${level}을(를) 생성할 수 없습니다.` }, { status: 400 });
    }

    if (parent) {
      const checks = [
        { field: "슬롯 롤링%", val: slot_rolling_pct || 0, max: Number(parent.slot_rolling_pct) },
        { field: "카지노 롤링%", val: casino_rolling_pct || 0, max: Number(parent.casino_rolling_pct) },
        { field: "슬롯 루징%", val: slot_losing_pct || 0, max: Number(parent.slot_losing_pct) },
        { field: "카지노 루징%", val: casino_losing_pct || 0, max: Number(parent.casino_losing_pct) },
      ];
      for (const c of checks) {
        if (c.val > c.max) {
          return NextResponse.json({ error: `${c.field}은(는) 상부(${c.max}%)를 초과할 수 없습니다.` }, { status: 400 });
        }
      }
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data, error } = await supabaseAdmin
      .from("partners")
      .insert({
        parent_id,
        username,
        nickname: nickname || username,
        password_hash,
        level,
        status: "active",
        phone: phone || null,
        slot_rolling_pct: slot_rolling_pct || 0,
        casino_rolling_pct: casino_rolling_pct || 0,
        slot_losing_pct: slot_losing_pct || 0,
        casino_losing_pct: casino_losing_pct || 0,
        bank_name: bank_name || null,
        bank_account: bank_account || null,
        bank_holder: bank_holder || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
