import { NextResponse } from "next/server";
import { honorlink } from "@/lib/honorlink";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await honorlink.getMyInfo();

    return NextResponse.json({
      data: result.data,
    });
  } catch (err: any) {
    console.error("[API] /games/agent-info error:", err.message);
    return NextResponse.json(
      { error: err.message || "에이전트 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
