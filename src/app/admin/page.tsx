"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  UserPlus,
  TrendingDown,
  Wallet,
  Users,
  DollarSign,
  BarChart3,
  Loader2,
  Gamepad2,
  RefreshCw,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────

interface DashboardData {
  topStats: {
    memberBalance: number;
    memberRolling: number;
    partnerBalance: number;
    partnerRolling: number;
    newMembersToday: number;
    onlineUsers: number;
  };
  todayDeposit: {
    count: number;
    amount: number;
    pendingCount: number;
  };
  todayWithdraw: {
    count: number;
    amount: number;
    pendingCount: number;
  };
  todayBetting: {
    slotBetAmount: number;
    slotWinAmount: number;
    casinoBetAmount: number;
    casinoWinAmount: number;
  };
  todayTransfers: {
    giveAmount: number;
    takeAmount: number;
  };
  moneyFlow: {
    depositAmount: number;
    withdrawAmount: number;
    depositCount: number;
    withdrawCount: number;
    memberBalance: number;
    partnerBalance: number;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function fmtSigned(n: number): { text: string; color: string } {
  if (n > 0) return { text: fmt(n), color: "text-green-400" };
  if (n < 0) return { text: fmt(n), color: "text-red-400" };
  return { text: "0", color: "text-white/80" };
}

// ── Subcomponents ───────────────────────────────────────────────────────

function GlowCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-green-900/15 overflow-hidden ${className}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(5,46,22,0.15) 0%, rgba(24,24,24,0.95) 100%)",
      }}
    >
      {children}
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  valueColor = "text-green-400",
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <GlowCard>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/10 flex items-center justify-center">
            <Icon size={15} className="text-green-500/70" />
          </div>
          <span className="text-[11px] text-white/80 font-medium">
            {label}
          </span>
        </div>
        <div
          className={`text-lg font-bold font-mono tabular-nums ${valueColor}`}
        >
          {value}
        </div>
        {sub && <div className="text-[10px] text-white/60 mt-1">{sub}</div>}
      </div>
    </GlowCard>
  );
}

// ── HonorLink Agent Info Component ───────────────────────────────────────

