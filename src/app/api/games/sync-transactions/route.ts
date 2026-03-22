import { NextRequest, NextResponse } from "next/server";
import { honorlink } from "@/lib/honorlink";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Types to skip - these are our own balance transfers, not game activity
const SKIP_TYPES = new Set([
  "agent.add_balance",
  "agent.sub_balance",
  "add_balance",
  "sub_balance",
]);

// Known casino/live vendors
const casinoVendors = new Set([
  "evolution", "dreamgame", "pragmaticplay-live", "pragmatic play live",
  "sagaming", "sa gaming", "allbet", "sexybcrt", "asia gaming",
  "ag", "wm", "wm casino", "playace", "live88", "ezugi",
  "betgames", "bota", "gameplay", "hogaming", "vivo",
  "pretty gaming", "dream gaming",
]);

/**
 * Sync recent HonorLink transactions to our local DB.
 * Fetches the last 1 hour of transactions and inserts new records
 * into slot_bet_history or casino_bet_history.
 */
export async function POST(request: NextRequest) {
  try {
    // Calculate time range: last 1 hour in UTC
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const start = oneHourAgo.toISOString().replace(/\.\d+Z$/, "");
    const end = now.toISOString().replace(/\.\d+Z$/, "");

    let allTransactions: any[] = [];
    let currentPage = 1;
    const perPage = 100;
    let hasMore = true;

    // Paginate through all results
    while (hasMore) {
      const result = await honorlink.getTransactions(start, end, currentPage, perPage, true);

      let transactions: any[] = [];
      if (Array.isArray(result.data)) {
        transactions = result.data;
      } else if (result.data) {
        const d = result.data as any;
        if (d.data && Array.isArray(d.data)) transactions = d.data;
        else if (d.transactions && Array.isArray(d.transactions)) transactions = d.transactions;
      }

      allTransactions = allTransactions.concat(transactions);

      // Check if there are more pages
      if (result.meta?.last_page && currentPage < result.meta.last_page) {
        currentPage++;
        // Rate limit: wait 2 seconds between calls
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        hasMore = false;
      }

      // Safety: max 10 pages per sync
      if (currentPage > 10) break;
    }

    if (allTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "동기화할 트랜잭션이 없습니다.",
      });
    }

    // Filter out our own balance transfers
    const gameTransactions = allTransactions.filter(
      (tx: any) => !SKIP_TYPES.has(tx.type)
    );

    // Get all usernames from transactions
    const usernames = Array.from(
      new Set(gameTransactions.map((tx: any) => tx.username).filter(Boolean))
    );

    // Look up members by username
    const { data: members } = await supabaseAdmin
      .from("members")
      .select("id, username")
      .in("username", usernames);

    const memberMap = new Map<string, string>();
    (members || []).forEach((m: any) => memberMap.set(m.username, m.id));

    // Get existing hl_transaction_ids to prevent duplicates
    const hlIds = gameTransactions
      .map((tx: any) => tx.id?.toString())
      .filter(Boolean);

    const existingIds = new Set<string>();
    if (hlIds.length > 0) {
      // Check in batches
      for (let i = 0; i < hlIds.length; i += 100) {
        const batch = hlIds.slice(i, i + 100);

        const { data: existingSlot } = await supabaseAdmin
          .from("slot_bet_history")
          .select("hl_transaction_id")
          .in("hl_transaction_id", batch);
        (existingSlot || []).forEach((r: any) => existingIds.add(r.hl_transaction_id));

        const { data: existingCasino } = await supabaseAdmin
          .from("casino_bet_history")
          .select("hl_transaction_id")
          .in("hl_transaction_id", batch);
        (existingCasino || []).forEach((r: any) => existingIds.add(r.hl_transaction_id));
      }
    }

    let slotRecords: any[] = [];
    let casinoRecords: any[] = [];
    let skippedCount = 0;
    let duplicateCount = 0;

    for (const tx of gameTransactions) {
      const txId = tx.id?.toString();

      // Skip duplicates
      if (txId && existingIds.has(txId)) {
        duplicateCount++;
        continue;
      }

      const memberId = memberMap.get(tx.username);
      if (!memberId) {
        skippedCount++;
        continue;
      }

      // Determine if slot or casino based on vendor
      const vendorLower = (tx.vendor || "").toLowerCase();
      const typeLower = (tx.type || "").toLowerCase();
      const isCasino = casinoVendors.has(vendorLower);

      // Convert UTC created_at to KST for storage
      const createdAtUtc = tx.created_at || new Date().toISOString();
      const kstDate = new Date(new Date(createdAtUtc).getTime() + 9 * 60 * 60 * 1000);

      // Handle different transaction types
      if (typeLower === "bet") {
        const record = {
          member_id: memberId,
          vendor: tx.vendor || "unknown",
          game_name: tx.game_name || tx.game_id || "unknown",
          bet_amount: Math.abs(tx.amount || 0),
          win_amount: 0,
          round_id: tx.round_id || null,
          created_at: kstDate.toISOString(),
          hl_transaction_id: txId || null,
        };

        if (isCasino) {
          casinoRecords.push(record);
        } else {
          slotRecords.push(record);
        }
      } else if (typeLower === "win") {
        const record = {
          member_id: memberId,
          vendor: tx.vendor || "unknown",
          game_name: tx.game_name || tx.game_id || "unknown",
          bet_amount: 0,
          win_amount: Math.abs(tx.amount || 0),
          round_id: tx.round_id || null,
          created_at: kstDate.toISOString(),
          hl_transaction_id: txId || null,
        };

        if (isCasino) {
          casinoRecords.push(record);
        } else {
          slotRecords.push(record);
        }
      } else if (typeLower === "cancel") {
        // Handle cancellation - record as negative bet
        const record = {
          member_id: memberId,
          vendor: tx.vendor || "unknown",
          game_name: tx.game_name || tx.game_id || "unknown",
          bet_amount: 0,
          win_amount: Math.abs(tx.amount || 0), // Refund amount goes as win
          round_id: tx.round_id || null,
          created_at: kstDate.toISOString(),
          hl_transaction_id: txId || null,
        };

        if (isCasino) {
          casinoRecords.push(record);
        } else {
          slotRecords.push(record);
        }
      }
      // Skip other types (agent.add_balance, agent.sub_balance already filtered)
    }

    let insertedSlot = 0;
    let insertedCasino = 0;

    // Insert slot records in batches
    if (slotRecords.length > 0) {
      for (let i = 0; i < slotRecords.length; i += 50) {
        const batch = slotRecords.slice(i, i + 50);
        const { error } = await supabaseAdmin
          .from("slot_bet_history")
          .insert(batch);

        if (error) {
          if (error.message?.includes("duplicate") || error.code === "23505") {
            // Insert one by one for duplicates
            for (const rec of batch) {
              const { error: singleErr } = await supabaseAdmin
                .from("slot_bet_history")
                .insert(rec);
              if (!singleErr) insertedSlot++;
            }
          } else {
            console.error("[SyncTx] Slot insert error:", error.message);
          }
        } else {
          insertedSlot += batch.length;
        }
      }
    }

    // Insert casino records in batches
    if (casinoRecords.length > 0) {
      for (let i = 0; i < casinoRecords.length; i += 50) {
        const batch = casinoRecords.slice(i, i + 50);
        const { error } = await supabaseAdmin
          .from("casino_bet_history")
          .insert(batch);

        if (error) {
          if (error.message?.includes("duplicate") || error.code === "23505") {
            for (const rec of batch) {
              const { error: singleErr } = await supabaseAdmin
                .from("casino_bet_history")
                .insert(rec);
              if (!singleErr) insertedCasino++;
            }
          } else {
            console.error("[SyncTx] Casino insert error:", error.message);
          }
        } else {
          insertedCasino += batch.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: insertedSlot + insertedCasino,
      details: {
        total_fetched: allTransactions.length,
        game_transactions: gameTransactions.length,
        slot_inserted: insertedSlot,
        casino_inserted: insertedCasino,
        skipped_no_member: skippedCount,
        skipped_duplicate: duplicateCount,
        skipped_transfers: allTransactions.length - gameTransactions.length,
      },
      time_range: { start, end },
    });
  } catch (err: any) {
    console.error("[API] /games/sync-transactions error:", err.message);
    return NextResponse.json(
      { error: err.message || "트랜잭션 동기화에 실패했습니다." },
      { status: 500 }
    );
  }
}
