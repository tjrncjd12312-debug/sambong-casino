/**
 * Server-side Transaction Cache
 *
 * Single source of truth for all HonorLink transaction data.
 * All API routes read from this cache instead of calling HonorLink directly.
 *
 * - Collects from HonorLink API every 60 seconds
 * - Respects 30-second rate limit
 * - Deduplicates by transaction ID
 * - Provides query methods for date range, type, user filtering
 */

import { honorlink } from "@/lib/honorlink";
import { supabaseAdmin } from "@/lib/supabase-server";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Casino Classification ──────────────────────────────────────────────

const CASINO_TYPES = new Set([
  "baccarat", "roulette", "blackjack", "poker", "sicbo", "dragontiger",
  "dragon tiger", "dragon-tiger", "sic bo", "sic-bo",
]);

const CASINO_VENDORS = new Set([
  "evolution", "dreamgame", "pragmaticplay-live", "pragmatic play live",
  "sagaming", "sa gaming", "allbet", "sexybcrt", "asia gaming",
  "ag", "wm", "wm casino", "wm live", "playace", "live88", "ezugi",
  "betgames", "bota", "gameplay", "hogaming", "vivo",
  "pretty gaming", "dream gaming", "superspace", "xprogaming",
]);

const SKIP_TYPES = new Set([
  "agent.add_balance", "agent.sub_balance",
  "add_balance", "sub_balance",
  "tip", "promo_win", "adjust",
]);

// ── Types ──────────────────────────────────────────────────────────────

export interface CachedTransaction {
  id: number | string;
  type: string; // "bet" | "win" | "cancel"
  amount: number;
  before: number;
  status: string;
  // game info
  gameId: string;
  gameType: string;
  gameRound: string;
  gameTitle: string;
  gameVendor: string;
  // user info
  userId: string;
  username: string;
  // timestamps
  processed_at: string;
  created_at: string;
  // computed
  isCasino: boolean;
  kstTime: string; // converted to KST
  // raw reference for any edge cases
  _raw: any;
}

// ── Helpers ────────────────────────────────────────────────────────────

function isCasinoGame(tx: any): boolean {
  const vendor = (tx.details?.game?.vendor || tx.vendor || "").toLowerCase();
  if (CASINO_VENDORS.has(vendor)) return true;

  const gameType = (tx.details?.game?.type || "").toLowerCase();
  if (CASINO_TYPES.has(gameType)) return true;

  const title = (tx.details?.game?.title || tx.game_name || "").toLowerCase();
  const casinoArr = Array.from(CASINO_TYPES);
  for (let i = 0; i < casinoArr.length; i++) {
    if (title.includes(casinoArr[i])) return true;
  }

  return false;
}

