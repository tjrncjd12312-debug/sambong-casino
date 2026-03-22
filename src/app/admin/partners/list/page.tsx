"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, ChevronDown, Search, Loader2 } from "lucide-react";
import CreatePartnerModal from "@/components/admin/CreatePartnerModal";
import CreateMemberModal from "@/components/admin/CreateMemberModal";
import MoneyModal from "@/components/admin/MoneyModal";

// --- Types ---

interface Partner {
  id: string;
  parent_id: string | null;
  username: string;
  nickname: string;
  level: "admin" | "head" | "sub_head" | "distributor" | "store";
  status: string;
  balance: number;
  rolling_balance: number;
  slot_rolling_pct: number;
  casino_rolling_pct: number;
  slot_losing_pct: number;
  casino_losing_pct: number;
  phone: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  can_give_money: boolean;
  can_take_money: boolean;
  created_at: string;
  last_login_at: string | null;
  memo: string | null;
}

interface TreeNodeData {
  id: string;
  label: string;
  type: string;
  typeBadgeColor: string;
  level: Partner["level"];
  children: TreeNodeData[];
}

// --- Constants ---

const LEVEL_LABELS: Record<string, string> = {
  admin: "관리자",
  head: "본사",
  sub_head: "부본사",
  distributor: "총판",
  store: "매장",
};

const LEVEL_SHORT: Record<string, string> = {
  admin: "관",
  head: "본",
  sub_head: "부",
  distributor: "총",
  store: "매",
};

const LEVEL_BADGE_COLOR: Record<string, string> = {
  admin: "bg-purple-600",
  head: "bg-blue-600",
  sub_head: "bg-cyan-600",
  distributor: "bg-orange-600",
  store: "bg-green-600",
};

// --- Helper: Build tree from flat list ---

