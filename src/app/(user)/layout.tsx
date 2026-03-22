"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "라이브카지노", href: "/#live-casino" },
  { label: "슬롯게임", href: "/#slot-game" },
  { label: "롤링챌린지", href: "#" },
  { label: "충전신청", href: "/deposit" },
  { label: "환전신청", href: "/withdraw" },
  { label: "출석부", href: "#" },
  { label: "공지사항", href: "/notice" },
  { label: "이벤트", href: "#" },
  { label: "고객센터", href: "/inquiry" },
  { label: "마이페이지", href: "/mypage" },
];

interface UserInfo {
  username: string;
  nickname?: string;
  balance: number;
  honorlink_balance: number;
}

interface UserNotification {
  id: string;
  type: "deposit" | "withdraw";
  amount: number;
  status: "approved" | "rejected";
  reject_reason?: string;
  processed_at: string;
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [retrieving, setRetrieving] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstLoadRef = React.useRef(true);

  // Fetch user balance
  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/user/balance");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUser({
            username: data.username,
            nickname: data.nickname,
            balance: data.balance,
            honorlink_balance: data.honorlink_balance,
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  // 충전/환전 처리 결과 폴링
  const checkMyRequests = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/user/my-requests");
      if (!res.ok) return;
      const json = await res.json();
      const results: UserNotification[] = json.data || [];

      if (isFirstLoadRef.current) {
        // 첫 로드: 이미 처리된 건은 seen으로 등록
        results.forEach((r: UserNotification) => seenIdsRef.current.add(r.id));
        isFirstLoadRef.current = false;
        return;
      }

