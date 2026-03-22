"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const LEVEL_LABELS: Record<string, string> = {
  head: "본사",
  sub_head: "부본사",
  distributor: "총판",
  store: "매장",
};

const ROLLING_OPTIONS = ["0%", "0.5%", "1%", "1.5%", "2%", "2.5%", "3%", "3.5%", "4%", "4.5%", "5%"];
const LOSING_OPTIONS = ["-", "0%", "5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"];
const BANKS = ["하나", "국민", "신한", "우리", "농협", "기업", "카카오뱅크", "토스뱅크", "SC제일", "대구", "부산", "경남", "광주", "전북", "제주", "수협", "씨티"];
const SETTLEMENT_OPTIONS = ["베/당", "롤링", "루징"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  parentId: string;
  level: string;
  maxSlotRolling?: number;
  maxCasinoRolling?: number;
  maxSlotLosing?: number;
  maxCasinoLosing?: number;
}

export default function CreatePartnerModal({ isOpen, onClose, onCreated, parentId, level, maxSlotRolling = 5, maxCasinoRolling = 2, maxSlotLosing = 50, maxCasinoLosing = 50 }: Props) {
  const [form, setForm] = useState({
    username: "",
    nickname: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    slotRollingPct: "0%",
    slotLosingPct: "-",
    casinoRollingPct: "0%",
    casinoLosingPct: "-",
    bankName: "하나",
    bankAccount: "0000",
    bankHolder: "0000",
    withdrawPassword: "",
    withdrawPasswordConfirm: "",
    settlementType: "베/당",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parsePct = (val: string): number => {
    if (val === "-") return 0;
    return parseFloat(val.replace("%", "")) || 0;
  };

  const handleSubmit = async () => {
    setError("");

    if (!form.username || form.username.length < 4 || form.username.length > 14) {
      setError("접속ID는 4~14자여야 합니다."); return;
    }
    if (/[^a-zA-Z0-9]/.test(form.username)) {
      setError("접속ID는 영문, 숫자만 가능합니다."); return;
    }
    if (!form.nickname) {
      setError("닉네임을 입력해주세요."); return;
    }
    if (!form.password) {
      setError("비밀번호를 입력해주세요."); return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다."); return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: parentId,
          username: form.username,
          nickname: form.nickname,
          password: form.password,
          level,
          phone: form.phone || null,
          slot_rolling_pct: parsePct(form.slotRollingPct),
          slot_losing_pct: parsePct(form.slotLosingPct),
          casino_rolling_pct: parsePct(form.casinoRollingPct),
          casino_losing_pct: parsePct(form.casinoLosingPct),
          bank_name: form.bankName,
          bank_account: form.bankAccount,
          bank_holder: form.bankHolder,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "생성 실패");
        return;
      }

      onCreated();
      onClose();
      setForm({
        username: "", nickname: "", password: "", passwordConfirm: "",
        phone: "", slotRollingPct: "0%", slotLosingPct: "-",
        casinoRollingPct: "0%", casinoLosingPct: "-",
        bankName: "하나", bankAccount: "0000", bankHolder: "0000",
        withdrawPassword: "", withdrawPasswordConfirm: "",
        settlementType: "베/당",
      });
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const levelLabel = LEVEL_LABELS[level] || "파트너";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[900px] max-h-[85vh] overflow-y-auto rounded-2xl border border-green-900/20 p-6 space-y-5" style={{ background: "rgba(20,20,20,0.98)" }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">{levelLabel} 추가하기</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {/* Row 1: 기본 정보 */}
        <div className="grid grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-white/60">접속ID (4-14자, 특수문자 불가) <span className="text-red-400">*</span></label>
            <Input
              placeholder="접속ID를 입력해 주세요."
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">닉네임 <span className="text-red-400">*</span></label>
            <Input
              placeholder="닉네임을 입력하세요"
              value={form.nickname}
              onChange={(e) => handleChange("nickname", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">비밀번호 <span className="text-red-400">*</span></label>
            <Input
              type="password"
              placeholder="비밀번호"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">비밀번호확인 <span className="text-red-400">*</span></label>
            <Input
              type="password"
              placeholder="비밀번호"
              value={form.passwordConfirm}
              onChange={(e) => handleChange("passwordConfirm", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">연락처</label>
            <Input
              placeholder="연락처를 입력하세요"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Row 2: 롤링/루징 수수료 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-white/60">롤링수수료율 (슬롯) <span className="text-white/30">최대치{maxSlotRolling}%</span></label>
            <select
              value={form.slotRollingPct}
              onChange={(e) => handleChange("slotRollingPct", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3"
            >
              {ROLLING_OPTIONS.filter(o => parsePct(o) <= maxSlotRolling).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">루징수수료율 (슬롯) <span className="text-white/30">최대치{maxSlotLosing}%</span></label>
            <select
              value={form.slotLosingPct}
              onChange={(e) => handleChange("slotLosingPct", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3"
            >
              {LOSING_OPTIONS.filter(o => o === "-" || parsePct(o) <= maxSlotLosing).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">롤링수수료율 (카지노) <span className="text-white/30">최대치{maxCasinoRolling}%</span></label>
            <select
              value={form.casinoRollingPct}
              onChange={(e) => handleChange("casinoRollingPct", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3"
            >
              {ROLLING_OPTIONS.filter(o => parsePct(o) <= maxCasinoRolling).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">루징수수료율 (카지노) <span className="text-white/30">최대치{maxCasinoLosing}%</span></label>
            <select
              value={form.casinoLosingPct}
              onChange={(e) => handleChange("casinoLosingPct", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3"
            >
              {LOSING_OPTIONS.filter(o => o === "-" || parsePct(o) <= maxCasinoLosing).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3: 은행/환전비밀번호 */}
        <div className="grid grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-white/60">은행</label>
            <select
              value={form.bankName}
              onChange={(e) => handleChange("bankName", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3"
            >
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">계좌번호</label>
            <Input
              value={form.bankAccount}
              onChange={(e) => handleChange("bankAccount", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">예금주</label>
            <Input
              value={form.bankHolder}
              onChange={(e) => handleChange("bankHolder", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">환전비밀번호 <span className="text-red-400">*</span></label>
            <Input
              type="password"
              placeholder="비밀번호(4자 이상)"
              value={form.withdrawPassword}
              onChange={(e) => handleChange("withdrawPassword", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">환전비밀번호확인 <span className="text-red-400">*</span></label>
            <Input
              type="password"
              placeholder="비밀번호(4자 이상)"
              value={form.withdrawPasswordConfirm}
              onChange={(e) => handleChange("withdrawPasswordConfirm", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Row 4: 정산방식 */}
        <div className="grid grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-white/60">정산방식</label>
            <select
              value={form.settlementType}
              onChange={(e) => handleChange("settlementType", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3"
            >
              {SETTLEMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-sm font-bold hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50"
          >
            {loading ? "생성 중..." : "✓ 추가하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
