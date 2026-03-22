"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WithdrawRequest {
  id: string;
  amount: number;
  status: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  created_at: string;
  processed_at: string | null;
}

interface BalanceInfo {
  balance: number;
  honorlink_balance: number;
}

export default function UserWithdrawPage() {
  const router = useRouter();
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo>({ balance: 0, honorlink_balance: 0 });
  const [bankInfo, setBankInfo] = useState({ bank_name: "", bank_account: "", bank_holder: "" });
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [retrieving, setRetrieving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);

  // Check auth, fetch balance and bank info
  const fetchBalance = () => {
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
          setBalanceInfo({
            balance: data.balance,
            honorlink_balance: data.honorlink_balance,
          });
        }
      })
      .catch(() => router.push("/login"));
  };

  useEffect(() => {
    fetchBalance();

    // Get bank info from member profile (we infer from withdraw requests or a separate call)
    // For now, bank info comes from the withdraw API response
  }, [router]);

  // Fetch pending requests
  useEffect(() => {
    fetch("/api/user/withdraw")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setRequests(data.data);
          // Extract bank info from latest request if available
          if (data.data.length > 0) {
            const latest = data.data[0];
            if (latest.bank_name) {
              setBankInfo({
                bank_name: latest.bank_name,
                bank_account: latest.bank_account || "",
                bank_holder: latest.bank_holder || "",
              });
            }
          }
        }
      })
      .catch(() => {});
  }, [success]);

  // Retrieve balance from HonorLink first
  const handleRetrieveBalance = async () => {
    setRetrieving(true);
    setError("");
    try {
      const res = await fetch("/api/user/game-exit", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (data.retrieved > 0) {
          setSuccess(`게임에서 ${data.retrieved.toLocaleString()}원이 회수되었습니다.`);
        }
        fetchBalance();
      } else {
        setError(data.error || "잔액 회수에 실패했습니다.");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setRetrieving(false);
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmount((prev) => {
      const current = parseInt(prev || "0", 10);
      return String(current + val);
    });
  };

  const handleMaxAmount = () => {
    setAmount(String(balanceInfo.balance));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount <= 0) {
      setError("환전 금액을 올바르게 입력해주세요.");
      return;
    }
    if (numAmount < 10000) {
      setError("최소 환전 금액은 10,000원입니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "환전 신청에 실패했습니다.");
        return;
      }

      let msg = `${numAmount.toLocaleString()}원 환전 신청이 완료되었습니다.`;
      if (data.retrieved_from_game > 0) {
        msg += ` (게임에서 ${data.retrieved_from_game.toLocaleString()}원 회수)`;
      }
      setSuccess(msg);
      setAmount("");
      fetchBalance();
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
    <div className="wd-container">
      <div className="wd-card">
        <h2>환전신청</h2>

        <div className="wd-balance-box">
          <div className="wd-balance-row">
            <span>보유머니</span>
            <span className="wd-balance-val">{balanceInfo.balance.toLocaleString()}원</span>
          </div>
          {balanceInfo.honorlink_balance > 0 && (
            <div className="wd-balance-row">
              <span>게임머니</span>
              <span className="wd-balance-hl">{balanceInfo.honorlink_balance.toLocaleString()}원</span>
            </div>
          )}
        </div>

        {balanceInfo.honorlink_balance > 0 && (
          <button
            className="wd-retrieve-btn"
            onClick={handleRetrieveBalance}
            disabled={retrieving}
          >
            {retrieving ? "회수 중..." : "게임머니 회수하기"}
          </button>
        )}

        {bankInfo.bank_name && (
          <div className="wd-bank-info">
            <span>출금계좌: </span>
            <strong>{bankInfo.bank_name}</strong> {bankInfo.bank_account} ({bankInfo.bank_holder})
          </div>
        )}

        {error && <div className="wd-msg wd-error">{error}</div>}
        {success && <div className="wd-msg wd-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="wd-field">
            <label>환전 금액</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="금액을 입력하세요"
              min="10000"
              step="10000"
              max={balanceInfo.balance}
              required
            />
            <div className="wd-quick-amounts">
              {[10000, 30000, 50000, 100000, 300000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="wd-quick-btn"
                  onClick={() => handleQuickAmount(val)}
                >
                  +{(val / 10000)}만
                </button>
              ))}
              <button
                type="button"
                className="wd-quick-btn wd-quick-max"
                onClick={handleMaxAmount}
              >
                전액
              </button>
              <button
                type="button"
                className="wd-quick-btn wd-quick-reset"
                onClick={() => setAmount("")}
              >
                초기화
              </button>
            </div>
          </div>

          <button type="submit" className="wd-submit" disabled={loading}>
            {loading ? "신청 중..." : "환전 신청"}
          </button>
        </form>
      </div>

      {/* Request History */}
      {requests.length > 0 && (
        <div className="wd-card wd-history">
          <h3>환전 신청 내역</h3>
          <div className="wd-table">
            <div className="wd-table-header">
              <span>금액</span>
              <span>계좌</span>
              <span>상태</span>
              <span>신청일</span>
            </div>
            {requests.map((req) => {
              const st = statusLabel(req.status);
              return (
                <div key={req.id} className="wd-table-row">
                  <span className="wd-amount">{req.amount.toLocaleString()}원</span>
                  <span className="wd-bank">{req.bank_name} {req.bank_holder}</span>
                  <span style={{ color: st.color, fontWeight: 600 }}>{st.text}</span>
                  <span className="wd-date">{new Date(req.created_at).toLocaleString("ko-KR")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .wd-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 15px;
        }
        .wd-card {
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

        .wd-balance-box {
          background: #222;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .wd-balance-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          color: #aaa;
          font-size: 15px;
        }
        .wd-balance-val {
          color: #f5e642;
          font-weight: 700;
          font-size: 20px;
        }
        .wd-balance-hl {
          color: #00bfff;
          font-weight: 600;
          font-size: 16px;
        }

        .wd-retrieve-btn {
          width: 100%;
          padding: 10px;
          background: linear-gradient(135deg, #00bfff, #0088cc);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-family: "Noto Sans KR", sans-serif;
          margin-bottom: 16px;
        }
        .wd-retrieve-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #33ccff, #00aaee);
          box-shadow: 0 0 12px rgba(0, 191, 255, 0.5);
        }
        .wd-retrieve-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .wd-bank-info {
          background: #1e1e2e;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 14px;
          color: #aaa;
        }
        .wd-bank-info strong {
          color: #fff;
        }

        .wd-msg {
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 16px;
          text-align: center;
        }
        .wd-error {
          background: rgba(255, 0, 0, 0.15);
          border: 1px solid #ff4444;
          color: #ff6666;
        }
        .wd-success {
          background: rgba(106, 191, 64, 0.15);
          border: 1px solid #6abf40;
          color: #6abf40;
        }

        .wd-field {
          margin-bottom: 16px;
        }
        .wd-field label {
          display: block;
          color: #aaa;
          font-size: 14px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .wd-field input {
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
        .wd-field input:focus {
          border-color: #6abf40;
          box-shadow: 0 0 8px rgba(106, 191, 64, 0.3);
        }
        .wd-field input::placeholder {
          color: #666;
        }
        .wd-quick-amounts {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .wd-quick-btn {
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
        .wd-quick-btn:hover {
          background: #444;
          border-color: #6abf40;
          color: #6abf40;
        }
        .wd-quick-max {
          background: #1a2a1a;
          border-color: #336633;
          color: #6abf40;
        }
        .wd-quick-max:hover {
          background: #2a3a2a;
          border-color: #6abf40;
        }
        .wd-quick-reset {
          background: #2a1a1a;
          border-color: #663333;
          color: #ff6666;
        }
        .wd-quick-reset:hover {
          background: #3a2020;
          border-color: #ff4444;
          color: #ff4444;
        }

        .wd-submit {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #ff6b9d, #cc3366);
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
        .wd-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #ff85b1, #dd4477);
          box-shadow: 0 0 15px rgba(255, 107, 157, 0.5);
          transform: translateY(-1px);
        }
        .wd-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* History table */
        .wd-history {
          border-color: #444;
          box-shadow: none;
        }
        .wd-table {
          font-size: 14px;
        }
        .wd-table-header {
          display: grid;
          grid-template-columns: 1fr 1.2fr 0.7fr 1.3fr;
          gap: 8px;
          padding: 10px 0;
          border-bottom: 1px solid #444;
          color: #888;
          font-weight: 600;
          font-size: 13px;
        }
        .wd-table-row {
          display: grid;
          grid-template-columns: 1fr 1.2fr 0.7fr 1.3fr;
          gap: 8px;
          padding: 10px 0;
          border-bottom: 1px solid #2a2a2a;
          color: #ccc;
          align-items: center;
        }
        .wd-table-row:last-child {
          border-bottom: none;
        }
        .wd-amount {
          color: #ff6b9d;
          font-weight: 600;
        }
        .wd-bank {
          font-size: 12px;
          color: #999;
        }
        .wd-date {
          color: #666;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
