import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getMemberFromToken } from "@/lib/member-auth";
import { cookies } from "next/headers";
import { sendTelegramNotification } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("member_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const member = getMemberFromToken(token);
    if (!member) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select("id, title, content, status, answer_content, answered_at, created_at")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false });

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
    const cookieStore = cookies();
    const token = cookieStore.get("member_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const member = getMemberFromToken(token);
    if (!member) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용은 필수입니다." },
        { status: 400 }
      );
    }

    // Get member's store_id
    const { data: memberData } = await supabaseAdmin
      .from("members")
      .select("store_id")
      .eq("id", member.id)
      .single();

    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .insert({
        member_id: member.id,
        store_id: memberData?.store_id || null,
        title,
        content,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send telegram notification (non-blocking)
    sendTelegramNotification(
      "inquiry",
      `회원: ${member.username}\n제목: ${title}`
    ).catch(() => {});

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
