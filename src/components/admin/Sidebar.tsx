"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  UserPlus,
  Wallet,
  RefreshCw,
  BarChart3,
  Calculator,
  Gamepad2,
  PieChart,
  Headphones,
  Settings,
  LogOut,
  ChevronDown,
  Database,
  Zap,
  Sparkles,
  Shield,
} from "lucide-react";
import { useState } from "react";

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  children?: { label: string; href: string }[];
}

const menuItems: MenuItem[] = [
  { label: "대시보드", icon: Home, href: "/admin" },
  {
    label: "퀵메뉴",
    icon: Zap,
    href: "#",
    children: [
      { label: "접속자 목록", href: "/admin/members/connected" },
      { label: "파트너 목록", href: "/admin/partners/list" },
      { label: "회원 목록", href: "/admin/members/list" },
      { label: "정산 통합(슬+카)", href: "/admin/settlement/integrated" },
      { label: "일자별 총환전", href: "/admin/exchange/daily" },
      { label: "충전 내역", href: "/admin/exchange/deposit-history" },
      { label: "환전 내역", href: "/admin/exchange/withdraw-history" },
      { label: "최대 당첨 현황", href: "/admin/members/max-win" },
      { label: "공지사항", href: "/admin/support/notice" },
      { label: "쪽지 보내기", href: "/admin/support/message" },
    ],
  },
  {
    label: "파트너 관리",
    icon: UserPlus,
    href: "#",
    children: [
      { label: "파트너 목록", href: "/admin/partners/list" },
      { label: "본사 목록", href: "/admin/partners/head" },
      { label: "부본 목록", href: "/admin/partners/sub-head" },
      { label: "총판 목록", href: "/admin/partners/distributor" },
      { label: "매장 목록", href: "/admin/partners/store" },
      { label: "쪽지 보내기", href: "/admin/partners/message" },
    ],
  },
  {
    label: "회원 관리",
    icon: Users,
    href: "#",
    children: [
      { label: "접속자 목록", href: "/admin/members/connected" },
      { label: "회원 목록", href: "/admin/members/list" },
      { label: "승인 대기", href: "/admin/members/approval" },
      { label: "최대 당첨 현황", href: "/admin/members/max-win" },
      { label: "쪽지 보내기", href: "/admin/members/message" },
    ],
  },
  {
    label: "배팅내역",
    icon: Database,
    href: "#",
    children: [
      { label: "슬롯 배팅내역", href: "/admin/betting/slot" },
      { label: "카지노 배팅내역", href: "/admin/betting/casino" },
      { label: "통합 배팅내역", href: "/admin/betting/all" },
    ],
  },
  {
    label: "머니내역",
    icon: Wallet,
    href: "#",
    children: [
      { label: "관리자머니 변동내역", href: "/admin/money/admin" },
      { label: "파트너→파트너 머니내역", href: "/admin/money/partner-to-partner" },
      { label: "파트너→회원 머니내역", href: "/admin/money/partner-to-member" },
      { label: "롤링내역", href: "/admin/money/rolling" },
      { label: "롤링전환 내역", href: "/admin/money/rolling-convert" },
    ],
  },
  {
    label: "총환전관리",
    icon: RefreshCw,
    href: "#",
    children: [
      { label: "충전 신청", href: "/admin/exchange/deposit-request" },
      { label: "충전 내역", href: "/admin/exchange/deposit-history" },
      { label: "환전 신청", href: "/admin/exchange/withdraw-request" },
      { label: "환전 내역", href: "/admin/exchange/withdraw-history" },
      { label: "일자별 총환전", href: "/admin/exchange/daily" },
      { label: "일자별 지급&회수", href: "/admin/exchange/daily-transfer" },
    ],
  },
  {
    label: "일자별 통계",
    icon: BarChart3,
    href: "#",
    children: [
      { label: "배팅 통계", href: "/admin/statistics/betting" },
      { label: "게임별 통계", href: "/admin/statistics/game" },
      { label: "사용자별 통계", href: "/admin/statistics/user" },
      { label: "본사 통계", href: "/admin/statistics/head" },
      { label: "부본 통계", href: "/admin/statistics/sub-head" },
      { label: "총판 통계", href: "/admin/statistics/distributor" },
      { label: "매장 통계", href: "/admin/statistics/store" },
    ],
  },
  {
    label: "정산관리",
    icon: Calculator,
    href: "#",
    children: [
      { label: "정산 통합(슬+카)", href: "/admin/settlement/integrated" },
    ],
  },
  {
    label: "게임설정",
    icon: Gamepad2,
    href: "#",
    children: [
      { label: "게임사 제한관리", href: "/admin/games/restrict" },
      { label: "게임 목록", href: "/admin/games/list" },
      { label: "게임사 기본설정", href: "/admin/games/default" },
      { label: "게임사 그룹설정", href: "/admin/games/group" },
    ],
  },
  {
    label: "공배팅 설정",
    icon: PieChart,
    href: "#",
    children: [
      { label: "슬롯 공배팅 설정", href: "/admin/public-betting/slot" },
      { label: "카지노 공배팅 설정", href: "/admin/public-betting/casino" },
      { label: "공배팅 복구", href: "/admin/public-betting/restore" },
      { label: "일자별 누락현황", href: "/admin/public-betting/missing" },
    ],
  },
  {
    label: "고객센터",
    icon: Headphones,
    href: "#",
    children: [
      { label: "공지사항", href: "/admin/support/notice" },
      { label: "상담문의(접수)", href: "/admin/support/inquiry-received" },
      { label: "상담문의(완료)", href: "/admin/support/inquiry-done" },
      { label: "쪽지 보내기", href: "/admin/support/message" },
    ],
  },
  {
    label: "설정 및 조회",
    icon: Settings,
    href: "#",
    children: [
      { label: "최대당첨금 알람 설정", href: "/admin/settings/max-win-alarm" },
      { label: "지급&회수 권한 설정", href: "/admin/settings/transfer-auth" },
      { label: "파트너 정산 통합 설정", href: "/admin/settings/partner-settlement" },
      { label: "고정답변 관리", href: "/admin/settings/fixed-reply" },
      { label: "보안설정", href: "/admin/settings/security" },
      { label: "총환전 제한설정", href: "/admin/settings/exchange-limit" },
      { label: "한줄공지글 설정", href: "/admin/settings/one-line-notice" },
      { label: "계좌변경건 조회", href: "/admin/settings/account-change" },
      { label: "도메인목록 조회", href: "/admin/settings/domain-list" },
      { label: "차단된 계정 조회", href: "/admin/settings/blocked-accounts" },
      { label: "차단된 IP 조회", href: "/admin/settings/blocked-ip" },
      { label: "로그인기록 조회", href: "/admin/settings/login-log" },
      { label: "텔레그램 알림설정", href: "/admin/settings/telegram" },
    ],
  },
];

