import { NextRequest, NextResponse } from "next/server";
import { honorlink } from "@/lib/honorlink";

export const dynamic = "force-dynamic";

// Per-vendor thumbnail cache: vendor -> { thumbnail, timestamp }
const thumbnailCache = new Map<string, { thumbnail: string | null; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendor = searchParams.get("vendor");

    if (!vendor) {
      return NextResponse.json(
        { error: "vendor 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const now = Date.now();
    const cached = thumbnailCache.get(vendor);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ vendor, thumbnail: cached.thumbnail });
    }

    const thumbnail = await fetchVendorThumbnail(vendor);

    thumbnailCache.set(vendor, { thumbnail, timestamp: now });

    return NextResponse.json({ vendor, thumbnail });
  } catch (err: any) {
    console.error("[API] /games/vendor-thumbnail error:", err.message);
    return NextResponse.json(
      { error: err.message || "썸네일을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
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
    // Prefer 300x300 thumbnail, fallback to regular thumbnail, then image
    const thumb =
      firstGame?.thumbnails?.["300x300"] ||
      firstGame?.thumbnail ||
      firstGame?.image ||
      null;

    return thumb;
  } catch (err: any) {
    console.error(`[vendor-thumbnail] Failed to fetch thumbnail for ${vendor}:`, err.message);
    return null;
  }
}
