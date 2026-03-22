"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface ExchangeLimitSettings {
  id?: string;
  deposit_start_time: string;
  deposit_end_time: string;
  deposit_interval_minutes: number;
  withdraw_start_time: string;
  withdraw_end_time: string;
  withdraw_interval_minutes: number;
}

const defaults: ExchangeLimitSettings = {
  deposit_start_time: "00:00",
  deposit_end_time: "23:59",
  deposit_interval_minutes: 1,
  withdraw_start_time: "00:00",
  withdraw_end_time: "23:59",
  withdraw_interval_minutes: 1,
};

export default function ExchangeLimitPage() {
  const [settings, setSettings] = useState<ExchangeLimitSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings?type=exchange-limit")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setSettings({ ...defaults, ...json.data });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings?type=exchange-limit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.data) {
        setSettings({ ...defaults, ...json.data });
        alert("저장되었습니다.");
      } else {
        alert(json.error || "저장에 실패했습니다.");
      }
    } catch {
      alert("저장에 실패했습니다.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-white/50">로딩 중...</span>
      </div>
    );
  }

  const fields = [
    { label: "충전 시간", key: "deposit_start_time" as const, suffix: "" },
    { label: "충전 마감", key: "deposit_end_time" as const, suffix: "" },
    { label: "충전텀", key: "deposit_interval_minutes" as const, suffix: "분 후 가능", isNumber: true },
    { label: "환전 시간", key: "withdraw_start_time" as const, suffix: "" },
    { label: "환전 마감", key: "withdraw_end_time" as const, suffix: "" },
    { label: "환전텀", key: "withdraw_interval_minutes" as const, suffix: "분 후 가능", isNumber: true },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-xs text-white/60 space-y-1 mb-5">
          <p>※ 중복신청을 불가합니다.</p>
          <p>※ 입력시간 형식은 00:00 입니다.(해당 시간:분 이 저장됩니다.)</p>
        </div>
        <div className="space-y-4 max-w-xl">
          {fields.map((item) => (
            <div key={item.label} className="flex items-center gap-4 border-b border-white/5 pb-4">
              <span className="text-sm text-white/70 w-32">{item.label}</span>
              <Input
                value={String(settings[item.key])}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    [item.key]: item.isNumber ? Number(e.target.value) || 0 : e.target.value,
                  })
                }
                className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
              />
              {item.suffix && <span className="text-sm text-white/60">{item.suffix}</span>}
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? "저장 중..." : "적용하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
