"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Search, Gamepad2 } from "lucide-react";

interface Vendor {
  vendor: string;
  name: string;
  type: string;
  status: string;
  game_count?: number;
  enabled?: boolean;
}

export default function GameRestrictPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/games/vendors");
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const vendorList: Vendor[] = json.data.map((v: any) => ({
          vendor: v.vendor || v.key || v.id || "",
          name: v.name || v.vendor || "",
          type: v.type || "slot",
          status: v.status || "active",
          game_count: v.game_count || v.gameCount || 0,
          enabled: true,
        }));
        setVendors(vendorList);
        // Initialize toggle states - all enabled by default
        const states: Record<string, boolean> = {};
        vendorList.forEach((v) => {
          states[v.vendor] = toggleStates[v.vendor] !== undefined ? toggleStates[v.vendor] : true;
        });
        setToggleStates(states);
      }
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    let filtered = vendors;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.vendor.toLowerCase().includes(term) ||
          v.name.toLowerCase().includes(term)
      );
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter((v) => v.type === typeFilter);
    }
    setFilteredVendors(filtered);
  }, [vendors, searchTerm, typeFilter]);

  const toggleVendor = (vendorKey: string) => {
    setToggleStates((prev) => ({
      ...prev,
      [vendorKey]: !prev[vendorKey],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Save to game_providers table in supabase
    try {
      const providers = vendors.map((v) => ({
        vendor_key: v.vendor,
        vendor_name: v.name,
        type: v.type,
        enabled: toggleStates[v.vendor] ?? true,
      }));

      const res = await fetch("/api/games/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers }),
      });

      if (res.ok) {
        alert("저장되었습니다.");
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(toggleStates).filter(Boolean).length;
  const disabledCount = Object.values(toggleStates).filter((v) => !v).length;

  // Get unique types
  const types = Array.from(new Set(vendors.map((v) => v.type)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Gamepad2 size={22} className="text-green-400" />
            게임사 제한관리
          </h1>
          <p className="text-xs text-white/50 mt-1 ml-[30px]">
            HonorLink 연동 벤더 목록 ({vendors.length}개)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchVendors}
            disabled={loading}
            className="border-green-900/30 text-white/70 hover:text-green-400 hover:bg-green-500/5 h-9"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="ml-1.5">새로고침</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold hover:from-green-400 hover:to-emerald-500 h-9 shadow-lg shadow-green-500/10"
          >
            {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
            설정 저장
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-green-900/15 p-3 text-center" style={{ background: "rgba(17,17,17,0.9)" }}>
          <div className="text-[10px] text-white/50 mb-1">전체 벤더</div>
          <div className="text-lg font-bold text-white font-mono">{vendors.length}</div>
        </div>
        <div className="rounded-xl border border-green-900/15 p-3 text-center" style={{ background: "rgba(17,17,17,0.9)" }}>
          <div className="text-[10px] text-white/50 mb-1">활성화</div>
          <div className="text-lg font-bold text-green-400 font-mono">{enabledCount}</div>
        </div>
        <div className="rounded-xl border border-green-900/15 p-3 text-center" style={{ background: "rgba(17,17,17,0.9)" }}>
          <div className="text-[10px] text-white/50 mb-1">비활성화</div>
          <div className="text-lg font-bold text-red-400 font-mono">{disabledCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-green-900/15 p-4" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="벤더 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-neutral-900/80 border border-green-900/20 text-white text-sm rounded-lg focus:outline-none focus:border-green-500/30"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 bg-neutral-900/80 border border-green-900/20 text-white text-sm rounded-lg px-3 focus:outline-none focus:border-green-500/30"
          >
            <option value="all">전체 유형</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-green-400" />
            <span className="ml-3 text-white/60 text-sm">벤더 목록 불러오는 중...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-green-900/15 hover:bg-transparent">
                <TableHead className="text-center text-xs text-white/70 font-bold py-3 w-16">#</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">게임종류</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">벤더 코드</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">벤더명</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">게임 수</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">상태</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">사용유무</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-white/40 text-sm">
                    {searchTerm ? "검색 결과가 없습니다." : "벤더 데이터가 없습니다."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor, i) => (
                  <TableRow key={vendor.vendor} className="border-green-900/10 hover:bg-white/[0.02]">
                    <TableCell className="text-center text-xs text-white/50 font-mono">{i + 1}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        vendor.type === "casino" || vendor.type === "live"
                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                          : vendor.type === "slot"
                          ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      }`}>
                        {vendor.type === "casino" || vendor.type === "live" ? "카지노" : vendor.type === "slot" ? "슬롯" : vendor.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/60 font-mono">{vendor.vendor}</TableCell>
                    <TableCell className="text-center text-sm text-white/80 font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-center text-xs text-white/60 font-mono">{vendor.game_count || "-"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        vendor.status === "active" ? "bg-green-400" : "bg-red-400"
                      }`} />
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => toggleVendor(vendor.vendor)}
                        className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                          toggleStates[vendor.vendor] ? "bg-green-600" : "bg-neutral-700"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${
                            toggleStates[vendor.vendor] ? "translate-x-6" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {!loading && filteredVendors.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-green-900/10">
            <span className="text-[11px] text-white/40">
              {filteredVendors.length}개 벤더 표시 중
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
