import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get the first active store-level partner as default store
    const { data: store, error } = await supabaseAdmin
      .from("partners")
      .select("id")
      .eq("level", "store")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error || !store) {
      // Fallback: try any active partner
      const { data: anyPartner } = await supabaseAdmin
        .from("partners")
        .select("id")
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (anyPartner) {
        return NextResponse.json({ store_id: anyPartner.id });
      }

      return NextResponse.json({ store_id: null });
    }

    return NextResponse.json({ store_id: store.id });
  } catch (err: any) {
    console.error("[API] /user/default-store error:", err.message);
    return NextResponse.json({ store_id: null });
  }
}
