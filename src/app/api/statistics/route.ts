import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Helper to get descendants of a partner using BFS
const getDescendantsHelper = (partnerId: string, childrenMap: Map<string, string[]>): Set<string> => {
  const result = new Set<string>([partnerId]);
  const queue = [partnerId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = childrenMap.get(current) || [];
    for (const childId of children) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }
  return result;
};

/**
 * Convert a KST date string to UTC ISO for DB queries.
 */
function kstDateRangeToUtc(startKst: string, endKst: string) {
  const startUtc = new Date(startKst + "T00:00:00+09:00").toISOString();
  const endUtc = new Date(endKst + "T23:59:59+09:00").toISOString();
  return { startUtc, endUtc };
}

/**
 * Fetch all bet records from both slot and casino tables for a date range.
 * Returns a unified array with a `gameType` field.
 */
async function fetchBetsFromDb(startUtc: string, endUtc: string) {
  // Fetch member mapping for username lookup
  const { data: members } = await supabaseAdmin.from("members").select("id, username");
  const memberIdToUsername: Record<string, string> = {};
  (members || []).forEach((m) => { memberIdToUsername[m.id] = m.username; });

  const [slotRes, casinoRes] = await Promise.all([
    supabaseAdmin
      .from("slot_bet_history")
      .select("member_id, provider_name, game_name, bet_amount, win_amount, bet_at")
      .gte("bet_at", startUtc)
      .lte("bet_at", endUtc),
    supabaseAdmin
      .from("casino_bet_history")
      .select("member_id, provider_name, game_name, bet_amount, win_amount, bet_at")
      .gte("bet_at", startUtc)
      .lte("bet_at", endUtc),
  ]);

  const allBets: any[] = [];

  for (const row of (slotRes.data || [])) {
    const username = memberIdToUsername[row.member_id] || "Unknown";
    allBets.push({
      bet_amount: Number(row.bet_amount) || 0,
      win_amount: Number(row.win_amount) || 0,
      created_at: row.bet_at,
      username,
      vendor: row.provider_name || "Unknown",
      game_name: row.game_name || "",
      gameType: "슬롯",
    });
  }

  for (const row of (casinoRes.data || [])) {
    const username = memberIdToUsername[row.member_id] || "Unknown";
    allBets.push({
      bet_amount: Number(row.bet_amount) || 0,
      win_amount: Number(row.win_amount) || 0,
      created_at: row.bet_at,
      username,
      vendor: row.provider_name || "Unknown",
      game_name: row.game_name || "",
      gameType: "카지노",
    });
  }

  return allBets;
}

