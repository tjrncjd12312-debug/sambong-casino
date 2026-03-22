/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface PartnerRow {
  name: string;
  belong: string;
  deposit: number;
  withdraw: number;
  given: number;
  taken: number;
  betting: number;
  winning: number;
  rolling: number;
  bwr: number;
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

interface Props {
  statsType: string; // "head" | "sub-head" | "distributor" | "store"
  nameLabel: string; // "본사명" | "부본사명" | "총판명" | "매장명"
  depositLabel?: string; // "입금(통장)" or "충전하기"
  withdrawLabel?: string; // "출금(통장)" or "환전하기"
}

export default function PartnerStatsPage({ statsType, nameLabel, depositLabel = "충전하기", withdrawLabel = "환전하기" }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<PartnerRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/statistics?type=${statsType}&start_date=${startDate}&end_date=${endDate}`);
      const json = await res.json();
      if (json.data) setData(json.data);
      if (json.summary) setSummary(json.summary);
    } catch (err) {
      console.error(`Failed to fetch ${statsType} stats:`, err);
    } finally {
      setLoading(false);
    }
  }, [statsType, startDate, endDate]);

  const fmt = (n: number) => n.toLocaleString();

  const columns = [
    { key: "name", label: nameLabel },
    { key: "belong", label: "소속" },
    { key: "deposit", label: depositLabel },
    { key: "withdraw", label: withdrawLabel },
    { key: "given", label: "지급" },
    { key: "taken", label: "회수" },
    { key: "betting", label: "베팅금" },
    { key: "winning", label: "당첨금" },
    { key: "rolling", label: "롤링금" },
    { key: "bwr", label: "베팅-당첨-롤링" },
  ];

  return (
    <div className="space-y-5">
      {/* Date range picker */}
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
              {columns.map((c) => (
                <TableHead key={c.key} className="text-center text-xs text-white/70 font-bold py-3">{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-20">
                  <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-20 text-white/30 text-sm">
                  {searched ? "데이터가 없습니다" : "날짜를 선택하고 검색하세요"}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => {
                const isTotal = row.name === "합계";
                return (
                  <TableRow key={i} className={`border-green-900/10 ${isTotal ? "bg-white/5 font-bold" : "hover:bg-white/[0.02]"}`}>
                    {columns.map((c) => {
                      const val = (row as any)[c.key];
                      const isNumber = typeof val === "number";
                      let colorClass = "text-white/80";

                      if (c.key === "deposit") colorClass = "text-green-400";
                      else if (c.key === "withdraw") colorClass = "text-red-400";
                      else if (c.key === "rolling") colorClass = "text-sky-400";
                      else if (c.key === "bwr") colorClass = val >= 0 ? "text-green-400" : "text-red-400";
                      else if (isNumber && val < 0) colorClass = "text-red-400";

                      return (
                        <TableCell key={c.key} className={`text-center text-xs py-3 ${isNumber ? "font-mono" : ""} ${colorClass}`}>
                          {isNumber ? fmt(val) : val}
                        </TableCell>
                      );
                    })}
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
