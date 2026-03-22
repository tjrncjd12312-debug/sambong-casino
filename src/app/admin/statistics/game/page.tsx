"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface GameRow {
  vendor: string;
  betTotal: number;
  winTotal: number;
  count: number;
}

interface Summary {
  totalBetting: number;
  totalWinning: number;
  bettingMinusWinning: number;
  totalCount: number;
}

export default function GameStatsPage() {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<GameRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/statistics?type=game&start_date=${startDate}&end_date=${endDate}`);
      const json = await res.json();
      if (json.data) setData(json.data);
      if (json.summary) setSummary(json.summary);
    } catch (err) {
      console.error("Failed to fetch game stats:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center justify-end gap-2">
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
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "총 배팅금", value: summary.totalBetting, color: "text-white" },
            { label: "총 당첨금", value: summary.totalWinning, color: "text-amber-400" },
            { label: "배팅-당첨", value: summary.bettingMinusWinning, color: summary.bettingMinusWinning >= 0 ? "text-green-400" : "text-red-400" },
            { label: "총 배팅건수", value: summary.totalCount, color: "text-sky-400" },
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
              {["공급사", "배팅건수", "베팅금", "당첨금", "베팅-당첨", "회수율"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-white/30 text-sm">
                  {searched ? "데이터가 없습니다" : "날짜를 선택하고 검색하세요"}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => {
                const isTotal = row.vendor === "합계";
                const profit = row.betTotal - row.winTotal;
                const rtp = row.betTotal > 0 ? ((row.winTotal / row.betTotal) * 100).toFixed(2) : "0.00";
                return (
                  <TableRow key={i} className={`border-green-900/10 ${isTotal ? "bg-white/5 font-bold" : "hover:bg-white/[0.02]"}`}>
                    <TableCell className="text-center text-xs text-white/80">{row.vendor}</TableCell>
                    <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.count)}</TableCell>
                    <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.betTotal)}</TableCell>
                    <TableCell className="text-center text-xs text-amber-400 font-mono">{fmt(row.winTotal)}</TableCell>
                    <TableCell className={`text-center text-xs font-mono ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(profit)}</TableCell>
                    <TableCell className="text-center text-xs text-white/80">{rtp}%</TableCell>
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
