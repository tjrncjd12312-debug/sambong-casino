import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [depositRes, withdrawRes, memberRes, inquiryRes] = await Promise.all([
      supabaseAdmin
        .from("deposit_requests")
        .select("id")
        .eq("status", "pending"),
      supabaseAdmin
        .from("withdraw_requests")
        .select("id")
        .eq("status", "pending"),
      supabaseAdmin
        .from("members")
        .select("id")
        .eq("status", "pending"),
      supabaseAdmin
        .from("inquiries")
        .select("id")
        .in("status", ["pending", "in_progress"]),
    ]);

    return NextResponse.json({
      pendingDeposits: depositRes.data?.length ?? 0,
      pendingWithdraws: withdrawRes.data?.length ?? 0,
      pendingMembers: memberRes.data?.length ?? 0,
      pendingInquiries: inquiryRes.data?.length ?? 0,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
