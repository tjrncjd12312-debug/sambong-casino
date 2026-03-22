import { NextResponse } from "next/server";
import { honorlink } from "@/lib/honorlink";

let cachedVendors: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const dynamic = "force-dynamic";

// 라이브 카지노 벤더
const CASINO_VENDORS = new Set([
  "evolution", "PragmaticPlay Live", "DreamGame", "WM Live", "Asia Gaming",
  "AllBet", "bota", "sexybcrt", "ezugi", "ezugix", "ezugiZ", "SuperSpade",
  "XProGaming", "vivo", "saGaming", "Skywind Live", "Live88", "tvbet",
  "Betgames.tv", "Imoon", "platingaming", "eagaming", "SkycityHoldem",
  "oriental", "Kiron", "absolute", "galaxsys", "7-mojos", "liw",
  "MicroGaming", "MicroGaming Plus", "mplay", "spinomenal",
]);

// 스포츠 벤더
const SPORTS_VENDORS = new Set([
  "bti", "live-inplay",
]);

// 한글 이름 매핑
const VENDOR_NAMES: Record<string, string> = {
  "evolution": "에볼루션",
  "PragmaticPlay": "프라그마틱",
  "PragmaticPlay Live": "프라그마틱 라이브",
  "DreamGame": "드림게임",
  "WM Live": "WM카지노",
  "Asia Gaming": "아시아게이밍",
  "Asia Gaming Slot": "아시아게이밍 슬롯",
  "AllBet": "올벳",
  "bota": "보타",
  "sexybcrt": "섹시카지노",
  "ezugi": "에주기",
  "SuperSpade": "슈퍼스페이드",
  "XProGaming": "XPro게이밍",
  "vivo": "비보게이밍",
  "saGaming": "SA게이밍",
  "Skywind Live": "스카이윈드 라이브",
  "Skywind Slot": "스카이윈드 슬롯",
  "Live88": "라이브88",
  "tvbet": "TV벳",
  "Betgames.tv": "벳게임즈",
  "MicroGaming": "마이크로게이밍",
  "MicroGaming Plus": "마이크로게이밍 플러스",
  "MicroGaming Plus Slo": "마이크로게이밍 슬롯",
  "MicroGamingSlot": "마이크로게이밍 슬롯",
  "netent": "넷엔트",
  "Habanero": "하바네로",
  "CQ9": "CQ9",
  "PG Soft": "PG소프트",
  "Booongo": "부운고",
  "PlayTech": "플레이텍",
  "PlayTechSlot": "플레이텍 슬롯",
  "playngo": "플레이앤고",
  "Playson": "플레이슨",
  "PlayStar": "플레이스타",
  "quickspin": "퀵스핀",
  "redtiger": "레드타이거",
  "Relax Gaming": "릴렉스 게이밍",
  "Hacksaw": "핵쏘",
  "Nolimit City": "노리밋시티",
  "bgaming": "B게이밍",
  "evoplay": "에보플레이",
  "Yggdrasil": "이그드라실",
  "dreamtech": "드림텍",
  "jili": "질리",
  "JDB": "JDB",
  "fachai": "파차이",
  "pragmaticplay": "프라그마틱",
  "Wazdan": "와즈단",
  "booming": "부밍",
  "spinomenal": "스피노메날",
  "GameArt": "게임아트",
  "platipus": "플라티푸스",
  "popok": "포폭",
  "rsg": "RSG",
  "RubyPlay": "루비플레이",
  "Spadegaming": "스페이드게이밍",
  "spribe": "스프라이브",
  "Smartsoft": "스마트소프트",
  "bti": "BTI 스포츠",
  "live-inplay": "라이브 인플레이",
};

// ── Thumbnail fetching helpers ────────────────────────────────────────────

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;
const MAX_THUMBNAIL_VENDORS = 60; // 카지노+슬롯 주요 벤더 모두 커버

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchVendorThumbnail(vendor: string): Promise<string | null> {
  try {
    const result = await honorlink.getGameList(vendor);

    let games: any[] = [];
    if (Array.isArray(result.data)) {
      games = result.data;
    } else if (result.data) {
      const d = result.data as any;
      if (d.games && Array.isArray(d.games)) {
        games = d.games;
      } else if (d.data && Array.isArray(d.data)) {
        games = d.data;
      }
    }

    if (games.length === 0) return null;

    const firstGame = games[0];
    return (
      firstGame?.thumbnails?.["300x300"] ||
      firstGame?.thumbnail ||
      firstGame?.image ||
      null
    );
  } catch (err: any) {
    console.error(`[vendors] Failed to fetch thumbnail for ${vendor}:`, err.message);
    return null;
  }
}

async function fetchThumbnailsInBatches(
  vendors: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const limited = vendors.slice(0, MAX_THUMBNAIL_VENDORS);

  for (let i = 0; i < limited.length; i += BATCH_SIZE) {
    const batch = limited.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map((vendor) => fetchVendorThumbnail(vendor))
    );

    batch.forEach((vendor, idx) => {
      const result = batchResults[idx];
      results.set(
        vendor,
        result.status === "fulfilled" ? result.value : null
      );
    });

    // Delay between batches to respect rate limits (skip after last batch)
    if (i + BATCH_SIZE < limited.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const now = Date.now();
    if (cachedVendors && now - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({ data: cachedVendors });
    }

    const result = await honorlink.getVendorList();

    let vendors: any[] = [];
    if (!Array.isArray(result.data) && result.data) {
      vendors = Object.entries(result.data).map(([key, val]: [string, any]) => {
        const vendorName = val?.name || key;
        let type = "slot"; // 기본값: 슬롯
        if (CASINO_VENDORS.has(vendorName)) type = "casino";
        if (SPORTS_VENDORS.has(vendorName)) type = "sports";

        return {
          vendor: vendorName,
          name: VENDOR_NAMES[vendorName] || vendorName,
          name_en: vendorName,
          type,
          status: val?.enabled === 1 ? "active" : "inactive",
          enabled: val?.enabled,
        };
      });
    } else if (Array.isArray(result.data)) {
      vendors = result.data;
    }

    // 활성화된 벤더만 필터
    vendors = vendors.filter((v: any) => v.status === "active" || v.enabled === 1);

    cachedVendors = vendors;
    cacheTimestamp = now;

    return NextResponse.json({ data: vendors });
  } catch (err: any) {
    console.error("[API] /games/vendors error:", err.message);
    return NextResponse.json(
      { error: err.message || "벤더 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