function HonorLinkAgentInfo() {
  const [info, setInfo] = useState<any>(null);
  const [hlLoading, setHlLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchAgentInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/games/agent-info");
      const json = await res.json();
      if (json.data) {
        setInfo(json.data);
      }
    } catch {
      // silent
    } finally {
      setHlLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgentInfo();
    const interval = setInterval(fetchAgentInfo, 60_000);
    return () => clearInterval(interval);
  }, [fetchAgentInfo]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/games/sync-transactions", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        alert(`동기화 완료: ${json.synced}건 처리됨`);
      } else {
        alert(`동기화 실패: ${json.error || "알 수 없는 오류"}`);
      }
    } catch {
      alert("동기화 요청 실패");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <GlowCard>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/10 flex items-center justify-center">
              <Gamepad2 size={14} className="text-green-500/70" />
            </div>
            <span className="text-xs font-bold text-white">게임 API</span>
            {info && (
              <span className="text-sm font-bold text-green-400 font-mono ml-2">
                {fmt(info.balance ?? info.credit ?? 0)}원
              </span>
            )}
            {info && (
              <span className={`w-2 h-2 rounded-full ml-1 ${info.status === "active" ? "bg-green-400" : "bg-red-400"}`} />
            )}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-green-500/10 text-green-400 hover:bg-green-500/15 border border-green-500/15 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
            {syncing ? "동기화 중..." : "트랜잭션 동기화"}
          </button>
        </div>
      </div>
    </GlowCard>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [moneyDate, setMoneyDate] = useState(todayStr);
  const [fundDate, setFundDate] = useState(todayStr);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json: DashboardData = await res.json();
      setData(json);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Derived values ──────────────────────────────────────────────────

  const d = data;

  const totalBet =
    (d?.todayBetting.slotBetAmount ?? 0) +
    (d?.todayBetting.casinoBetAmount ?? 0);
  const totalWin =
    (d?.todayBetting.slotWinAmount ?? 0) +
    (d?.todayBetting.casinoWinAmount ?? 0);
  const bettingProfit = totalBet - totalWin; // positive = house wins
  // 롤링금 placeholder: we use memberRolling as "총롤링금" for the formula
  const totalRolling = d?.topStats.memberRolling ?? 0;
  const bettingNetProfit = totalBet - totalWin - totalRolling;

  const depositTotal =
    (d?.todayDeposit.amount ?? 0) + (d?.todayTransfers.giveAmount ?? 0);
  const withdrawTotal =
    (d?.todayWithdraw.amount ?? 0) + (d?.todayTransfers.takeAmount ?? 0);

  // 나의 자금 변동 증가 합계
  const increaseHQ = 0; // 본사충전 — admin self-charge, placeholder
  const increaseUpperGive = 0; // 상부 알지급
  const increaseLowerTake = d?.todayTransfers.takeAmount ?? 0; // 하부 알회수
  const increaseRollingConvert = 0; // 롤링금전환
  const increaseTotal =
    increaseHQ + increaseUpperGive + increaseLowerTake + increaseRollingConvert;

  // 감소
  const decreaseHQ = 0; // 본사 환전
  const decreaseUpperTake = 0; // 상부 알회수
  const decreaseLowerGive = d?.todayTransfers.giveAmount ?? 0; // 하부 알지급
  const decreaseTotal = decreaseHQ + decreaseUpperTake + decreaseLowerGive;

  // ── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
        <span className="ml-3 text-white/60 text-sm">
          대시보드 데이터를 불러오는 중...
        </span>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────

  const bettingProfitFmt = fmtSigned(bettingProfit);
  const bettingNetFmt = fmtSigned(bettingNetProfit);
  const betMinusWin = totalBet - totalWin;
  const betMinusWinFmt = fmtSigned(betMinusWin);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={22} className="text-green-400" />
          대시보드
        </h1>
        <p className="text-xs text-white/60 mt-1 ml-[30px]">
          접속계정 : admin / 관리자
        </p>
      </div>

      {/* ── HonorLink Agent Info ──────────────────────────────────────── */}
      <HonorLinkAgentInfo />

      {/* ── Section 1: Top Summary Cards ─────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {/* 충전 / 환전 */}
        <GlowCard>
          <div className="grid grid-cols-2 divide-x divide-green-900/15">
            <div className="p-4 text-center">
              <div className="text-[10px] text-white/60 mb-1">
                충전 ({d?.todayDeposit.count ?? 0}건)
              </div>
              <div className="text-base font-bold text-green-400 font-mono">
                {fmt(d?.todayDeposit.amount ?? 0)}
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-[10px] text-white/60 mb-1">
                환전 ({d?.todayWithdraw.count ?? 0}건)
              </div>
              <div className="text-base font-bold text-red-400 font-mono">
                {fmt(d?.todayWithdraw.amount ?? 0)}
              </div>
            </div>
          </div>
        </GlowCard>

        {/* 알지급 / 알회수 */}
        <GlowCard>
          <div className="grid grid-cols-2 divide-x divide-green-900/15">
            <div className="p-4 text-center">
              <div className="text-[10px] text-white/60 mb-1">알지급</div>
              <div className="text-base font-bold text-white font-mono">
                {fmt(d?.todayTransfers.giveAmount ?? 0)}
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-[10px] text-white/60 mb-1">알회수</div>
              <div className="text-base font-bold text-green-400 font-mono">
                {fmt(d?.todayTransfers.takeAmount ?? 0)}
              </div>
            </div>
          </div>
        </GlowCard>

        {/* 금일 신규회원 */}
        <StatItem
          icon={UserPlus}
          label="금일 신규회원"
          value={fmt(d?.topStats.newMembersToday ?? 0)}
          valueColor="text-white"
        />

        {/* 금일 배팅손익 */}
        <StatItem
          icon={TrendingDown}
          label="금일 배팅손익"
          value={fmt(bettingProfit)}
          valueColor={bettingProfitFmt.color}
        />

        {/* 배팅 - 당첨 - 총롤링금 */}
        <StatItem
          icon={TrendingDown}
          label="배팅-당첨-롤링금"
          value={fmt(bettingNetProfit)}
          valueColor={bettingNetFmt.color}
          sub="(배팅 - 당첨 - 총롤링금)"
        />
      </div>

      {/* Holding Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatItem
          icon={Wallet}
          label="회원보유금"
          value={fmt(d?.topStats.memberBalance ?? 0)}
          valueColor="text-sky-400"
        />
        <StatItem
          icon={DollarSign}
          label="회원보유 롤링금"
          value={fmt(d?.topStats.memberRolling ?? 0)}
          valueColor="text-emerald-400"
        />
        <StatItem
          icon={Users}
          label="파트너 보유금"
          value={fmt(d?.topStats.partnerBalance ?? 0)}
          valueColor="text-purple-400"
        />
        <StatItem
          icon={ArrowUpCircle}
          label="파트너 보유 롤링금"
          value={fmt(d?.topStats.partnerRolling ?? 0)}
          valueColor="text-amber-400"
        />
      </div>

      {/* ── Section 2: 머니 입출금 개요 ──────────────────────────────── */}
      <GlowCard>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full" />
              <span className="font-bold text-sm text-white">
                머니 입출금 개요
              </span>
              <span className="text-[10px] text-white/60 ml-1">
                보유 잔액 = 보유머니 + 롤링금, 총환전은 소속 회원에게 총환전된
                금액 합계
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={moneyDate}
                onChange={(e) => setMoneyDate(e.target.value)}
                className="w-36 h-8 text-xs bg-neutral-900/80 border-green-900/20 text-white rounded-lg focus:border-green-500/30"
              />
              <Button
                size="sm"
                onClick={fetchData}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold rounded-lg hover:from-green-400 hover:to-emerald-500 h-8 shadow-lg shadow-green-500/10"
              >
                검색
              </Button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-green-900/10">
            <Table>
              <TableHeader>
                <TableRow className="border-green-900/10">
                  <TableHead
                    colSpan={3}
                    className="text-center text-green-400 text-xs font-bold bg-green-500/5 border-b border-green-900/10"
                  >
                    충전
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center text-red-400 text-xs font-bold bg-red-500/5 border-b border-green-900/10"
                  >
                    환전
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="text-center text-sky-400 text-xs font-bold bg-sky-500/5 border-b border-green-900/10"
                  >
                    현재보유금
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center text-amber-400 text-xs font-bold bg-amber-500/5 border-b border-green-900/10"
                  >
                    베팅 / 당첨
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center text-purple-400 text-xs font-bold bg-purple-500/5 border-b border-green-900/10"
                  >
                    롤링금
                  </TableHead>
                </TableRow>
                <TableRow className="border-green-900/10">
                  {[
                    "충전",
                    "알지급",
                    "충전합계",
                    "환전",
                    "알회수",
                    "환전합계",
                    "회원보유잔액",
                    "파트너보유잔액",
                    "베팅금",
                    "당첨금",
                    "베팅-당첨",
                    "총 롤링금",
                    "실 롤링금",
                    "본인 롤링금",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-center text-[10px] text-white/80 font-medium border-b border-green-900/10 py-2"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-green-900/10 hover:bg-green-500/[0.02]">
                  {/* 충전 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(d?.todayDeposit.amount ?? 0)}
                  </TableCell>
                  {/* 알지급 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(d?.todayTransfers.giveAmount ?? 0)}
                  </TableCell>
                  {/* 충전합계 */}
                  <TableCell className="text-center text-xs text-green-400 font-mono font-semibold py-3">
                    {fmt(depositTotal)}
                  </TableCell>
                  {/* 환전 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(d?.todayWithdraw.amount ?? 0)}
                  </TableCell>
                  {/* 알회수 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(d?.todayTransfers.takeAmount ?? 0)}
                  </TableCell>
                  {/* 환전합계 */}
                  <TableCell className="text-center text-xs text-red-400 font-mono font-semibold py-3">
                    {fmt(withdrawTotal)}
                  </TableCell>
                  {/* 회원보유잔액 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(
                      (d?.topStats.memberBalance ?? 0) +
                        (d?.topStats.memberRolling ?? 0)
                    )}
                  </TableCell>
                  {/* 파트너보유잔액 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(
                      (d?.topStats.partnerBalance ?? 0) +
                        (d?.topStats.partnerRolling ?? 0)
                    )}
                  </TableCell>
                  {/* 베팅금 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(totalBet)}
                  </TableCell>
                  {/* 당첨금 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(totalWin)}
                  </TableCell>
                  {/* 베팅-당첨 */}
                  <TableCell
                    className={`text-center text-xs font-mono font-semibold py-3 ${betMinusWinFmt.color}`}
                  >
                    {fmt(betMinusWin)}
                  </TableCell>
                  {/* 총 롤링금 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(d?.topStats.memberRolling ?? 0)}
                  </TableCell>
                  {/* 실 롤링금 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    0
                  </TableCell>
                  {/* 본인 롤링금 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    0
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </GlowCard>

      {/* ── Section 3: 나의 자금 변동내역 ────────────────────────────── */}
      <GlowCard>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full" />
              <span className="font-bold text-sm text-white">
                나의 자금 변동내역
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fundDate}
                onChange={(e) => setFundDate(e.target.value)}
                className="w-36 h-8 text-xs bg-neutral-900/80 border-green-900/20 text-white rounded-lg focus:border-green-500/30"
              />
              <Button
                size="sm"
                onClick={fetchData}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold rounded-lg hover:from-green-400 hover:to-emerald-500 h-8 shadow-lg shadow-green-500/10"
              >
                검색
              </Button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-green-900/10">
            <Table>
              <TableHeader>
                <TableRow className="border-green-900/10">
                  <TableHead
                    colSpan={5}
                    className="text-center text-green-400 text-xs font-bold bg-green-500/5 border-b border-green-900/10"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <ArrowUpCircle size={13} />
                      보유금 증가
                    </div>
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="text-center text-red-400 text-xs font-bold bg-red-500/5 border-b border-green-900/10"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <ArrowDownCircle size={13} />
                      보유금 감소
                    </div>
                  </TableHead>
                </TableRow>
                <TableRow className="border-green-900/10">
                  {[
                    "본사충전",
                    "상부 알지급",
                    "하부 알회수",
                    "롤링금전환",
                    "증가 합계",
                    "본사 환전",
                    "상부 알회수",
                    "하부 알지급",
                    "감소 합계",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-center text-[10px] text-white/80 font-medium border-b border-green-900/10 py-2"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-green-900/10 hover:bg-green-500/[0.02]">
                  {/* 본사충전 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(increaseHQ)}
                  </TableCell>
                  {/* 상부 알지급 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(increaseUpperGive)}
                  </TableCell>
                  {/* 하부 알회수 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(increaseLowerTake)}
                  </TableCell>
                  {/* 롤링금전환 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(increaseRollingConvert)}
                  </TableCell>
                  {/* 증가 합계 */}
                  <TableCell className="text-center text-xs text-green-400 font-mono font-bold py-3">
                    {fmt(increaseTotal)}
                  </TableCell>
                  {/* 본사 환전 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(decreaseHQ)}
                  </TableCell>
                  {/* 상부 알회수 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(decreaseUpperTake)}
                  </TableCell>
                  {/* 하부 알지급 */}
                  <TableCell className="text-center text-xs text-white/80 font-mono py-3">
                    {fmt(decreaseLowerGive)}
                  </TableCell>
                  {/* 감소 합계 */}
                  <TableCell className="text-center text-xs text-red-400 font-mono font-bold py-3">
                    {fmt(decreaseTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}
