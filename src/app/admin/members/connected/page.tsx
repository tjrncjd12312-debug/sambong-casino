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
import TreeWithSearch from "@/components/admin/TreeWithSearch";
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
  status: string;
  balance: number;
  point_rolling: number;
  last_login_at: string | null;
  last_login_ip: string | null;
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

export default function ConnectedMembersPage() {
  const [selectedPartner, setSelectedPartner] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnected = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "active");
      params.set("sort", "last_login_desc");
      params.set("limit", "100");
      if (selectedPartner) params.set("store_id", selectedPartner);

      const res = await fetch(`/api/members?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setMembers(json.data);
      }
    } catch {
      console.error("Failed to fetch connected members");
    } finally {
      setLoading(false);
    }
  }, [selectedPartner]);

  useEffect(() => {
    fetchConnected();
  }, [fetchConnected]);

  const formatNumber = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "0";
    return Number(n).toLocaleString();
  };

  const getPartnerBadge = (partner: MemberPartner | null) => {
    if (!partner) return null;
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
      <div className="flex gap-5">
        {/* Left - Tree */}
        <TreeWithSearch
          buttonLabel="배팅통합내역 바로가기"
          showBlockedBtn={true}
          onSelect={(id) => setSelectedPartner(id)}
          selectedId={selectedPartner}
        />

        {/* Right - Connected Users */}
        <div className="flex-1 space-y-4">
          {/* Info Text */}
          <div
            className="rounded-xl border border-green-900/15 p-4 space-y-1"
            style={{ background: "rgba(17,17,17,0.9)" }}
          >
            <p className="text-xs text-white/70">
              ※ 실롤링=본인이 실제 지급받는 롤링금(본인요율-접속ID요율)
            </p>
            <p className="text-xs text-white/70">
              ※ 총입금/총출금, 베팅/당첨(슬롯), 베팅/당첨(카지노)는 금일의 합계입니다.
            </p>
            <p className="text-xs text-white/70">
              ※ 강제종료=게임사이트의 로그아웃 기능입니다.게임실행 중인 상태의
              종료가 아님을 알립니다.
            </p>
          </div>

          {/* Table */}
          <div
            className="rounded-2xl border border-green-900/15 overflow-hidden"
            style={{ background: "rgba(17,17,17,0.9)" }}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-green-900/15 hover:bg-transparent">
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      #
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      접속ID
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      닉네임
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      그룹설정
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      소속
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      보유머니
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      수동관리
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      충전
                      <br />
                      환전
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      지급(받음)
                      <br />
                      회수(보냄)
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      베팅/당첨
                      <br />
                      롤링(슬)
                      <br />
                      실롤링
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      베팅/당첨
                      <br />
                      롤링(카)
                      <br />
                      실롤링
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      최근실행게임
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">
                      강제종료
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow className="border-green-900/10">
                      <TableCell colSpan={13} className="text-center py-20">
                        <Loader2
                          className="animate-spin text-green-500 mx-auto"
                          size={28}
                        />
                        <div className="text-white/30 text-sm mt-3">
                          로딩 중...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow className="border-green-900/10">
                      <TableCell
                        colSpan={13}
                        className="text-center py-20 text-white/30 text-sm"
                      >
                        접속 중인 회원이 없습니다
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
                          <span className="text-sm font-bold text-white">
                            {member.username}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <button className="px-2.5 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-500 transition-colors">
                              상세보기
                            </button>
                            <div className="text-xs text-green-400 mt-1">
                              {member.nickname}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs text-white/70 max-w-[140px] truncate">
                          -
                        </TableCell>
                        <TableCell className="text-center">
                          {getPartnerBadge(member.partners)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <div className="text-[10px] text-sky-400 mb-1 cursor-pointer" onClick={fetchConnected}>
                              새로고침
                            </div>
                            <span className="inline-block px-2.5 py-1 bg-green-600 text-white text-xs font-bold rounded">
                              {formatNumber(member.balance)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-500 transition-colors">
                              알지급
                            </button>
                            <button className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-500 transition-colors">
                              알회수
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/80">0</div>
                          <div className="text-white/60">0</div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/80">0</div>
                          <div className="text-white/60">0</div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/80">0/0</div>
                          <div className="text-green-400">0</div>
                          <div className="text-white/50">0</div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/80">0/0</div>
                          <div className="text-green-400">0</div>
                          <div className="text-white/50">0</div>
                        </TableCell>
                        <TableCell className="text-center text-xs text-white/50">
                          -
                        </TableCell>
                        <TableCell className="text-center">
                          <button className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-500 transition-colors">
                            로그아웃
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
