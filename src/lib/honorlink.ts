/**
 * HonorLink API Client
 * API integration for game vendor management
 */

const HONORLINK_API_URL = process.env.HONORLINK_API_URL || "https://api.honorlink.org/api";
const HONORLINK_API_KEY = process.env.HONORLINK_API_KEY || "";

// ── Types ────────────────────────────────────────────────────────────────

export interface HonorLinkVendor {
  vendor: string;
  name: string;
  type: string; // "slot" | "casino" | "fishing" etc.
  status: string;
  game_count?: number;
}

export interface HonorLinkGame {
  id: number | string;
  game_id: string;
  name: string;
  vendor: string;
  type: string;
  thumbnail?: string;
  image?: string;
  status?: string;
}

export interface HonorLinkUser {
  username: string;
  nickname?: string;
  balance: number;
  status?: string;
  created_at?: string;
}

export interface HonorLinkTransaction {
  id: number | string;
  username: string;
  vendor: string;
  game_id?: string;
  game_name?: string;
  type: string; // "bet" | "win" | "cancel" etc.
  amount: number;
  balance_before: number;
  balance_after: number;
  created_at: string; // UTC timestamp
  round_id?: string;
  detail?: any;
}

export interface HonorLinkAgentInfo {
  id: number;
  username: string;
  balance: number;
  status: string;
  vendor_count?: number;
  user_count?: number;
}

export interface HonorLinkResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

// ── Client Class ─────────────────────────────────────────────────────────

class HonorLinkClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || HONORLINK_API_URL;
    this.apiKey = apiKey || HONORLINK_API_KEY;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  private async request<T = any>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    params?: Record<string, any>,
    body?: Record<string, any>
  ): Promise<HonorLinkResponse<T>> {
    let url = `${this.baseUrl}${endpoint}`;

    // HonorLink uses query params for ALL requests (GET and POST)
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: this.headers,
        cache: "no-store",
      });

      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`HonorLink API returned non-JSON response: ${text.substring(0, 200)}`);
      }

      if (!res.ok) {
        throw new Error(
          json?.message || json?.error || `HonorLink API error: ${res.status} ${res.statusText}`
        );
      }

      // Normalize response format - HonorLink may return data directly or wrapped
      if (json.data !== undefined) {
        return {
          success: json.success !== undefined ? json.success : true,
          data: json.data,
          message: json.message,
          meta: json.meta,
        };
      }

      return {
        success: true,
        data: json,
      };
    } catch (err: any) {
      console.error(`[HonorLink] ${method} ${endpoint} error:`, err.message);
      throw err;
    }
  }

  // ── Agent Info ───────────────────────────────────────────────────────

  async getMyInfo(): Promise<HonorLinkResponse<HonorLinkAgentInfo>> {
    return this.request("GET", "/my-info");
  }

  // ── Vendor & Game Management ─────────────────────────────────────────

  async getVendorList(): Promise<HonorLinkResponse<HonorLinkVendor[]>> {
    return this.request("GET", "/vendor-list");
  }

  async getGameList(vendor: string): Promise<HonorLinkResponse<HonorLinkGame[]>> {
    return this.request("GET", "/game-list", { vendor });
  }

  async getLobbyList(): Promise<HonorLinkResponse<any>> {
    return this.request("GET", "/lobby-list");
  }

  // ── Game Launch ──────────────────────────────────────────────────────

  async getGameLaunchLink(
    username: string,
    gameId: string | number,
    vendor: string,
    nickname?: string
  ): Promise<HonorLinkResponse<{ url: string }>> {
    const params: Record<string, any> = {
      username,
      game_id: gameId,
      vendor,
    };
    if (nickname) params.nickname = nickname;
    return this.request("GET", "/game-launch-link", params);
  }

  // ── User Management ──────────────────────────────────────────────────

  async createUser(
    username: string,
    nickname?: string
  ): Promise<HonorLinkResponse<HonorLinkUser>> {
    // HonorLink auto-creates users on game-launch-link calls
    // This is a convenience method that launches a dummy game to create the user
    // Or use the user endpoint if available
    return this.request("GET", "/user", { username });
  }

  async getUser(username: string): Promise<HonorLinkResponse<HonorLinkUser>> {
    return this.request("GET", "/user", { username });
  }

  async getUserList(
    page?: number,
    perPage?: number
  ): Promise<HonorLinkResponse<HonorLinkUser[]>> {
    return this.request("GET", "/user-list", { page, perPage });
  }

  // ── Balance Management ───────────────────────────────────────────────

  async addBalance(
    username: string,
    amount: number
  ): Promise<HonorLinkResponse<{ balance: number }>> {
    return this.request("POST", "/user/add-balance", { username, amount });
  }

  async subBalance(
    username: string,
    amount: number
  ): Promise<HonorLinkResponse<{ balance: number }>> {
    return this.request("POST", "/user/sub-balance", { username, amount });
  }

  async subBalanceAll(
    username: string
  ): Promise<HonorLinkResponse<{ balance: number; amount: number }>> {
    return this.request("POST", "/user/sub-balance-all", { username });
  }

  // ── Transactions ─────────────────────────────────────────────────────

  async getTransactions(
    start: string,
    end: string,
    page?: number,
    perPage?: number,
    withDetails?: boolean
  ): Promise<HonorLinkResponse<HonorLinkTransaction[]>> {
    const params: Record<string, any> = { start, end, order: "desc" };
    if (page) params.page = page;
    if (perPage) params.perPage = perPage;
    if (withDetails) params.withDetails = 1;
    return this.request("GET", "/transactions", params);
  }
}

// ── Singleton Export ──────────────────────────────────────────────────────

export const honorlink = new HonorLinkClient();
export default honorlink;
