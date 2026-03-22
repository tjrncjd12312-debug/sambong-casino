import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("partners")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

const PCT_FIELDS = ["slot_rolling_pct", "casino_rolling_pct", "slot_losing_pct", "casino_losing_pct"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "phone", "slot_rolling_pct", "casino_rolling_pct",
      "slot_losing_pct", "casino_losing_pct", "nickname",
      "status", "bank_name", "bank_account", "bank_holder",
      "memo", "can_give_money", "can_take_money",
    ];

    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // 롤링/루징 변경 시 상부 파트너 값 초과 검증
    const hasPctUpdate = PCT_FIELDS.some((f) => updates[f] !== undefined);
    if (hasPctUpdate) {
      // 현재 파트너 조회
      const { data: current } = await supabaseAdmin
        .from("partners")
        .select("parent_id, level")
        .eq("id", id)
        .single();

      if (current && current.parent_id) {
        // 상부 파트너 조회
        const { data: parent } = await supabaseAdmin
          .from("partners")
          .select("slot_rolling_pct, casino_rolling_pct, slot_losing_pct, casino_losing_pct")
          .eq("id", current.parent_id)
          .single();

        if (parent) {
          for (const field of PCT_FIELDS) {
            if (updates[field] !== undefined) {
              const parentVal = Number(parent[field as keyof typeof parent]);
              const newVal = Number(updates[field]);
              if (newVal > parentVal) {
                const labels: Record<string, string> = {
                  slot_rolling_pct: "슬롯 롤링%",
                  casino_rolling_pct: "카지노 롤링%",
                  slot_losing_pct: "슬롯 루징%",
                  casino_losing_pct: "카지노 루징%",
                };
                return NextResponse.json(
                  { error: `${labels[field]}은(는) 상부(${parentVal}%)를 초과할 수 없습니다.` },
                  { status: 400 }
                );
              }
            }
          }
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from("partners")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