function buildTree(partners: Partner[]): TreeNodeData[] {
  const map = new Map<string, TreeNodeData>();
  const roots: TreeNodeData[] = [];

  // Create nodes
  for (const p of partners) {
    map.set(p.id, {
      id: p.id,
      label: p.nickname || p.username,
      type: LEVEL_SHORT[p.level] || p.level,
      typeBadgeColor: LEVEL_BADGE_COLOR[p.level] || "bg-gray-600",
      level: p.level,
      children: [],
    });
  }

  // Build hierarchy
  for (const p of partners) {
    const node = map.get(p.id)!;
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// --- Tree filter by search ---

function filterTree(nodes: TreeNodeData[], term: string): TreeNodeData[] {
  if (!term) return nodes;
  const lower = term.toLowerCase();
  return nodes.reduce<TreeNodeData[]>((acc, node) => {
    const childMatches = filterTree(node.children, term);
    const selfMatches =
      node.id.toLowerCase().includes(lower) ||
      node.label.toLowerCase().includes(lower);
    if (selfMatches || childMatches.length > 0) {
      acc.push({ ...node, children: childMatches });
    }
    return acc;
  }, []);
}

// --- Components ---

function TreeNode({
  node,
  depth = 0,
  selectedId,
  onSelect,
  forceExpand,
}: {
  node: TreeNodeData;
  depth?: number;
  selectedId: string;
  onSelect: (id: string) => void;
  forceExpand?: boolean | null;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  useEffect(() => {
    if (forceExpand === true) setExpanded(true);
    if (forceExpand === false) setExpanded(false);
  }, [forceExpand]);

  return (
    <div>
      <div
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-150 ${
          isSelected
            ? "bg-green-500/15 text-green-400"
            : "text-white/80 hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0 p-0.5 hover:bg-white/10 rounded">
            {expanded ? (
              <ChevronDown size={14} className="text-green-500" />
            ) : (
              <ChevronRight size={14} className="text-white/40" />
            )}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <button onClick={() => onSelect(node.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${node.typeBadgeColor} text-white shrink-0`}
          >
            {node.type}
          </span>
          <span className="font-medium truncate">{node.label}</span>
        </button>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              forceExpand={forceExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-green-900/15 overflow-hidden h-full flex flex-col"
      style={{ background: "rgba(20,20,20,0.8)" }}
    >
      <div className="px-4 py-2.5 border-b border-green-900/15">
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      <div className="p-4 space-y-4 flex-1">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueColor = "text-white",
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-lg border border-white/5 overflow-hidden"
      style={{ background: "rgba(30,30,30,0.6)" }}
    >
      <div className="px-3 py-1.5 border-b border-white/5">
        <span className="text-[11px] text-white/50 font-medium">{label}</span>
      </div>
      <div className={`px-3 py-2 text-sm font-medium ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}

function EditableRow({
  label,
  value,
  onSave,
  saving,
}: {
  label: string;
  value: number;
  onSave?: (newValue: number) => void;
  saving?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="rounded-lg border border-white/5 overflow-hidden"
      style={{ background: "rgba(30,30,30,0.6)" }}
    >
      <div className="px-3 py-1.5 border-b border-white/5">
        <span className="text-[11px] text-white/50 font-medium">{label}</span>
      </div>
      <div className="px-3 py-2 flex items-center gap-2">
        <Input
          ref={inputRef}
          defaultValue={value.toFixed(2)}
          key={value}
          className="h-8 text-sm bg-neutral-900 border-white/10 text-white w-24 rounded-lg"
        />
        <button
          disabled={saving}
          onClick={() => {
            if (onSave && inputRef.current) {
              const v = parseFloat(inputRef.current.value);
              if (!isNaN(v)) onSave(v);
            }
          }}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0 disabled:opacity-50"
        >
          {saving ? "..." : "변경"}
        </button>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function PartnerListPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [childPartners, setChildPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [forceExpand, setForceExpand] = useState<boolean | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [phoneValue, setPhoneValue] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const sortTabs = [
    "디폴드순",
    "생성 순",
    "아이디 순",
    "최신가입 순",
    "보유머니 순",
    "보유롤링금 순",
  ];
  const [activeSort, setActiveSort] = useState("디폴드순");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [moneyModal, setMoneyModal] = useState<{
    isOpen: boolean;
    mode: "give" | "take";
    targetId: string;
    targetName: string;
    currentBalance: number;
  }>({ isOpen: false, mode: "give", targetId: "", targetName: "", currentBalance: 0 });

  // Fetch all partners
  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partners");
      const json = await res.json();
      if (json.data) {
        setPartners(json.data);
        const tree = buildTree(json.data);
        setTreeData(tree);

        // Auto-select the first root (admin) if nothing selected
        if (!selectedPartnerId && json.data.length > 0) {
          const admin = json.data.find((p: Partner) => p.level === "admin");
          if (admin) {
            setSelectedPartnerId(admin.id);
          } else {
            setSelectedPartnerId(json.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch partners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch selected partner detail
  const fetchPartnerDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/partners/${id}`);
      const json = await res.json();
      if (json.data) {
        setSelectedPartner(json.data);
        setPhoneValue(json.data.phone || "");
      }
    } catch (err) {
      console.error("Failed to fetch partner detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Fetch all descendants of selected partner (본인 포함)
  const fetchChildren = useCallback(
    (parentId: string) => {
      const getAllDescendants = (pid: string): Partner[] => {
        const directChildren = partners.filter((p) => p.parent_id === pid);
        let all: Partner[] = [];
        for (const child of directChildren) {
          all.push(child);
          all = all.concat(getAllDescendants(child.id));
        }
        return all;
      };
      const self = partners.find((p) => p.id === parentId);
      const descendants = getAllDescendants(parentId);
      // 본인(admin 제외) + 전체 하부
      if (self && self.level !== "admin") {
        setChildPartners([self, ...descendants]);
      } else {
        setChildPartners(descendants);
      }
    },
    [partners]
  );

  // Initial load
  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // When selected partner changes, fetch detail and children
  useEffect(() => {
    if (selectedPartnerId) {
      fetchPartnerDetail(selectedPartnerId);
      fetchChildren(selectedPartnerId);
    }
  }, [selectedPartnerId, fetchPartnerDetail, fetchChildren]);

  // PATCH partner field
  const patchPartner = async (field: string, value: any) => {
    if (!selectedPartner) return;
    setSavingField(field);
    try {
      const res = await fetch(`/api/partners/${selectedPartner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json();
      if (json.data) {
        setSelectedPartner(json.data);
        // Also update local partners array
        setPartners((prev) =>
          prev.map((p) => (p.id === json.data.id ? json.data : p))
        );
      }
    } catch (err) {
      console.error("Failed to update partner:", err);
    } finally {
      setSavingField(null);
    }
  };

  // Sorted children
  const sortedChildren = [...childPartners].sort((a, b) => {
    switch (activeSort) {
      case "생성 순":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "아이디 순":
        return a.username.localeCompare(b.username);
      case "최신가입 순":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "보유머니 순":
        return b.balance - a.balance;
      case "보유롤링금 순":
        return b.rolling_balance - a.rolling_balance;
      default:
        return 0;
    }
  });

  const filteredTree = filterTree(treeData, searchTerm);

  const getLevelLabel = (level: string) => LEVEL_LABELS[level] || level;
  const getLevelShort = (level: string) => LEVEL_SHORT[level] || level;
  const getLevelBadgeColor = (level: string) =>
    LEVEL_BADGE_COLOR[level] || "bg-gray-600";

  return (
    <div className="space-y-5">
      {/* Sort Tabs */}
      <div className="flex items-center gap-2">
        {sortTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSort(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border ${
              activeSort === tab
                ? "bg-white/10 text-white border-white/20"
                : "text-white/50 border-white/5 hover:text-white hover:border-white/15"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex gap-5">
        {/* Left - Tree */}
        <div
          className="w-64 shrink-0 rounded-2xl border border-green-900/15 overflow-hidden"
          style={{ background: "rgba(17,17,17,0.9)" }}
        >
          <div className="p-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <Input
                placeholder="검색어"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm bg-neutral-900 border-white/10 text-white pl-9 rounded-lg placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="px-3 pb-2 flex flex-col gap-1.5">
            <button className="w-full py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold hover:from-green-400 hover:to-emerald-500 transition-all">
              회원목록 바로가기
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={() => setForceExpand(true)}
                className="flex-1 py-1.5 rounded-lg bg-orange-600 text-white text-[11px] font-bold hover:bg-orange-500 transition-colors"
              >
                모두펼치기
              </button>
              <button
                onClick={() => setForceExpand(false)}
                className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-500 transition-colors"
              >
                모두 접기
              </button>
              <button className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-500 transition-colors">
                차단 회원 표기
              </button>
            </div>
          </div>

          <div className="border-t border-green-900/15 py-2 px-1 max-h-[500px] overflow-y-auto sidebar-scroll">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-green-500" size={20} />
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">
                파트너가 없습니다
              </div>
            ) : (
              filteredTree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  selectedId={selectedPartnerId}
                  onSelect={(id) => {
                    setSelectedPartnerId(id);
                    setForceExpand(null);
                  }}
                  forceExpand={forceExpand}
                />
              ))
            )}
          </div>
        </div>

        {/* Right - Details */}
        <div className="flex-1 space-y-5">
          {/* Date Filter & Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-500 transition-colors">
                하부포함 파트너 노드이동
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                defaultValue={today}
                className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
              />
              <Input
                type="date"
                defaultValue={today}
                className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
              />
              <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/10">
                검색
              </button>
            </div>
          </div>

          {/* Partner Info Title */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full" />
            <span className="text-white font-bold">
              ※ 파트너 정보 조회
              {selectedPartner && (
                <span className="ml-2 text-green-400 text-sm">
                  ({selectedPartner.username})
                </span>
              )}
            </span>
          </div>

          {/* Info Cards Grid */}
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-green-500" size={28} />
            </div>
          ) : selectedPartner ? (
            <>
              <div className="rounded-xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(20,20,20,0.8)" }}>
                {/* 헤더 */}
                <div className="grid grid-cols-4 border-b border-green-900/15">
                  <div className="px-4 py-2.5"><span className="text-sm font-bold text-white">기본정보</span></div>
                  <div className="px-4 py-2.5"><span className="text-sm font-bold text-white">롤링 & 루징</span></div>
                  <div className="px-4 py-2.5"><span className="text-sm font-bold text-white">베팅 및 롤링금</span></div>
                  <div className="px-4 py-2.5"><span className="text-sm font-bold text-white">자금이동</span></div>
                </div>
                {/* Row 1 */}
                <div className="grid grid-cols-4 border-b border-white/5">
                  <div className="p-3"><InfoRow label="구분" value={getLevelLabel(selectedPartner.level)} /></div>
                  <div className="p-3">
                    <EditableRow label="롤링 % (슬롯)" value={selectedPartner.slot_rolling_pct} saving={savingField === "slot_rolling_pct"} onSave={(v) => patchPartner("slot_rolling_pct", v)} />
                  </div>
                  <div className="p-3"><InfoRow label="베팅/당첨금 (슬롯)" value="-" valueColor="text-green-400" /></div>
                  <div className="p-3"><InfoRow label="충전금 합계" value="-" /></div>
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-4 border-b border-white/5">
                  <div className="p-3"><InfoRow label="접속ID / 닉네임" value={`${selectedPartner.username} / ${selectedPartner.nickname || "-"}`} /></div>
                  <div className="p-3">
                    <EditableRow label="롤링 % (카지노)" value={selectedPartner.casino_rolling_pct} saving={savingField === "casino_rolling_pct"} onSave={(v) => patchPartner("casino_rolling_pct", v)} />
                  </div>
                  <div className="p-3"><InfoRow label="베팅/당첨금 (카지노)" value="-" valueColor="text-green-400" /></div>
                  <div className="p-3"><InfoRow label="환전금 합계" value="-" /></div>
                </div>
                {/* Row 3 */}
                <div className="grid grid-cols-4 border-b border-white/5">
                  <div className="p-3"><InfoRow label="보유머니 / 보유롤링금" value={`${selectedPartner.balance.toLocaleString()} / ${selectedPartner.rolling_balance.toLocaleString()}`} /></div>
                  <div className="p-3">
                    <EditableRow label="루징 % (슬롯)" value={selectedPartner.slot_losing_pct} saving={savingField === "slot_losing_pct"} onSave={(v) => patchPartner("slot_losing_pct", v)} />
                  </div>
                  <div className="p-3"><InfoRow label="롤링금 (슬롯)" value="-" valueColor="text-amber-400" /></div>
                  <div className="p-3"><InfoRow label="알지급금 합계" value={selectedPartner.can_give_money ? "알지급 가능" : "불가"} valueColor="text-green-400" /></div>
                </div>
                {/* Row 4 */}
                <div className="grid grid-cols-4">
                  <div className="p-3">
                    <div className="rounded-lg border border-white/5 overflow-hidden" style={{ background: "rgba(30,30,30,0.6)" }}>
                      <div className="px-3 py-1.5 border-b border-white/5">
                        <span className="text-[11px] text-white/50 font-medium">전화번호</span>
                      </div>
                      <div className="px-3 py-2 flex items-center gap-2">
                        <Input value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} className="h-8 text-sm bg-neutral-900 border-white/10 text-white w-full rounded-lg" />
                        <button disabled={savingField === "phone"} onClick={() => patchPartner("phone", phoneValue)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0 disabled:opacity-50">
                          {savingField === "phone" ? "..." : "변경"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <EditableRow label="루징 % (카지노)" value={selectedPartner.casino_losing_pct} saving={savingField === "casino_losing_pct"} onSave={(v) => patchPartner("casino_losing_pct", v)} />
                  </div>
                  <div className="p-3"><InfoRow label="롤링금 (카지노)" value="-" valueColor="text-amber-400" /></div>
                  <div className="p-3"><InfoRow label="알회수금 합계" value={selectedPartner.can_take_money ? "알회수 가능" : "불가"} valueColor="text-red-400" /></div>
                </div>
              </div>

              {/* 롤링&루징 수정 버튼 */}
              <div className="flex justify-center">
                <button className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-colors shadow-lg shadow-purple-500/10">
                  롤링&루징 수정
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-white/40 text-sm">
              파트너를 선택해주세요
            </div>
          )}

          {/* 하부 파트너 목록 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full" />
                <span className="text-white font-bold">※ 하부 파트너 목록</span>
              </div>
              {selectedPartner?.level === "store" ? (
                <button
                  onClick={() => setShowMemberModal(true)}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-colors"
                >
                  회원생성
                </button>
              ) : (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  {selectedPartner
                    ? `${getLevelLabel(
                        selectedPartner.level === "admin"
                          ? "head"
                          : selectedPartner.level === "head"
                            ? "sub_head"
                            : selectedPartner.level === "sub_head"
                              ? "distributor"
                              : "store"
                      )}생성`
                    : "하부생성"}
                </button>
              )}
            </div>

            <div
              className="rounded-2xl border border-green-900/15 overflow-hidden"
              style={{ background: "rgba(17,17,17,0.9)" }}
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-green-900/15 hover:bg-transparent">
                    {["접속ID", "형태", "그룹", "보유머니\n보유롤링금", "롤링금(슬)\n롤링금(카)", "입출금", "롤링 %\n(슬) / (카)", "루징 %\n(슬) / (카)", "등록일시", "본사충전\n본사환전", "알지급(받음)\n알회수(보냄)", "베팅(슬)\n베팅(카)", "하부관리", "상세정보"].map((h) => (
                      <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3 whitespace-pre-line">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedChildren.length === 0 ? (
                    <TableRow className="border-green-900/10">
                      <TableCell colSpan={14} className="text-center py-8 text-white/40 text-sm">
                        하부 파트너가 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedChildren.map((p) => (
                      <TableRow key={p.id} className="border-green-900/10 hover:bg-white/[0.02] transition-colors">
                        {/* 접속ID */}
                        <TableCell className="text-center py-4">
                          <div className="text-sm font-bold text-white">{p.username}</div>
                          <div className="text-xs text-green-400">{p.nickname || "-"}</div>
                        </TableCell>
                        {/* 형태 */}
                        <TableCell className="text-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getLevelBadgeColor(p.level)} text-white`}>
                            {getLevelShort(p.level)}
                          </span>
                          <div className="text-xs text-white/60 mt-1">{getLevelLabel(p.level)}</div>
                        </TableCell>
                        {/* 그룹 */}
                        <TableCell className="text-center text-xs text-white/60">그룹없음</TableCell>
                        {/* 보유머니 / 보유롤링금 */}
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/80">{p.balance.toLocaleString()}</div>
                          <div className="text-green-400">{p.rolling_balance.toLocaleString()}</div>
                        </TableCell>
                        {/* 롤링금(슬) / 롤링금(카) */}
                        <TableCell className="text-center text-xs font-mono">
                          <div className="text-white/80">0</div>
                          <div className="text-white/60">0</div>
                        </TableCell>
                        {/* 입출금 */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setMoneyModal({ isOpen: true, mode: "give", targetId: p.id, targetName: p.nickname || p.username, currentBalance: p.balance })}
                              className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-500 transition-colors"
                            >
                              알지급
                            </button>
                            <button
                              onClick={() => setMoneyModal({ isOpen: true, mode: "take", targetId: p.id, targetName: p.nickname || p.username, currentBalance: p.balance })}
                              className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-400 transition-colors"
                            >
                              알회수
                            </button>
                          </div>
                        </TableCell>
                        {/* 롤링 % */}
                        <TableCell className="text-center text-xs font-mono text-white/80">
                          <div>{p.slot_rolling_pct}%</div>
                          <div>{p.casino_rolling_pct}%</div>
                        </TableCell>
                        {/* 루징 % */}
                        <TableCell className="text-center text-xs font-mono text-white/80">
                          <div>{p.slot_losing_pct}%</div>
                          <div>{p.casino_losing_pct}%</div>
                        </TableCell>
                        {/* 등록일시 */}
                        <TableCell className="text-center text-xs text-white/60">
                          {p.created_at ? new Date(p.created_at).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                        </TableCell>
                        {/* 본사충전 / 본사환전 */}
                        <TableCell className="text-center text-xs font-mono text-white/80">
                          <div>0</div>
                          <div>0</div>
                        </TableCell>
                        {/* 알지급 / 알회수 */}
                        <TableCell className="text-center text-xs font-mono text-white/80">
                          <div>0</div>
                          <div>0</div>
                        </TableCell>
                        {/* 베팅(슬) / 베팅(카) */}
                        <TableCell className="text-center text-xs font-mono text-white/80">
                          <div>0</div>
                          <div>0</div>
                        </TableCell>
                        {/* 하부관리 */}
                        <TableCell className="text-center">
                          {p.level === "store" ? (
                            <button onClick={() => { setSelectedPartnerId(p.id); setShowMemberModal(true); }} className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-500 transition-colors">
                              회원생성
                            </button>
                          ) : (
                            <button onClick={() => setSelectedPartnerId(p.id)} className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-500 transition-colors">
                              {p.level === "admin" ? "본사생성" : p.level === "head" ? "부본생성" : p.level === "sub_head" ? "총판생성" : "매장생성"}
                            </button>
                          )}
                        </TableCell>
                        {/* 상세정보 */}
                        <TableCell className="text-center">
                          <div className="flex flex-col gap-1 items-center">
                            <select className="bg-neutral-900 border border-white/10 text-white text-[10px] rounded px-2 py-1">
                              <option>상세정보</option>
                            </select>
                            <button onClick={() => setSelectedPartnerId(p.id)} className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-500 transition-colors">
                              자세히
                            </button>
                          </div>
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

      {/* 파트너 생성 모달 */}
      <CreatePartnerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchPartners()}
        parentId={selectedPartner?.id || ""}
        level={
          selectedPartner?.level === "admin"
            ? "head"
            : selectedPartner?.level === "head"
              ? "sub_head"
              : selectedPartner?.level === "sub_head"
                ? "distributor"
                : "store"
        }
        maxSlotRolling={selectedPartner?.slot_rolling_pct || 5}
        maxCasinoRolling={selectedPartner?.casino_rolling_pct || 2}
        maxSlotLosing={selectedPartner?.slot_losing_pct || 50}
        maxCasinoLosing={selectedPartner?.casino_losing_pct || 50}
      />

      {/* 회원 생성 모달 */}
      <CreateMemberModal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        onCreated={() => fetchPartners()}
        storeId={selectedPartner?.id || ""}
        storeName={selectedPartner?.nickname || selectedPartner?.username || ""}
        maxSlotRolling={selectedPartner?.slot_rolling_pct || 5}
        maxCasinoRolling={selectedPartner?.casino_rolling_pct || 2}
        maxSlotLosing={selectedPartner?.slot_losing_pct || 50}
        maxCasinoLosing={selectedPartner?.casino_losing_pct || 50}
      />

      {/* 알지급/알회수 모달 */}
      <MoneyModal
        isOpen={moneyModal.isOpen}
        onClose={() => setMoneyModal((prev) => ({ ...prev, isOpen: false }))}
        onComplete={() => {
          fetchPartners();
          if (selectedPartnerId) fetchPartnerDetail(selectedPartnerId);
        }}
        mode={moneyModal.mode}
        targetType="partner"
        targetId={moneyModal.targetId}
        targetName={moneyModal.targetName}
        currentBalance={moneyModal.currentBalance}
      />
    </div>
  );
}
