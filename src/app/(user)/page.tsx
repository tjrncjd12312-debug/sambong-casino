"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// ── Types ───────────────────────────────────────────────────────────────
interface Vendor {
  vendor: string;
  name: string;
  type: string;
  status: string;
  game_count?: number;
  thumbnail?: string | null;
}

interface Transaction {
  username: string;
  amount: number;
  date: string;
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
  Skywind: "스카이윈드",
  Taishan: "타이산",
  playace: "플레이에이스",
};

function getVendorKoreanName(vendor: string): string {
  return vendorKoreanNames[vendor] || vendor;
}

// ── Category tabs data ──────────────────────────────────────────────────
const categories = [
  { label: "라이브카지노", sub: "LIVE CASINO", type: "casino" },
  { label: "슬롯게임", sub: "SLOT GAME", type: "slot" },
  { label: "스포츠", sub: "SPORTS", type: "sports" },
];

const eventItems = [
  "복귀 이벤트",
  "스포츠 미적중 이벤트",
  "쿠폰 에어드랍 이벤트",
  "스포츠 충전 이벤트",
  "카지노 충전 이벤트",
];

const providerNames = [
  "PRAGMATIC PLAY", "CQ9 GAMING", "HABANERO", "AG Asia Gaming", "Booongo",
  "STARGAMES", "RTG SLOTS", "DREAMTECH", "Play'n GO", "DREAMGAME",
  "PLAYSTAR", "GAMEART", "TOPTREND", "Genesis", "ORIENT",
  "PLAYSON", "BGAMING", "BETSOFT", "EVOPLAY", "AFB CASINO",
  "GG", "Microgaming", "ALLBET", "TGAME", "WM CASINO",
  "SA GAMING", "BBIN", "SEXYBCRT", "Evolution", "VIVO GAMING",
];

// ── Helper ──────────────────────────────────────────────────────────────
function formatAmount(amount: number): string {
  return amount.toLocaleString() + "원";
}

function formatDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

