"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ── Types ───────────────────────────────────────────────────────────────
interface Game {
  id: number | string;
  game_id: string;
  name: string;
  name_ko?: string;
  vendor: string;
  type: string;
  thumbnail?: string;
  image?: string;
  status?: string;
}

// ── Vendor Korean name mapping ──────────────────────────────────────────
const vendorKoreanNames: Record<string, string> = {
  evolution: "에볼루션",
  PragmaticPlay: "프라그마틱",
  "PragmaticPlay Live": "프라그마틱 라이브",
  "WM Live": "WM카지노",
  DreamGame: "드림게임",
  bota: "보타",
  "Asia Gaming": "아시아게이밍",
  AllBet: "올벳",
  "Betgames.tv": "벳게임즈",
  MicroGaming: "마이크로게이밍",
  CQ9: "CQ9",
  Habanero: "하바네로",
  Booongo: "부운고",
  "Play'n GO": "플레이앤고",
  PLAYSTAR: "플레이스타",
  GAMEART: "게임아트",
  Playson: "플레이손",
  BGaming: "비게이밍",
  Betsoft: "벳소프트",
  Evoplay: "에보플레이",
  "SA Gaming": "SA게이밍",
  "Vivo Gaming": "비보게이밍",
  Ezugi: "에주기",
  NetEnt: "넷엔트",
  RedTiger: "레드타이거",
  "No Limit City": "노리밋시티",
  Hacksaw: "핵쏘",
  Relax: "릴랙스",
  PGSoft: "PG소프트",
  Spadegaming: "스페이드게이밍",
  JDB: "JDB",
  JILI: "JILI",
  YGG: "와이지지",
  AIS: "AIS게이밍",
};

function getVendorKoreanName(vendor: string): string {
  return vendorKoreanNames[vendor] || vendor;
}