function HonorLinkBalance() {
  const [agentBalance, setAgentBalance] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  useState(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch("/api/games/agent-info");
        const json = await res.json();
        if (json.data) {
          setAgentBalance(json.data.balance ?? json.data.credit ?? null);
          setUserCount(json.data.user_count ?? json.data.users ?? null);
        }
      } catch {
        // Silently fail - will show placeholder
      }
    };
    fetchInfo();
    const interval = setInterval(fetchInfo, 60_000); // refresh every minute
    return () => clearInterval(interval);
  });

  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-neutral-500">게임 잔액</span>
        <span className="text-green-400 font-mono font-semibold">
          {agentBalance !== null ? agentBalance.toLocaleString("ko-KR") : "..."}
        </span>
      </div>
    </div>
  );
}

const levelLabels: Record<string, string> = {
  admin: "관리자",
  head: "본사",
  sub_head: "부본사",
  distributor: "총판",
  store: "매장",
};

export default function Sidebar({ username, level }: { username?: string; level?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      // Force redirect even on error
      window.location.href = "/admin/login";
    }
  };

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? [] : [label]
    );
  };

  return (
    <aside className="w-56 min-h-screen flex flex-col text-[13px] border-r border-green-900/15"
      style={{ background: "#111111" }}
    >
      {/* Top neon bar */}
      <div className="h-[2px] neon-shimmer-bar shrink-0" />

      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-green-900/15 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-green-500/20"
            style={{ background: "linear-gradient(135deg, #052e16, #14532d)" }}
          >
            <Sparkles size={20} className="text-green-400 neon-icon" />
          </div>
          <div>
            <div className="text-[20px] font-black tracking-wider text-green-400 neon-text">CC</div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-green-700/60 font-semibold -mt-0.5">Casino</div>
          </div>
        </div>

        {/* API Balances */}
        <HonorLinkBalance />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto sidebar-scroll">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href && !item.children;
          const isOpen = openMenus.includes(item.label);
          const hasChildren = item.children && item.children.length > 0;
          const isDashboard = item.label === "대시보드";

          return (
            <div key={item.label}>
              {isDashboard ? (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-5 py-2.5 transition-all duration-200 ${
                    isActive
                      ? "text-green-400 bg-green-500/10 border-r-2 border-green-400"
                      : "text-white/80 hover:text-green-400 hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon size={16} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ) : (
                <button
                  onClick={() => hasChildren && toggleMenu(item.label)}
                  className={`w-full flex items-center justify-between px-5 py-2.5 transition-all duration-200 ${
                    isOpen
                      ? "text-green-400 bg-green-500/5"
                      : "text-white/80 hover:text-green-400 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isOpen ? "text-green-400" : ""} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {hasChildren && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-green-500" : "text-neutral-700"}`}
                    />
                  )}
                </button>
              )}

              {/* Submenu */}
              {hasChildren && isOpen && (
                <div className="menu-enter bg-white/[0.01]">
                  {item.children!.map((child) => {
                    const isChildActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 pl-11 pr-5 py-2 text-xs transition-all duration-150 ${
                          isChildActive
                            ? "text-green-400"
                            : "text-white/60 hover:text-green-300"
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${isChildActive ? "bg-green-400" : "bg-neutral-700"}`} />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-green-900/15 shrink-0">
        {username && (
          <div className="px-5 py-3 flex items-center gap-3 border-b border-green-900/15">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/15 flex items-center justify-center">
              <Shield size={14} className="text-green-500/70" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/90 truncate">{username}</div>
              <div className="text-[10px] text-green-500/60">{levelLabels[level || ""] || level}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-3 text-white/50 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={16} />
          <span className="font-medium">로그아웃</span>
        </button>
      </div>

      <div className="h-[2px] neon-shimmer-bar shrink-0" />
    </aside>
  );
}