function utcToKst(utcStr: string): string {
  const date = new Date(utcStr);
  if (isNaN(date.getTime())) return utcStr;
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const kstDate = new Date(kstMs);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getUTCDate()).padStart(2, "0");
  const hours = String(kstDate.getUTCHours()).padStart(2, "0");
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(kstDate.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function kstToUtc(kstStr: string): string {
  const date = new Date(kstStr.replace(" ", "T") + "+09:00");
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function normalizeTx(tx: any): CachedTransaction | null {
  const txType = (tx.type || "").toLowerCase();

  // Skip non-game types
  if (SKIP_TYPES.has(txType)) return null;
  if (txType !== "bet" && txType !== "win" && txType !== "cancel") return null;

  const processedAt = tx.processed_at || tx.created_at || "";
  const casino = isCasinoGame(tx);

  return {
    id: tx.id,
    type: txType,
    amount: tx.amount || 0,
    before: tx.before || 0,
    status: tx.status || "",
    gameId: tx.details?.game?.id || "",
    gameType: tx.details?.game?.type || "",
    gameRound: tx.details?.game?.round || tx.round_id || "",
    gameTitle: tx.details?.game?.title || tx.game_name || "",
    gameVendor: tx.details?.game?.vendor || tx.vendor || "",
    userId: tx.user?.id || tx.referer_id || "",
    username: tx.user?.username || tx.username || "",
    processed_at: processedAt,
    created_at: tx.created_at || "",
    isCasino: casino,
    kstTime: processedAt ? utcToKst(processedAt) : "",
    _raw: tx,
  };
}

// ── DB Persistence ───────────────────────────────────────────────────

/** Cache username → member row to avoid repeated DB lookups */
const memberCache = new Map<string, { id: string; store_id: string | null }>();
let memberCacheLastRefresh = 0;
const MEMBER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function refreshMemberCache(): Promise<void> {
  const now = Date.now();
  if (now - memberCacheLastRefresh < MEMBER_CACHE_TTL && memberCache.size > 0) return;
  try {
    const { data } = await supabaseAdmin.from("members").select("id, username, store_id");
    if (data) {
      memberCache.clear();
      for (const m of data) {
        memberCache.set(m.username, { id: m.id, store_id: m.store_id });
      }
      memberCacheLastRefresh = now;
    }
  } catch (err: any) {
    console.error("[TransactionCache] refreshMemberCache error:", err.message);
  }
}

/**
 * Save collected transactions to slot_bet_history / casino_bet_history.
 * Runs asynchronously — does not block the collect() caller.
 */
async function saveTxsToDb(txs: CachedTransaction[]): Promise<void> {
  if (txs.length === 0) return;

  try {
    await refreshMemberCache();

    const slotRows: any[] = [];
    const casinoRows: any[] = [];

    // Collect win transactions separately so we can update matching bets
    const winTxs: CachedTransaction[] = [];

    for (const tx of txs) {
      if (tx.type !== "bet" && tx.type !== "win") continue;
      if (!tx.gameRound) continue; // need round_id for upsert

      const member = memberCache.get(tx.username);
      if (!member) continue; // unknown member, skip

      if (tx.type === "win") {
        winTxs.push(tx);
        continue;
      }

      // bet transaction
      const row: any = {
        member_id: member.id,
        store_id: member.store_id,
        provider_name: tx.gameVendor,
        game_id: tx.gameId,
        game_name: tx.gameTitle,
        round_id: tx.gameRound,
        bet_amount: Math.abs(tx.amount),
        win_amount: 0,
        rolling_amount: 0,
        is_rolling_processed: false,
        is_public_bet: true,
        bet_at: tx.processed_at || tx.created_at,
      };

      if (tx.isCasino) {
        casinoRows.push(row);
      } else {
        slotRows.push(row);
      }
    }

    // Batch upsert bet rows (slot)
    if (slotRows.length > 0) {
      for (let i = 0; i < slotRows.length; i += 500) {
        const batch = slotRows.slice(i, i + 500);
        const { error } = await supabaseAdmin
          .from("slot_bet_history")
          .upsert(batch, { onConflict: "round_id" });
        if (error) console.error("[TransactionCache] slot upsert error:", error.message);
      }
    }

    // Batch upsert bet rows (casino)
    if (casinoRows.length > 0) {
      for (let i = 0; i < casinoRows.length; i += 500) {
        const batch = casinoRows.slice(i, i + 500);
        const { error } = await supabaseAdmin
          .from("casino_bet_history")
          .upsert(batch, { onConflict: "round_id" });
        if (error) console.error("[TransactionCache] casino upsert error:", error.message);
      }
    }

    // Process win transactions: update existing bet records' win_amount
    for (const win of winTxs) {
      const winAmount = Math.abs(win.amount);
      const table = win.isCasino ? "casino_bet_history" : "slot_bet_history";

      // Try to update the matching bet row by round_id
      const { data: updated, error } = await supabaseAdmin
        .from(table)
        .update({ win_amount: winAmount })
        .eq("round_id", win.gameRound)
        .select("id");

      if (error) {
        console.error(`[TransactionCache] win update error (${table}):`, error.message);
      }

      // If no matching bet exists, insert a new row with win_amount
      if (!updated || updated.length === 0) {
        const member = memberCache.get(win.username);
        if (member) {
          const row: any = {
            member_id: member.id,
            store_id: member.store_id,
            provider_name: win.gameVendor,
            game_id: win.gameId,
            game_name: win.gameTitle,
            round_id: win.gameRound,
            bet_amount: 0,
            win_amount: winAmount,
            rolling_amount: 0,
            is_rolling_processed: false,
            is_public_bet: true,
            bet_at: win.processed_at || win.created_at,
          };
          const { error: insertErr } = await supabaseAdmin
            .from(table)
            .upsert([row], { onConflict: "round_id" });
          if (insertErr) console.error(`[TransactionCache] win insert error (${table}):`, insertErr.message);
        }
      }
    }

    console.log(`[TransactionCache] DB save: ${slotRows.length} slot bets, ${casinoRows.length} casino bets, ${winTxs.length} wins`);
  } catch (err: any) {
    console.error("[TransactionCache] saveTxsToDb error:", err.message);
  }
}

// ── Singleton Cache ────────────────────────────────────────────────────

class TransactionCacheImpl {
  private transactions: Map<string | number, CachedTransaction> = new Map();
  private lastApiCall: number = 0;
  private lastCollectTime: number = 0;
  private collecting: boolean = false;
  private collectPromise: Promise<any> | null = null;
  private autoCollectTimer: ReturnType<typeof setInterval> | null = null;
  private initialized: boolean = false;

  private readonly RATE_LIMIT_MS = 30_000;
  private readonly AUTO_COLLECT_MS = 60_000;

  /**
   * Collect transactions from HonorLink API.
   * Respects 30-second rate limit.
   * Merges new data into cache, deduplicating by ID.
   */
  async collect(): Promise<{ added: number; total: number }> {
    // 이미 수집 중이면 완료를 기다림
    if (this.collecting && this.collectPromise) {
      await this.collectPromise;
      return { added: 0, total: this.transactions.size };
    }

    // Rate limit 체크 (캐시가 비어있으면 무시)
    const now = Date.now();
    if (this.transactions.size > 0 && now - this.lastApiCall < this.RATE_LIMIT_MS) {
      return { added: 0, total: this.transactions.size };
    }

    this.collecting = true;
    this.collectPromise = this._doCollect();
    const result = await this.collectPromise;
    this.collectPromise = null;
    return result;
  }

  private async _doCollect(): Promise<{ added: number; total: number }> {
    let added = 0;

    try {
      // Fetch last 7 days of data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const formatUtc = (d: Date): string => {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const hh = String(d.getUTCHours()).padStart(2, "0");
        const mm = String(d.getUTCMinutes()).padStart(2, "0");
        const ss = String(d.getUTCSeconds()).padStart(2, "0");
        return `${y}-${m}-${dd} ${hh}:${mm}:${ss}`;
      };

      const startUtc = formatUtc(startDate);
      const endUtc = formatUtc(endDate);

      this.lastApiCall = Date.now();

      const result = await honorlink.getTransactions(startUtc, endUtc, 1, 1000, true);

      let rawTxs: any[] = [];
      if (Array.isArray(result.data)) {
        rawTxs = result.data;
      } else if (result.data) {
        const d = result.data as any;
        if (d.data && Array.isArray(d.data)) rawTxs = d.data;
        else if (d.transactions && Array.isArray(d.transactions)) rawTxs = d.transactions;
      }

      for (const raw of rawTxs) {
        const cached = normalizeTx(raw);
        if (!cached) continue;

        if (!this.transactions.has(cached.id)) {
          added++;
        }
        this.transactions.set(cached.id, cached);
      }

      this.lastCollectTime = Date.now();
      console.log(`[TransactionCache] Collected: ${rawTxs.length} raw, ${added} new, ${this.transactions.size} total`);

      // Async save to DB - don't block the collect() return
      const allNormalized: CachedTransaction[] = [];
      for (const raw of rawTxs) {
        const cached = normalizeTx(raw);
        if (cached) allNormalized.push(cached);
      }
      saveTxsToDb(allNormalized).catch((err) => {
        console.error("[TransactionCache] async DB save failed:", err.message);
      });
    } catch (err: any) {
      console.error("[TransactionCache] collect error:", err.message);
    } finally {
      this.collecting = false;
    }

    return { added, total: this.transactions.size };
  }

  /**
   * Ensure cache is fresh. Triggers collect if stale (>60s).
   */
  async ensureFresh(): Promise<void> {
    if (!this.initialized) {
      this.initialized = true;
      await this.collect();
      this.startAutoCollect();
      return;
    }

    if (Date.now() - this.lastCollectTime > this.AUTO_COLLECT_MS) {
      await this.collect();
    }
  }

  private startAutoCollect(): void {
    if (this.autoCollectTimer) return;
    this.autoCollectTimer = setInterval(() => {
      this.collect().catch((err) => {
        console.error("[TransactionCache] auto-collect error:", err.message);
      });
    }, this.AUTO_COLLECT_MS);
    // Prevent the timer from keeping Node.js alive
    if (this.autoCollectTimer && typeof this.autoCollectTimer === "object" && "unref" in this.autoCollectTimer) {
      (this.autoCollectTimer as any).unref();
    }
  }

  /** Get all cached transactions */
  getAll(): CachedTransaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get transactions by KST date range.
   * start/end in "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss" format (KST).
   */
  getByDateRange(startKst: string, endKst: string): CachedTransaction[] {
    const startFull = startKst.includes(" ") ? startKst : `${startKst} 00:00:00`;
    const endFull = endKst.includes(" ") ? endKst : `${endKst} 23:59:59`;

    return this.getAll().filter((tx) => {
      if (!tx.kstTime) return false;
      return tx.kstTime >= startFull && tx.kstTime <= endFull;
    });
  }

  /**
   * Get transactions filtered by game type.
   */
  getByType(type: "slot" | "casino" | "all"): CachedTransaction[] {
    if (type === "all") return this.getAll();
    if (type === "casino") return this.getAll().filter((tx) => tx.isCasino);
    return this.getAll().filter((tx) => !tx.isCasino);
  }

  /** Get transactions for a specific user */
  getByUser(username: string): CachedTransaction[] {
    const lower = username.toLowerCase();
    return this.getAll().filter((tx) => tx.username.toLowerCase().includes(lower));
  }

  /** Get last collect timestamp */
  getLastCollectTime(): number {
    return this.lastCollectTime;
  }

  /** Get cache size */
  getSize(): number {
    return this.transactions.size;
  }

  /**
   * Get raw transactions (in original HonorLink format) for a KST date range.
   * Useful for settlement/statistics that need the raw data shape.
   */
  getRawByDateRange(startKst: string, endKst: string): any[] {
    return this.getByDateRange(startKst, endKst).map((tx) => tx._raw);
  }
}

// globalThis에 저장하여 Next.js 핫 리로드에도 캐시 유지
const globalForCache = globalThis as unknown as { __txCache?: TransactionCacheImpl };
export const transactionCache = globalForCache.__txCache || new TransactionCacheImpl();
if (!globalForCache.__txCache) {
  globalForCache.__txCache = transactionCache;
}

// Re-export helpers for use by other modules
export { utcToKst, kstToUtc, isCasinoGame, CASINO_TYPES, CASINO_VENDORS, SKIP_TYPES };
