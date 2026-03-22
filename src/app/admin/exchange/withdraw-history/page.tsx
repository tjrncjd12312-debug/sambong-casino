"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TreeWithSearch from "@/components/admin/TreeWithSearch";
import { Loader2 } from "lucide-react";

interface WithdrawRequest {
  id: string;
  member_id: string;
  store_id: string;
  amount: number;
  status: string;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
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

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
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

export default function WithdrawHistoryPage() {
  const today = new Date().toISOString().split("T")[0];
  const [activeTab, setActiveTab] = useState<"approved" | "rejected">("approved");
  const [data, setData] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [summary, setSummary] = useState({ totalAmount: 0, totalCount: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "processed" });
      if (selectedStoreId) params.set("store_id", selectedStoreId);
      if (searchKeyword) params.set("search", searchKeyword);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/withdraw?${params}`);
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        setSummary(json.summary || { totalAmount: 0, totalCount: 0 });
      }
    } catch {
      console.error("Failed to fetch withdraw history");
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, searchKeyword, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = data.filter((item) => item.status === activeTab);

  const setQuickDate = (offset: number) => {
    const d = getQuickDate(offset);
    setDateFrom(d);
    setDateTo(d);
  };

  const tabs = [
    { label: "승인내역", value: "approved" as const, color: "bg-purple-600" },
    { label: "거절내역", value: "rejected" as const, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="text-sm text-white/80">
        총환전 : <span className="text-orange-400 font-bold">{summary.totalAmount.toLocaleString()}</span>
        (<span className="text-orange-400">{summary.totalCount}건</span>)
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors ${
              activeTab === t.value ? t.color : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
        <select className="h-9 bg-neutral-900 border border-white/10 text-white text-xs rounded-lg px-2">
          <option>접속ID</option>
          <option>닉네임</option>
          <option>예금주</option>
        </select>
        <Input
          placeholder="검색어"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-28 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
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
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold hover:from-green-400 hover:to-emerald-500 transition-all"
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

      {/* Content */}
      <div className="flex gap-5">
        <TreeWithSearch buttonLabel="회원목록 바로가기" onSelect={(id) => setSelectedStoreId(id)} />

        <div className="flex-1">
          <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
            <Table>
              <TableHeader>
                <TableRow className="border-green-900/15 hover:bg-transparent">
                  {["#", "구분", "환전 금액", "회원ID\n(닉네임)", "소속", "예금주", "은행명", "출금계좌", "요청일시\n처리일시", "상태", "상세정보", "메모"].map((h) => (
                    <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">
                      <span dangerouslySetInnerHTML={{ __html: h.replace(/\n/g, "<br/>") }} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-20">
                      <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-20 text-white/30 text-sm">
                      데이터가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, idx) => (
                    <TableRow key={item.id} className="border-green-900/10 hover:bg-white/[0.02]">
                      <TableCell className="text-center text-xs text-white/60">{idx + 1}</TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="px-2 py-0.5 rounded bg-orange-600/20 text-orange-400 text-[10px] font-bold">환전</span>
                      </TableCell>
                      <TableCell className="text-center text-xs text-red-400 font-bold">
                        {Number(item.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <div className="text-white/90 font-medium">{item.member?.username || "-"}</div>
                        <div className="text-white/50 text-[10px]">({item.member?.nickname || "-"})</div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/60">
                        {item.member?.partners?.nickname || item.member?.partners?.username || "-"}
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/70">{item.bank_holder || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/70">{item.bank_name || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/60 font-mono">{item.bank_account || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/50">
                        <div>{formatDate(item.created_at)}</div>
                        <div className="text-green-400/60">{formatDate(item.processed_at)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status === "approved" ? (
                          <span className="px-2 py-1 rounded-full bg-green-600/20 text-green-400 text-[10px] font-bold">승인</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-red-600/20 text-red-400 text-[10px] font-bold">거절</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/50">
                        {item.status === "rejected" && item.reject_reason ? (
                          <span className="text-red-400 text-[10px]" title={item.reject_reason}>
                            {item.reject_reason.length > 10 ? item.reject_reason.slice(0, 10) + "..." : item.reject_reason}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/50 max-w-[100px] truncate">{item.memo || "-"}</TableCell>
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
