import { NextRequest, NextResponse } from "next/server";
import { honorlink } from "@/lib/honorlink";

export const dynamic = "force-dynamic";

/**
 * Convert UTC date string to KST (UTC+9)
 */
function utcToKst(utcStr: string): string {
  const date = new Date(utcStr);
  // Add 9 hours for KST
  date.setHours(date.getHours() + 9);
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const perPage = searchParams.get("perPage") ? parseInt(searchParams.get("perPage")!) : 50;

    if (!start || !end) {
      return NextResponse.json(
        { error: "start, end 파라미터가 필요합니다. (UTC 형식)" },
        { status: 400 }
      );
    }

    // HonorLink expects UTC times. If the caller sends KST, we need to convert.
    // The API consumer should send UTC times, and we convert to KST for display.

    const result = await honorlink.getTransactions(start, end, page, perPage, true);

    // Convert timestamps to KST for display
    let transactions = Array.isArray(result.data) ? result.data : [];
    if (!Array.isArray(result.data) && result.data) {
      const d = result.data as any;
      if (d.data && Array.isArray(d.data)) transactions = d.data;
      else if (d.transactions && Array.isArray(d.transactions)) transactions = d.transactions;
    }

    const transactionsKst = transactions.map((tx: any) => ({
      ...tx,
      created_at_utc: tx.created_at,
      created_at_kst: tx.created_at ? utcToKst(tx.created_at) : null,
    }));

    return NextResponse.json({
      data: transactionsKst,
      meta: result.meta || {
        current_page: page,
        per_page: perPage,
        total: transactionsKst.length,
      },
    });
  } catch (err: any) {
    console.error("[API] /games/transactions error:", err.message);
    return NextResponse.json(
      { error: err.message || "트랜잭션 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
