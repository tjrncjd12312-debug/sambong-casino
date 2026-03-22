import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendTelegramNotification } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("store_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "username";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    let query = supabaseAdmin
      .from("members")
      .select("*, partners:store_id(id, username, nickname, level, parent_id)")
      .limit(limit);

    if (storeId) {
      // Get all descendant store IDs for this partner
      const { data: allPartners } = await supabaseAdmin
        .from("partners")
        .select("id, parent_id");

      if (allPartners) {
        const descendantIds = getDescendantIds(storeId, allPartners);
        descendantIds.push(storeId);
        query = query.in("store_id", descendantIds);
      }
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `username.ilike.%${search}%,nickname.ilike.%${search}%,phone.ilike.%${search}%,bank_account.ilike.%${search}%,bank_holder.ilike.%${search}%`
      );
    }

    // Sort
    switch (sort) {
      case "username":
        query = query.order("username", { ascending: true });
        break;
      case "created_at_desc":
        query = query.order("created_at", { ascending: false });
        break;
      case "balance_desc":
        query = query.order("balance", { ascending: false });
        break;
      case "last_login_desc":
        query = query.order("last_login_at", { ascending: false, nullsFirst: false });
        break;
      case "last_login_asc":
        query = query.order("last_login_at", { ascending: true, nullsFirst: false });
        break;
      default:
        query = query.order("username", { ascending: true });
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
    const {
      username,
      password,
      nickname,
      store_id,
      phone,
      bank_name,
      bank_account,
      bank_holder,
      memo,
      max_win_amount,
    } = body;

    // Validate required fields
    if (!username || !password || !nickname || !store_id) {
      return NextResponse.json(
        { error: "필수 항목을 입력해주세요. (아이디, 비밀번호, 닉네임, 소속)" },
        { status: 400 }
      );
    }

    // Validate username format: 4-14 chars, alphanumeric only
    if (username.length < 4 || username.length > 14 || /[^a-zA-Z0-9]/.test(username)) {
      return NextResponse.json(
        { error: "아이디는 4~14자 영문/숫자만 가능합니다." },
        { status: 400 }
      );
    }

    // Check username uniqueness across both members and partners
    const { data: existingMember } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("username", username)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 }
      );
    }

    const { data: existingPartner } = await supabaseAdmin
      .from("partners")
      .select("id")
      .eq("username", username)
      .single();

    if (existingPartner) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    const { data, error } = await supabaseAdmin
      .from("members")
      .insert({
        username,
        password_hash,
        password_plain: password,
        nickname: nickname || username,
        store_id,
        status: "active",
        phone: phone || null,
        balance: 0,
        point_rolling: 0,
        bank_name: bank_name || null,
        bank_account: bank_account || null,
        bank_holder: bank_holder || null,
        memo: memo || null,
        max_win_amount: max_win_amount || null,
        is_bet_blocked: false,
      })
      .select("*, partners:store_id(id, username, nickname, level)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send telegram notification (non-blocking)
    sendTelegramNotification(
      "new_member",
      `아이디: ${username}\n닉네임: ${nickname || username}`
    ).catch(() => {});

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: get all descendant partner IDs recursively
function getDescendantIds(
  parentId: string,
  allPartners: { id: string; parent_id: string | null }[]
): string[] {
  const children = allPartners.filter((p) => p.parent_id === parentId);
  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    ids.push(...getDescendantIds(child.id, allPartners));
  }
  return ids;
}
