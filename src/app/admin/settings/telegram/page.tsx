"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface TelegramSetting {
  id?: string;
  bot_token: string;
  chat_id: string;
  notify_deposit_request: boolean;
  notify_withdraw_request: boolean;
  notify_inquiry_received: boolean;
  notify_new_member: boolean;
  notify_admin_login: boolean;
}

const defaultSetting: TelegramSetting = {
  bot_token: "",
  chat_id: "",
  notify_deposit_request: true,
  notify_withdraw_request: true,
  notify_inquiry_received: true,
  notify_new_member: true,
  notify_admin_login: false,
};

function TelegramCard({
  num,
  setting,
  onSave,
  onReset,
  onTest,
}: {
  num: number;
  setting: TelegramSetting;
  onSave: (s: TelegramSetting) => void;
  onReset: () => void;
  onTest: (botToken: string, chatId: string) => void;
}) {
  const [form, setForm] = useState<TelegramSetting>(setting);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setForm(setting);
  }, [setting]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const handleTest = async () => {
    if (!form.bot_token || !form.chat_id) {
      setTestResult("봇 토큰과 채팅 ID를 입력해주세요.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, bot_token: form.bot_token, chat_id: form.chat_id }),
      });
      const data = await res.json();
      setTestResult(data.success ? "성공" : data.error || "실패");
    } catch {
      setTestResult("전송 실패");
    }
    setTesting(false);
  };

  const checks = [
    { key: "notify_deposit_request" as const, label: "충전신청" },
    { key: "notify_withdraw_request" as const, label: "환전신청" },
    { key: "notify_inquiry_received" as const, label: "문의" },
    { key: "notify_new_member" as const, label: "가입신청" },
    { key: "notify_admin_login" as const, label: "관리자로그인" },
  ];

  return (
    <div className="rounded-2xl border border-green-900/15 p-6" style={{ background: "rgba(17,17,17,0.9)" }}>
      <div className="text-white font-bold text-lg mb-4">텔레그램 {num}</div>
      <div className="flex flex-wrap gap-4 mb-4">
        {checks.map((item) => (
          <label key={item.key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form[item.key]}
              onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
              className="w-5 h-5 rounded border-white/20 bg-neutral-900 text-blue-600 focus:ring-0"
            />
            <span className="text-sm text-white/80">{item.label}</span>
          </label>
        ))}
      </div>
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60 w-20">봇 토큰</span>
          <Input
            value={form.bot_token}
            onChange={(e) => setForm({ ...form, bot_token: e.target.value })}
            placeholder="Telegram Bot Token"
            className="flex-1 max-w-md h-9 text-sm bg-neutral-800 border-white/10 text-white rounded-lg"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60 w-20">채팅 ID</span>
          <Input
            value={form.chat_id}
            onChange={(e) => setForm({ ...form, chat_id: e.target.value })}
            placeholder="Chat ID"
            className="flex-1 max-w-md h-9 text-sm bg-neutral-800 border-white/10 text-white rounded-lg"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-cyan-500 text-white text-xs font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "적용"}
        </button>
        <button
          onClick={onReset}
          className="px-5 py-2 bg-cyan-600 text-white text-xs font-bold rounded-lg hover:bg-cyan-500"
        >
          초기화
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-5 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-500 disabled:opacity-50"
        >
          {testing ? "전송 중..." : "테스트"}
        </button>
        {testResult && (
          <span className={`text-sm ${testResult === "성공" ? "text-green-400" : "text-red-400"}`}>
            {testResult}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TelegramPage() {
  const [loginAuth, setLoginAuth] = useState(false);
  const [settings, setSettings] = useState<TelegramSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings?type=telegram");
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        setSettings(json.data);
      } else {
        // Initialize with two empty settings
        setSettings([{ ...defaultSetting }, { ...defaultSetting }]);
      }
    } catch {
      setSettings([{ ...defaultSetting }, { ...defaultSetting }]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (index: number, setting: TelegramSetting) => {
    try {
      const res = await fetch("/api/admin/settings?type=telegram", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setting),
      });
      const json = await res.json();
      if (json.data) {
        const newSettings = [...settings];
        newSettings[index] = json.data;
        setSettings(newSettings);
      }
    } catch (err) {
      alert("저장에 실패했습니다.");
    }
  };

  const handleReset = (index: number) => {
    const newSettings = [...settings];
    newSettings[index] = { ...defaultSetting, id: settings[index]?.id };
    setSettings(newSettings);
  };

  const handleTest = async (botToken: string, chatId: string) => {
    // handled inside TelegramCard
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-white/50">로딩 중...</span>
      </div>
    );
  }

  // Ensure we always show at least 2 cards
  while (settings.length < 2) {
    settings.push({ ...defaultSetting });
  }

  return (
    <div className="space-y-5">
      {/* Auth Code Section */}
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-red-400 font-bold text-sm mb-3">텔레그램 인증코드</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLoginAuth(!loginAuth)}
            className={`w-12 h-6 rounded-full relative transition-colors ${loginAuth ? "bg-blue-600" : "bg-neutral-700"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${loginAuth ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
          <span className="text-sm text-white/60">로그인 사용여부(On 으로 선택시 텔인증 필요합니다.)</span>
        </div>
      </div>

      {/* Telegram Cards */}
      {settings.map((setting, i) => (
        <TelegramCard
          key={setting.id || i}
          num={i + 1}
          setting={setting}
          onSave={(s) => handleSave(i, s)}
          onReset={() => handleReset(i)}
          onTest={handleTest}
        />
      ))}
    </div>
  );
}
