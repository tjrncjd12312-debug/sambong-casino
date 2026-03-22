import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    // Default: last 30 days
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const from = dateFrom || defaultFrom.toISOString().split("T")[0];
    const to = dateTo || now.toISOString().split("T")[0];

    // Fetch approved deposits in range
    const { data: deposits, error: depErr } = await supabaseAdmin
      .from("deposit_requests")
      .select("amount, created_at")
      .eq("status", "approved")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`);

    if (depErr) {
      return NextResponse.json({ error: depErr.message }, { status: 500 });
    }

    // Fetch approved withdrawals in range
    const { data: withdrawals, error: wdErr } = await supabaseAdmin
      .from("withdraw_requests")
      .select("amount, created_at")
      .eq("status", "approved")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`);

    if (wdErr) {
      return NextResponse.json({ error: wdErr.message }, { status: 500 });
    }

    // Group by date
    const dailyMap = new Map<string, { deposit: number; withdraw: number }>();

    // Initialize all dates in range
    const startDate = new Date(from);
    const endDate = new Date(to);
    for (let d = new Date(endDate); d >= startDate; d.setDate(d.getDate() - 1)) {
      const key = d.toISOString().split("T")[0];
      dailyMap.set(key, { deposit: 0, withdraw: 0 });
    }

    for (const dep of deposits || []) {
      const dateKey = new Date(dep.created_at).toISOString().split("T")[0];
      const entry = dailyMap.get(dateKey) || { deposit: 0, withdraw: 0 };
      entry.deposit += Number(dep.amount);
      dailyMap.set(dateKey, entry);
    }

    for (const wd of withdrawals || []) {
      const dateKey = new Date(wd.created_at).toISOString().split("T")[0];
      const entry = dailyMap.get(dateKey) || { deposit: 0, withdraw: 0 };
      entry.withdraw += Number(wd.amount);
      dailyMap.set(dateKey, entry);
    }

    // Convert to array sorted by date desc
    const result = Array.from(dailyMap.entries())
      .map(([date, vals]) => ({
        date,
        deposit: vals.deposit,
        withdraw: vals.withdraw,
        profit: vals.deposit - vals.withdraw,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const totalDeposit = result.reduce((s, r) => s + r.deposit, 0);
    const totalWithdraw = result.reduce((s, r) => s + r.withdraw, 0);

    return NextResponse.json({
      data: result,
      summary: {
        total_deposit: totalDeposit,
        total_withdraw: totalWithdraw,
        total_profit: totalDeposit - totalWithdraw,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
