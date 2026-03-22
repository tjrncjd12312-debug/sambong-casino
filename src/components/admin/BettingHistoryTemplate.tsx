"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface BettingRecord {
  betNo: number;
  betTime: string;
  user: string;
  belonging: string;
  memo: string;
  pot: string;
  provider: string;
  gameType: string;
  gameName: string;
  roundId: string;
  betAmount: number;
  winAmount: number;
  balance: number;
  result: string;
}

interface Props {
  title: string;
  /** "slot" | "casino" | "all" */
  filterType: string;
}

// ── 전역 배팅 저장소 (탭 이동해도 유지 + localStorage 영속) ──────────
const STORAGE_KEY = "betting_cache_v2";
const globalBetting = {
  records: [] as BettingRecord[],
  seenIds: new Set<number>(),
  loaded: false,
  collectTimer: null as ReturnType<typeof setInterval> | null,
};

function loadFromStorage() {
  if (globalBetting.loaded) return;
  globalBetting.loaded = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: BettingRecord[] = JSON.parse(stored);
      globalBetting.records = parsed;
      parsed.forEach((r) => globalBetting.seenIds.add(r.betNo));
    }
  } catch {}
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalBetting.records.slice(0, 1000)));
  } catch {}
}

function getFilteredRecords(filterType: string): BettingRecord[] {
  if (filterType === "all") return globalBetting.records;
  if (filterType === "slot") return globalBetting.records.filter((r) => r.gameType === "슬롯");
  if (filterType === "casino") return globalBetting.records.filter((r) => r.gameType === "카지노");
  return globalBetting.records;
}

