import { NextRequest, NextResponse } from "next/server";
import { honorlink } from "@/lib/honorlink";

export const dynamic = "force-dynamic";

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

    const result = await honorlink.getGameList(vendor);

    // Normalize game list
    let games = Array.isArray(result.data) ? result.data : [];
    if (!Array.isArray(result.data) && result.data) {
      const d = result.data as any;
      if (d.games && Array.isArray(d.games)) {
        games = d.games;
      } else if (d.data && Array.isArray(d.data)) {
        games = d.data;
      }
    }

    return NextResponse.json({
      data: games,
      vendor,
      total: games.length,
    });
  } catch (err: any) {
    console.error("[API] /games/list error:", err.message);
    return NextResponse.json(
      { error: err.message || "게임 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
