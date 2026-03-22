"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronDown, Search, Loader2 } from "lucide-react";

interface Partner {
  id: string;
  parent_id: string | null;
  username: string;
  nickname: string;
  level: string;
  status: string;
}

interface TreeNode {
  id: string;
  label: string;
  type: string;
  typeBadgeColor: string;
  children: TreeNode[];
}

const LEVEL_MAP: Record<string, { label: string; badge: string; color: string }> = {
  admin: { label: "관리자", badge: "관", color: "bg-purple-600" },
  head: { label: "본사", badge: "본", color: "bg-blue-600" },
  sub_head: { label: "부본사", badge: "부", color: "bg-cyan-600" },
  distributor: { label: "총판", badge: "총", color: "bg-orange-600" },
  store: { label: "매장", badge: "매", color: "bg-green-600" },
};

function buildTree(partners: Partner[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const p of partners) {
    const info = LEVEL_MAP[p.level] || { label: p.level, badge: "?", color: "bg-gray-600" };
    map.set(p.id, {
      id: p.id,
      label: p.nickname || p.username,
      type: info.badge,
      typeBadgeColor: info.color,
      children: [],
    });
  }

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

function filterTree(nodes: TreeNode[], term: string): TreeNode[] {
  if (!term) return nodes;
  const lower = term.toLowerCase();
  return nodes.reduce<TreeNode[]>((acc, node) => {
    const filtered = filterTree(node.children, term);
    if (node.label.toLowerCase().includes(lower) || filtered.length > 0) {
      acc.push({ ...node, children: filtered });
    }
    return acc;
  }, []);
}

function TreeNodeComponent({
  node,
  depth = 0,
  selectedId,
  onSelect,
  forceExpand,
}: {
  node: TreeNode;
  depth?: number;
  selectedId: string;
  onSelect: (id: string) => void;
  forceExpand?: boolean | null;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  useEffect(() => {
    if (forceExpand === true) setExpanded(true);
    if (forceExpand === false) setExpanded(false);
  }, [forceExpand]);

  return (
    <div>
      <div
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-150 ${
          isSelected ? "bg-green-500/15 text-green-400" : "text-white/80 hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0 p-0.5 hover:bg-white/10 rounded">
            {expanded ? <ChevronDown size={14} className="text-green-500" /> : <ChevronRight size={14} className="text-white/40" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <button onClick={() => onSelect(node.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${node.typeBadgeColor} text-white shrink-0`}>
            {node.type}
          </span>
          <span className="font-medium truncate">{node.label}</span>
        </button>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} forceExpand={forceExpand} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  buttonLabel?: string;
  showBlockedBtn?: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string;
}

export default function TreeWithSearch({ buttonLabel = "회원목록 바로가기", showBlockedBtn = true, onSelect, selectedId: externalSelectedId }: Props) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [forceExpand, setForceExpand] = useState<boolean | null>(null);

  const activeSelectedId = externalSelectedId ?? selectedId;

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch("/api/partners");
      const json = await res.json();
      if (json.data) setPartners(json.data);
    } catch {
      console.error("Failed to fetch partners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const tree = buildTree(partners);
  const filteredTree = filterTree(tree, searchTerm);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect?.(id);
  };

  return (
    <div className="w-64 shrink-0 rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
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
          {buttonLabel}
        </button>
        <div className="flex gap-1.5">
          <button onClick={() => setForceExpand(true)} className="flex-1 py-1.5 rounded-lg bg-orange-600 text-white text-[11px] font-bold hover:bg-orange-500 transition-colors">
            모두펼치기
          </button>
          <button onClick={() => setForceExpand(false)} className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-500 transition-colors">
            모두 접기
          </button>
          {showBlockedBtn && (
            <button className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-500 transition-colors">
              차단 회원 표기
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-green-900/15 py-2 px-1 max-h-[500px] overflow-y-auto sidebar-scroll">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-green-500" size={20} /></div>
        ) : filteredTree.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-xs">파트너가 없습니다</div>
        ) : (
          filteredTree.map((node) => (
            <TreeNodeComponent key={node.id} node={node} selectedId={activeSelectedId} onSelect={handleSelect} forceExpand={forceExpand} />
          ))
        )}
      </div>
    </div>
  );
}
