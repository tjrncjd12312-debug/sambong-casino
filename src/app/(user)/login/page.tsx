"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function UserLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/member-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }

      router.push("/");
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <Image
            src="/images/cclogo.png"
            alt="CC CASINO"
            width={80}
            height={80}
            style={{ height: "80px", width: "auto" }}
          />
        </div>

        <h2>로그인</h2>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              required
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="login-links">
          <Link href="/register">회원가입</Link>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: 40px 15px;
        }
        .login-card {
          background: #1a1a1a;
          border: 1px solid #6abf40;
          box-shadow: 0 0 20px rgba(106, 191, 64, 0.3);
          border-radius: 12px;
          padding: 40px;
          width: 100%;
          max-width: 420px;
        }
        .login-logo {
          text-align: center;
          margin-bottom: 20px;
        }
        h2 {
          text-align: center;
          color: #fff;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 24px;
        }
        .login-error {
          background: rgba(255, 0, 0, 0.15);
          border: 1px solid #ff4444;
          color: #ff6666;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 16px;
          text-align: center;
        }
        .login-field {
          margin-bottom: 16px;
        }
        .login-field label {
          display: block;
          color: #aaa;
          font-size: 14px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .login-field input {
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
        .login-field input:focus {
          border-color: #6abf40;
          box-shadow: 0 0 8px rgba(106, 191, 64, 0.3);
        }
        .login-field input::placeholder {
          color: #666;
        }
        .login-submit {
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
        .login-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #7dd956, #5ab83a);
          box-shadow: 0 0 15px rgba(106, 191, 64, 0.5);
          transform: translateY(-1px);
        }
        .login-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-links {
          text-align: center;
          margin-top: 20px;
        }
        .login-links :global(a) {
          color: #6abf40;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s;
        }
        .login-links :global(a):hover {
          color: #7dd956;
          text-shadow: 0 0 8px rgba(106, 191, 64, 0.4);
        }
      `}</style>
    </div>
  );
}
