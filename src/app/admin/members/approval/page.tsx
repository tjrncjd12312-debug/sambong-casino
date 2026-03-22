"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface MemberPartner {
  id: string;
  username: string;
  nickname: string;
  level: string;
  parent_id: string | null;
}

interface Member {
  id: string;
  username: string;
  nickname: string;
  phone: string | null;
  bank_name: string | null;
  bank_holder: string | null;
  created_at: string;
  store_id: string;
  partners: MemberPartner | null;
}

const LEVEL_BADGE: Record<string, { label: string; color: string }> = {
  admin: { label: "관", color: "bg-purple-600" },
  head: { label: "본", color: "bg-blue-600" },
  sub_head: { label: "부", color: "bg-cyan-600" },
  distributor: { label: "총", color: "bg-orange-600" },
  store: { label: "매", color: "bg-green-600" },
};

export default function MemberApprovalPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/members?status=pending&sort=created_at_desc");
      const json = await res.json();
      if (json.data) {
        setMembers(json.data);
      }
    } catch {
      console.error("Failed to fetch pending members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        const json = await res.json();
        alert(json.error || "승인 실패");
      }
    } catch {
      alert("승인 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("정말 반려하시겠습니까?")) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        const json = await res.json();
        alert(json.error || "반려 실패");
      }
    } catch {
      alert("반려 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      alert("선택된 회원이 없습니다.");
      return;
    }
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleApprove(id);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) {
      alert("선택된 회원이 없습니다.");
      return;
    }
    if (!confirm(`선택된 ${selectedIds.size}명을 일괄 반려하시겠습니까?`)) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      setProcessingId(id);
      try {
        await fetch(`/api/members/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "inactive" }),
        });
        setMembers((prev) => prev.filter((m) => m.id !== id));
      } catch {
        // continue
      }
    }
    setSelectedIds(new Set());
    setProcessingId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.id)));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPartnerInfo = (partner: MemberPartner | null) => {
    if (!partner) return "-";
    const info = LEVEL_BADGE[partner.level] || { label: "?", color: "bg-gray-600" };
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 text-xs text-white/70">
        <span className={`w-3.5 h-3.5 ${info.color} rounded-sm text-[8px] text-white flex items-center justify-center font-bold`}>
          {info.label}
        </span>
        {partner.nickname || partner.username}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Table */}
      <div
        className="rounded-2xl border border-green-900/15 overflow-hidden"
        style={{ background: "rgba(17,17,17,0.9)" }}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-green-900/15 hover:bg-transparent">
                <TableHead className="text-center text-xs text-white/70 font-bold py-3 w-10">
                  <input
                    type="checkbox"
                    checked={members.length > 0 && selectedIds.size === members.length}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-transparent"
                  />
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  #
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  회원ID
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  닉네임
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  소속
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  전화번호
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  은행명
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  예금주
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  가입일시
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  승인
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  거절
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-green-900/10">
                  <TableCell colSpan={11} className="text-center py-20">
                    <Loader2
                      className="animate-spin text-green-500 mx-auto"
                      size={28}
                    />
                    <div className="text-white/30 text-sm mt-3">로딩 중...</div>
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow className="border-green-900/10">
                  <TableCell
                    colSpan={11}
                    className="text-center py-32 text-white/30 text-sm"
                  >
                    승인 대기중인 회원이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member, idx) => (
                  <TableRow
                    key={member.id}
                    className="border-green-900/10 hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.id)}
                        onChange={() => toggleSelect(member.id)}
                        className="rounded border-white/20 bg-transparent"
                      />
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/60">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-bold text-white">
                        {member.username}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-green-400">
                      {member.nickname}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPartnerInfo(member.partners)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/70">
                      {member.phone || "-"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/70">
                      {member.bank_name || "-"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/70">
                      {member.bank_holder || "-"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/60">
                      {formatDate(member.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleApprove(member.id)}
                        disabled={processingId === member.id}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {processingId === member.id ? (
                          <Loader2 className="animate-spin inline" size={12} />
                        ) : (
                          "승인"
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleReject(member.id)}
                        disabled={processingId === member.id}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {processingId === member.id ? (
                          <Loader2 className="animate-spin inline" size={12} />
                        ) : (
                          "거절"
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Bottom Buttons */}
        <div className="flex justify-end gap-2 p-4 border-t border-green-900/10">
          <button
            onClick={handleBulkApprove}
            className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors"
          >
            일괄승인
          </button>
          <button
            onClick={handleBulkReject}
            className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-colors"
          >
            일괄반려
          </button>
        </div>
      </div>
    </div>
  );
}
