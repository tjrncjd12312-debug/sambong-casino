import { NextResponse } from "next/server";
import { honorlink } from "@/lib/honorlink";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await honorlink.getVendorList();

    // Normalize vendors data
    let vendors: any[] = [];

    if (Array.isArray(result.data)) {
      vendors = result.data;
    } else if (result.data) {
      const d = result.data as any;
      if (d.vendors && Array.isArray(d.vendors)) {
        vendors = d.vendors;
      } else if (d.data && Array.isArray(d.data)) {
        vendors = d.data;
      } else {
        vendors = Object.entries(result.data).map(([key, val]: [string, any]) => ({
          vendor: key,
          name: val?.name || key,
          type: val?.type || "slot",
          status: val?.status || "active",
          game_count: val?.game_count || 0,
          ...val,
        }));
      }
    }

    // Filter only active vendors and map for user display
    const activeVendors = vendors
      .filter((v: any) => v.status === "active" || !v.status)
      .map((v: any) => ({
        vendor: v.vendor,
        name: v.name || v.vendor,
        type: v.type || "slot",
        game_count: v.game_count || 0,
        thumbnail: v.thumbnail || v.image || null,
      }));

    return NextResponse.json({ data: activeVendors });
  } catch (err: any) {
    console.error("[API] /user/games error:", err.message);
    return NextResponse.json(
      { error: "게임 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
