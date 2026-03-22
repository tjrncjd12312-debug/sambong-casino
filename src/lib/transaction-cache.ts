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
