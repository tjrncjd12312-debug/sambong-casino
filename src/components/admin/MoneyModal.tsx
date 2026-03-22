"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  mode: "give" | "take";
  targetType: "member" | "partner";
  targetId: string;
  targetName: string;
  currentBalance: number;
}

export default function MoneyModal({
  isOpen,
  onClose,
  onComplete,
  mode,
  targetType,
  targetId,
  targetName,
  currentBalance,
}: MoneyModalProps) {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setMemo("");
      setError("");
      setSuccess("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isGive = mode === "give";
  const title = isGive ? "알지급" : "알회수";
  const targetLabel = targetType === "member" ? "회원" : "파트너";

  const formatAmount = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    if (!num) return "";
    return Number(num).toLocaleString();
  };

  const rawAmount = Number(amount.replace(/[^0-9]/g, ""));

  const handleSubmit = async () => {
    if (!rawAmount || rawAmount <= 0) {
      setError("금액을 입력해주세요.");
      return;
    }

    if (!isGive && rawAmount > currentBalance) {
      setError(`잔액이 부족합니다. 현재 잔액: ${currentBalance.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const endpoint = isGive ? "/api/money/give" : "/api/money/take";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          amount: rawAmount,
          memo,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "처리에 실패했습니다.");
        return;
      }

      setSuccess(
        `${title} 완료! ${json.data.target_name}님에게 ${rawAmount.toLocaleString()}원 ${
          isGive ? "지급" : "회수"
        } (잔액: ${json.data.balance_after.toLocaleString()})`
      );

      setTimeout(() => {
        onComplete();
        onClose();
      }, 1200);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [10000, 50000, 100000, 500000, 1000000, 5000000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-green-900/20 shadow-2xl"
        style={{ background: "rgba(20,20,20,0.97)" }}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isGive ? "border-green-900/20" : "border-red-900/20"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                isGive
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isGive ? "+" : "-"}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{title}</h3>
              <p className="text-white/40 text-xs">
                {targetLabel}에게 머니 {isGive ? "지급" : "회수"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} className="text-white/50" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Target Info */}
          <div
            className="rounded-xl border border-white/5 p-4 space-y-2"
            style={{ background: "rgba(30,30,30,0.6)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">대상</span>
              <span className="text-sm text-white font-medium">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 ${
                    targetType === "member"
                      ? "bg-blue-600 text-white"
                      : "bg-orange-600 text-white"
                  }`}
                >
                  {targetLabel}
                </span>
                {targetName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">현재 잔액</span>
              <span className="text-sm text-green-400 font-bold font-mono">
                {currentBalance.toLocaleString()}
              </span>
            </div>
            {rawAmount > 0 && (
              <div className="flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-xs text-white/40">
                  {isGive ? "지급 후" : "회수 후"} 잔액
                </span>
                <span
                  className={`text-sm font-bold font-mono ${
                    isGive ? "text-blue-400" : "text-red-400"
                  }`}
                >
                  {isGive
                    ? (currentBalance + rawAmount).toLocaleString()
                    : (currentBalance - rawAmount).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-xs text-white/50 font-medium">금액</label>
            <Input
              ref={inputRef}
              value={amount}
              onChange={(e) => setAmount(formatAmount(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="금액을 입력하세요"
              className="h-12 text-lg bg-neutral-900 border-white/10 text-white rounded-xl text-right font-mono placeholder:text-white/20"
            />
            {/* Quick amount buttons */}
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((qa) => (
                <button
                  key={qa}
                  onClick={() => {
                    const current = rawAmount || 0;
                    setAmount((current + qa).toLocaleString());
                  }}
                  className="py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-colors"
                >
                  +{qa.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAmount("")}
                className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 text-xs transition-colors"
              >
                초기화
              </button>
              {!isGive && currentBalance > 0 && (
                <button
                  onClick={() => setAmount(currentBalance.toLocaleString())}
                  className="flex-1 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold transition-colors border border-red-600/20"
                >
                  전액회수 ({currentBalance.toLocaleString()})
                </button>
              )}
            </div>
          </div>

          {/* Memo Input */}
          <div className="space-y-2">
            <label className="text-xs text-white/50 font-medium">메모</label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모 (선택)"
              className="h-10 text-sm bg-neutral-900 border-white/10 text-white rounded-xl placeholder:text-white/20"
            />
          </div>

          {/* Error / Success */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            disabled={loading || !!success}
            onClick={handleSubmit}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 ${
              isGive
                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/20"
                : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 shadow-lg shadow-red-500/20"
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" size={18} />
            ) : (
              `${rawAmount > 0 ? rawAmount.toLocaleString() + "원 " : ""}${title} 실행`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
