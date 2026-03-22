"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface Transfer {
  id: string;
  transfer_type: string;
  amount: number;
  from_balance_before: number;
  from_balance_after: number;
  to_balance_before: number;
  to_balance_after: number;
  memo: string | null;
  created_at: string;
  from_partner: { id: string; username: string; nickname: string; level: string } | null;
  to_partner: { id: string; username: string; nickname: string; level: string } | null;
  from_member: { id: string; username: string; nickname: string } | null;
  to_member: { id: string; username: string; nickname: string } | null;
}

export default function AdminMoneyPage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "admin_to_partner,admin_recover");
      params.set("date_from", dateFrom);
      params.set("date_to", dateTo);
      if (search) params.set("search", search);
      params.set("limit", "200");

      const res = await fetch(`/api/money/history?${params.toString()}`);
      const json = await res.json();
      if (json.data) setTransfers(json.data);
    } catch {
      console.error("Failed to fetch admin money history");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSourceName = (t: Transfer) => {
    if (t.from_partner) return t.from_partner.username;
    if (t.from_member) return t.from_member.username;
    return "-";
  };

  const getTargetName = (t: Transfer) => {
    if (t.to_partner) return t.to_partner.username;
    if (t.to_member) return t.to_member.username;
    return "-";
  };

  const getReasonLabel = (t: Transfer) => {
    switch (t.transfer_type) {
      case "admin_to_partner": return "알지급";
      case "admin_recover": return "알회수";
      default: return t.transfer_type;
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full" />
        <span className="text-white font-bold">관리자 머니 변동내역</span>
      </div>

      {/* Date Filter */}
      <div className="flex justify-end gap-2">
        <Input
          placeholder="ID, 닉네임"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData()}
          className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
        />
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

      {/* Table */}
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["#", "보내기전", "보낸후", "증감", "보낸곳", "받는곳", "변동사유", "메모", "최종변동일시"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-20">
                  <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                  <div className="text-white/30 text-sm mt-3">로딩 중...</div>
                </TableCell>
              </TableRow>
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-20 text-white/30 text-sm">
                  데이터가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((t, idx) => {
                const isGive = t.transfer_type === "admin_to_partner";
                const change = isGive ? t.amount : -t.amount;
                return (
                  <TableRow key={t.id} className="border-green-900/10 hover:bg-white/[0.02]">
                    <TableCell className="text-center text-xs text-white/60 font-mono">{idx + 1}</TableCell>
                    <TableCell className="text-center text-xs text-white/70 font-mono">
                      {isGive ? t.to_balance_before.toLocaleString() : t.from_balance_before.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/70 font-mono">
                      {isGive ? t.to_balance_after.toLocaleString() : t.from_balance_after.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-center text-xs font-mono font-bold ${change > 0 ? "text-blue-400" : "text-red-400"}`}>
                      {change > 0 ? `+${change.toLocaleString()}` : change.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/80">{getSourceName(t)}</TableCell>
                    <TableCell className="text-center text-xs text-white/80">{getTargetName(t)}</TableCell>
                    <TableCell className="text-center text-xs text-white/70">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isGive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {getReasonLabel(t)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/50">{t.memo || "-"}</TableCell>
                    <TableCell className="text-center text-xs text-white/60">
                      {new Date(t.created_at).toLocaleString("ko-KR", {
                        month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-4 border-t border-green-900/10">
          <div className="text-xs text-white/40">총 {transfers.length}건</div>
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5">
            <option>100줄</option>
            <option>200줄</option>
          </select>
        </div>
      </div>
    </div>
  );
}
