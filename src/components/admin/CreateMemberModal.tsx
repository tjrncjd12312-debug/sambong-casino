"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const BANKS = ["하나", "국민", "신한", "우리", "농협", "기업", "카카오뱅크", "토스뱅크", "SC제일", "대구", "부산", "경남", "광주", "전북", "제주", "수협", "씨티"];
const NUM_OPTIONS = ["-", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "20", "30", "40", "50", "100"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  storeId: string;
  storeName: string;
  maxSlotRolling?: number;
  maxCasinoRolling?: number;
  maxSlotLosing?: number;
  maxCasinoLosing?: number;
}

const ROLLING_OPTIONS = ["0%", "0.5%", "1%", "1.5%", "2%", "2.5%", "3%", "3.5%", "4%", "4.5%", "5%"];
const LOSING_OPTIONS = ["-", "0%", "5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%"];

const parsePct = (val: string): number => {
  if (val === "-") return 0;
  return parseFloat(val.replace("%", "")) || 0;
};

export default function CreateMemberModal({ isOpen, onClose, onCreated, storeId, storeName, maxSlotRolling = 5, maxCasinoRolling = 2, maxSlotLosing = 50, maxCasinoLosing = 50 }: Props) {
  const [form, setForm] = useState({
    username: "",
    startNum: "-",
    endNum: "-",
    password: "",
    passwordConfirm: "",
    nickname: "",
    withdrawPassword: "",
    withdrawPasswordConfirm: "",
    slotRollingPct: "0%",
    slotLosingPct: "-",
    casinoRollingPct: "0%",
    casinoLosingPct: "-",
    bankName: "하나",
    bankAccount: "0000",
    bankHolder: "",
    casinoAccess: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successCount, setSuccessCount] = useState(0);

  if (!isOpen) return null;

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError("");
    setSuccessCount(0);

    if (!form.username || form.username.length < 4) {
      setError("접속ID는 영문소문자, 숫자 4자 이상이어야 합니다."); return;
    }
    if (/[^a-zA-Z0-9]/.test(form.username)) {
      setError("접속ID는 영문, 숫자만 가능합니다."); return;
    }
    if (!form.password) {
      setError("비밀번호를 입력해주세요."); return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다."); return;
    }
    if (!form.nickname) {
      setError("닉네임을 입력해주세요."); return;
    }
    if (form.withdrawPassword && form.withdrawPassword.length < 4) {
      setError("환전비밀번호는 4자 이상이어야 합니다."); return;
    }
    if (form.withdrawPassword !== form.withdrawPasswordConfirm) {
      setError("환전비밀번호가 일치하지 않습니다."); return;
    }

    setLoading(true);

    // 대량 생성 여부 확인
    const isBulk = form.startNum !== "-" && form.endNum !== "-";
    const start = parseInt(form.startNum) || 0;
    const end = parseInt(form.endNum) || 0;

    if (isBulk && end < start) {
      setError("끝 번호는 시작번호보다 크거나 같아야 합니다.");
      setLoading(false);
      return;
    }

    const usernames = isBulk
      ? Array.from({ length: end - start + 1 }, (_, i) => `${form.username}${String(start + i).padStart(2, "0")}`)
      : [form.username];

    let created = 0;
    let lastError = "";

    for (const uname of usernames) {
      try {
        const res = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_id: storeId,
            username: uname,
            nickname: isBulk ? uname : form.nickname,
            password: form.password,
            bank_name: form.bankName,
            bank_account: form.bankAccount || null,
            bank_holder: form.bankHolder || null,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          created++;
        } else {
          lastError = data.error || "생성 실패";
        }
      } catch {
        lastError = "서버 오류";
      }
    }

    setLoading(false);

    if (created > 0) {
      setSuccessCount(created);
      onCreated();
      if (created === usernames.length) {
        onClose();
        setForm({
          username: "", startNum: "-", endNum: "-", password: "", passwordConfirm: "",
          nickname: "", withdrawPassword: "", withdrawPasswordConfirm: "",
          slotRollingPct: "0%", slotLosingPct: "-", casinoRollingPct: "0%", casinoLosingPct: "-",
          bankName: "하나", bankAccount: "0000", bankHolder: "", casinoAccess: true,
        });
      } else {
        setError(`${created}개 생성 성공, ${usernames.length - created}개 실패: ${lastError}`);
      }
    } else {
      setError(lastError || "생성 실패");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[900px] max-h-[85vh] overflow-y-auto rounded-2xl border border-green-900/20 p-6 space-y-5" style={{ background: "rgba(20,20,20,0.98)" }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">회원 추가</h2>
            <p className="text-xs text-white/40 mt-1">소속 매장: {storeName}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {/* Row 1: 접속ID + 시작번호 + 끝번호 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-white/60">접속 ID (영문소문자, 숫자 4자 이상) <span className="text-red-400">*</span></label>
            <Input placeholder="접속ID를 입력해 주세요." value={form.username} onChange={(e) => handleChange("username", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">시작번호</label>
            <select value={form.startNum} onChange={(e) => handleChange("startNum", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3">
              {NUM_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">끝 번호</label>
            <select value={form.endNum} onChange={(e) => handleChange("endNum", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3">
              {NUM_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: 비밀번호 + 닉네임 + 환전비밀번호 */}
        <div className="grid grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-white/60">비밀번호 <span className="text-red-400">*</span></label>
            <Input type="password" placeholder="비밀번호" value={form.password} onChange={(e) => handleChange("password", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">비밀번호확인 <span className="text-red-400">*</span></label>
            <Input type="password" placeholder="비밀번호" value={form.passwordConfirm} onChange={(e) => handleChange("passwordConfirm", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">닉네임 <span className="text-red-400">*</span></label>
            <Input placeholder="닉네임" value={form.nickname} onChange={(e) => handleChange("nickname", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">환전비밀번호 <span className="text-red-400">*</span></label>
            <Input type="password" placeholder="비밀번호(4자 이상)" value={form.withdrawPassword} onChange={(e) => handleChange("withdrawPassword", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">환전비밀번호확인 <span className="text-red-400">*</span></label>
            <Input type="password" placeholder="비밀번호(4자 이상)" value={form.withdrawPasswordConfirm} onChange={(e) => handleChange("withdrawPasswordConfirm", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          </div>
        </div>

        {/* Row 3: 롤링/루징 수수료 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-white/60">롤링수수료율 (슬롯) <span className="text-white/30">최대치{maxSlotRolling}%</span></label>
            <select value={form.slotRollingPct} onChange={(e) => handleChange("slotRollingPct", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3">
              {ROLLING_OPTIONS.filter(o => parsePct(o) <= maxSlotRolling).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">루징수수료율 (슬롯) <span className="text-white/30">최대치{maxSlotLosing}%</span></label>
            <select value={form.slotLosingPct} onChange={(e) => handleChange("slotLosingPct", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3">
              {LOSING_OPTIONS.filter(o => o === "-" || parsePct(o) <= maxSlotLosing).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">롤링수수료율 (카지노) <span className="text-white/30">최대치{maxCasinoRolling}%</span></label>
            <select value={form.casinoRollingPct} onChange={(e) => handleChange("casinoRollingPct", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3">
              {ROLLING_OPTIONS.filter(o => parsePct(o) <= maxCasinoRolling).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">루징수수료율 (카지노) <span className="text-white/30">최대치{maxCasinoLosing}%</span></label>
            <select value={form.casinoLosingPct} onChange={(e) => handleChange("casinoLosingPct", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3">
              {LOSING_OPTIONS.filter(o => o === "-" || parsePct(o) <= maxCasinoLosing).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Row 4: 은행 정보 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-white/60">은행</label>
            <select value={form.bankName} onChange={(e) => handleChange("bankName", e.target.value)}
              className="w-full h-10 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3">
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">계좌번호</label>
            <Input value={form.bankAccount} onChange={(e) => handleChange("bankAccount", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">예금주</label>
            <Input placeholder="예금주" value={form.bankHolder} onChange={(e) => handleChange("bankHolder", e.target.value)}
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          </div>
        </div>

        {/* Row 5: 카지노 접근 허용 */}
        <div className="rounded-xl border border-white/10 p-4 flex items-center justify-between" style={{ background: "rgba(30,30,30,0.6)" }}>
          <span className="text-sm text-white font-medium">카지노 접근 허용</span>
          <button
            onClick={() => handleChange("casinoAccess", !form.casinoAccess)}
            className={`w-12 h-6 rounded-full relative transition-colors ${form.casinoAccess ? "bg-blue-600" : "bg-neutral-700"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${form.casinoAccess ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-sm font-bold hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50">
            {loading ? "생성 중..." : "✓ 추가하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
