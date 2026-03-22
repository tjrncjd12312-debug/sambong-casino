import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { transactionCache } from "@/lib/transaction-cache";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

function todayRange() {
  const now = new Date();
  // KST = UTC+9
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kstDate = new Date(kstMs);
  const y = kstDate.getUTCFullYear();
  const m = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kstDate.getUTCDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;
  // KST day boundaries in UTC
  const startUtc = new Date(dateStr + "T00:00:00+09:00").toISOString();
  const endUtc = new Date(dateStr + "T23:59:59+09:00").toISOString();
  // Local datetime strings for deposit/withdraw queries
  const start = `${y}-${m}-${d}T00:00:00`;
  const end = `${y}-${m}-${d}T23:59:59`;
  return { start, end, startUtc, endUtc, dateStr };
}

export async function GET() {
  try {
    const { start, end, startUtc, endUtc } = todayRange();
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Still trigger cache collection in background (for real-time betting history page)
    transactionCache.ensureFresh().catch(() => {});

    // Get today's betting data from DB
    const [slotBetRes, casinoBetRes] = await Promise.all([
      supabaseAdmin
        .from("slot_bet_history")
        .select("bet_amount, win_amount")
        .gte("bet_at", startUtc)
        .lte("bet_at", endUtc),
      supabaseAdmin
        .from("casino_bet_history")
        .select("bet_amount, win_amount")
        .gte("bet_at", startUtc)
        .lte("bet_at", endUtc),
    ]);

    let slotBetAmount = 0, slotWinAmount = 0, casinoBetAmount = 0, casinoWinAmount = 0;

    for (const row of (slotBetRes.data || [])) {
      slotBetAmount += Number(row.bet_amount) || 0;
      slotWinAmount += Number(row.win_amount) || 0;
    }
    for (const row of (casinoBetRes.data || [])) {
      casinoBetAmount += Number(row.bet_amount) || 0;
      casinoWinAmount += Number(row.win_amount) || 0;
    }

    // ── Parallel Supabase queries ──

    const [
      memberBalanceRes,
      memberRollingRes,
      partnerBalanceRes,
      partnerRollingRes,
      newMembersRes,
      onlineUsersRes,
      todayDepositApprovedRes,
      todayDepositPendingRes,
      todayWithdrawApprovedRes,
      todayWithdrawPendingRes,
      moneyGiveRes,
      moneyTakeRes,
    ] = await Promise.all([
      // 1. total member balance
      supabaseAdmin
        .from("members")
        .select("balance"),
      // 2. total member rolling
      supabaseAdmin
        .from("members")
        .select("point_rolling"),
      // 3. total partner balance (excluding admin)
      supabaseAdmin
        .from("partners")
        .select("balance")
        .neq("level", "admin"),
      // 4. total partner rolling (excluding admin)
      supabaseAdmin
        .from("partners")
        .select("rolling_balance")
        .neq("level", "admin"),
      // 5. new members today
      supabaseAdmin
        .from("members")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start)
        .lte("created_at", end),
      // 6. online users (last 30 min)
      supabaseAdmin
        .from("members")
        .select("id", { count: "exact", head: true })
        .gte("last_login_at", thirtyMinAgo),
      // 7. today approved deposits
      supabaseAdmin
        .from("deposit_requests")
        .select("amount")
        .eq("status", "approved")
        .gte("created_at", start)
        .lte("created_at", end),
      // 8. today pending deposits
      supabaseAdmin
        .from("deposit_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      // 9. today approved withdrawals
      supabaseAdmin
        .from("withdraw_requests")
        .select("amount")
        .eq("status", "approved")
        .gte("created_at", start)
        .lte("created_at", end),
      // 10. today pending withdrawals
      supabaseAdmin
        .from("withdraw_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      // 11. money transfers - give (알지급) today
      supabaseAdmin
        .from("money_transfers")
        .select("amount")
        .in("transfer_type", ["admin_to_partner", "partner_to_member"])
        .gte("created_at", start)
        .lte("created_at", end),
      // 12. money transfers - take (알회수) today
      supabaseAdmin
        .from("money_transfers")
        .select("amount")
        .eq("transfer_type", "admin_recover")
        .gte("created_at", start)
        .lte("created_at", end),
    ]);

    // ── Aggregate helpers ─────────────────────────────────────────────

    const sumField = (rows: any[] | null, field: string): number =>
      (rows ?? []).reduce((s: number, r: any) => s + (Number(r[field]) || 0), 0);

    // Debug errors
    const results = [memberBalanceRes, memberRollingRes, partnerBalanceRes, partnerRollingRes, newMembersRes, onlineUsersRes, todayDepositApprovedRes, todayDepositPendingRes, todayWithdrawApprovedRes, todayWithdrawPendingRes, moneyGiveRes, moneyTakeRes];
    results.forEach((r, i) => { if (r.error) console.error(`Dashboard query ${i} error:`, r.error.message); });

    const memberBalance = sumField(memberBalanceRes.data, "balance");
    const memberRolling = sumField(memberRollingRes.data, "point_rolling");
    const partnerBalance = sumField(partnerBalanceRes.data, "balance");
    const partnerRolling = sumField(partnerRollingRes.data, "rolling_balance");

    const depositCount = todayDepositApprovedRes.data?.length ?? 0;
    const depositAmount = sumField(todayDepositApprovedRes.data, "amount");
    const withdrawCount = todayWithdrawApprovedRes.data?.length ?? 0;
    const withdrawAmount = sumField(todayWithdrawApprovedRes.data, "amount");

    const giveAmount = sumField(moneyGiveRes.data, "amount");
    const takeAmount = sumField(moneyTakeRes.data, "amount");

    // ── Response ──────────────────────────────────────────────────────

    return NextResponse.json({
      topStats: {
        memberBalance,
        memberRolling,
        partnerBalance,
        partnerRolling,
        newMembersToday: newMembersRes.count ?? 0,
        onlineUsers: onlineUsersRes.count ?? 0,
      },
      todayDeposit: {
        count: depositCount,
        amount: depositAmount,
        pendingCount: todayDepositPendingRes.count ?? 0,
      },
      todayWithdraw: {
        count: withdrawCount,
        amount: withdrawAmount,
        pendingCount: todayWithdrawPendingRes.count ?? 0,
      },
      todayBetting: {
        slotBetAmount,
        slotWinAmount,
        casinoBetAmount,
        casinoWinAmount,
      },
      todayTransfers: {
        giveAmount,
        takeAmount,
      },
      moneyFlow: {
        depositAmount,
        withdrawAmount,
        depositCount,
        withdrawCount,
        memberBalance,
        partnerBalance,
      },
    });
  } catch (err: any) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
