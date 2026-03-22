"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TreeWithSearch from "@/components/admin/TreeWithSearch";
import { Loader2 } from "lucide-react";

interface DepositRequest {
  id: string;
  member_id: string;
  store_id: string;
  amount: number;
  bonus_amount: number;
  status: string;
  depositor_name: string | null;
  bank_name: string | null;
  memo: string | null;
  reject_reason: string | null;
  processed_at: string | null;
  created_at: string;
  member: {
    id: string;
    username: string;
    nickname: string;
    balance: number;
    store_id: string;
    bank_name: string | null;
    bank_account: string | null;
    bank_holder: string | null;
    partners: { id: string; username: string; nickname: string; level: string } | null;
  } | null;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getQuickDate(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().split("T")[0];
}

export default function DepositRequestPage() {
  const today = new Date().toISOString().split("T")[0];
  const [data, setData] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [summary, setSummary] = useState({ totalAmount: 0, totalCount: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "pending" });
      if (selectedStoreId) params.set("store_id", selectedStoreId);
      if (searchKeyword) params.set("search", searchKeyword);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/deposit?${params}`);
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        setSummary(json.summary || { totalAmount: 0, totalCount: 0 });
      }
    } catch {
      console.error("Failed to fetch deposit requests");
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, searchKeyword, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    if (!confirm("이 충전 신청을 승인하시겠습니까?")) return;
    setProcessing(id);
    try {
      const res = await fetch(`/api/deposit/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "승인에 실패했습니다.");
      } else {
        fetchData();
      }
    } catch {
      alert("승인 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("거절 사유를 입력해주세요:");
    if (reason === null) return;
    setProcessing(id);
    try {
      const res = await fetch(`/api/deposit/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reject_reason: reason }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "거절에 실패했습니다.");
      } else {
        fetchData();
      }
    } catch {
      alert("거절 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const setQuickDate = (offset: number) => {
    const d = getQuickDate(offset);
    setDateFrom(d);
    setDateTo(d);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select className="h-9 bg-neutral-900 border border-white/10 text-white text-xs rounded-lg px-2">
          <option>접속ID</option>
          <option>닉네임</option>
          <option>입금자명</option>
        </select>
        <Input
          placeholder="검색어"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-32 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
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
          onClick={() => fetchData()}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold hover:from-green-400 hover:to-emerald-500 transition-all"
        >
          검색
        </button>
        <button onClick={() => setQuickDate(0)} className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-500 transition-colors">
          오늘
        </button>
        <button onClick={() => setQuickDate(1)} className="px-3 py-2 rounded-lg border border-white/10 text-white/60 text-xs hover:border-white/30 transition-colors">
          어제
        </button>
        <button onClick={() => setQuickDate(2)} className="px-3 py-2 rounded-lg border border-white/10 text-white/60 text-xs hover:border-white/30 transition-colors">
          그저께
        </button>
      </div>

      {/* Summary */}
      <div className="text-sm text-white/80">
        충전 대기 : <span className="text-green-400 font-bold">{data.length}건</span>
      </div>

      {/* Content */}
      <div className="flex gap-5">
        <TreeWithSearch buttonLabel="회원목록 바로가기" onSelect={(id) => setSelectedStoreId(id)} />

        <div className="flex-1">
          <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
            <Table>
              <TableHeader>
                <TableRow className="border-green-900/15 hover:bg-transparent">
                  {["#", "회원번호", "회원ID", "닉네임", "소속", "입금요청금액", "보너스", "입금자명", "현재 잔고", "요청일시", "메모", "승인", "거부"].map((h) => (
                    <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3 whitespace-nowrap">
                      {h}
                    </TableHead>
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
                      충전 신청 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, idx) => (
                    <TableRow key={item.id} className="border-green-900/10 hover:bg-white/[0.02]">
                      <TableCell className="text-center text-xs text-white/60">{idx + 1}</TableCell>
                      <TableCell className="text-center text-xs text-white/60 font-mono">{item.member_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-center text-xs text-white/90 font-medium">{item.member?.username || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/70">{item.member?.nickname || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/60">
                        {item.member?.partners?.nickname || item.member?.partners?.username || "-"}
                      </TableCell>
                      <TableCell className="text-center text-xs text-green-400 font-bold">
                        {Number(item.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-xs text-yellow-400">
                        {Number(item.bonus_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/70">{item.depositor_name || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/60 font-mono">
                        {Number(item.member?.balance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/50">{formatDate(item.created_at)}</TableCell>
                      <TableCell className="text-center text-xs text-white/50 max-w-[100px] truncate">{item.memo || "-"}</TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={processing === item.id}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold hover:bg-green-500 transition-colors disabled:opacity-50"
                        >
                          {processing === item.id ? "..." : "승인"}
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={processing === item.id}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-500 transition-colors disabled:opacity-50"
                        >
                          {processing === item.id ? "..." : "거절"}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex justify-center py-4 border-t border-green-900/10">
              <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5">
                <option>100줄</option>
                <option>50줄</option>
                <option>200줄</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
