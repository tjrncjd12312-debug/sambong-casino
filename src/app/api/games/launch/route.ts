import { NextRequest, NextResponse } from "next/server";
import { honorlink } from "@/lib/honorlink";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { member_id, game_id, vendor } = body;

    if (!member_id || !game_id || !vendor) {
      return NextResponse.json(
        { error: "member_id, game_id, vendor 모두 필요합니다." },
        { status: 400 }
      );
    }

    // 1. Look up the member from our DB
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, username, nickname, balance")
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "회원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2. Transfer member's balance to HonorLink (if they have balance)
    if (member.balance > 0) {
      try {
        await honorlink.addBalance(member.username, Math.floor(member.balance));

        // Deduct from our system balance
        await supabaseAdmin
          .from("members")
          .update({ balance: 0 })
          .eq("id", member_id);
      } catch (balErr: any) {
        console.error("[GameLaunch] Balance transfer error:", balErr.message);
        // Continue anyway - the game may still launch
      }
    }

    // 3. Get game launch link from HonorLink
    const result = await honorlink.getGameLaunchLink(
      member.username,
      game_id,
      vendor,
      member.nickname
    );

    // Extract URL from response
    let launchUrl = "";
    if (typeof result.data === "string") {
      launchUrl = result.data;
    } else if (result.data?.url) {
      launchUrl = result.data.url;
    } else if ((result.data as any)?.launch_url) {
      launchUrl = (result.data as any).launch_url;
    } else if ((result.data as any)?.game_url) {
      launchUrl = (result.data as any).game_url;
    }

    if (!launchUrl) {
      return NextResponse.json(
        { error: "게임 실행 URL을 가져올 수 없습니다.", raw: result.data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: launchUrl,
      member_id,
      username: member.username,
      balance_transferred: member.balance,
    });
  } catch (err: any) {
    console.error("[API] /games/launch error:", err.message);
    return NextResponse.json(
      { error: err.message || "게임 실행에 실패했습니다." },
      { status: 500 }
    );
  }
}
