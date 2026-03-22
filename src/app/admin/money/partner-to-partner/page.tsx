"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TreeWithSearch from "@/components/admin/TreeWithSearch";
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
}

const LEVEL_LABELS: Record<string, string> = {
  admin: "관리자", head: "본사", sub_head: "부본사", distributor: "총판", store: "매장",
};

export default function PartnerToPartnerPage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPartner, setSelectedPartner] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "partner_to_partner");
      params.set("date_from", dateFrom);
      params.set("date_to", dateTo);
      if (search) params.set("search", search);
      if (selectedPartner) params.set("partner_id", selectedPartner);
      params.set("limit", "200");

      const res = await fetch(`/api/money/history?${params.toString()}`);
      const json = await res.json();
      if (json.data) setTransfers(json.data);
    } catch {
      console.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search, selectedPartner]);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        <button onClick={setYesterday} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold">어제</button>
        <Input
          placeholder="아이디,대상ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData()}
          className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
        />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
        <button onClick={fetchData} className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
      </div>
      <div className="flex gap-5">
        <TreeWithSearch buttonLabel="회원목록 바로가기" onSelect={setSelectedPartner} selectedId={selectedPartner} />
        <div className="flex-1">
          <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
            <Table>
              <TableHeader>
                <TableRow className="border-green-900/15 hover:bg-transparent">
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3" rowSpan={2}>#</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3" rowSpan={2}>아이디</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3" rowSpan={2}>닉네임</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3" rowSpan={2}>구분</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3" rowSpan={2}>형태</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3" rowSpan={2}>대상ID</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3 bg-green-500/5" colSpan={3}>보낸 내역</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3 bg-sky-500/5" colSpan={3}>받은 내역</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3" rowSpan={2}>일시</TableHead>
                </TableRow>
                <TableRow className="border-green-900/15 hover:bg-transparent">
                  <TableHead className="text-center text-[10px] text-white/60 py-2 bg-green-500/5">실행 전</TableHead>
                  <TableHead className="text-center text-[10px] text-white/60 py-2 bg-green-500/5">실행금액</TableHead>
                  <TableHead className="text-center text-[10px] text-white/60 py-2 bg-green-500/5">실행 후</TableHead>
                  <TableHead className="text-center text-[10px] text-white/60 py-2 bg-sky-500/5">이전 머니</TableHead>
                  <TableHead className="text-center text-[10px] text-white/60 py-2 bg-sky-500/5">실행금액</TableHead>
                  <TableHead className="text-center text-[10px] text-white/60 py-2 bg-sky-500/5">이후 머니</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-20">
                      <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                      <div className="text-white/30 text-sm mt-3">로딩 중...</div>
                    </TableCell>
                  </TableRow>
                ) : transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-20 text-white/30 text-sm">데이터가 없습니다</TableCell>
                  </TableRow>
                ) : (
                  transfers.map((t, idx) => (
                    <TableRow key={t.id} className="border-green-900/10 hover:bg-white/[0.02]">
                      <TableCell className="text-center text-xs text-white/60 font-mono">{idx + 1}</TableCell>
                      <TableCell className="text-center text-xs text-purple-400 font-semibold">{t.from_partner?.username || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/70">{t.from_partner?.nickname || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/60">{t.from_partner ? LEVEL_LABELS[t.from_partner.level] || t.from_partner.level : "-"}</TableCell>
                      <TableCell className="text-center text-xs font-bold text-blue-400">보냄--&gt;</TableCell>
                      <TableCell className="text-center text-xs text-white/80">{t.to_partner?.username || "-"}</TableCell>
                      {/* 보낸 내역 */}
                      <TableCell className="text-center text-xs text-white/70 font-mono bg-green-500/[0.02]">{t.from_balance_before.toLocaleString()}</TableCell>
                      <TableCell className="text-center text-xs text-red-400 font-mono font-semibold bg-green-500/[0.02]">{t.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-center text-xs text-white/70 font-mono bg-green-500/[0.02]">{t.from_balance_after.toLocaleString()}</TableCell>
                      {/* 받은 내역 */}
                      <TableCell className="text-center text-xs text-white/70 font-mono bg-sky-500/[0.02]">{t.to_balance_before.toLocaleString()}</TableCell>
                      <TableCell className="text-center text-xs text-blue-400 font-mono font-semibold bg-sky-500/[0.02]">{t.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-center text-xs text-white/70 font-mono bg-sky-500/[0.02]">{t.to_balance_after.toLocaleString()}</TableCell>
                      <TableCell className="text-center text-xs text-white/60">
                        {new Date(t.created_at).toLocaleString("ko-KR", {
                          year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))
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
      </div>
    </div>
  );
}
