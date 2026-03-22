import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function maskUsername(username: string): string {
  if (!username) return "***";
  if (username.length <= 2) return username + "***";
  return username.slice(0, 2) + "***";
}

export async function GET() {
  try {
    // Fetch recent approved deposits
    const { data: deposits } = await supabaseAdmin
      .from("deposit_requests")
      .select("amount, created_at, member:member_id(username)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch recent approved withdrawals
    const { data: withdrawals } = await supabaseAdmin
      .from("withdraw_requests")
      .select("amount, created_at, member:member_id(username)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20);

    const maskedDeposits = (deposits || []).map((d: any) => ({
      username: maskUsername(d.member?.username || ""),
      amount: d.amount,
      date: d.created_at,
    }));

    const maskedWithdrawals = (withdrawals || []).map((w: any) => ({
      username: maskUsername(w.member?.username || ""),
      amount: w.amount,
      date: w.created_at,
    }));

    return NextResponse.json({
      deposits: maskedDeposits,
      withdrawals: maskedWithdrawals,
    });
  } catch (err: any) {
    console.error("[API] /user/recent-transactions error:", err.message);
    // Return empty arrays on error so the UI can fall back to placeholder data
    return NextResponse.json({
      deposits: [],
      withdrawals: [],
    });
  }
}
