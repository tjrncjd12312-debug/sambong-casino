/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const levelLabels: Record<string, string> = {
  admin: "관리자", head: "본사", sub_head: "부본", distributor: "총판", store: "매장",
};

/**
 * Convert a KST date string (YYYY-MM-DD) to UTC ISO range for DB queries.
 * KST is UTC+9, so KST 00:00 = previous day 15:00 UTC.
 */
function kstDateRangeToUtc(startKst: string, endKst: string) {
  const startUtc = new Date(startKst + "T00:00:00+09:00").toISOString();
  const endUtc = new Date(endKst + "T23:59:59+09:00").toISOString();
  return { startUtc, endUtc };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const partnerId = searchParams.get("partner_id");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "start_date, end_date 필요" }, { status: 400 });
    }

    // 1. 파트너 전체 조회
    const { data: allPartners } = await supabaseAdmin
      .from("partners")
      .select("id, username, nickname, level, parent_id, slot_rolling_pct, casino_rolling_pct, slot_losing_pct, casino_losing_pct, balance, rolling_balance");

    if (!allPartners || allPartners.length === 0) {
      return NextResponse.json({ mySettlement: [], subSettlement: [] });
    }

    const partnerObj: Record<string, any> = {};
    allPartners.forEach((p) => (partnerObj[p.id] = p));

    const childrenMap = new Map<string, string[]>();
    allPartners.forEach((p) => {
      if (p.parent_id) {
        if (!childrenMap.has(p.parent_id)) childrenMap.set(p.parent_id, []);
        childrenMap.get(p.parent_id)!.push(p.id);
      }
    });

    // 2. 회원 → 소속 매장 매핑
    const { data: members } = await supabaseAdmin.from("members").select("id, username, store_id");
    const memberStoreMap: Record<string, string> = {};
    const memberIdToUsername: Record<string, string> = {};
    (members || []).forEach((m) => {
      if (m.store_id) memberStoreMap[m.username] = m.store_id;
      memberIdToUsername[m.id] = m.username;
    });

    // 3. 배팅 데이터 조회 - DB에서 읽기
    const { startUtc, endUtc } = kstDateRangeToUtc(startDate, endDate);

    const [slotRes, casinoRes] = await Promise.all([
      supabaseAdmin
        .from("slot_bet_history")
        .select("member_id, bet_amount, win_amount")
        .gte("bet_at", startUtc)
        .lte("bet_at", endUtc),
      supabaseAdmin
        .from("casino_bet_history")
        .select("member_id, bet_amount, win_amount")
        .gte("bet_at", startUtc)
        .lte("bet_at", endUtc),
    ]);

    // 4. 유저별 배팅 집계
    const userBetting: Record<string, { slotBet: number; slotWin: number; casinoBet: number; casinoWin: number }> = {};

    for (const row of (slotRes.data || [])) {
      const username = memberIdToUsername[row.member_id];
      if (!username) continue;
      if (!userBetting[username]) {
        userBetting[username] = { slotBet: 0, slotWin: 0, casinoBet: 0, casinoWin: 0 };
      }
      userBetting[username].slotBet += Number(row.bet_amount) || 0;
      userBetting[username].slotWin += Number(row.win_amount) || 0;
    }

    for (const row of (casinoRes.data || [])) {
      const username = memberIdToUsername[row.member_id];
      if (!username) continue;
      if (!userBetting[username]) {
        userBetting[username] = { slotBet: 0, slotWin: 0, casinoBet: 0, casinoWin: 0 };
      }
      userBetting[username].casinoBet += Number(row.bet_amount) || 0;
      userBetting[username].casinoWin += Number(row.win_amount) || 0;
    }

    // 5. 파트너별 하부 회원 집계
    const getDescendants = (pid: string): Set<string> => {
      const result = new Set<string>([pid]);
      const queue = [pid];
      while (queue.length > 0) {
        const current = queue.shift()!;
        (childrenMap.get(current) || []).forEach((c) => { if (!result.has(c)) { result.add(c); queue.push(c); } });
      }
      return result;
    };

    let targetPartnerId = partnerId || "";
    if (!targetPartnerId) {
      const admin = allPartners.find((p) => p.level === "admin");
      targetPartnerId = admin ? admin.id : allPartners[0].id;
    }

    const calcSettlement = (pid: string) => {
      const partner = partnerObj[pid];
      if (!partner) return null;

      const descendants = getDescendants(pid);
      let slotBetTotal = 0, slotWinTotal = 0, casinoBetTotal = 0, casinoWinTotal = 0;

      Object.entries(userBetting).forEach(([username, data]) => {
        const storeId = memberStoreMap[username];
        if (storeId && descendants.has(storeId)) {
          slotBetTotal += data.slotBet;
          slotWinTotal += data.slotWin;
          casinoBetTotal += data.casinoBet;
          casinoWinTotal += data.casinoWin;
        }
      });

      const slotRollingPct = Number(partner.slot_rolling_pct) || 0;
      const casinoRollingPct = Number(partner.casino_rolling_pct) || 0;
      const slotLosingPct = Number(partner.slot_losing_pct) || 0;
      const casinoLosingPct = Number(partner.casino_losing_pct) || 0;

      const slotRolling = Math.floor(slotBetTotal * (slotRollingPct / 100));
      const casinoRolling = Math.floor(casinoBetTotal * (casinoRollingPct / 100));
      const slotBw = slotBetTotal - slotWinTotal;
      const casinoBw = casinoBetTotal - casinoWinTotal;
      const slotBdr = slotBw - slotRolling;
      const casinoBdr = casinoBw - casinoRolling;
      const slotBdrL = Math.floor(slotBdr * (slotLosingPct / 100));
      const casinoBdrL = Math.floor(casinoBdr * (casinoLosingPct / 100));

      return {
        id: pid,
        type: levelLabels[partner.level] || partner.level,
        partner: `${partner.username}\n${partner.nickname || partner.username}`,
        totalBetSlot: slotBetTotal, totalBetCasino: casinoBetTotal, totalBet: slotBetTotal + casinoBetTotal,
        totalWinSlot: slotWinTotal, totalWinCasino: casinoWinTotal, totalWin: slotWinTotal + casinoWinTotal,
        bwSlot: slotBw, bwCasino: casinoBw, bwTotal: slotBw + casinoBw,
        rollingPct: `${slotRollingPct}%\n${casinoRollingPct}%`,
        totalRollingSlot: slotRolling, totalRollingCasino: casinoRolling, totalRolling: slotRolling + casinoRolling,
        realRollingSlot: slotRolling, realRollingCasino: casinoRolling,
        bdrSlot: slotBdr, bdrCasino: casinoBdr, bdrTotal: slotBdr + casinoBdr,
        losing: `${slotLosingPct}%\n${casinoLosingPct}%`,
        bdrLSlot: slotBdrL, bdrLCasino: casinoBdrL, bdrLTotal: slotBdrL + casinoBdrL,
        holdMoney: Number(partner.balance) || 0,
        holdRolling: Number(partner.rolling_balance) || 0,
        rollingConvert: 0,
      };
    };

    const myData = calcSettlement(targetPartnerId);
    const directChildren = childrenMap.get(targetPartnerId) || [];
    let subSettlement: any[] = directChildren.map((id) => calcSettlement(id)).filter(Boolean);

    // 매장(store)이면 하부에 소속 회원별 정산 표시
    const targetPartner = partnerObj[targetPartnerId];
    if (targetPartner?.level === "store" && subSettlement.length === 0) {
      const memberUsers = Object.entries(memberStoreMap)
        .filter(([, storeId]) => storeId === targetPartnerId)
        .map(([username]) => username);

      subSettlement = memberUsers.map((username) => {
        const data = userBetting[username] || { slotBet: 0, slotWin: 0, casinoBet: 0, casinoWin: 0 };
        const slotBw = data.slotBet - data.slotWin;
        const casinoBw = data.casinoBet - data.casinoWin;
        return {
          id: username,
          type: "회원",
          partner: `${username}\n${username}`,
          totalBetSlot: data.slotBet, totalBetCasino: data.casinoBet, totalBet: data.slotBet + data.casinoBet,
          totalWinSlot: data.slotWin, totalWinCasino: data.casinoWin, totalWin: data.slotWin + data.casinoWin,
          bwSlot: slotBw, bwCasino: casinoBw, bwTotal: slotBw + casinoBw,
          rollingPct: "0%\n0%",
          totalRollingSlot: 0, totalRollingCasino: 0, totalRolling: 0,
          realRollingSlot: 0, realRollingCasino: 0,
          bdrSlot: slotBw, bdrCasino: casinoBw, bdrTotal: slotBw + casinoBw,
          losing: "0%\n0%",
          bdrLSlot: 0, bdrLCasino: 0, bdrLTotal: 0,
          holdMoney: 0, holdRolling: 0, rollingConvert: 0,
        };
      }).filter((u) => u.totalBet > 0);
    }

    return NextResponse.json({ mySettlement: myData ? [myData] : [], subSettlement });
  } catch (err: any) {
    console.error("[API] /settlement error:", err.message);
    return NextResponse.json({ error: err.message || "정산 조회 실패" }, { status: 500 });
  }
}
