"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function PartnerToMemberPage() {
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
      params.set("type", "partner_to_member");
      params.set("date_from", dateFrom);
      params.set("date_to", dateTo);
      if (search) params.set("search", search);
      params.set("limit", "200");

      const res = await fetch(`/api/money/history?${params.toString()}`);
      const json = await res.json();
      if (json.data) setTransfers(json.data);
    } catch {
      console.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const ys = y.toISOString().split("T")[0];
    setDateFrom(ys);
    setDateTo(ys);
  };

  const getPartnerName = (t: Transfer) => {
    // For partner_to_member: from is partner (give), or to is partner (take/recover)
    if (t.from_partner) return t.from_partner.username;
    if (t.to_partner) return t.to_partner.username;
    return "-";
  };

  const getMemberName = (t: Transfer) => {
    if (t.to_member) return t.to_member.username;
    if (t.from_member) return t.from_member.username;
    return "-";
  };

  const getMemberNickname = (t: Transfer) => {
    if (t.to_member) return t.to_member.nickname;
    if (t.from_member) return t.from_member.nickname;
    return "-";
  };

  const isGiveToMember = (t: Transfer) => {
    // partner_to_member means partner gave to member
    return t.to_member !== null;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        <button onClick={setYesterday} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold">어제</button>
        <Input
          placeholder="회원ID,파트너ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData()}
          className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
        />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
        <button onClick={fetchData} className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
      </div>
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["#", "파트너ID", "형태", "회원ID", "회원닉네임", "알지급 금액", "알회수 금액", "메모", "일시"].map((h) => (
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
                <TableCell colSpan={9} className="text-center py-20 text-white/30 text-sm">데이터가 없습니다</TableCell>
              </TableRow>
            ) : (
              transfers.map((t, idx) => {
                const give = isGiveToMember(t);
                return (
                  <TableRow key={t.id} className="border-green-900/10 hover:bg-white/[0.02]">
                    <TableCell className="text-center text-xs text-white/60 font-mono">{idx + 1}</TableCell>
                    <TableCell className="text-center text-xs text-purple-400 font-semibold">{getPartnerName(t)}</TableCell>
                    <TableCell className={`text-center text-xs font-bold ${give ? "text-blue-400" : "text-red-400"}`}>
                      {give ? "보냄-->" : "받음<--"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/80">{getMemberName(t)}</TableCell>
                    <TableCell className="text-center text-xs text-white/70">{getMemberNickname(t)}</TableCell>
                    <TableCell className="text-center text-xs text-blue-400 font-mono font-semibold">
                      {give ? t.amount.toLocaleString() : 0}
                    </TableCell>
                    <TableCell className="text-center text-xs text-red-400 font-mono font-semibold">
                      {!give ? t.amount.toLocaleString() : 0}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/50">{t.memo || "-"}</TableCell>
                    <TableCell className="text-center text-xs text-white/60">
                      {new Date(t.created_at).toLocaleString("ko-KR", {
                        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
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
