"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface UserRow {
  username: string;
  betTotal: number;
  winTotal: number;
  count: number;
}

interface Summary {
  totalBetting: number;
  totalWinning: number;
  bettingMinusWinning: number;
}

export default function UserStatsPage() {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<UserRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [search, setSearch] = useState("");
  const [sortTab, setSortTab] = useState(0);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/statistics?type=user&start_date=${startDate}&end_date=${endDate}`);
      const json = await res.json();
      if (json.data) setData(json.data);
      if (json.summary) setSummary(json.summary);
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const fmt = (n: number) => n.toLocaleString();

  // Filter and sort
  let displayData = [...data];
  if (search) {
    const searchLower = search.toLowerCase();
    displayData = displayData.filter(
      (r) => r.username !== "합계" && r.username.toLowerCase().includes(searchLower)
    );
    // Re-add totals row
    const totalsRow = data.find((r) => r.username === "합계");
    if (totalsRow) displayData.push(totalsRow);
  }

  // Sort based on tab
  const nonTotalRows = displayData.filter((r) => r.username !== "합계");
  const totalRow = displayData.find((r) => r.username === "합계");

  if (sortTab === 0) {
    nonTotalRows.sort((a, b) => a.username.localeCompare(b.username));
  } else if (sortTab === 1) {
    nonTotalRows.sort((a, b) => b.betTotal - a.betTotal);
  } else if (sortTab === 2) {
    nonTotalRows.sort((a, b) => b.winTotal - a.winTotal);
  }

  const sortedData = totalRow ? [totalRow, ...nonTotalRows] : nonTotalRows;

  const sortTabs = ["아이디 순", "배팅금 높은순", "당첨금 높은순"];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {sortTabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setSortTab(i)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                sortTab === i
                  ? "bg-white/10 text-white border-white/20"
                  : "text-white/50 border-white/5 hover:border-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="유저아이디/닉네임"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
          />
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
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "총 배팅금", value: summary.totalBetting, color: "text-white" },
            { label: "총 당첨금", value: summary.totalWinning, color: "text-amber-400" },
            { label: "배팅-당첨", value: summary.bettingMinusWinning, color: summary.bettingMinusWinning >= 0 ? "text-green-400" : "text-red-400" },
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
              {["사용자 ID", "배팅건수", "베팅금", "당첨금", "베팅-당첨", "회수율"].map((h) => (
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
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-white/30 text-sm">
                  {searched ? "데이터가 없습니다" : "날짜를 선택하고 검색하세요"}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row, i) => {
                const isTotal = row.username === "합계";
                const profit = row.betTotal - row.winTotal;
                const rtp = row.betTotal > 0 ? ((row.winTotal / row.betTotal) * 100).toFixed(2) : "0.00";
                return (
                  <TableRow key={i} className={`border-green-900/10 ${isTotal ? "bg-white/5 font-bold" : "hover:bg-white/[0.02]"}`}>
                    <TableCell className="text-center text-xs text-white/80">{row.username}</TableCell>
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