// ── Component ───────────────────────────────────────────────────────────
// ── VendorCard: 개별 썸네일 로드 ─────────────────────────────────────
function VendorCard({ card, index, onClick }: {
  card: { name: string; sub: string; vendor: string; thumbnail: string | null; game_count: number };
  index: number;
  onClick: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(card.thumbnail ? `/api/games/image-proxy?url=${encodeURIComponent(card.thumbnail)}` : null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // 썸네일이 없으면 vendor-thumbnail API에서 가져오기
  useEffect(() => {
    if (thumbUrl) return;
    let cancelled = false;
    fetch(`/api/games/vendor-thumbnail?vendor=${encodeURIComponent(card.vendor)}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.thumbnail) {
          setThumbUrl(`/api/games/image-proxy?url=${encodeURIComponent(data.thumbnail)}`);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [card.vendor, thumbUrl]);

  return (
    <div className="cc-game-card" onClick={onClick}>
      <div
        className="cc-game-card-img"
        style={{
          background: `linear-gradient(145deg, hsl(${(index * 47 + 120) % 360}, 50%, 20%), hsl(${(index * 47 + 160) % 360}, 40%, 8%))`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {thumbUrl && !imgError && (
          <img
            src={thumbUrl}
            alt={card.name}
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              objectFit: "cover",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.3s",
            }}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}
        <div style={{
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          width: "100%", height: "100%", padding: "15px",
          background: imgLoaded ? "linear-gradient(transparent 20%, rgba(0,0,0,0.8))" : "none",
        }}>
          <span style={{
            fontSize: card.name.length > 6 ? "22px" : "28px",
            fontWeight: 900, color: "#fff",
            textAlign: "center", lineHeight: 1.2,
            textShadow: "0 2px 15px rgba(0,0,0,0.9), 0 0 30px rgba(106,191,64,0.3)",
            letterSpacing: "1px",
          }}>{card.name}</span>
        </div>
      </div>
      <div className="cc-game-card-info">
        <h4>{card.name}</h4>
        <p>{card.sub}</p>
      </div>
    </div>
  );
}

export default function UserMainPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("casino");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [deposits, setDeposits] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
  const [jackpotValue, setJackpotValue] = useState(2773582502);
  // Check if user is logged in (simple check via balance API)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    fetch("/api/user/balance")
      .then((r) => {
        if (r.ok) setIsLoggedIn(true);
        else setIsLoggedIn(false);
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  // Fetch vendors
  useEffect(() => {
    fetch("/api/games/vendors")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setVendors(res.data);
      })
      .catch(() => {});
  }, []);

  // Fetch recent transactions
  useEffect(() => {
    fetch("/api/user/recent-transactions")
      .then((r) => r.json())
      .then((res) => {
        if (res.deposits) setDeposits(res.deposits);
        if (res.withdrawals) setWithdrawals(res.withdrawals);
      })
      .catch(() => {
        // Use placeholder data
      });
  }, []);

  // Jackpot counter animation
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpotValue((v) => v + Math.floor(Math.random() * 100) + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Transaction rolling animation
  useEffect(() => {
    const names = ["se***", "ba***", "x2***", "m***", "ak***", "jo***", "ki***", "pa***", "ch***", "lu***"];
    const amounts = [50000, 100000, 150000, 200000, 300000, 500000, 750000, 1000000, 2000000, 3500000, 5000000];

    const rollDeposits = setInterval(() => {
      setDeposits((prev) => {
        const newItem: Transaction = {
          username: names[Math.floor(Math.random() * names.length)],
          amount: amounts[Math.floor(Math.random() * amounts.length)],
          date: new Date().toISOString().slice(0, 10),
        };
        return [newItem, ...prev.slice(0, 4)];
      });
    }, 3000 + Math.random() * 2000);

    const rollWithdrawals = setInterval(() => {
      setWithdrawals((prev) => {
        const newItem: Transaction = {
          username: names[Math.floor(Math.random() * names.length)],
          amount: amounts[Math.floor(Math.random() * amounts.length)],
          date: new Date().toISOString().slice(0, 10),
        };
        return [newItem, ...prev.slice(0, 4)];
      });
    }, 3500 + Math.random() * 2000);

    return () => {
      clearInterval(rollDeposits);
      clearInterval(rollWithdrawals);
    };
  }, []);

  useEffect(() => {
  }, [vendors]);

  // ── Vendor card click → navigate to games page ─────────────────────
  const handleVendorCardClick = (vendorId: string) => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    router.push(`/games?vendor=${encodeURIComponent(vendorId)}`);
  };

  // Filter vendors by category
  const filteredVendors = vendors.filter((v) => {
    if (activeCategory === "casino") return v.type === "casino" || v.type === "live";
    if (activeCategory === "slot") return v.type === "slot";
    if (activeCategory === "sports") return v.type === "sports";
    return false;
  });

  // Fallback game cards if no vendors loaded
  const fallbackCards = [
    { name: "프라그마틱", sub: "PragmaticPlay", vendor: "PragmaticPlay", game_count: 0 },
    { name: "에볼루션", sub: "evolution", vendor: "evolution", game_count: 0 },
    { name: "프라그마틱 라이브", sub: "PragmaticPlay Live", vendor: "PragmaticPlay Live", game_count: 0 },
    { name: "WM카지노", sub: "WM Live", vendor: "WM Live", game_count: 0 },
    { name: "드림게임", sub: "DreamGame", vendor: "DreamGame", game_count: 0 },
    { name: "벳게임즈", sub: "Betgames.tv", vendor: "Betgames.tv", game_count: 0 },
    { name: "보타", sub: "bota", vendor: "bota", game_count: 0 },
    { name: "마이크로게이밍", sub: "MicroGaming", vendor: "MicroGaming", game_count: 0 },
    { name: "아시아게이밍", sub: "Asia Gaming", vendor: "Asia Gaming", game_count: 0 },
    { name: "올벳", sub: "AllBet", vendor: "AllBet", game_count: 0 },
    { name: "에보플레이", sub: "Evoplay", vendor: "Evoplay", game_count: 0 },
    { name: "SA게이밍", sub: "SA Gaming", vendor: "SA Gaming", game_count: 0 },
  ];

  const displayCards = filteredVendors.length > 0
    ? filteredVendors.map((v) => ({
        name: getVendorKoreanName(v.vendor) || v.name || v.vendor,
        sub: v.vendor,
        vendor: v.vendor,
        game_count: v.game_count || 0,
        thumbnail: v.thumbnail || null,
      }))
    : fallbackCards.map((c) => ({ ...c, thumbnail: null as string | null }));

  return (
    <>
      {/* BANNER */}
      <section className="cc-banner">
        <Image
          src="/images/banner.png"
          alt="배너"
          width={1300}
          height={400}
          style={{ width: "100%", height: "auto", display: "block" }}
          priority
        />
      </section>

      {/* CATEGORY TABS */}
      <section className="cc-category-tabs">
        {categories.map((cat) => (
          <div
            key={cat.type}
            className={`cc-category-tab ${activeCategory === cat.type ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.type)}
          >
            <h3>{cat.label}</h3>
            <p>{cat.sub}</p>
          </div>
        ))}
      </section>

      {/* GAME CARDS (Vendor Cards) */}
      <section className="cc-game-cards">
        {displayCards.map((card, i) => (
          <VendorCard key={card.vendor + i} card={card} index={i} onClick={() => handleVendorCardClick(card.vendor)} />
        ))}
      </section>

      {/* INFO SECTION */}
      <section className="cc-info-section">
        {/* Events */}
        <div
          className="cc-info-box"

          style={{
          }}
        >
          <div className="cc-info-box-header cc-event-header">
            <span className="cc-icon">&#x1F3AA;</span> 이벤트
          </div>
          <div className="cc-event-list">
            {eventItems.map((item, i) => (
              <div key={i} className="cc-event-item">
                <span className="cc-event-tag">이벤트</span>
                <span>&#183;{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deposits */}
        <div
          className="cc-info-box"

          style={{
          }}
        >
          <div className="cc-info-box-header cc-deposit-header">
            <span className="cc-icon">&#x1F4B0;</span> 실시간입금현황
          </div>
          <div className="cc-transaction-list">
            {(deposits.length > 0
              ? deposits.slice(0, 5)
              : [
                  { username: "se***", amount: 50000, date: "2026-03-15" },
                  { username: "ba***", amount: 300000, date: "2026-03-15" },
                  { username: "x2***", amount: 300000, date: "2026-03-15" },
                  { username: "m***", amount: 50000, date: "2026-03-15" },
                  { username: "x2***", amount: 200000, date: "2026-03-15" },
                ]
            ).map((tx, i) => (
              <div key={`d-${i}`} className="cc-transaction-row">
                <span className="cc-tx-user">{tx.username}</span>
                <span className="cc-tx-amount">{formatAmount(tx.amount)}</span>
                <span className="cc-tx-date">{formatDate(tx.date)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Withdrawals */}
        <div
          className="cc-info-box"

          style={{
          }}
        >
          <div className="cc-info-box-header cc-withdraw-header">
            <span className="cc-icon">&#x1F4B0;</span> 실시간출금현황
          </div>
          <div className="cc-transaction-list">
            {(withdrawals.length > 0
              ? withdrawals.slice(0, 5)
              : [
                  { username: "m***", amount: 360000, date: "2026-03-15" },
                  { username: "x2***", amount: 2500000, date: "2026-03-15" },
                  { username: "m***", amount: 470000, date: "2026-03-15" },
                  { username: "ak***", amount: 4100000, date: "2026-03-15" },
                  { username: "m***", amount: 750000, date: "2026-03-15" },
                ]
            ).map((tx, i) => (
              <div key={`w-${i}`} className="cc-transaction-row">
                <span className="cc-tx-user">{tx.username}</span>
                <span
                  className="cc-tx-amount"
                  style={tx.amount >= 2000000 ? { color: "#ff69b4" } : {}}
                >
                  {formatAmount(tx.amount)}
                </span>
                <span className="cc-tx-date">{formatDate(tx.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRESSIVE JACKPOT */}
      <section
        className="cc-jackpot-section"
      >
        <h3>PROGRESSIVE JACKPOT</h3>
        <div className="cc-jackpot-amount">{jackpotValue.toLocaleString()}</div>
      </section>

      {/* BANNER LINKS */}
      <section className="cc-banner-links">
        {[
          { src: "/images/banner1.jpg", alt: "공식 텔레그램" },
          { src: "/images/banner2.jpg", alt: "공식 채널" },
          { src: "/images/banner3.jpg", alt: "평생도메인" },
        ].map((b, i) => (
          <a
            key={i}
            href="#"
            className="cc-banner-link"

          >
            <Image
              src={b.src}
              alt={b.alt}
              width={420}
              height={200}
              style={{ width: "100%", height: "auto", display: "block", borderRadius: "10px" }}
            />
          </a>
        ))}
      </section>

      {/* GAME PROVIDERS GRID */}
      <section className="cc-providers-section">
        <div className="cc-providers-grid">
          {providerNames.map((name, i) => (
            <div
              key={name}
              className="cc-provider-item"
  
            >
              <span>{name}</span>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        /* ── Banner ───────────────────────────────────── */
        .cc-banner {
          width: 100%;
          border-bottom: 1px solid #6abf40;
          box-shadow: 0 1px 8px rgba(106, 191, 64, 0.5);
        }

        /* ── Category Tabs ────────────────────────────── */
        .cc-category-tabs {
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 20px 15px;
          max-width: 1300px;
          margin: 0 auto;
          background: rgba(30, 30, 30, 0.85);
        }
        .cc-category-tab {
          flex: 1;
          text-align: center;
          padding: 12px 40px;
          cursor: pointer;
          transition: all 0.4s ease;
          border: 1px solid #444;
          border-radius: 40px;
          background: linear-gradient(180deg, #3a3a3a 0%, #252525 100%);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }
        .cc-category-tab:hover {
          background: linear-gradient(180deg, #4a4a4a 0%, #333 100%);
          border-color: #6abf40;
          box-shadow: 0 0 15px rgba(106, 191, 64, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.4);
          transform: translateY(-2px);
        }
        .cc-category-tab.active {
          background: linear-gradient(180deg, #7dd956 0%, #4a9a2e 50%, #3a7a20 100%);
          border-color: #8ae65a;
          box-shadow: 0 0 25px rgba(106, 191, 64, 0.5), 0 4px 15px rgba(106, 191, 64, 0.3),
            inset 0 1px 1px rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        .cc-category-tab h3 {
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 2px;
          color: #ddd;
          transition: color 0.3s, text-shadow 0.3s;
        }
        .cc-category-tab:hover h3 {
          color: #fff;
        }
        .cc-category-tab.active h3 {
          color: #f5e642;
          text-shadow: 0 0 10px rgba(245, 230, 66, 0.5);
        }
        .cc-category-tab p {
          font-size: 12px;
          color: #777;
          letter-spacing: 2px;
          transition: color 0.3s;
          margin: 0;
        }
        .cc-category-tab:hover p {
          color: #aaa;
        }
        .cc-category-tab.active p {
          color: rgba(255, 255, 255, 0.9);
        }

        /* ── Game Cards ───────────────────────────────── */
        .cc-game-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 15px;
          padding: 20px 15px;
          max-width: 1300px;
          margin: 0 auto;
          background: linear-gradient(180deg, rgba(30, 30, 30, 0.5), rgba(17, 17, 17, 1));
        }
        .cc-game-card {
          width: 100%;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(106, 191, 64, 0.4);
          background: #1a1a1a;
          cursor: pointer;
          transition: all 0.4s ease;
        }
        .cc-game-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: #6abf40;
          box-shadow: 0 10px 30px rgba(106, 191, 64, 0.3), 0 0 15px rgba(106, 191, 64, 0.2);
        }
        .cc-game-card-img {
          width: 100%;
          height: 200px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background-size: cover;
          background-position: center top;
        }
        .cc-overlay {
          width: 100%;
          height: 100%;
          background: linear-gradient(transparent 50%, rgba(0, 0, 0, 0.6));
          position: absolute;
          top: 0;
          left: 0;
        }
        .cc-thumb-fallback {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 50%, #2a2a2a 100%);
          z-index: 1;
        }
        .cc-thumb-fallback span {
          font-size: 20px;
          font-weight: 700;
          color: rgba(106, 191, 64, 0.6);
          text-align: center;
          padding: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .cc-game-card-info {
          padding: 10px;
          text-align: center;
          background: #1a1a1a;
          border-top: 1px solid #333;
        }
        .cc-game-card-info h4 {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }
        .cc-game-card-info p {
          font-size: 13px;
          color: #888;
          margin: 0;
        }
        .cc-game-count-badge {
          display: inline-block;
          margin-top: 6px;
          font-size: 11px;
          color: #6abf40;
          background: rgba(106, 191, 64, 0.1);
          border: 1px solid rgba(106, 191, 64, 0.3);
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
        }

        /* ── Info Section ─────────────────────────────── */
        .cc-info-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          padding: 40px 15px;
          max-width: 1300px;
          margin: 0 auto;
        }
        .cc-info-box {
          background: #1a1a1a;
          border: 1px solid #6abf40;
          box-shadow: 0 0 8px rgba(106, 191, 64, 0.3);
          border-radius: 8px;
          overflow: hidden;
        }
        .cc-info-box-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 18px;
          border-bottom: 1px solid #6abf40;
          box-shadow: 0 1px 8px rgba(106, 191, 64, 0.3);
          font-size: 20px;
          font-weight: 700;
        }
        .cc-icon {
          font-size: 18px;
        }
        .cc-event-header {
          color: #f5e642;
        }
        .cc-deposit-header {
          color: #00bfff;
        }
        .cc-withdraw-header {
          color: #ff6b9d;
        }

        /* Event list */
        .cc-event-list {
          padding: 8px 0;
        }
        .cc-event-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 18px;
          height: 48px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid rgba(106, 191, 64, 0.3);
        }
        .cc-event-item:last-child {
          border-bottom: none;
        }
        .cc-event-item:hover {
          background: rgba(106, 191, 64, 0.08);
        }
        .cc-event-tag {
          background: #f5e642;
          color: #000;
          font-size: 14px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 3px;
          white-space: nowrap;
        }
        .cc-event-item span {
          font-size: 17px;
          color: #ccc;
        }

        /* Transaction list */
        .cc-transaction-list {
          padding: 8px 0;
        }
        .cc-transaction-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          padding: 0 18px;
          height: 48px;
          align-items: center;
          font-size: 16px;
          border-bottom: 1px solid rgba(106, 191, 64, 0.3);
          transition: opacity 0.4s, transform 0.4s;
        }
        .cc-transaction-row:last-child {
          border-bottom: none;
        }
        .cc-tx-user {
          color: #ccc;
        }
        .cc-tx-amount {
          color: #f5e642;
          text-align: center;
          font-weight: 600;
        }
        .cc-tx-date {
          color: #666;
          text-align: right;
          font-size: 12px;
        }

        /* ── Jackpot ──────────────────────────────────── */
        .cc-jackpot-section {
          margin: 0 auto 40px;
          max-width: 1300px;
          border-radius: 12px;
          overflow: hidden;
          background: linear-gradient(135deg, #1a1000, #0d0800, #1a1000);
          border: 1px solid #6abf40;
          box-shadow: 0 0 8px rgba(106, 191, 64, 0.3);
          padding: 40px;
          text-align: center;
          position: relative;
        }
        .cc-jackpot-section h3 {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 4px;
          color: #ccc;
          margin-bottom: 10px;
        }
        .cc-jackpot-amount {
          font-size: 72px;
          font-weight: 900;
          background: linear-gradient(180deg, #ffd700, #ff8c00, #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }

        /* ── Banner Links ─────────────────────────────── */
        .cc-banner-links {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          padding: 0 15px 40px;
          max-width: 1300px;
          margin: 0 auto;
        }
        .cc-banner-link {
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s;
          text-decoration: none;
        }
        .cc-banner-link:hover {
          transform: translateY(-3px);
        }

        /* ── Providers Grid ───────────────────────────── */
        .cc-providers-section {
          padding: 0 15px 40px;
          max-width: 1300px;
          margin: 0 auto;
        }
        .cc-providers-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 2px;
        }
        .cc-provider-item {
          background: #1a1a1a;
          border: 1px solid rgba(106, 191, 64, 0.3);
          padding: 15px 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60px;
          transition: background 0.2s;
          cursor: pointer;
        }
        .cc-provider-item:hover {
          background: #252525;
          border-color: #6abf40;
          box-shadow: 0 0 8px rgba(106, 191, 64, 0.3);
        }
        .cc-provider-item:hover span {
          color: #6abf40;
        }
        .cc-provider-item span {
          font-size: 11px;
          color: #888;
          text-align: center;
          font-weight: 500;
          letter-spacing: 1px;
        }

        /* ── Responsive ───────────────────────────────── */
        @media (max-width: 1024px) {
          .cc-info-section {
            grid-template-columns: 1fr;
          }
          .cc-banner-links {
            grid-template-columns: 1fr;
          }
          .cc-providers-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        @media (max-width: 768px) {
          .cc-category-tabs {
            flex-direction: column;
            gap: 10px;
          }
          .cc-category-tab h3 {
            font-size: 20px;
          }
          .cc-jackpot-amount {
            font-size: 40px;
          }
          .cc-providers-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .cc-game-cards {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }
        }
      `}</style>
    </>
  );
}
