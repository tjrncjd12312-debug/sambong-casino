"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface DailyRow {
  date: string;
  deposit: number;
  withdraw: number;
  profit: number;
}

interface Summary {
  total_deposit: number;
  total_withdraw: number;
  total_profit: number;
}

export default function DailyExchangePage() {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  })();

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState<DailyRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_deposit: 0, total_withdraw: 0, total_profit: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("date_from", dateFrom);
      params.set("date_to", dateTo);

      const res = await fetch(`/api/exchange/daily?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        setSummary(json.summary);
      }
    } catch {
      console.error("Failed to fetch daily exchange data");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-5">
      {/* Summary & Search */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm text-white/80">
            총입금 : <span className="text-green-400 font-bold font-mono">{summary.total_deposit.toLocaleString()}</span>
          </div>
          <div className="text-sm text-white/80">
            총출금 : <span className="text-red-400 font-bold font-mono">{summary.total_withdraw.toLocaleString()}</span>
          </div>
          <div className="text-sm text-white/80">
            순수익 : <span className={`font-bold font-mono ${summary.total_profit >= 0 ? "text-green-400" : "text-red-400"}`}>
              {summary.total_profit.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
          />
          <button
            onClick={fetchData}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold"
          >
            검색
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">날짜</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">충전액</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">상세내역</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">환전액</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">상세내역</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">순수익</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                  <div className="text-white/30 text-sm mt-3">로딩 중...</div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-white/30 text-sm">데이터가 없습니다</TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.date} className="border-green-900/10 hover:bg-white/[0.02]">
                  <TableCell className="text-center text-sm text-white/80">{row.date}</TableCell>
                  <TableCell className="text-center text-sm text-white/80 font-mono">
                    {row.deposit > 0 ? (
                      <span className="text-green-400 font-semibold">{row.deposit.toLocaleString()}</span>
                    ) : (
                      <span className="text-white/40">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.deposit > 0 ? (
                      <a
                        href={`/admin/exchange/deposit-history?date=${row.date}`}
                        className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-500 transition-colors inline-block"
                      >
                        상세내역
                      </a>
                    ) : (
                      <span className="text-white/20 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm text-white/80 font-mono">
                    {row.withdraw > 0 ? (
                      <span className="text-red-400 font-semibold">{row.withdraw.toLocaleString()}</span>
                    ) : (
                      <span className="text-white/40">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.withdraw > 0 ? (
                      <a
                        href={`/admin/exchange/withdraw-history?date=${row.date}`}
                        className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-500 transition-colors inline-block"
                      >
                        상세내역
                      </a>
                    ) : (
                      <span className="text-white/20 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-center text-sm font-mono font-bold ${row.profit > 0 ? "text-green-400" : row.profit < 0 ? "text-red-400" : "text-white/60"}`}>
                    {row.profit.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-4 border-t border-green-900/10">
          <div className="text-xs text-white/40">총 {data.length}일</div>
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5">
            <option>100줄</option>
            <option>200줄</option>
          </select>
        </div>
      </div>
    </div>
  );
}
