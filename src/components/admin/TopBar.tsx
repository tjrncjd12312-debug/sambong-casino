"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, Bell, Moon, Wallet, RefreshCw, MessageSquare, Users, Trophy, Zap, X, Volume2 } from "lucide-react";

interface Notification {
  id: string;
  type: "deposit" | "withdraw" | "member";
  message: string;
  href: string;
  time: string;
}

export default function TopBar({ username, level }: { username?: string; level?: string }) {
  const [counts, setCounts] = useState({
    pendingDeposits: 0,
    pendingWithdraws: 0,
    pendingMembers: 0,
    pendingInquiries: 0,
  });
  const prevCountsRef = useRef({ pendingDeposits: 0, pendingWithdraws: 0, pendingMembers: 0, pendingInquiries: 0 });
  const isFirstLoad = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [alarmActive, setAlarmActive] = useState(false);

  // AudioContext 초기화
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    document.addEventListener("click", initAudio, { once: true });
    return () => document.removeEventListener("click", initAudio);
  }, []);

  // 알림음 1회 재생
  const playBeep = useCallback(() => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 880;
      osc1.type = "sine";
      gain1.gain.setValueAtTime(0.5, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1320;
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.5, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc2.start(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.4);
    } catch {}
  }, []);

  // 반복 알림 시작
  const startAlarm = useCallback(() => {
    if (alarmIntervalRef.current) return; // 이미 울리고 있으면 중복 방지
    setAlarmActive(true);
    playBeep(); // 즉시 1회
    alarmIntervalRef.current = setInterval(() => {
      playBeep();
    }, 3000); // 3초마다 반복
  }, [playBeep]);

  // 알림 중지
  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    setAlarmActive(false);
  }, []);

  // 팝업 클릭 → 알림 닫기 + 알람 중지 + 페이지 이동
  const dismissNotification = useCallback((id: string, href?: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // 남은 알림이 없으면 알람 중지
    setNotifications((prev) => {
      if (prev.length === 0) stopAlarm();
      return prev;
    });
    if (href) window.location.href = href;
  }, [stopAlarm]);

  // 전체 알림 닫기
  const dismissAll = useCallback(() => {
    setNotifications([]);
    stopAlarm();
  }, [stopAlarm]);

  // cleanup
  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/dashboard/counts");
        const json = await res.json();
        if (!res.ok) return;

        const newCounts = {
          pendingDeposits: json.pendingDeposits ?? 0,
          pendingWithdraws: json.pendingWithdraws ?? 0,
          pendingMembers: json.pendingMembers ?? 0,
          pendingInquiries: json.pendingInquiries ?? 0,
        };

        if (!isFirstLoad.current) {
          const prev = prevCountsRef.current;
          const now = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const newNotifs: Notification[] = [];

          // 새 충전 신청
          if (newCounts.pendingDeposits > prev.pendingDeposits) {
            const diff = newCounts.pendingDeposits - prev.pendingDeposits;
            newNotifs.push({
              id: `deposit-${Date.now()}`,
              type: "deposit",
              message: `새로운 충전 신청 ${diff}건이 접수되었습니다.`,
              href: "/admin/exchange/deposit-request",
              time: now,
            });
          }

          // 새 환전 신청
          if (newCounts.pendingWithdraws > prev.pendingWithdraws) {
            const diff = newCounts.pendingWithdraws - prev.pendingWithdraws;
            newNotifs.push({
              id: `withdraw-${Date.now()}`,
              type: "withdraw",
              message: `새로운 환전 신청 ${diff}건이 접수되었습니다.`,
              href: "/admin/exchange/withdraw-request",
              time: now,
            });
          }

          // 새 회원 승인대기
          if (newCounts.pendingMembers > prev.pendingMembers) {
            const diff = newCounts.pendingMembers - prev.pendingMembers;
            newNotifs.push({
              id: `member-${Date.now()}`,
              type: "member",
              message: `새로운 회원 가입 ${diff}건이 접수되었습니다.`,
              href: "/admin/members/approval",
              time: now,
            });
          }

          if (newNotifs.length > 0) {
            setNotifications((prev) => [...newNotifs, ...prev].slice(0, 10)); // 최대 10개
            startAlarm();
          }
        }

        // pending이 0이 되면 자동으로 알람 중지
        if (newCounts.pendingDeposits === 0 && newCounts.pendingWithdraws === 0) {
          stopAlarm();
        }

        isFirstLoad.current = false;
        prevCountsRef.current = newCounts;
        setCounts(newCounts);
      } catch {}
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 3000);
    return () => clearInterval(interval);
  }, [startAlarm, stopAlarm]);

  return (
    <>
      <header className="border-b border-green-900/20 px-5 py-3" style={{ background: "#111111" }}>
        {/* Top Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 transition-all duration-300 shadow-lg shadow-green-500/20">
              전체머니변동내역
            </button>
            <div className="flex items-center gap-1">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                <Input
                  placeholder="통합검색"
                  className="w-48 h-9 text-xs bg-neutral-900/80 border-green-900/20 text-white placeholder:text-neutral-600 pl-9 rounded-xl focus:border-green-500/30 focus:ring-green-500/20"
                />
              </div>
              <button className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all duration-300 h-9">
                검색
              </button>
            </div>
            <button className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 border border-green-900/20 hover:border-green-500/30 hover:text-green-400 bg-neutral-900/50 transition-all duration-300">
              관리자머니 변동내역
            </button>
            <button className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 transition-all duration-300 shadow-lg shadow-green-500/20">
              전체머니변동내역
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* 알람 활성 표시 */}
            {alarmActive && (
              <button
                onClick={dismissAll}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold animate-pulse"
              >
                <Volume2 size={14} />
                알림 끄기
              </button>
            )}
            <button className="w-9 h-9 rounded-xl bg-neutral-900/80 border border-green-900/20 flex items-center justify-center hover:border-green-500/30 transition-all duration-300 relative">
              <Bell size={16} className="text-white/50" />
              {notifications.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-bounce">
                  {notifications.length}
                </div>
              )}
            </button>
            <button className="w-9 h-9 rounded-xl bg-neutral-900/80 border border-green-900/20 flex items-center justify-center hover:border-green-500/30 transition-all duration-300">
              <Moon size={16} className="text-white/50" />
            </button>
          </div>
        </div>

        {/* Status Badges Row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <StatusBadge icon={Wallet} label="보유머니" value="0" color="green" />
          <StatusBadge icon={Users} label="승인대기" value={`${counts.pendingMembers} 건`} color="neutral" />
          <StatusBadge icon={Zap} label="충전신청" value={`${counts.pendingDeposits} 건`} color={counts.pendingDeposits > 0 ? "orange-pulse" : "orange"} href="/admin/exchange/deposit-request" />
          <StatusBadge icon={RefreshCw} label="환전신청" value={`${counts.pendingWithdraws} 건`} color={counts.pendingWithdraws > 0 ? "purple-pulse" : "purple"} href="/admin/exchange/withdraw-request" />
          <StatusBadge icon={MessageSquare} label="1:1 문의" value={`${counts.pendingInquiries} 건`} color={counts.pendingInquiries > 0 ? "green" : "green"} href="/admin/support/inquiry-received" />
          <StatusBadge icon={Trophy} label="최대당첨" value="0 건" color="blue" />
          <StatusBadge icon={Users} label="현재접속자" value="0 명" color="red" />
        </div>
      </header>

      {/* 알림 팝업 (우측 상단 고정) */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => dismissNotification(notif.id, notif.href)}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] shadow-2xl animate-slide-in ${
                notif.type === "deposit"
                  ? "bg-orange-950/95 border-orange-500/50"
                  : notif.type === "withdraw"
                    ? "bg-purple-950/95 border-purple-500/50"
                    : "bg-blue-950/95 border-blue-500/50"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                notif.type === "deposit"
                  ? "bg-orange-500/20"
                  : notif.type === "withdraw"
                    ? "bg-purple-500/20"
                    : "bg-blue-500/20"
              }`}>
                {notif.type === "deposit" ? (
                  <Zap size={18} className="text-orange-400" />
                ) : notif.type === "withdraw" ? (
                  <RefreshCw size={18} className="text-purple-400" />
                ) : (
                  <Users size={18} className="text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-bold">
                  {notif.type === "deposit" ? "충전 신청" : notif.type === "withdraw" ? "환전 신청" : "회원 가입"}
                </div>
                <div className="text-xs text-white/70 mt-0.5">{notif.message}</div>
                <div className="text-[10px] text-white/40 mt-1">{notif.time} · 클릭하여 확인</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                className="text-white/30 hover:text-white/70 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {notifications.length > 1 && (
            <button
              onClick={dismissAll}
              className="text-center py-2 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              전체 알림 닫기
            </button>
          )}
        </div>
      )}

      {/* 슬라이드인 애니메이션 */}
      <style jsx global>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

function StatusBadge({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  color: string;
  href?: string;
}) {
  const colorStyles: Record<string, string> = {
    green: "border-green-500/20 text-green-400 bg-green-500/5",
    orange: "border-orange-500/20 text-orange-400 bg-orange-500/5",
    "orange-pulse": "border-orange-500/40 text-orange-400 bg-orange-500/10 animate-pulse",
    purple: "border-purple-500/20 text-purple-400 bg-purple-500/5",
    "purple-pulse": "border-purple-500/40 text-purple-400 bg-purple-500/10 animate-pulse",
    blue: "border-blue-500/20 text-blue-400 bg-blue-500/5",
    red: "border-red-500/20 text-red-400 bg-red-500/5",
    neutral: "border-neutral-700 text-white/70 bg-neutral-800/50",
  };

  const content = (
    <>
      <Icon size={16} />
      <span className="text-white/50">{label}:</span>
      <span>{value}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${colorStyles[color]} hover:opacity-80 transition-opacity cursor-pointer`}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${colorStyles[color]}`}>
      {content}
    </div>
  );
}