/**
 * GET /api/statistics
 * Reads from DB (slot_bet_history, casino_bet_history) for reliable data.
 *
 * Query params:
 *   type: betting | game | user | head | sub-head | distributor | store
 *   start_date: YYYY-MM-DD
 *   end_date: YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "betting";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date, end_date 파라미터가 필요합니다" },
        { status: 400 }
      );
    }

    const { startUtc, endUtc } = kstDateRangeToUtc(startDate, endDate);
    const startDatetime = `${startDate}T00:00:00`;
    const endDatetime = `${endDate}T23:59:59`;

    // Fetch deposit/withdraw data from Supabase for the date range
    const [depositRes, withdrawRes] = await Promise.all([
      supabaseAdmin
        .from("deposit_requests")
        .select("amount, created_at")
        .eq("status", "approved")
        .gte("created_at", startDatetime)
        .lte("created_at", endDatetime),
      supabaseAdmin
        .from("withdraw_requests")
        .select("amount, created_at")
        .eq("status", "approved")
        .gte("created_at", startDatetime)
        .lte("created_at", endDatetime),
    ]);

    // Fetch money transfers (give/take)
    const [giveRes, takeRes] = await Promise.all([
      supabaseAdmin
        .from("money_transfers")
        .select("amount, created_at")
        .in("transfer_type", ["admin_to_partner", "partner_to_member"])
        .gte("created_at", startDatetime)
        .lte("created_at", endDatetime),
      supabaseAdmin
        .from("money_transfers")
        .select("amount, created_at")
        .eq("transfer_type", "admin_recover")
        .gte("created_at", startDatetime)
        .lte("created_at", endDatetime),
    ]);

    // 배팅 데이터 조회 - DB에서 읽기
    const allBets = await fetchBetsFromDb(startUtc, endUtc);

    if (type === "betting") {
      return handleBettingStats(allBets, depositRes.data || [], withdrawRes.data || [], giveRes.data || [], takeRes.data || [], startDate, endDate);
    } else if (type === "game") {
      return handleGameStats(allBets);
    } else if (type === "user") {
      return handleUserStats(allBets);
    } else {
      return handlePartnerStats(type, allBets, startDatetime, endDatetime);
    }
  } catch (err: any) {
    console.error("[API] /statistics error:", err.message);
    return NextResponse.json(
      { error: err.message || "통계 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

function handleBettingStats(
  allBets: any[],
  deposits: any[],
  withdraws: any[],
  gives: any[],
  takes: any[],
  startDate: string,
  endDate: string
) {
  // Group by date using object instead of Map for iteration
  const dateObj: Record<string, {
    deposit: number; withdraw: number;
    given: number; taken: number;
    betting: number; winning: number;
    rolling: number;
  }> = {};

  // Initialize all dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split("T")[0];
    dateObj[ds] = { deposit: 0, withdraw: 0, given: 0, taken: 0, betting: 0, winning: 0, rolling: 0 };
  }

  const getDateKey = (created_at: string) => {
    try {
      // Convert UTC bet_at to KST date key
      const date = new Date(created_at);
      if (isNaN(date.getTime())) return created_at.substring(0, 10);
      const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
      const kstDate = new Date(kstMs);
      return kstDate.toISOString().split("T")[0];
    } catch { return ""; }
  };

  for (const d of deposits) {
    const dk = getDateKey(d.created_at);
    if (dateObj[dk]) dateObj[dk].deposit += Number(d.amount) || 0;
  }
  for (const w of withdraws) {
    const dk = getDateKey(w.created_at);
    if (dateObj[dk]) dateObj[dk].withdraw += Number(w.amount) || 0;
  }
  for (const g of gives) {
    const dk = getDateKey(g.created_at);
    if (dateObj[dk]) dateObj[dk].given += Number(g.amount) || 0;
  }
  for (const t of takes) {
    const dk = getDateKey(t.created_at);
    if (dateObj[dk]) dateObj[dk].taken += Number(t.amount) || 0;
  }
  for (const b of allBets) {
    const dk = getDateKey(b.created_at);
    if (dateObj[dk]) {
      dateObj[dk].betting += Number(b.bet_amount) || 0;
      dateObj[dk].winning += Number(b.win_amount) || 0;
      dateObj[dk].rolling += Math.floor((Number(b.bet_amount) || 0) * 0.03);
    }
  }

  const rows: any[] = [];
  const totals = { deposit: 0, withdraw: 0, given: 0, taken: 0, betting: 0, winning: 0, rolling: 0 };

  const sortedDates = Object.keys(dateObj).sort();
  for (const date of sortedDates) {
    const entry = dateObj[date];
    const dw = entry.deposit - entry.withdraw;
    const gt = entry.given - entry.taken;
    const bw = entry.betting - entry.winning;
    const bwr = bw - entry.rolling;
    const rtp = entry.betting > 0 ? Math.round((entry.winning / entry.betting) * 100) : 0;

    rows.push({ date, deposit: entry.deposit, withdraw: entry.withdraw, dw, given: entry.given, taken: entry.taken, gt, betting: entry.betting, winning: entry.winning, bw, rolling: entry.rolling, bwr, rtp });

    totals.deposit += entry.deposit;
    totals.withdraw += entry.withdraw;
    totals.given += entry.given;
    totals.taken += entry.taken;
    totals.betting += entry.betting;
    totals.winning += entry.winning;
    totals.rolling += entry.rolling;
  }

  const totalDw = totals.deposit - totals.withdraw;
  const totalGt = totals.given - totals.taken;
  const totalBw = totals.betting - totals.winning;
  const totalBwr = totalBw - totals.rolling;
  const totalRtp = totals.betting > 0 ? Math.round((totals.winning / totals.betting) * 100) : 0;

  rows.push({
    date: "합계", deposit: totals.deposit, withdraw: totals.withdraw, dw: totalDw,
    given: totals.given, taken: totals.taken, gt: totalGt, betting: totals.betting,
    winning: totals.winning, bw: totalBw, rolling: totals.rolling, bwr: totalBwr, rtp: totalRtp,
  });

  return NextResponse.json({
    data: rows,
    summary: {
      totalBetting: totals.betting, totalWinning: totals.winning,
      bettingMinusWinning: totalBw, totalRolling: totals.rolling,
      totalDeposit: totals.deposit, totalWithdraw: totals.withdraw, netProfit: totalBwr,
    },
  });
}

function handleGameStats(allBets: any[]) {
  const vendorObj: Record<string, { vendor: string; betTotal: number; winTotal: number; count: number }> = {};

  for (const b of allBets) {
    const vendor = b.vendor || "Unknown";
    if (!vendorObj[vendor]) {
      vendorObj[vendor] = { vendor, betTotal: 0, winTotal: 0, count: 0 };
    }
    vendorObj[vendor].betTotal += Number(b.bet_amount) || 0;
    vendorObj[vendor].winTotal += Number(b.win_amount) || 0;
    vendorObj[vendor].count += 1;
  }

  const rows = Object.values(vendorObj).sort((a, b) => b.betTotal - a.betTotal);
  const totals = rows.reduce((acc, r) => ({
    vendor: "합계", betTotal: acc.betTotal + r.betTotal, winTotal: acc.winTotal + r.winTotal, count: acc.count + r.count,
  }), { vendor: "합계", betTotal: 0, winTotal: 0, count: 0 });

  return NextResponse.json({
    data: [...rows, totals],
    summary: { totalBetting: totals.betTotal, totalWinning: totals.winTotal, bettingMinusWinning: totals.betTotal - totals.winTotal, totalCount: totals.count },
  });
}

function handleUserStats(allBets: any[]) {
  const userObj: Record<string, { username: string; betTotal: number; winTotal: number; count: number }> = {};

  for (const b of allBets) {
    const username = b.username || "Unknown";
    if (!userObj[username]) {
      userObj[username] = { username, betTotal: 0, winTotal: 0, count: 0 };
    }
    userObj[username].betTotal += Number(b.bet_amount) || 0;
    userObj[username].winTotal += Number(b.win_amount) || 0;
    userObj[username].count += 1;
  }

  const rows = Object.values(userObj).sort((a, b) => b.betTotal - a.betTotal);
  const totals = rows.reduce((acc, r) => ({
    username: "합계", betTotal: acc.betTotal + r.betTotal, winTotal: acc.winTotal + r.winTotal, count: acc.count + r.count,
  }), { username: "합계", betTotal: 0, winTotal: 0, count: 0 });

  return NextResponse.json({
    data: [...rows, totals],
    summary: { totalBetting: totals.betTotal, totalWinning: totals.winTotal, bettingMinusWinning: totals.betTotal - totals.winTotal },
  });
}

async function handlePartnerStats(
  type: string,
  allBets: any[],
  startDatetime: string,
  endDatetime: string,
) {
  const levelMap: Record<string, string> = {
    head: "head", "sub-head": "sub_head", distributor: "distributor", store: "store",
  };
  const targetLevel = levelMap[type] || type;

  const { data: partners } = await supabaseAdmin
    .from("partners")
    .select("id, username, nickname, level, parent_id")
    .eq("level", targetLevel);

  if (!partners || partners.length === 0) {
    return NextResponse.json({ data: [], summary: {} });
  }

  const { data: members } = await supabaseAdmin
    .from("members")
    .select("username, partner_id");

  const memberPartnerObj: Record<string, string> = {};
  if (members) {
    for (const m of members) {
      if (m.partner_id) memberPartnerObj[m.username] = m.partner_id;
    }
  }

  const { data: allPartners } = await supabaseAdmin
    .from("partners")
    .select("id, parent_id, username, nickname, level");

  const childrenMap = new Map<string, string[]>();
  const partnerIdObj: Record<string, any> = {};
  if (allPartners) {
    for (const p of allPartners) {
      partnerIdObj[p.id] = p;
      if (p.parent_id) {
        if (!childrenMap.has(p.parent_id)) childrenMap.set(p.parent_id, []);
        childrenMap.get(p.parent_id)!.push(p.id);
      }
    }
  }

  // Build stats object keyed by partner id
  const statsObj: Record<string, {
    name: string; belong: string;
    deposit: number; withdraw: number;
    given: number; taken: number;
    betting: number; winning: number;
    rolling: number;
  }> = {};

  // Build member sets per partner using plain objects
  const partnerMemberSetsObj: Record<string, Set<string>> = {};

  for (const p of partners) {
    const parentPartner = p.parent_id ? partnerIdObj[p.parent_id] : null;
    const belong = parentPartner ? parentPartner.username : "";
    const displayName = `${p.username} (${p.nickname || p.username})`;
    statsObj[p.id] = {
      name: displayName, belong,
      deposit: 0, withdraw: 0, given: 0, taken: 0,
      betting: 0, winning: 0, rolling: 0,
    };

    const descendantIds = getDescendantsHelper(p.id, childrenMap);
    const memberUsernames = new Set<string>();
    const memberEntries = Object.entries(memberPartnerObj);
    for (let i = 0; i < memberEntries.length; i++) {
      const [username, pid] = memberEntries[i];
      if (descendantIds.has(pid)) {
        memberUsernames.add(username);
      }
    }
    partnerMemberSetsObj[p.id] = memberUsernames;
  }

  // Distribute bets to partners
  const partnerIds = Object.keys(partnerMemberSetsObj);
  for (const bet of allBets) {
    const username = bet.username;
    for (let i = 0; i < partnerIds.length; i++) {
      const pid = partnerIds[i];
      if (partnerMemberSetsObj[pid].has(username)) {
        const stats = statsObj[pid];
        stats.betting += Number(bet.bet_amount) || 0;
        stats.winning += Number(bet.win_amount) || 0;
        stats.rolling += Math.floor((Number(bet.bet_amount) || 0) * 0.03);
        break;
      }
    }
  }

  // Distribute deposits to partners
  const [depositWithMemberRes, withdrawWithMemberRes] = await Promise.all([
    supabaseAdmin
      .from("deposit_requests")
      .select("amount, member_id, members!inner(username, partner_id)")
      .eq("status", "approved")
      .gte("created_at", startDatetime)
      .lte("created_at", endDatetime),
    supabaseAdmin
      .from("withdraw_requests")
      .select("amount, member_id, members!inner(username, partner_id)")
      .eq("status", "approved")
      .gte("created_at", startDatetime)
      .lte("created_at", endDatetime),
  ]);

  for (const dep of (depositWithMemberRes.data || [])) {
    const memberData = dep.members as any;
    const partnerId = memberData?.partner_id;
    if (partnerId) {
      for (let i = 0; i < partnerIds.length; i++) {
        const pid = partnerIds[i];
        const descendants = getDescendantsHelper(pid, childrenMap);
        if (descendants.has(partnerId)) {
          statsObj[pid].deposit += Number(dep.amount) || 0;
          break;
        }
      }
    }
  }

  for (const wd of (withdrawWithMemberRes.data || [])) {
    const memberData = wd.members as any;
    const partnerId = memberData?.partner_id;
    if (partnerId) {
      for (let i = 0; i < partnerIds.length; i++) {
        const pid = partnerIds[i];
        const descendants = getDescendantsHelper(pid, childrenMap);
        if (descendants.has(partnerId)) {
          statsObj[pid].withdraw += Number(wd.amount) || 0;
          break;
        }
      }
    }
  }

  // Money transfers
  const [giveTransfers, takeTransfers] = await Promise.all([
    supabaseAdmin
      .from("money_transfers")
      .select("amount, to_partner_id, to_member_id")
      .in("transfer_type", ["admin_to_partner", "partner_to_member"])
      .gte("created_at", startDatetime)
      .lte("created_at", endDatetime),
    supabaseAdmin
      .from("money_transfers")
      .select("amount, from_partner_id, from_member_id")
      .eq("transfer_type", "admin_recover")
      .gte("created_at", startDatetime)
      .lte("created_at", endDatetime),
  ]);

  for (const g of (giveTransfers.data || [])) {
    const targetId = g.to_partner_id || g.to_member_id;
    if (targetId) {
      for (let i = 0; i < partnerIds.length; i++) {
        const pid = partnerIds[i];
        const descendants = getDescendantsHelper(pid, childrenMap);
        if (descendants.has(targetId)) {
          statsObj[pid].given += Number(g.amount) || 0;
          break;
        }
      }
    }
  }

  for (const t of (takeTransfers.data || [])) {
    const targetId = t.from_partner_id || t.from_member_id;
    if (targetId) {
      for (let i = 0; i < partnerIds.length; i++) {
        const pid = partnerIds[i];
        const descendants = getDescendantsHelper(pid, childrenMap);
        if (descendants.has(targetId)) {
          statsObj[pid].taken += Number(t.amount) || 0;
          break;
        }
      }
    }
  }

  const rows = Object.values(statsObj).sort((a, b) => b.betting - a.betting);

  const totals = rows.reduce((acc, r) => ({
    name: "합계", belong: "",
    deposit: acc.deposit + r.deposit, withdraw: acc.withdraw + r.withdraw,
    given: acc.given + r.given, taken: acc.taken + r.taken,
    betting: acc.betting + r.betting, winning: acc.winning + r.winning,
    rolling: acc.rolling + r.rolling,
  }), { name: "합계", belong: "", deposit: 0, withdraw: 0, given: 0, taken: 0, betting: 0, winning: 0, rolling: 0 });

  const rowsWithBwr = rows.map(r => ({ ...r, bwr: (r.betting - r.winning) - r.rolling }));
  const totalBwr = (totals.betting - totals.winning) - totals.rolling;

  return NextResponse.json({
    data: [{ ...totals, bwr: totalBwr }, ...rowsWithBwr],
    summary: {
      totalBetting: totals.betting, totalWinning: totals.winning,
      bettingMinusWinning: totals.betting - totals.winning, totalRolling: totals.rolling,
      totalDeposit: totals.deposit, totalWithdraw: totals.withdraw, netProfit: totalBwr,
    },
  });
}
