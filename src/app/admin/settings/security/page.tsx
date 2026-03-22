"use client";

import { useState, useEffect } from "react";

interface SecuritySettings {
  id?: string;
  allow_admin_duplicate_login: boolean;
  allow_partner_duplicate_login: boolean;
  require_complex_password: boolean;
  allow_user_password_change: boolean;
}

const defaults: SecuritySettings = {
  allow_admin_duplicate_login: true,
  allow_partner_duplicate_login: true,
  require_complex_password: false,
  allow_user_password_change: true,
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-12 h-6 rounded-full relative transition-colors ${on ? "bg-blue-600" : "bg-neutral-700"}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${on ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function SecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings?type=security")
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
      const res = await fetch("/api/admin/settings?type=security", {
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

  const items = [
    { key: "allow_admin_duplicate_login" as const, label: "관리자 중복로그인 허용" },
    { key: "allow_partner_duplicate_login" as const, label: "파트너 중복로그인 허용" },
    { key: "require_complex_password" as const, label: "영어,특수,숫자포함 6자리 이상 필수사용" },
    { key: "allow_user_password_change" as const, label: "유저가 비밀번호 직접 변경 가능" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-green-400 font-bold text-sm mb-5">보안설정</div>
        <p className="text-white font-bold mb-4">*특수문자 허용 예시(!@#$%^&*)</p>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-white/10">
            {items.map((item) => (
              <div key={item.key} className="p-3 text-center text-xs text-white/70">{item.label}</div>
            ))}
          </div>
          <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10">
            {items.map((item) => (
              <div key={item.key} className="p-4 flex justify-center">
                <Toggle
                  on={settings[item.key]}
                  onChange={(v) => setSettings({ ...settings, [item.key]: v })}
                />
              </div>
            ))}
          </div>
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