async function collectFromServer() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/cache/transactions?start=${today}&end=${today}&page=1&perPage=1000&type=all`);
    if (!res.ok) return;
    const json = await res.json();
    const newRecords: BettingRecord[] = json.data || [];
    const freshItems = newRecords.filter((r) => !globalBetting.seenIds.has(r.betNo));
    if (freshItems.length > 0) {
      freshItems.forEach((r) => globalBetting.seenIds.add(r.betNo));
      globalBetting.records = [...freshItems, ...globalBetting.records];
      saveToStorage();
    }
  } catch {}
}

// 앱 시작 시 백그라운드 수집 시작 (30초마다, 탭에 없어도 계속)
if (typeof window !== "undefined") {
  setTimeout(() => {
    loadFromStorage();
    if (!globalBetting.collectTimer) {
      collectFromServer(); // 즉시 1회
      globalBetting.collectTimer = setInterval(collectFromServer, 30000);
    }
  }, 1000);
}

export default function BettingHistoryTemplate({ title, filterType }: Props) {
  const today = new Date().toISOString().split("T")[0];

  if (typeof window !== "undefined") loadFromStorage();

  const [data, setData] = useState<BettingRecord[]>(() => getFilteredRecords(filterType));
  const [totalCount, setTotalCount] = useState(() => getFilteredRecords(filterType).length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [page, setPage] = useState(1);

  const perPage = 100;

  // 전역 데이터 동기화 (2초마다)
  useEffect(() => {
    const sync = setInterval(() => {
      const filtered = getFilteredRecords(filterType);
      if (filtered.length !== data.length) {
        setData([...filtered]);
        setTotalCount(filtered.length);
      }
    }, 2000);
    return () => clearInterval(sync);
  }, [filterType, data.length]);

  // 수동 검색 (다른 날짜 범위 등)
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start: startDate, end: endDate, page: "1", perPage: "1000", type: filterType,
      });
      if (searchInput) params.set("search", searchInput);
      if (sortBy) params.set("sortBy", sortBy);

      const res = await fetch(`/api/cache/transactions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "조회 실패");

      const newRecords: BettingRecord[] = json.data || [];
      // 전역 저장소에 추가
      const freshItems = newRecords.filter((r) => !globalBetting.seenIds.has(r.betNo));
      freshItems.forEach((r) => globalBetting.seenIds.add(r.betNo));
      globalBetting.records = [...freshItems, ...globalBetting.records];
      saveToStorage();

      const filtered = getFilteredRecords(filterType);
      setData([...filtered]);
      setTotalCount(filtered.length);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSort = (type: string) => {
    if (sortBy === type) {
      setSortBy("");
    } else {
      setSortBy(type);
    }
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / perPage) || 1;

  // Statistics calculation
  const stats = {
    totalBet: data.reduce((s, r) => s + (r.betAmount || 0), 0),
    totalWin: data.reduce((s, r) => s + (r.winAmount || 0), 0),
    betCount: data.filter((r) => r.betAmount > 0).length,
    winCount: data.filter((r) => r.winAmount > 0).length,
    profit: data.reduce((s, r) => s + (r.betAmount || 0) - (r.winAmount || 0), 0),
  };

  const resultColor = (r: string) => {
    if (r === "승") return "text-blue-400";
    if (r === "패") return "text-red-400";
    if (r === "금") return "text-yellow-400";
    if (r === "무") return "text-white/50";
    return "text-white/50";
  };

  const resultBg = (r: string) => {
    if (r === "승") return "bg-blue-500/10";
    if (r === "패") return "bg-red-500/10";
    if (r === "금") return "bg-yellow-500/10";
    return "";
  };

  return (
    <div className="space-y-5">
      {/* Statistics cards */}
      {data.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          <div className="rounded-xl border border-blue-500/20 p-4" style={{ background: "rgba(17,17,17,0.9)" }}>
            <div className="text-[10px] text-white/40 mb-1">총 배팅금</div>
            <div className="text-lg font-bold text-blue-400 font-mono">{stats.totalBet.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-green-500/20 p-4" style={{ background: "rgba(17,17,17,0.9)" }}>
            <div className="text-[10px] text-white/40 mb-1">총 당첨금</div>
            <div className="text-lg font-bold text-green-400 font-mono">{stats.totalWin.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-purple-500/20 p-4" style={{ background: "rgba(17,17,17,0.9)" }}>
            <div className="text-[10px] text-white/40 mb-1">베팅 건수</div>
            <div className="text-lg font-bold text-purple-400 font-mono">{stats.betCount.toLocaleString()}건</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 p-4" style={{ background: "rgba(17,17,17,0.9)" }}>
            <div className="text-[10px] text-white/40 mb-1">당첨 건수</div>
            <div className="text-lg font-bold text-amber-400 font-mono">{stats.winCount.toLocaleString()}건</div>
          </div>
          <div className={`rounded-xl border p-4 ${stats.profit >= 0 ? "border-red-500/20" : "border-cyan-500/20"}`} style={{ background: "rgba(17,17,17,0.9)" }}>
            <div className="text-[10px] text-white/40 mb-1">순이익 (배팅-당첨)</div>
            <div className={`text-lg font-bold font-mono ${stats.profit >= 0 ? "text-red-400" : "text-cyan-400"}`}>
              {stats.profit >= 0 ? "+" : ""}{stats.profit.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        {/* Header */}
        <div className="p-5 border-b border-green-900/15">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="text-white font-bold text-sm">
                총:<span className="text-green-400">{totalCount.toLocaleString()}</span>건
              </div>
              {loading && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-white/40">로딩중...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort buttons */}
              <button
                onClick={() => handleSort("bet")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  sortBy === "bet"
                    ? "bg-white/10 text-white border-white/20"
                    : "text-white/50 border-white/5 hover:text-white"
                }`}
              >
                배팅금 높은순
              </button>
              <button
                onClick={() => handleSort("win")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  sortBy === "win"
                    ? "bg-white/10 text-white border-white/20"
                    : "text-white/50 border-white/5 hover:text-white"
                }`}
              >
                당첨금 높은순
              </button>

              {/* Search input */}
              <Input
                placeholder="검색어 (유저명)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
              />

              {/* Date range */}
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
              />

              {/* Search button */}
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50"
              >
                검색
              </button>

              {/* Auto-refresh status indicator */}
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                ● 자동 수집 중 (30초)
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-green-900/15 hover:bg-transparent">
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">배팅번호</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">배팅시간</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">유저</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">소속</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">메모</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">POT</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">게임사</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">게임타입</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">게임상세</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">라운드ID</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">배팅금액</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">당첨금액</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">현 잔액</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">결과</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && data.length === 0 ? (
                <TableRow className="border-green-900/10">
                  <TableCell colSpan={14} className="text-center py-32">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                      <span className="text-white/30 text-sm">배팅내역을 불러오는 중...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow className="border-green-900/10">
                  <TableCell colSpan={14} className="text-center py-32 text-white/30 text-sm">
                    배팅 내역이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, idx) => (
                  <TableRow
                    key={`${row.betNo}-${idx}`}
                    className={`border-green-900/10 hover:bg-white/[0.02] transition-colors ${resultBg(row.result)}`}
                  >
                    <TableCell className="text-center text-xs text-white/60 font-mono">{row.betNo}</TableCell>
                    <TableCell className="text-center text-xs text-white/70 whitespace-nowrap">{row.betTime}</TableCell>
                    <TableCell className="text-center text-xs text-white/80">{row.user}</TableCell>
                    <TableCell className="text-center">
                      {row.belonging ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 text-[10px] text-white/70">
                          <span className="w-3 h-3 bg-green-600 rounded-sm text-[7px] text-white flex items-center justify-center font-bold">매</span>
                          {row.belonging}
                        </span>
                      ) : (
                        <span className="text-xs text-white/30">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/50">{row.memo || ""}</TableCell>
                    <TableCell className="text-center text-xs text-white/70">{row.pot}</TableCell>
                    <TableCell className="text-center text-xs text-white/80">{row.provider}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        row.gameType === "카지노"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/20"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/20"
                      }`}>
                        {row.gameType}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/80 max-w-[180px] truncate">{row.gameName}</TableCell>
                    <TableCell className="text-center text-[10px] text-white/50 font-mono max-w-[160px] truncate">{row.roundId}</TableCell>
                    <TableCell className="text-center text-xs text-white/80 font-mono font-semibold">{row.betAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs text-green-400 font-mono font-semibold">{row.winAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs text-white/70 font-mono">{row.balance.toLocaleString()}</TableCell>
                    <TableCell className={`text-center text-xs font-bold ${resultColor(row.result)}`}>
                      <span className={`inline-block px-2 py-0.5 rounded ${
                        row.result === "승" ? "bg-blue-500/15" :
                        row.result === "패" ? "bg-red-500/15" :
                        row.result === "금" ? "bg-yellow-500/15" :
                        "bg-white/5"
                      }`}>
                        {row.result}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-green-900/15 flex items-center justify-between">
            <div className="text-xs text-white/40">
              페이지 {page} / {totalPages} (총 {totalCount.toLocaleString()}건)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1.5 rounded text-xs text-white/60 border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                처음
              </button>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1.5 rounded text-xs text-white/60 border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                이전
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    disabled={loading}
                    className={`px-2.5 py-1.5 rounded text-xs border transition-all ${
                      page === pageNum
                        ? "bg-green-500/20 text-green-400 border-green-500/30 font-bold"
                        : "text-white/60 border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1.5 rounded text-xs text-white/60 border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                다음
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1.5 rounded text-xs text-white/60 border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                마지막
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
