"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Lock, User, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("서버에 연결할 수 없습니다.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "#0a0a0a" }}
    >
      {/* Background effects */}
      <div className="absolute inset-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{
            background:
              "radial-gradient(circle, rgba(74, 222, 128, 0.8) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-[1px] neon-shimmer-bar"
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px] neon-shimmer-bar"
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="rounded-2xl border border-green-900/20 p-8 neon-glow-box"
          style={{
            background:
              "linear-gradient(135deg, rgba(5,46,22,0.12) 0%, rgba(17,17,17,0.98) 100%)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center border border-green-500/20 mb-4 logo-anim"
              style={{
                background: "linear-gradient(135deg, #052e16, #14532d)",
              }}
            >
              <Sparkles size={32} className="text-green-400 neon-icon" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-wider text-green-400 neon-text">
                CC
              </h1>
              <p className="text-[10px] tracking-[0.3em] uppercase text-green-700/60 font-semibold mt-0.5">
                Casino Admin
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 flex items-center gap-2">
                <User size={14} className="text-green-500/70" />
                아이디
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="h-12 text-sm bg-neutral-900/80 border-green-900/20 text-white placeholder:text-neutral-600 rounded-xl focus:border-green-500/40 focus:ring-green-500/20"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 flex items-center gap-2">
                <Lock size={14} className="text-green-500/70" />
                비밀번호
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="h-12 text-sm bg-neutral-900/80 border-green-900/20 text-white placeholder:text-neutral-600 rounded-xl focus:border-green-500/40 focus:ring-green-500/20"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-black hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  로그인 중...
                </span>
              ) : (
                "로그인"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-[10px] text-white/30 mt-6">
            관리자 전용 페이지입니다. 무단 접근을 금지합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
