"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const BANKS = [
  "KB국민은행", "신한은행", "우리은행", "하나은행", "SC제일은행",
  "한국씨티은행", "기업은행", "농협은행", "수협은행", "대구은행",
  "부산은행", "광주은행", "제주은행", "전북은행", "경남은행",
  "카카오뱅크", "케이뱅크", "토스뱅크",
];

export default function UserRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
    phone: "",
    bank_name: "",
    bank_account: "",
    bank_holder: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate
    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (form.username.length < 4 || form.username.length > 14) {
      setError("아이디는 4~14자 영문/숫자만 가능합니다.");
      return;
    }

    if (!form.nickname) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      // First, get the default store_id (first store partner)
      const storeRes = await fetch("/api/user/default-store");
      const storeData = await storeRes.json();

      if (!storeData.store_id) {
        setError("현재 회원가입이 불가합니다. 관리자에게 문의하세요.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          nickname: form.nickname,
          store_id: storeData.store_id,
          phone: form.phone || undefined,
          bank_name: form.bank_name || undefined,
          bank_account: form.bank_account || undefined,
          bank_holder: form.bank_holder || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "회원가입에 실패했습니다.");
        return;
      }

      // Success - redirect to login
      router.push("/login?registered=1");
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-logo">
          <Image
            src="/images/cclogo.png"
            alt="CC CASINO"
            width={80}
            height={80}
            style={{ height: "80px", width: "auto" }}
          />
        </div>

        <h2>회원가입</h2>

        {error && <div className="register-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="register-field">
            <label>아이디 *</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="4~14자 영문/숫자"
              required
              autoComplete="username"
            />
          </div>

          <div className="register-field">
            <label>비밀번호 *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="register-field">
            <label>비밀번호 확인 *</label>
            <input
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력하세요"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="register-field">
            <label>닉네임 *</label>
            <input
              type="text"
              name="nickname"
              value={form.nickname}
              onChange={handleChange}
              placeholder="닉네임을 입력하세요"
              required
            />
          </div>

          <div className="register-field">
            <label>연락처</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="010-0000-0000"
            />
          </div>

          <div className="register-divider">은행 정보</div>

          <div className="register-field">
            <label>은행명</label>
            <select name="bank_name" value={form.bank_name} onChange={handleChange}>
              <option value="">선택하세요</option>
              {BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          <div className="register-field">
            <label>계좌번호</label>
            <input
              type="text"
              name="bank_account"
              value={form.bank_account}
              onChange={handleChange}
              placeholder="계좌번호를 입력하세요"
            />
          </div>

          <div className="register-field">
            <label>예금주</label>
            <input
              type="text"
              name="bank_holder"
              value={form.bank_holder}
              onChange={handleChange}
              placeholder="예금주를 입력하세요"
            />
          </div>

          <button type="submit" className="register-submit" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <div className="register-links">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </div>
      </div>

      <style jsx>{`
        .register-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: 40px 15px;
        }
        .register-card {
          background: #1a1a1a;
          border: 1px solid #6abf40;
          box-shadow: 0 0 20px rgba(106, 191, 64, 0.3);
          border-radius: 12px;
          padding: 40px;
          width: 100%;
          max-width: 480px;
        }
        .register-logo {
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
        .register-error {
          background: rgba(255, 0, 0, 0.15);
          border: 1px solid #ff4444;
          color: #ff6666;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 16px;
          text-align: center;
        }
        .register-divider {
          color: #6abf40;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 0 8px;
          border-top: 1px solid #333;
          margin-top: 8px;
        }
        .register-field {
          margin-bottom: 14px;
        }
        .register-field label {
          display: block;
          color: #aaa;
          font-size: 14px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .register-field input,
        .register-field select {
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
        .register-field select {
          cursor: pointer;
          appearance: auto;
        }
        .register-field input:focus,
        .register-field select:focus {
          border-color: #6abf40;
          box-shadow: 0 0 8px rgba(106, 191, 64, 0.3);
        }
        .register-field input::placeholder {
          color: #666;
        }
        .register-submit {
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
        .register-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #7dd956, #5ab83a);
          box-shadow: 0 0 15px rgba(106, 191, 64, 0.5);
          transform: translateY(-1px);
        }
        .register-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .register-links {
          text-align: center;
          margin-top: 20px;
          color: #888;
          font-size: 14px;
        }
        .register-links :global(a) {
          color: #6abf40;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        .register-links :global(a):hover {
          color: #7dd956;
          text-shadow: 0 0 8px rgba(106, 191, 64, 0.4);
        }
      `}</style>
    </div>
  );
}
