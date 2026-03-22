"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
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
}

interface Member {
  id: string;
  username: string;
  nickname: string;
  balance: number;
  max_win_amount: number | null;
  last_login_at: string | null;
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

export default function MaxWinPage() {
  const [searchUser, setSearchUser] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<"current" | "previous">("current");

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sort", "balance_desc");
      params.set("limit", "100");
      if (searchUser) params.set("search", searchUser);

      const res = await fetch(`/api/members?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        // Filter to members with notable wins (max_win_amount set)
        setMembers(json.data);
      }
    } catch {
      console.error("Failed to fetch max win data");
    } finally {
      setLoading(false);
    }
  }, [searchUser]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearch = () => {
    fetchMembers();
  };

  const formatNumber = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "0";
    return Number(n).toLocaleString();
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

  const getPartnerBadge = (partner: MemberPartner | null) => {
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
      {/* Month Filter */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setMonthFilter("previous")}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-colors border ${
            monthFilter === "previous"
              ? "border-green-500/30 text-green-400 bg-green-500/10"
              : "border-white/10 text-white/70 hover:bg-white/5"
          }`}
        >
          지난달
        </button>
        <button
          onClick={() => setMonthFilter("current")}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-colors border ${
            monthFilter === "current"
              ? "border-green-500/30 text-green-400 bg-green-500/10"
              : "border-white/10 text-white/70 hover:bg-white/5"
          }`}
        >
          이번달
        </button>
      </div>

      {/* Content */}
      <div
        className="rounded-2xl border border-green-900/15 overflow-hidden"
        style={{ background: "rgba(17,17,17,0.9)" }}
      >
        {/* Header */}
        <div className="p-5 border-b border-green-900/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full" />
              <span className="text-white font-bold">
                최대 당첨금 회원 이력
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors">
                설정바로가기
              </button>
              <div className="flex items-center gap-4 text-sm">
                <span>
                  슬롯설정액:
                  <span className="text-green-400 font-bold ml-1">
                    3,000,000
                  </span>
                </span>
                <span>
                  카지노설정액:
                  <span className="text-red-400 font-bold ml-1">
                    10,000,000
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  placeholder="사용자"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-32 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold hover:from-green-400 hover:to-emerald-500 transition-all"
                >
                  검색
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-green-900/15 hover:bg-transparent">
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  #
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  사용자
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  소속
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  게임사
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  게임이름
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  라운드ID
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  베팅
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  당첨
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  잔액
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  날짜
                </TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                  확인
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
                    최대 당첨 데이터가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member, idx) => (
                  <TableRow
                    key={member.id}
                    className="border-green-900/10 hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="text-center text-xs text-white/60">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-center">
                      <div>
                        <span className="text-sm font-bold text-white">
                          {member.username}
                        </span>
                        <div className="text-[10px] text-green-400">
                          {member.nickname}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getPartnerBadge(member.partners)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/50">
                      -
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/50">
                      -
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/50 font-mono">
                      -
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-white/70">
                      -
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-bold text-green-400 font-mono">
                        {formatNumber(member.max_win_amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-white/70">
                      {formatNumber(member.balance)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/60">
                      {formatDate(member.last_login_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button className="px-2.5 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-500 transition-colors">
                        확인
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5">
            <option>100줄</option>
            <option>50줄</option>
            <option>200줄</option>
          </select>
        </div>
      </div>
    </div>
  );
}
