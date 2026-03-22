"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface BettingRow {
  date: string;
  deposit: number;
  withdraw: number;
  dw: number;
  given: number;
  taken: number;
  gt: number;
  betting: number;
  winning: number;
  bw: number;
  rolling: number;
  bwr: number;
  rtp: number;
}

interface Summary {
  totalBetting: number;
  totalWinning: number;
  bettingMinusWinning: number;
  totalRolling: number;
  totalDeposit: number;
  totalWithdraw: number;
  netProfit: number;
}

export default function BettingStatsPage() {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<BettingRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/statistics?type=betting&start_date=${startDate}&end_date=${endDate}`);
      const json = await res.json();
      if (json.data) setData(json.data);
      if (json.summary) setSummary(json.summary);
    } catch (err) {
      console.error("Failed to fetch betting stats:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-5">
      {/* Date range picker */}
      <div className="flex justify-end gap-2">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold disabled:opacity-50"
        >
          {loading ? "검색중..." : "검색"}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-7 gap-3">
          {[
            { label: "총 배팅금", value: summary.totalBetting, color: "text-white" },
            { label: "총 당첨금", value: summary.totalWinning, color: "text-amber-400" },
            { label: "배팅-당첨", value: summary.bettingMinusWinning, color: summary.bettingMinusWinning >= 0 ? "text-green-400" : "text-red-400" },
            { label: "총 롤링금", value: summary.totalRolling, color: "text-sky-400" },
            { label: "충전합계", value: summary.totalDeposit, color: "text-green-400" },
            { label: "환전합계", value: summary.totalWithdraw, color: "text-red-400" },
            { label: "순이익", value: summary.netProfit, color: summary.netProfit >= 0 ? "text-green-400" : "text-red-400" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-green-900/15 p-4"
              style={{ background: "rgba(17,17,17,0.9)" }}
            >
              <div className="text-[11px] text-white/50 mb-1">{card.label}</div>
              <div className={`text-sm font-bold font-mono ${card.color}`}>
                {fmt(card.value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["날짜", "충전", "환전", "충전-환전", "지급", "회수", "지급-회수", "베팅", "당첨", "베팅-당첨", "롤링", "베팅-당첨-롤링", "RTP"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-20">
                  <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-20 text-white/30 text-sm">
                  {searched ? "데이터가 없습니다" : "날짜를 선택하고 검색하세요"}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => {
                const isTotal = row.date === "합계";
                return (
                  <TableRow key={i} className={`border-green-900/10 ${isTotal ? "bg-white/5 font-bold" : "hover:bg-white/[0.02]"}`}>
                    <TableCell className="text-center text-xs text-white/80">{row.date}</TableCell>
                    <TableCell className="text-center text-xs text-green-400 font-mono">{fmt(row.deposit)}</TableCell>
                    <TableCell className="text-center text-xs text-red-400 font-mono">{fmt(row.withdraw)}</TableCell>
                    <TableCell className={`text-center text-xs font-mono ${row.dw >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(row.dw)}</TableCell>
                    <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.given)}</TableCell>
                    <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.taken)}</TableCell>
                    <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.gt)}</TableCell>
                    <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.betting)}</TableCell>
                    <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.winning)}</TableCell>
                    <TableCell className={`text-center text-xs font-mono ${row.bw >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(row.bw)}</TableCell>
                    <TableCell className="text-center text-xs text-sky-400 font-mono bg-sky-500/5">{fmt(row.rolling)}</TableCell>
                    <TableCell className={`text-center text-xs font-mono ${row.bwr >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(row.bwr)}</TableCell>
                    <TableCell className="text-center text-xs text-white/80">{row.rtp}%</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5">
            <option>100줄</option>
          </select>
        </div>
      </div>
    </div>
  );
}
