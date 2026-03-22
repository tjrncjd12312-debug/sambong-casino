import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendTelegramMessage, sendTelegramNotification } from "@/lib/telegram";

// POST: Send a telegram notification (for testing or manual trigger)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, message, test } = body;

    // Test mode: send a test message using stored settings
    if (test) {
      const { bot_token, chat_id } = body;
      if (!bot_token || !chat_id) {
        return NextResponse.json(
          { error: "bot_token과 chat_id가 필요합니다." },
          { status: 400 }
        );
      }

      const testMessage = "테스트 메시지입니다. 텔레그램 알림이 정상적으로 연결되었습니다.";
      const success = await sendTelegramMessage(bot_token, chat_id, testMessage);

      if (success) {
        return NextResponse.json({ success: true, message: "테스트 메시지가 전송되었습니다." });
      } else {
        return NextResponse.json(
          { error: "메시지 전송에 실패했습니다. 봇 토큰과 채팅 ID를 확인해주세요." },
          { status: 400 }
        );
      }
    }

    // Event notification mode
    if (event_type && message) {
      await sendTelegramNotification(event_type, message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "event_type과 message, 또는 test 파라미터가 필요합니다." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
