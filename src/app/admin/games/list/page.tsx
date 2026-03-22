"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  Search,
  Gamepad2,
  Copy,
  Check,
  Grid3X3,
  List,
  ExternalLink,
} from "lucide-react";

interface Vendor {
  vendor: string;
  name: string;
  type: string;
}

interface Game {
  id: string | number;
  game_id: string;
  name: string;
  vendor: string;
  type: string;
  thumbnail?: string;
  image?: string;
}

export default function GameListPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [totalGames, setTotalGames] = useState(0);

  // Fetch vendors on mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await fetch("/api/games/vendors");
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const vendorList = json.data.map((v: any) => ({
            vendor: v.vendor || v.key || v.id || "",
            name: v.name || v.vendor || "",
            type: v.type || "slot",
          }));
          setVendors(vendorList);
          if (vendorList.length > 0) {
            setSelectedVendor(vendorList[0].vendor);
          }
        }
      } catch (err) {
        console.error("Failed to fetch vendors:", err);
      } finally {
        setVendorsLoading(false);
      }
    };
    fetchVendors();
  }, []);

  // Fetch games when vendor changes
  const fetchGames = useCallback(async () => {
    if (!selectedVendor) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/games/list?vendor=${encodeURIComponent(selectedVendor)}`);
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const gameList: Game[] = json.data.map((g: any) => ({
          id: g.id || g.game_id,
          game_id: g.game_id || g.id?.toString() || "",
          name: g.name || g.title || g.game_name || "",
          vendor: g.vendor || selectedVendor,
          type: g.type || "slot",
          thumbnail: g.thumbnail || g.image || g.img || g.icon || null,
          image: g.image || g.thumbnail || g.img || null,
        }));
        setGames(gameList);
        setTotalGames(json.total || gameList.length);
      } else {
        setGames([]);
        setTotalGames(0);
      }
    } catch (err) {
      console.error("Failed to fetch games:", err);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [selectedVendor]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Filter games by search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredGames(games);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredGames(
        games.filter(
          (g) =>
            g.name.toLowerCase().includes(term) ||
            g.game_id.toLowerCase().includes(term)
        )
      );
    }
  }, [games, searchTerm]);

  const handleCopyId = (gameId: string) => {
    navigator.clipboard.writeText(gameId);
    setCopiedId(gameId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Gamepad2 size={22} className="text-green-400" />
            게임 목록
          </h1>
          <p className="text-xs text-white/50 mt-1 ml-[30px]">
            HonorLink 게임 라이브러리
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "grid"
                ? "bg-green-500/15 text-green-400"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "list"
                ? "bg-green-500/15 text-green-400"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <List size={16} />
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchGames}
            disabled={loading}
            className="border-green-900/30 text-white/70 hover:text-green-400 hover:bg-green-500/5 h-9"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="ml-1.5">새로고침</span>
          </Button>
        </div>
      </div>

      {/* Vendor Selector & Search */}
      <div className="rounded-2xl border border-green-900/15 p-4" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <label className="text-[10px] text-white/40 block mb-1">벤더 선택</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              disabled={vendorsLoading}
              className="h-9 bg-neutral-900/80 border border-green-900/20 text-white text-sm rounded-lg px-3 min-w-[200px] focus:outline-none focus:border-green-500/30"
            >
              {vendorsLoading ? (
                <option>불러오는 중...</option>
              ) : (
                vendors.map((v) => (
                  <option key={v.vendor} value={v.vendor}>
                    {v.name} ({v.vendor})
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-white/40 block mb-1">게임 검색</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="게임명 또는 ID 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-neutral-900/80 border border-green-900/20 text-white text-sm rounded-lg focus:outline-none focus:border-green-500/30"
              />
            </div>
          </div>
          <div className="flex-shrink-0 pt-4">
            <span className="text-xs text-white/40">
              {filteredGames.length} / {totalGames} 게임
            </span>
          </div>
        </div>
      </div>

      {/* Games Display */}
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-green-400" />
            <span className="ml-3 text-white/60 text-sm">게임 목록 불러오는 중...</span>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <Gamepad2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm">
              {searchTerm ? "검색 결과가 없습니다." : selectedVendor ? "이 벤더에 게임이 없습니다." : "벤더를 선택해주세요."}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredGames.map((game) => (
                <div
                  key={game.game_id}
                  className="group rounded-xl border border-green-900/10 overflow-hidden hover:border-green-500/30 transition-all duration-200"
                  style={{ background: "rgba(24,24,24,0.8)" }}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-neutral-900 relative overflow-hidden">
                    {game.thumbnail ? (
                      <img
                        src={game.thumbnail}
                        alt={game.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gamepad2 size={28} className="text-white/10" />
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleCopyId(game.game_id)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="게임 ID 복사"
                      >
                        {copiedId === game.game_id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <button
                        className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                        title="게임 실행"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <div className="text-[11px] font-medium text-white/80 truncate" title={game.name}>
                      {game.name}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-white/40 font-mono truncate">{game.game_id}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        game.type === "casino" || game.type === "live"
                          ? "bg-purple-500/15 text-purple-400"
                          : "bg-blue-500/15 text-blue-400"
                      }`}>
                        {game.type === "casino" || game.type === "live" ? "카지노" : "슬롯"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="divide-y divide-green-900/10">
            {filteredGames.map((game) => (
              <div
                key={game.game_id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded-lg bg-neutral-900 overflow-hidden flex-shrink-0">
                  {game.thumbnail ? (
                    <img
                      src={game.thumbnail}
                      alt={game.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gamepad2 size={16} className="text-white/10" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/80 truncate">{game.name}</div>
                  <div className="text-[10px] text-white/40 font-mono mt-0.5">
                    ID: {game.game_id} | {game.vendor}
                  </div>
                </div>
                {/* Type Badge */}
                <span className={`text-[10px] px-2 py-1 rounded font-bold flex-shrink-0 ${
                  game.type === "casino" || game.type === "live"
                    ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                    : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                }`}>
                  {game.type === "casino" || game.type === "live" ? "카지노" : "슬롯"}
                </span>
                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCopyId(game.game_id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                    title="게임 ID 복사"
                  >
                    {copiedId === game.game_id ? (
                      <Check size={14} className="text-green-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-green-500/10 text-white/40 hover:text-green-400 transition-colors"
                    title="게임 실행"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