// ── Wrapper with Suspense ────────────────────────────────────────────────
export default function GamesPage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "80px 15px", textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, border: "3px solid #333", borderTopColor: "#6abf40",
          borderRadius: "50%", margin: "0 auto 16px",
          animation: "gl-spin 0.8s linear infinite",
        }} />
        <p style={{ color: "#888", fontSize: 15 }}>로딩 중...</p>
        <style>{`@keyframes gl-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <GamesPageInner />
    </Suspense>
  );
}

// ── Component ───────────────────────────────────────────────────────────
function GamesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const vendor = searchParams.get("vendor") || "";

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Game launch modal state
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchTarget, setLaunchTarget] = useState<Game | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const gameWindowRef = useRef<Window | null>(null);

  // Login check
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/user/balance")
      .then((r) => {
        if (r.ok) setIsLoggedIn(true);
        else setIsLoggedIn(false);
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  // Fetch games for vendor
  useEffect(() => {
    if (!vendor) {
      setLoading(false);
      setError("벤더가 선택되지 않았습니다.");
      return;
    }

    setLoading(true);
    setError("");
    fetch(`/api/games/list?vendor=${encodeURIComponent(vendor)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setGames(res.data);
        } else {
          setGames([]);
        }
      })
      .catch((err) => {
        setError("게임 목록을 불러올 수 없습니다.");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [vendor]);

  // Filter games by search
  const filteredGames = games.filter((game) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (game.name && game.name.toLowerCase().includes(q)) ||
      (game.name_ko && game.name_ko.toLowerCase().includes(q)) ||
      (game.game_id && game.game_id.toLowerCase().includes(q))
    );
  });

  // ── Game launch handlers ────────────────────────────────────────────
  // 게임 페이지를 떠날 때만 잔액 회수
  useEffect(() => {
    return () => {
      // 페이지 unmount 시 잔액 회수
      fetch("/api/user/game-exit", { method: "POST" }).catch(() => {});
    };
  }, []);

  const handleGameClick = async (game: Game) => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (launching) return;
    setLaunching(true);
    setLaunchTarget(game);

    try {
      const res = await fetch("/api/user/game-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: game.vendor || vendor,
          game_id: game.game_id || game.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "게임 실행에 실패했습니다.");
        setLaunching(false);
        return;
      }

      // 팝업으로 게임 실행 (같은 팝업 이름으로 열어서 이전 게임 대체)
      const gameWindow = window.open(data.url, "casino_game", "width=1280,height=800,scrollbars=yes");
      gameWindowRef.current = gameWindow;
      setLaunching(false);

      // 팝업 차단된 경우
      if (!gameWindow) {
        alert("팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.");
        return;
      }
    } catch {
      alert("서버에 연결할 수 없습니다.");
      setLaunching(false);
    }
  };

  // Get display name for game
  const getGameDisplayName = (game: Game): string => {
    return game.name_ko || game.name || game.game_id || String(game.id);
  };

  // Get thumbnail URL
  const getGameThumbnail = (game: Game): string | null => {
    return game.thumbnail || game.image || null;
  };

  return (
    <>
      {/* PAGE HEADER */}
      <section className="gl-page-header">
        <button className="gl-back-btn" onClick={() => router.push("/")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          돌아가기
        </button>
        <div className="gl-page-title">
          <h2>{getVendorKoreanName(vendor)}</h2>
          <span className="gl-page-subtitle">{vendor}</span>
          {!loading && (
            <span className="gl-game-count">{filteredGames.length}개 게임</span>
          )}
        </div>
      </section>

      {/* SEARCH BAR */}
      <section className="gl-search-section">
        <div className="gl-search-wrapper">
          <svg className="gl-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="gl-search-input"
            placeholder="게임 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="gl-search-clear" onClick={() => setSearchQuery("")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </section>

      {/* LOADING STATE */}
      {loading && (
        <section className="gl-loading">
          <div className="gl-spinner" />
          <p>게임 목록을 불러오는 중...</p>
        </section>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <section className="gl-error">
          <p>{error}</p>
          <button className="gl-retry-btn" onClick={() => window.location.reload()}>
            다시 시도
          </button>
        </section>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && filteredGames.length === 0 && games.length > 0 && (
        <section className="gl-empty">
          <p>검색 결과가 없습니다.</p>
        </section>
      )}

      {!loading && !error && games.length === 0 && (
        <section className="gl-empty">
          <p>이 벤더에 사용 가능한 게임이 없습니다.</p>
          <button className="gl-retry-btn" onClick={() => router.push("/")}>
            메인으로 돌아가기
          </button>
        </section>
      )}

      {/* GAME GRID */}
      {!loading && !error && filteredGames.length > 0 && (
        <section className="gl-game-grid">
          {filteredGames.map((game, i) => {
            const thumb = getGameThumbnail(game);
            return (
              <div
                key={game.game_id || game.id || i}
                className="gl-game-card"
                onClick={() => handleGameClick(game)}
                style={{
                  animationDelay: `${Math.min(i * 0.03, 0.6)}s`,
                }}
              >
                <div className="gl-game-thumb">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={getGameDisplayName(game)}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) parent.classList.add("gl-thumb-fallback");
                      }}
                    />
                  ) : (
                    <div className="gl-thumb-placeholder">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <path d="M12 6v-2" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    </div>
                  )}
                  <div className="gl-game-hover-overlay">
                    <span className="gl-play-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="#6abf40">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="gl-game-info">
                  <h4 className="gl-game-name">{getGameDisplayName(game)}</h4>
                  <p className="gl-game-vendor">{getVendorKoreanName(game.vendor || vendor)}</p>
                  <button
                    className="gl-launch-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGameClick(game);
                    }}
                  >
                    게임 실행
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <style jsx>{`
        /* ── Modal ────────────────────────────────────── */
        .gl-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: gl-fade-in 0.2s ease;
        }
        .gl-modal {
          background: #1a1a1a;
          border: 1px solid #6abf40;
          box-shadow: 0 0 40px rgba(106, 191, 64, 0.4);
          border-radius: 16px;
          padding: 36px;
          width: 90%;
          max-width: 420px;
          text-align: center;
          animation: gl-scale-in 0.25s ease;
        }
        .gl-modal h3 {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 12px;
        }
        .gl-modal-game {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 4px;
        }
        .gl-modal-vendor {
          font-size: 14px;
          color: #6abf40;
          margin: 0 0 20px;
        }
        .gl-modal-desc {
          font-size: 15px;
          color: #ccc;
          line-height: 1.6;
          margin: 0 0 20px;
        }
        .gl-modal-error {
          color: #ff6666;
          font-size: 14px;
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid #ff4444;
          border-radius: 8px;
          padding: 10px 14px;
          margin: 0 0 16px;
        }
        .gl-modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .gl-modal-btn {
          padding: 14px 36px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.3s;
          font-family: "Noto Sans KR", sans-serif;
        }
        .gl-modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .gl-modal-confirm {
          background: linear-gradient(135deg, #6abf40, #4a9a2e);
          color: #fff;
        }
        .gl-modal-confirm:hover:not(:disabled) {
          background: linear-gradient(135deg, #7dd956, #5ab83a);
          box-shadow: 0 0 20px rgba(106, 191, 64, 0.5);
        }
        .gl-modal-cancel {
          background: #333;
          color: #ccc;
          border: 1px solid #555;
        }
        .gl-modal-cancel:hover:not(:disabled) {
          background: #444;
          border-color: #888;
        }

        /* ── Page Header ─────────────────────────────── */
        .gl-page-header {
          max-width: 1300px;
          margin: 0 auto;
          padding: 24px 15px 0;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .gl-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: 1px solid #444;
          color: #ccc;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-family: "Noto Sans KR", sans-serif;
          white-space: nowrap;
        }
        .gl-back-btn:hover {
          border-color: #6abf40;
          color: #6abf40;
          box-shadow: 0 0 10px rgba(106, 191, 64, 0.2);
        }
        .gl-page-title {
          display: flex;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
        }
        .gl-page-title h2 {
          font-size: 28px;
          font-weight: 900;
          color: #fff;
          margin: 0;
        }
        .gl-page-subtitle {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }
        .gl-game-count {
          font-size: 13px;
          color: #6abf40;
          background: rgba(106, 191, 64, 0.1);
          border: 1px solid rgba(106, 191, 64, 0.3);
          padding: 3px 10px;
          border-radius: 20px;
          font-weight: 600;
        }

        /* ── Search ──────────────────────────────────── */
        .gl-search-section {
          max-width: 1300px;
          margin: 0 auto;
          padding: 20px 15px;
        }
        .gl-search-wrapper {
          position: relative;
          max-width: 500px;
        }
        .gl-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .gl-search-input {
          width: 100%;
          padding: 12px 40px 12px 42px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 10px;
          color: #fff;
          font-size: 15px;
          font-family: "Noto Sans KR", sans-serif;
          outline: none;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .gl-search-input::placeholder {
          color: #555;
        }
        .gl-search-input:focus {
          border-color: #6abf40;
          box-shadow: 0 0 12px rgba(106, 191, 64, 0.2);
        }
        .gl-search-clear {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Loading ─────────────────────────────────── */
        .gl-loading {
          max-width: 1300px;
          margin: 0 auto;
          padding: 80px 15px;
          text-align: center;
        }
        .gl-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #333;
          border-top-color: #6abf40;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: gl-spin 0.8s linear infinite;
        }
        .gl-loading p {
          color: #888;
          font-size: 15px;
        }

        /* ── Error / Empty ───────────────────────────── */
        .gl-error,
        .gl-empty {
          max-width: 1300px;
          margin: 0 auto;
          padding: 80px 15px;
          text-align: center;
        }
        .gl-error p,
        .gl-empty p {
          color: #888;
          font-size: 16px;
          margin: 0 0 16px;
        }
        .gl-retry-btn {
          background: linear-gradient(135deg, #6abf40, #4a9a2e);
          color: #fff;
          border: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          font-family: "Noto Sans KR", sans-serif;
        }
        .gl-retry-btn:hover {
          box-shadow: 0 0 15px rgba(106, 191, 64, 0.4);
        }

        /* ── Game Grid ───────────────────────────────── */
        .gl-game-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          padding: 0 15px 40px;
          max-width: 1300px;
          margin: 0 auto;
        }

        /* ── Game Card ───────────────────────────────── */
        .gl-game-card {
          border-radius: 12px;
          overflow: hidden;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          cursor: pointer;
          transition: all 0.35s ease;
          animation: gl-card-in 0.4s ease both;
        }
        .gl-game-card:hover {
          transform: translateY(-6px) scale(1.02);
          border-color: #6abf40;
          box-shadow: 0 8px 30px rgba(106, 191, 64, 0.25), 0 0 15px rgba(106, 191, 64, 0.15);
        }

        .gl-game-thumb {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: #0d0d0d;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gl-game-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .gl-game-card:hover .gl-game-thumb img {
          transform: scale(1.08);
        }
        .gl-thumb-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1a1a1a, #0d0d0d);
        }
        .gl-thumb-fallback {
          background: linear-gradient(135deg, #1a1a1a, #0d0d0d) !important;
        }

        .gl-game-hover-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .gl-game-card:hover .gl-game-hover-overlay {
          opacity: 1;
        }
        .gl-play-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(106, 191, 64, 0.15);
          border: 2px solid #6abf40;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s;
        }
        .gl-game-card:hover .gl-play-icon {
          transform: scale(1.1);
        }

        .gl-game-info {
          padding: 12px;
          text-align: center;
          border-top: 1px solid #222;
        }
        .gl-game-name {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gl-game-vendor {
          font-size: 11px;
          color: #666;
          margin: 0 0 8px;
        }
        .gl-launch-btn {
          width: 100%;
          padding: 8px 0;
          background: linear-gradient(135deg, #6abf40, #4a9a2e);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          font-family: "Noto Sans KR", sans-serif;
        }
        .gl-launch-btn:hover {
          background: linear-gradient(135deg, #7dd956, #5ab83a);
          box-shadow: 0 0 12px rgba(106, 191, 64, 0.4);
        }

        /* ── Animations ──────────────────────────────── */
        @keyframes gl-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes gl-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes gl-scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes gl-card-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ── Responsive ──────────────────────────────── */
        @media (max-width: 1200px) {
          .gl-game-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 1024px) {
          .gl-game-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 768px) {
          .gl-page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .gl-page-title h2 {
            font-size: 22px;
          }
          .gl-game-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .gl-game-name {
            font-size: 12px;
          }
          .gl-game-info {
            padding: 8px;
          }
        }
        @media (max-width: 480px) {
          .gl-game-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
      `}</style>
    </>
  );
}
