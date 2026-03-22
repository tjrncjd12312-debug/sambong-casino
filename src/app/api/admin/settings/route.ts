import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

const validTypes = [
  "telegram",
  "security",
  "exchange-limit",
  "domain",
  "blocked-ip",
  "one-line-notice",
  "login-log",
];

const tableMap: Record<string, string> = {
  telegram: "telegram_settings",
  security: "security_settings",
  "exchange-limit": "exchange_limit_settings",
  domain: "domains",
  "blocked-ip": "blocked_ips",
  "one-line-notice": "one_line_notices",
  "login-log": "login_logs",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: "유효하지 않은 설정 타입입니다." },
        { status: 400 }
      );
    }

    const table = tableMap[type];

    // For login-log, support search/pagination
    if (type === "login-log") {
      const search = searchParams.get("search") || "";
      const startDate = searchParams.get("start_date") || "";
      const endDate = searchParams.get("end_date") || "";
      const limit = parseInt(searchParams.get("limit") || "100", 10);

      let query = supabaseAdmin
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (search) {
        query = query.or(`username.ilike.%${search}%,ip_address.ilike.%${search}%`);
      }
      if (startDate) {
        query = query.gte("created_at", startDate + "T00:00:00");
      }
      if (endDate) {
        query = query.lte("created_at", endDate + "T23:59:59");
      }

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [] });
    }

    // For single-row settings tables (telegram, security, exchange-limit)
    if (type === "telegram") {
      const { data, error } = await supabaseAdmin.from(table).select("*").order("id");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [] });
    }

    if (type === "security" || type === "exchange-limit") {
      const { data, error } = await supabaseAdmin.from(table).select("*").limit(1).single();
      if (error && error.code !== "PGRST116") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data: data ?? null });
    }

    // For list-type tables (domain, blocked-ip, one-line-notice)
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: "유효하지 않은 설정 타입입니다." },
        { status: 400 }
      );
    }

    const table = tableMap[type];
    const body = await request.json();

    // Single-row update (security, exchange-limit)
    if (type === "security" || type === "exchange-limit") {
      const { id, ...updateData } = body;

      if (id) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .update(updateData)
          .eq("id", id)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data });
      } else {
        // Upsert: try to get existing, then update or insert
        const { data: existing } = await supabaseAdmin.from(table).select("id").limit(1).single();
        if (existing) {
          const { data, error } = await supabaseAdmin
            .from(table)
            .update(updateData)
            .eq("id", existing.id)
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          return NextResponse.json({ data });
        } else {
          const { data, error } = await supabaseAdmin
            .from(table)
            .insert(updateData)
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          return NextResponse.json({ data });
        }
      }
    }

    // Telegram settings: update by id
    if (type === "telegram") {
      const { id, ...updateData } = body;
      if (!id) {
        // Insert new
        const { data, error } = await supabaseAdmin
          .from(table)
          .insert(updateData)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data });
      }
      const { data, error } = await supabaseAdmin
        .from(table)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    // Domain: update by id
    if (type === "domain") {
      const { id, ...updateData } = body;
      if (!id) {
        const { data, error } = await supabaseAdmin.from(table).insert(updateData).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data });
      }
      const { data, error } = await supabaseAdmin
        .from(table)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    // Blocked IP: add new
    if (type === "blocked-ip") {
      const { data, error } = await supabaseAdmin.from(table).insert(body).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    // One-line notice: update by id or insert
    if (type === "one-line-notice") {
      const { id, ...updateData } = body;
      if (id) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .update(updateData)
          .eq("id", id)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data });
      } else {
        const { data, error } = await supabaseAdmin.from(table).insert(updateData).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data });
      }
    }

    return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}

// DELETE: For removing items (domains, blocked IPs, etc.)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "type과 id가 필요합니다." }, { status: 400 });
    }

    const table = tableMap[type];
    if (!table) {
      return NextResponse.json({ error: "유효하지 않은 타입입니다." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}
