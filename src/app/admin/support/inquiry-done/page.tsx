"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Inquiry {
  id: string;
  title: string;
  content: string;
  status: string;
  answer_content: string | null;
  answered_at: string | null;
  created_at: string;
  member: {
    id: string;
    username: string;
    nickname: string;
    bank_holder: string | null;
    bank_account: string | null;
    store_id: string | null;
    partners?: {
      id: string;
      username: string;
      nickname: string;
      level: string;
    } | null;
  } | null;
}

export default function InquiryDonePage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split("T")[0];

  const fetchInquiries = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: "done" });
      if (search) params.set("search", search);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`/api/support/inquiries?${params}`);
      const json = await res.json();
      if (json.data) setInquiries(json.data);
    } catch {
      console.error("Failed to fetch inquiries");
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === inquiries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(inquiries.map((i) => i.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/support/inquiries/${id}`, { method: "DELETE" })
        )
      );
      setSelectedIds(new Set());
      fetchInquiries();
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/support/inquiries/${id}`, { method: "DELETE" });
      if (res.ok) fetchInquiries();
      else alert("삭제에 실패했습니다.");
    } catch {
      alert("서버 오류가 발생했습니다.");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-green-400 font-bold text-lg mb-5">1:1 문의(완료) <span className="text-sm text-white/50">({inquiries.length}건)</span></div>
        <div className="flex items-center justify-between mb-4">
          <div />
          <div className="flex items-center gap-2">
            <Input
              placeholder="검색어"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchInquiries()}
              className="w-32 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
            <Input
              type="date"
              value={dateFrom || today}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
            />
            <Input
              type="date"
              value={dateTo || today}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
            />
            <button onClick={fetchInquiries} className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={selectAll} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold">
            {selectedIds.size === inquiries.length && inquiries.length > 0 ? "전체해제" : "전체선택"}
          </button>
          <button onClick={handleDeleteSelected} className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold">선택삭제</button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["선택", "#", "상위ID", "접속ID", "닉네임", "회원구분", "예금주명", "제목", "등록일시", "답변일시", "삭제"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-20">
                  <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                </TableCell>
              </TableRow>
            ) : inquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-20 text-white/30 text-sm">완료된 문의가 없습니다</TableCell>
              </TableRow>
            ) : (
              inquiries.map((inq, idx) => {
                const member = inq.member;
                const partner = member?.partners;
                const isExpanded = expandedId === inq.id;

                return (
                  <>
                    <TableRow
                      key={inq.id}
                      className={`border-green-900/10 cursor-pointer transition-colors ${isExpanded ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}
                      onClick={() => toggleExpand(inq.id)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inq.id)}
                          onChange={() => toggleSelect(inq.id)}
                          className="w-4 h-4 rounded border-white/20 bg-neutral-800"
                        />
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/60">{inquiries.length - idx}</TableCell>
                      <TableCell className="text-center text-xs text-purple-400">{partner?.nickname || partner?.username || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/80">{member?.username || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/70">{member?.nickname || "-"}</TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-600 text-white">유저</span>
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/60">{member?.bank_holder || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-white/80 max-w-[200px] truncate">
                        <div className="flex items-center justify-center gap-1">
                          {inq.title}
                          {isExpanded ? <ChevronUp size={12} className="text-green-400" /> : <ChevronDown size={12} className="text-white/40" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/60">{formatDate(inq.created_at)}</TableCell>
                      <TableCell className="text-center text-xs text-green-400">{inq.answered_at ? formatDate(inq.answered_at) : "-"}</TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(inq.id); }}
                          className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-500"
                        >삭제</button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow key={`${inq.id}-detail`} className="border-green-900/10">
                        <TableCell colSpan={11} className="p-0">
                          <div className="p-5 space-y-4 bg-neutral-900/50">
                            <div>
                              <div className="text-xs text-white/50 mb-1">문의 내용</div>
                              <div className="text-sm text-white/80 bg-neutral-800 rounded-lg p-4 whitespace-pre-wrap">{inq.content}</div>
                            </div>
                            <div>
                              <div className="text-xs text-green-400 mb-1">답변 내용</div>
                              <div className="text-sm text-white/80 bg-green-900/20 border border-green-900/20 rounded-lg p-4 whitespace-pre-wrap">{inq.answer_content || "답변 없음"}</div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5"><option>100줄</option></select>
        </div>
      </div>
    </div>
  );
}
