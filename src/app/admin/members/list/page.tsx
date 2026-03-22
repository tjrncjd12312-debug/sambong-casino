"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TreeWithSearch from "@/components/admin/TreeWithSearch";
import MoneyModal from "@/components/admin/MoneyModal";
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
  phone: string | null;
  balance: number;
  point_rolling: number;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  max_win_amount: number | null;
  is_bet_blocked: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  store_id: string;
  partners: MemberPartner | null;
}

const SORT_OPTIONS = [
  { label: "아이디 순", value: "username" },
  { label: "최신가입 순", value: "created_at_desc" },
  { label: "보유머니 순", value: "balance_desc" },
  { label: "최신활동 순", value: "last_login_desc" },
  { label: "오래된접속 순", value: "last_login_asc" },
];

const LEVEL_BADGE: Record<string, { label: string; color: string }> = {
  admin: { label: "관", color: "bg-purple-600" },
  head: { label: "본", color: "bg-blue-600" },
  sub_head: { label: "부", color: "bg-cyan-600" },
  distributor: { label: "총", color: "bg-orange-600" },
  store: { label: "매", color: "bg-green-600" },
};

export default function MemberListPage() {
  const router = useRouter();
  const [selectedPartner, setSelectedPartner] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSort, setActiveSort] = useState("username");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(100);
  const [moneyModal, setMoneyModal] = useState<{
    isOpen: boolean;
    mode: "give" | "take";
    targetId: string;
    targetName: string;
    currentBalance: number;
  }>({ isOpen: false, mode: "give", targetId: "", targetName: "", currentBalance: 0 });
  const [batchLoading, setBatchLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const actionButtons = [
    { label: "일괄지급", color: "bg-orange-500 hover:bg-orange-400" },
    { label: "일괄회수", color: "bg-red-500 hover:bg-red-400" },
    { label: "전체카지노 ON", color: "bg-sky-600 hover:bg-sky-500" },
    { label: "하부전체 비번변경", color: "bg-purple-600 hover:bg-purple-500" },
    { label: "하부전체 차단", color: "bg-blue-700 hover:bg-blue-600" },
    { label: "하부전체 삭제", color: "bg-red-600 hover:bg-red-500" },
  ];

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPartner) params.set("store_id", selectedPartner);
      if (activeSort) params.set("sort", activeSort);
      params.set("limit", pageSize.toString());

      const res = await fetch(`/api/members?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setMembers(json.data);
      }
    } catch {
      console.error("Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, [selectedPartner, activeSort, pageSize]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPartner) params.set("store_id", selectedPartner);
      if (searchTerm) params.set("search", searchTerm);
      if (activeSort) params.set("sort", activeSort);
      params.set("limit", pageSize.toString());

      const res = await fetch(`/api/members?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setMembers(json.data);
      }
    } catch {
      console.error("Failed to search members");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchMoney = async (mode: "give" | "take") => {
    if (selectedIds.size === 0) {
      alert("대상 회원을 선택해주세요.");
      return;
    }
    const amountStr = prompt(
      `선택된 ${selectedIds.size}명에게 ${mode === "give" ? "일괄지급" : "일괄회수"}할 금액을 입력하세요:`
    );
    if (!amountStr) return;
    const amount = Number(amountStr.replace(/[^0-9]/g, ""));
    if (!amount || amount <= 0) {
      alert("올바른 금액을 입력해주세요.");
      return;
    }
    const memoStr = prompt("메모 (선택):") || "";
    const confirmMsg = `선택된 ${selectedIds.size}명에게 ${amount.toLocaleString()}원을 ${mode === "give" ? "지급" : "회수"}하시겠습니까?`;
    if (!confirm(confirmMsg)) return;

    setBatchLoading(true);
    const endpoint = mode === "give" ? "/api/money/give" : "/api/money/take";
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_type: "member", target_id: id, amount, memo: memoStr }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setBatchLoading(false);
    alert(`완료: 성공 ${successCount}건, 실패 ${failCount}건`);
    setSelectedIds(new Set());
    fetchMembers();
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
      {/* Sort Tabs */}
      <div className="flex items-center gap-2">
        {SORT_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveSort(tab.value)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border ${
              activeSort === tab.value
                ? "bg-white/10 text-white border-white/20"
                : "text-white/50 border-white/5 hover:text-white hover:border-white/15"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex gap-5">
        {/* Left - Tree */}
        <TreeWithSearch
          buttonLabel="접속자목록 바로가기"
          onSelect={setSelectedPartner}
          selectedId={selectedPartner}
        />

        {/* Right - Member List */}
        <div className="flex-1 space-y-4">
          {/* Search & Actions */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-green-400">
              *닉네임 클릭 가능/소속 박스를 통하여 상위 계정으로 바로 이동
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="ID, 닉네임, 입금자, 계좌번호 또는 전화번호"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-72 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
              />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
              />
              <button
                onClick={handleSearch}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/10"
              >
                검색
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {actionButtons.map((btn) => (
              <button
                key={btn.label}
                disabled={batchLoading}
                onClick={() => {
                  if (btn.label === "일괄지급") handleBatchMoney("give");
                  else if (btn.label === "일괄회수") handleBatchMoney("take");
                }}
                className={`px-4 py-2 rounded-lg text-white text-xs font-bold transition-colors ${btn.color} disabled:opacity-50`}
              >
                {batchLoading && (btn.label === "일괄지급" || btn.label === "일괄회수")
                  ? "처리중..."
                  : btn.label}
              </button>
            ))}
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
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3 w-10">
                      <input
                        type="checkbox"
                        checked={members.length > 0 && selectedIds.size === members.length}
                        onChange={toggleSelectAll}
                        className="rounded border-white/20 bg-transparent"
                      />
                    </TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">회원ID</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">닉네임</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">그룹<br />설정</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">소속</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">보유머니</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">포인트<br />롤링</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">충환건</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">충지급(받음)<br />충회수(보냄)</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">충입금<br />총출금</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">베팅/당첨<br />배-당<br />롤링 (슬롯)</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">베팅/당첨<br />배-당<br />롤링 (카지노)</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">입출금</TableHead>
                    <TableHead className="text-center text-xs text-white/70 font-bold py-3">상세정보</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow className="border-green-900/10">
                      <TableCell colSpan={14} className="text-center py-20">
                        <Loader2 className="animate-spin text-green-500 mx-auto" size={28} />
                        <div className="text-white/30 text-sm mt-3">로딩 중...</div>
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow className="border-green-900/10">
                      <TableCell colSpan={14} className="text-center py-20 text-white/30 text-sm">
                        회원 데이터가 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
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
                        <TableCell className="text-center">
                          <span className="text-sm font-bold text-white">{member.username}</span>
                          {member.status === "blocked" && (
                            <span className="ml-1 text-[9px] px-1 py-0.5 bg-red-600 text-white rounded">차단</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <button className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium">
                            {member.nickname}
                          </button>
                        </TableCell>
                        <TableCell className="text-center text-xs text-white/50">-</TableCell>
                        <TableCell className="text-center">
                          {getPartnerBadge(member.partners)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-block px-2.5 py-1 bg-green-600 text-white text-xs font-bold rounded">
                            {formatNumber(member.balance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-white/70">
                          {formatNumber(member.point_rolling)}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-white/50">
                          0/0
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/70">0</div>
                          <div className="text-white/50">0</div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/70">0</div>
                          <div className="text-white/50">0</div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/70">0/0</div>
                          <div className="text-green-400">0</div>
                          <div className="text-white/50">0</div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/70">0/0</div>
                          <div className="text-green-400">0</div>
                          <div className="text-white/50">0</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                setMoneyModal({
                                  isOpen: true,
                                  mode: "give",
                                  targetId: member.id,
                                  targetName: member.nickname || member.username,
                                  currentBalance: member.balance,
                                })
                              }
                              className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-500 transition-colors"
                            >
                              알지급
                            </button>
                            <button
                              onClick={() =>
                                setMoneyModal({
                                  isOpen: true,
                                  mode: "take",
                                  targetId: member.id,
                                  targetName: member.nickname || member.username,
                                  currentBalance: member.balance,
                                })
                              }
                              className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-400 transition-colors"
                            >
                              알회수
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => router.push(`/admin/members/detail?id=${member.id}`)}
                            className="px-2.5 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-500 transition-colors"
                          >
                            상세보기
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-4 border-t border-green-900/10">
              <div className="text-xs text-white/40">
                총 {members.length}명
              </div>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5"
              >
                <option value={50}>50줄</option>
                <option value={100}>100줄</option>
                <option value={200}>200줄</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 알지급/알회수 모달 */}
      <MoneyModal
        isOpen={moneyModal.isOpen}
        onClose={() => setMoneyModal((prev) => ({ ...prev, isOpen: false }))}
        onComplete={() => fetchMembers()}
        mode={moneyModal.mode}
        targetType="member"
        targetId={moneyModal.targetId}
        targetName={moneyModal.targetName}
        currentBalance={moneyModal.currentBalance}
      />
    </div>
  );
}
