import { NextRequest, NextResponse } from "next/server";
import { transactionCache, utcToKst } from "@/lib/transaction-cache";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET /api/cache/transactions
 *
 * Single endpoint that all pages use to read transaction data.
 * Reads from the server-side transaction cache (no HonorLink call).
 *
 * Query params:
 *   start    - KST date (YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)
 *   end      - KST date
 *   type     - "slot" | "casino" | "all" (default: "all")
 *   username - filter by username (partial match)
 *   page     - page number (default: 1)
 *   perPage  - items per page (default: 100, max: 1000)
 *   sortBy   - "bet" | "win" | "" (default: time descending)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startKst = searchParams.get("start");
    const endKst = searchParams.get("end");
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = Math.min(parseInt(searchParams.get("perPage") || "100"), 1000);
    const filterType = (searchParams.get("type") || "all") as "slot" | "casino" | "all";
    const search = searchParams.get("search") || searchParams.get("username") || "";
    const sortBy = searchParams.get("sortBy") || "";

    if (!startKst || !endKst) {
      return NextResponse.json(
        { error: "start, end 파라미터가 필요합니다 (KST 형식: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Ensure cache is fresh (triggers collect if stale)
    await transactionCache.ensureFresh();

    // Query cached data
    let transactions = transactionCache.getByDateRange(startKst, endKst);

    // Filter by type
    if (filterType === "slot") {
      transactions = transactions.filter((tx) => !tx.isCasino);
    } else if (filterType === "casino") {
      transactions = transactions.filter((tx) => tx.isCasino);
    }

    // Filter by username search
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter((tx) =>
        tx.username.toLowerCase().includes(searchLower)
      );
    }

    // Match bet-win pairs by game.id + game.round
    const gameGroups = new Map<string, typeof transactions>();
    const ungrouped: typeof transactions = [];

    for (const tx of transactions) {
      if (tx.gameId && tx.gameRound) {
        const key = `${tx.gameId}_${tx.gameRound}`;
        if (!gameGroups.has(key)) gameGroups.set(key, []);
        gameGroups.get(key)!.push(tx);
      } else {
        ungrouped.push(tx);
      }
    }

    // Build paired records
    const records: any[] = [];

    const groupEntries = Array.from(gameGroups.entries());
    for (const [, group] of groupEntries) {
      const bets = group.filter((tx: any) => tx.type === "bet");
      const wins = group.filter((tx: any) => tx.type === "win");

      if (bets.length > 0) {
        for (const bet of bets) {
          const betAmount = Math.abs(bet.amount || 0);
          const matchingWin = wins.length > 0 ? wins[0] : null;
          const winAmount = matchingWin ? Math.abs(matchingWin.amount || 0) : 0;

          let resultText: string;
          if (winAmount === 0) {
            resultText = "패";
          } else if (winAmount >= betAmount * 10) {
            resultText = "금";
          } else if (winAmount > betAmount) {
            resultText = "승";
          } else if (winAmount === betAmount) {
            resultText = "무";
          } else {
            resultText = "승";
          }

          const balance = (bet.before || 0) + (bet.amount || 0);

          records.push({
            betNo: bet.id,
            betTime: bet.kstTime,
            user: bet.username,
            userId: bet.userId,
            belonging: "",
            memo: "",
            pot: bet.gameVendor,
            provider: bet.gameVendor,
            gameType: bet.isCasino ? "카지노" : "슬롯",
            gameName: bet.gameTitle,
            roundId: bet.gameRound,
            betAmount,
            winAmount,
            balance: Math.abs(balance),
            result: resultText,
            processedAt: bet.processed_at || "",
          });
        }
      } else {
        for (const win of wins) {
          const winAmount = Math.abs(win.amount || 0);
          const balance = (win.before || 0) + (win.amount || 0);

          records.push({
            betNo: win.id,
            betTime: win.kstTime,
            user: win.username,
            userId: win.userId,
            belonging: "",
            memo: "",
            pot: win.gameVendor,
            provider: win.gameVendor,
            gameType: win.isCasino ? "카지노" : "슬롯",
            gameName: win.gameTitle,
            roundId: win.gameRound,
            betAmount: 0,
            winAmount,
            balance: Math.abs(balance),
            result: "승",
            processedAt: win.processed_at || "",
          });
        }
      }
    }

    // Handle ungrouped transactions
    for (const tx of ungrouped) {
      const isBet = tx.type === "bet";
      const amount = Math.abs(tx.amount || 0);
      const balance = (tx.before || 0) + (tx.amount || 0);

      records.push({
        betNo: tx.id,
        betTime: tx.kstTime,
        user: tx.username,
        userId: tx.userId,
        belonging: "",
        memo: "",
        pot: tx.gameVendor,
        provider: tx.gameVendor,
        gameType: tx.isCasino ? "카지노" : "슬롯",
        gameName: tx.gameTitle,
        roundId: tx.gameRound,
        betAmount: isBet ? amount : 0,
        winAmount: isBet ? 0 : amount,
        balance: Math.abs(balance),
        result: isBet ? "패" : "승",
        processedAt: tx.processed_at || "",
      });
    }

    // Look up member stores from DB
    const usernames = Array.from(new Set(records.map((r: any) => r.user).filter(Boolean)));
    const memberStoreMap = new Map<string, string>();

    if (usernames.length > 0) {
      try {
        for (let i = 0; i < usernames.length; i += 50) {
          const batch = usernames.slice(i, i + 50);
          const { data: members } = await supabaseAdmin
            .from("members")
            .select("username, store_name, partner_id")
            .in("username", batch);

          if (members) {
            for (const m of members) {
              memberStoreMap.set(m.username, m.store_name || m.partner_id || "");
            }
          }
        }
      } catch {
        // If DB lookup fails, continue without store info
      }
    }

    // Fill in belonging (store) for each record
    for (const record of records) {
      record.belonging = memberStoreMap.get(record.user) || "";
    }

    // Sort records
    if (sortBy === "bet") {
      records.sort((a: any, b: any) => b.betAmount - a.betAmount);
    } else if (sortBy === "win") {
      records.sort((a: any, b: any) => b.winAmount - a.winAmount);
    } else {
      records.sort((a: any, b: any) => {
        if (a.betTime > b.betTime) return -1;
        if (a.betTime < b.betTime) return 1;
        return 0;
      });
    }

    // Paginate
    const totalCount = records.length;
    const startIdx = (page - 1) * perPage;
    const paginatedRecords = records.slice(startIdx, startIdx + perPage);

    return NextResponse.json({
      data: paginatedRecords,
      totalCount,
      meta: {
        current_page: page,
        per_page: perPage,
        total: totalCount,
        cache_size: transactionCache.getSize(),
        last_collect: transactionCache.getLastCollectTime(),
      },
    });
  } catch (err: any) {
    console.error("[API] /cache/transactions error:", err.message);
    return NextResponse.json(
      { error: err.message || "배팅내역 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
