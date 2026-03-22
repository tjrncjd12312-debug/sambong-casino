"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DepositRequest {
  id: string;
  amount: number;
  bonus_amount: number;
  status: string;
  depositor_name: string;
  created_at: string;
  processed_at: string | null;
}

export default function UserDepositPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requests, setRequests] = useState<DepositRequest[]>([]);

  // Check auth and fetch balance
  useEffect(() => {
    fetch("/api/user/balance")
      .then((r) => {
        if (!r.ok) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.success) {
          setBalance(data.balance);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // Fetch pending requests
  useEffect(() => {
    fetch("/api/user/deposit")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setRequests(data.data);
        }
      })
      .catch(() => {});
  }, [success]);

  const handleQuickAmount = (val: number) => {
    setAmount((prev) => {
      const current = parseInt(prev || "0", 10);
      return String(current + val);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount <= 0) {
      setError("충전 금액을 올바르게 입력해주세요.");
      return;
    }
    if (numAmount < 10000) {
      setError("최소 충전 금액은 10,000원입니다.");
      return;
    }
    if (!depositorName.trim()) {
      setError("입금자명을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          depositor_name: depositorName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "충전 신청에 실패했습니다.");
        return;
      }

      setSuccess(`${numAmount.toLocaleString()}원 충전 신청이 완료되었습니다. 관리자 승인 후 반영됩니다.`);
      setAmount("");
      setDepositorName("");
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending": return { text: "대기중", color: "#f5e642" };
      case "approved": return { text: "승인", color: "#6abf40" };
      case "rejected": return { text: "거절", color: "#ff4444" };
      default: return { text: status, color: "#888" };
    }
  };

  return (
    <div className="dp-container">
      <div className="dp-card">
        <h2>충전신청</h2>

        <div className="dp-balance">
          보유머니: <span>{balance.toLocaleString()}원</span>
        </div>

        {error && <div className="dp-msg dp-error">{error}</div>}
        {success && <div className="dp-msg dp-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="dp-field">
            <label>충전 금액</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="금액을 입력하세요"
              min="10000"
              step="10000"
              required
            />
            <div className="dp-quick-amounts">
              {[10000, 30000, 50000, 100000, 300000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="dp-quick-btn"
                  onClick={() => handleQuickAmount(val)}
                >
                  +{(val / 10000)}만
                </button>
              ))}
              <button
                type="button"
                className="dp-quick-btn dp-quick-reset"
                onClick={() => setAmount("")}
              >
                초기화
              </button>
            </div>
          </div>

          <div className="dp-field">
            <label>입금자명</label>
            <input
              type="text"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              placeholder="입금자명을 입력하세요"
              required
            />
          </div>

          <button type="submit" className="dp-submit" disabled={loading}>
            {loading ? "신청 중..." : "충전 신청"}
          </button>
        </form>
      </div>

      {/* Request History */}
      {requests.length > 0 && (
        <div className="dp-card dp-history">
          <h3>충전 신청 내역</h3>
          <div className="dp-table">
            <div className="dp-table-header">
              <span>금액</span>
              <span>입금자</span>
              <span>상태</span>
              <span>신청일</span>
            </div>
            {requests.map((req) => {
              const st = statusLabel(req.status);
              return (
                <div key={req.id} className="dp-table-row">
                  <span className="dp-amount">{req.amount.toLocaleString()}원</span>
                  <span>{req.depositor_name}</span>
                  <span style={{ color: st.color, fontWeight: 600 }}>{st.text}</span>
                  <span className="dp-date">{new Date(req.created_at).toLocaleString("ko-KR")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .dp-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 15px;
        }
        .dp-card {
          background: #1a1a1a;
          border: 1px solid #6abf40;
          box-shadow: 0 0 20px rgba(106, 191, 64, 0.3);
          border-radius: 12px;
          padding: 32px;
          margin-bottom: 24px;
        }
        h2 {
          text-align: center;
          color: #fff;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 20px;
        }
        h3 {
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 16px;
        }
        .dp-balance {
          text-align: center;
          font-size: 16px;
          color: #aaa;
          margin-bottom: 20px;
          padding: 12px;
          background: #222;
          border-radius: 8px;
        }
        .dp-balance span {
          color: #f5e642;
          font-weight: 700;
          font-size: 20px;
        }
        .dp-msg {
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 16px;
          text-align: center;
        }
        .dp-error {
          background: rgba(255, 0, 0, 0.15);
          border: 1px solid #ff4444;
          color: #ff6666;
        }
        .dp-success {
          background: rgba(106, 191, 64, 0.15);
          border: 1px solid #6abf40;
          color: #6abf40;
        }
        .dp-field {
          margin-bottom: 16px;
        }
        .dp-field label {
          display: block;
          color: #aaa;
          font-size: 14px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .dp-field input {
          width: 100%;
          padding: 12px 14px;
          background: #222;
          border: 1px solid #444;
          border-radius: 8px;
          color: #fff;
          font-size: 15px;
          outline: none;
          transition: border-color 0.3s;
          font-family: "Noto Sans KR", sans-serif;
          box-sizing: border-box;
        }
        .dp-field input:focus {
          border-color: #6abf40;
          box-shadow: 0 0 8px rgba(106, 191, 64, 0.3);
        }
        .dp-field input::placeholder {
          color: #666;
        }
        .dp-quick-amounts {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .dp-quick-btn {
          padding: 6px 12px;
          background: #333;
          border: 1px solid #555;
          border-radius: 6px;
          color: #ccc;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: "Noto Sans KR", sans-serif;
        }
        .dp-quick-btn:hover {
          background: #444;
          border-color: #6abf40;
          color: #6abf40;
        }
        .dp-quick-reset {
          background: #2a1a1a;
          border-color: #663333;
          color: #ff6666;
        }
        .dp-quick-reset:hover {
          background: #3a2020;
          border-color: #ff4444;
          color: #ff4444;
        }
        .dp-submit {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #6abf40, #4a9a2e);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          font-family: "Noto Sans KR", sans-serif;
          margin-top: 8px;
        }
        .dp-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #7dd956, #5ab83a);
          box-shadow: 0 0 15px rgba(106, 191, 64, 0.5);
          transform: translateY(-1px);
        }
        .dp-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* History table */
        .dp-history {
          border-color: #444;
          box-shadow: none;
        }
        .dp-table {
          font-size: 14px;
        }
        .dp-table-header {
          display: grid;
          grid-template-columns: 1fr 1fr 0.7fr 1.3fr;
          gap: 8px;
          padding: 10px 0;
          border-bottom: 1px solid #444;
          color: #888;
          font-weight: 600;
          font-size: 13px;
        }
        .dp-table-row {
          display: grid;
          grid-template-columns: 1fr 1fr 0.7fr 1.3fr;
          gap: 8px;
          padding: 10px 0;
          border-bottom: 1px solid #2a2a2a;
          color: #ccc;
          align-items: center;
        }
        .dp-table-row:last-child {
          border-bottom: none;
        }
        .dp-amount {
          color: #f5e642;
          font-weight: 600;
        }
        .dp-date {
          color: #666;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
