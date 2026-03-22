import { NextRequest, NextResponse } from "next/server";
import { honorlink } from "@/lib/honorlink";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { member_id, action, amount } = body;

    if (!member_id || !action) {
      return NextResponse.json(
        { error: "member_id, action이 필요합니다." },
        { status: 400 }
      );
    }

    if ((action === "deposit" || action === "withdraw") && (!amount || amount <= 0)) {
      return NextResponse.json(
        { error: "금액은 0보다 커야 합니다." },
        { status: 400 }
      );
    }

    // Look up member
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

    let result: any;
    let newLocalBalance = member.balance;

    switch (action) {
      case "deposit": {
        // Transfer money from our system to HonorLink
        if (member.balance < amount) {
          return NextResponse.json(
            { error: "회원 잔액이 부족합니다." },
            { status: 400 }
          );
        }
        result = await honorlink.addBalance(member.username, Math.floor(amount));
        newLocalBalance = member.balance - amount;

        // Update local balance
        await supabaseAdmin
          .from("members")
          .update({ balance: newLocalBalance })
          .eq("id", member_id);
        break;
      }

      case "withdraw": {
        // Take specific amount from HonorLink back to our system
        result = await honorlink.subBalance(member.username, Math.floor(amount));
        newLocalBalance = member.balance + amount;

        // Update local balance
        await supabaseAdmin
          .from("members")
          .update({ balance: newLocalBalance })
          .eq("id", member_id);
        break;
      }

      case "withdraw_all": {
        // Take all money from HonorLink back to our system
        result = await honorlink.subBalanceAll(member.username);

        // Extract the amount that was withdrawn
        const withdrawnAmount =
          result.data?.amount || result.data?.balance || 0;
        newLocalBalance = member.balance + withdrawnAmount;

        // Update local balance
        if (withdrawnAmount > 0) {
          await supabaseAdmin
            .from("members")
            .update({ balance: newLocalBalance })
            .eq("id", member_id);
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: "유효하지 않은 action입니다. (deposit, withdraw, withdraw_all)" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      member_id,
      username: member.username,
      local_balance: newLocalBalance,
      honorlink_result: result.data,
    });
  } catch (err: any) {
    console.error("[API] /games/balance error:", err.message);
    return NextResponse.json(
      { error: err.message || "잔액 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