      const newOnes = results.filter((r: UserNotification) => !seenIdsRef.current.has(r.id));
      if (newOnes.length > 0) {
        newOnes.forEach((r: UserNotification) => seenIdsRef.current.add(r.id));
        setNotifications((prev) => [...newOnes, ...prev].slice(0, 10));
        fetchBalance(); // 잔액도 갱신
      }
    } catch {}
  }, [user, fetchBalance]);

  // Initial check + auto-refresh every 10 seconds
  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  // 처리 결과 폴링 (3초마다)
  useEffect(() => {
    if (!user) return;
    checkMyRequests();
    const interval = setInterval(checkMyRequests, 3000);
    return () => clearInterval(interval);
  }, [user, checkMyRequests]);

  // 알림 닫기
  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Handle game exit / balance retrieval
  const handleRetrieveBalance = async () => {
    if (retrieving) return;
    setRetrieving(true);
    try {
      const res = await fetch("/api/user/game-exit", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(
          data.retrieved > 0
            ? `${data.retrieved.toLocaleString()}원이 회수되었습니다.`
            : "회수할 잔액이 없습니다."
        );
        fetchBalance();
      } else {
        alert(data.error || "잔액 회수에 실패했습니다.");
      }
    } catch {
      alert("서버에 연결할 수 없습니다.");
    } finally {
      setRetrieving(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <div
      style={{
        fontFamily: "'Noto Sans KR', sans-serif",
        backgroundColor: "#111111",
        color: "#ffffff",
        minHeight: "100vh",
      }}
    >
      {/* Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
        rel="stylesheet"
      />

      {/* TOP BAR */}
      <div className="cc-top-bar">
        {!loadingAuth && user ? (
          <>
            <span className="cc-user-info">
              <span className="cc-user-name">{user.nickname || user.username}</span>
              <span className="cc-user-balance">
                {(user.balance + user.honorlink_balance).toLocaleString()}원
              </span>
            </span>
            <Link href="/deposit">
              <button className="cc-top-btn cc-btn-signup">충전</button>
            </Link>
            <Link href="/withdraw">
              <button className="cc-top-btn cc-btn-signup">환전</button>
            </Link>
            <button className="cc-top-btn cc-btn-logout" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        ) : !loadingAuth ? (
          <>
            <Link href="/login">
              <button className="cc-top-btn cc-btn-login">로그인</button>
            </Link>
            <Link href="/register">
              <button className="cc-top-btn cc-btn-signup">회원가입</button>
            </Link>
            <button className="cc-top-btn cc-btn-anon">무기명가입</button>
          </>
        ) : null}
      </div>

      {/* HEADER / NAV */}
      <header className="cc-header">
        <Link href="/" className="cc-logo">
          <Image
            src="/images/cclogo.png"
            alt="CC CASINO"
            width={60}
            height={60}
            style={{ height: "60px", width: "auto" }}
          />
        </Link>

        {/* Mobile hamburger */}
        <button
          className="cc-mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`cc-nav ${mobileMenuOpen ? "open" : ""}`}>
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* MAIN CONTENT */}
      {children}

      {/* 유저 알림 팝업 */}
      {notifications.length > 0 && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          display: "flex", flexDirection: "column", gap: 10, maxWidth: 380,
        }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => dismissNotification(notif.id)}
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                cursor: "pointer",
                border: `1px solid ${notif.status === "approved" ? "#6abf40" : "#ff4444"}`,
                background: notif.status === "approved"
                  ? "linear-gradient(135deg, rgba(106,191,64,0.15), rgba(17,17,17,0.95))"
                  : "linear-gradient(135deg, rgba(255,68,68,0.15), rgba(17,17,17,0.95))",
                boxShadow: notif.status === "approved"
                  ? "0 4px 20px rgba(106,191,64,0.3)"
                  : "0 4px 20px rgba(255,68,68,0.3)",
                animation: "cc-slide-in 0.4s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{
                  fontSize: 24,
                }}>
                  {notif.status === "approved" ? "✅" : "❌"}
                </span>
                <span style={{
                  fontSize: 16, fontWeight: 700,
                  color: notif.status === "approved" ? "#6abf40" : "#ff4444",
                }}>
                  {notif.type === "deposit" ? "충전" : "환전"}
                  {notif.status === "approved" ? " 승인" : " 거절"}
                </span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#f5e642", marginBottom: 4 }}>
                {Number(notif.amount).toLocaleString()}원
              </div>
              {notif.status === "rejected" && notif.reject_reason && (
                <div style={{ fontSize: 12, color: "#ff8888", marginBottom: 4 }}>
                  사유: {notif.reject_reason}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#666" }}>
                클릭하여 닫기
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <footer
        style={{
          background: "#0a0a0a",
          borderTop: "1px solid #6abf40",
          boxShadow: "0 -1px 8px rgba(106, 191, 64, 0.5)",
          padding: "30px 40px",
          textAlign: "center",
          color: "#555",
          fontSize: "12px",
        }}
      >
        <p>&copy; CC CASINO. All Rights Reserved.</p>
      </footer>

      <style jsx global>{`
        /* CC Casino User Theme Styles */
        .cc-top-bar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 5px 15px;
          gap: 10px;
          background: #111;
          max-width: 1300px;
          margin: 0 auto;
          flex-wrap: wrap;
        }

        .cc-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-right: auto;
        }
        .cc-user-name {
          color: #6abf40;
          font-weight: 700;
          font-size: 14px;
        }
        .cc-user-balance {
          color: #f5e642;
          font-weight: 700;
          font-size: 15px;
        }
        .cc-user-hl-balance {
          color: #00bfff;
          font-size: 12px;
        }

        .cc-top-btn {
          padding: 6px 18px;
          border-radius: 5px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.3s;
          font-family: "Noto Sans KR", sans-serif;
        }
        .cc-top-btn:hover {
          transform: translateY(-1px);
        }
        .cc-top-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .cc-btn-login {
          background: transparent;
          border: 1px solid #6abf40;
          color: #6abf40;
        }
        .cc-btn-login:hover {
          background: rgba(106, 191, 64, 0.15);
          box-shadow: 0 0 10px rgba(106, 191, 64, 0.3);
        }
        .cc-btn-signup {
          background: linear-gradient(135deg, #6abf40, #4a9a2e);
          color: #fff;
        }
        .cc-btn-signup:hover {
          background: linear-gradient(135deg, #7dd956, #5ab83a);
          box-shadow: 0 0 12px rgba(106, 191, 64, 0.5);
        }
        .cc-btn-anon {
          background: linear-gradient(135deg, #6abf40, #4a9a2e);
          color: #fff;
        }
        .cc-btn-anon:hover {
          background: linear-gradient(135deg, #7dd956, #5ab83a);
          box-shadow: 0 0 12px rgba(106, 191, 64, 0.5);
        }
        .cc-btn-retrieve {
          background: linear-gradient(135deg, #00bfff, #0088cc);
          color: #fff;
        }
        .cc-btn-retrieve:hover:not(:disabled) {
          background: linear-gradient(135deg, #33ccff, #00aaee);
          box-shadow: 0 0 12px rgba(0, 191, 255, 0.5);
        }
        .cc-btn-logout {
          background: transparent;
          border: 1px solid #666;
          color: #999;
        }
        .cc-btn-logout:hover {
          border-color: #ff4444;
          color: #ff4444;
          box-shadow: 0 0 10px rgba(255, 68, 68, 0.3);
        }

        .cc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 15px;
          max-width: 1300px;
          margin: 0 auto;
          background: #000;
          border-top: 1px solid #6abf40;
          border-bottom: 1px solid #6abf40;
          box-shadow: 0 1px 8px rgba(106, 191, 64, 0.5);
        }

        .cc-logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .cc-nav {
          display: flex;
          gap: 25px;
        }
        .cc-nav a {
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          transition: color 0.2s;
          white-space: nowrap;
          text-decoration: none;
          position: relative;
        }
        .cc-nav a::after {
          content: "";
          display: block;
          width: 0;
          height: 2px;
          background: #6abf40;
          transition: width 0.3s;
          box-shadow: 0 0 6px rgba(106, 191, 64, 0.5);
        }
        .cc-nav a:hover {
          color: #6abf40;
          text-shadow: 0 0 8px rgba(106, 191, 64, 0.4);
        }
        .cc-nav a:hover::after {
          width: 100%;
        }

        .cc-mobile-menu-btn {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
        }
        .cc-mobile-menu-btn span {
          display: block;
          width: 25px;
          height: 2px;
          background: #6abf40;
          transition: all 0.3s;
        }

        @keyframes cc-slide-in {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @media (max-width: 768px) {
          .cc-mobile-menu-btn {
            display: flex;
          }
          .cc-nav {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #000;
            flex-direction: column;
            padding: 15px;
            gap: 15px;
            z-index: 100;
            border-bottom: 1px solid #6abf40;
          }
          .cc-nav.open {
            display: flex;
          }
          .cc-header {
            position: relative;
          }
          .cc-top-bar {
            flex-wrap: wrap;
            gap: 6px;
          }
          .cc-user-info {
            width: 100%;
            margin-right: 0;
            margin-bottom: 4px;
          }
        }
      `}</style>
    </div>
  );
}
