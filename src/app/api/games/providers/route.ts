import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("game_providers")
      .select("*")
      .order("vendor_key", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providers } = body;

    if (!providers || !Array.isArray(providers)) {
      return NextResponse.json(
        { error: "providers 배열이 필요합니다." },
        { status: 400 }
      );
    }

    // Upsert each provider
    for (const provider of providers) {
      const { error } = await supabaseAdmin
        .from("game_providers")
        .upsert(
          {
            vendor_key: provider.vendor_key,
            vendor_name: provider.vendor_name,
            type: provider.type || "slot",
            enabled: provider.enabled ?? true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "vendor_key" }
        );

      if (error) {
        console.error(`[Providers] Upsert error for ${provider.vendor_key}:`, error.message);
      }
    }

    return NextResponse.json({ success: true, count: providers.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
