import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Send a message via Telegram Bot API.
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch (err) {
    console.error("[Telegram] sendMessage error:", err);
    return false;
  }
}

type TelegramEventType =
  | "deposit_request"
  | "withdraw_request"
  | "new_member"
  | "inquiry";

const eventSettingMap: Record<TelegramEventType, string> = {
  deposit_request: "notify_deposit_request",
  withdraw_request: "notify_withdraw_request",
  new_member: "notify_new_member",
  inquiry: "notify_inquiry_received",
};

const eventLabelMap: Record<TelegramEventType, string> = {
  deposit_request: "충전 신청",
  withdraw_request: "환전 신청",
  new_member: "신규 회원가입",
  inquiry: "고객 문의",
};

/**
 * Send a notification for a specific event type.
 * Fetches all telegram_settings rows and sends to those with the event enabled.
 */
export async function sendTelegramNotification(
  eventType: TelegramEventType,
  details: string
): Promise<void> {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from("telegram_settings")
      .select("*");

    if (error || !settings || settings.length === 0) return;

    const settingKey = eventSettingMap[eventType];
    const label = eventLabelMap[eventType];

    const message = `<b>[${label}]</b>\n${details}`;

    for (const setting of settings) {
      if (!setting.bot_token || !setting.chat_id) continue;
      if (!setting[settingKey]) continue;

      await sendTelegramMessage(setting.bot_token, setting.chat_id, message);
    }
  } catch (err) {
    console.error("[Telegram] notification error:", err);
  }
}
