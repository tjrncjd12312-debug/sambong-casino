import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { verifyMemberToken } from "@/lib/member-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("member_token")?.value;
    if (!token) return NextResponse.json({ data: [] });

    const payload = verifyMemberToken(token);
    if (!payload) return NextResponse.json({ data: [] });

    // 최근 처리된 충전/환전 내역 (최근 1시간 이내 처리된 것만)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [deposits, withdraws] = await Promise.all([
      supabaseAdmin
        .from("deposit_requests")
        .select("id, amount, status, processed_at")
        .eq("member_id", payload.id)
        .in("status", ["approved", "rejected"])
        .gte("processed_at", oneHourAgo)
        .order("processed_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("withdraw_requests")
        .select("id, amount, status, reject_reason, processed_at")
        .eq("member_id", payload.id)
        .in("status", ["approved", "rejected"])
        .gte("processed_at", oneHourAgo)
        .order("processed_at", { ascending: false })
        .limit(5),
    ]);

    const results = [
      ...(deposits.data || []).map((d: any) => ({
        id: d.id,
        type: "deposit" as const,
        amount: d.amount,
        status: d.status,
        processed_at: d.processed_at,
      })),
      ...(withdraws.data || []).map((w: any) => ({
        id: w.id,
        type: "withdraw" as const,
        amount: w.amount,
        status: w.status,
        reject_reason: w.reject_reason,
        processed_at: w.processed_at,
      })),
    ].sort((a, b) => new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime());

    return NextResponse.json({ data: results }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
