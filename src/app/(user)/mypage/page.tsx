"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MemberProfile {
  id: string;
  username: string;
  nickname: string;
  phone: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  balance: number;
  point_rolling: number;
  status: string;
  created_at: string;
  last_login_at: string;
}

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "password" | "bank">("info");

  // Form states
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json?.data) {
          const d = json.data;
          setProfile(d);
          setNickname(d.nickname || "");
          setPhone(d.phone || "");
          setBankName(d.bank_name || "");
          setBankAccount(d.bank_account || "");
          setBankHolder(d.bank_holder || "");
        }
      })
      .catch(() => {
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, phone }),
      });
      const json = await res.json();
      if (json.success) {
        showMessage("success", "정보가 수정되었습니다.");
        if (json.data) {
          setProfile((prev) => (prev ? { ...prev, ...json.data } : prev));
        }
      } else {
        showMessage("error", json.error || "수정에 실패했습니다.");
      }
    } catch {
      showMessage("error", "서버에 연결할 수 없습니다.");
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showMessage("error", "현재 비밀번호를 입력해주세요.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showMessage("error", "새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage("error", "새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        showMessage("success", "비밀번호가 변경되었습니다.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showMessage("error", json.error || "변경에 실패했습니다.");
      }
    } catch {
      showMessage("error", "서버에 연결할 수 없습니다.");
    }
    setSaving(false);
  };

  const handleUpdateBank = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: bankName,
          bank_account: bankAccount,
          bank_holder: bankHolder,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMessage("success", "은행 정보가 수정되었습니다.");
        if (json.data) {
          setProfile((prev) => (prev ? { ...prev, ...json.data } : prev));
        }
      } else {
        showMessage("error", json.error || "수정에 실패했습니다.");
      }
    } catch {
      showMessage("error", "서버에 연결할 수 없습니다.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <span style={{ color: "#666" }}>로딩 중...</span>
      </div>
    );
  }

  if (!profile) return null;

  const tabs = [
    { key: "info" as const, label: "기본정보" },
    { key: "password" as const, label: "비밀번호 변경" },
    { key: "bank" as const, label: "은행정보" },
  ];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 15px" }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>마이페이지</h1>
        <p style={{ fontSize: 14, color: "#666" }}>회원 정보를 확인하고 수정할 수 있습니다.</p>
      </div>

      {/* Balance Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a2a15, #0d1a08)",
          border: "1px solid #6abf40",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 24,
          boxShadow: "0 0 20px rgba(106,191,64,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#6abf40", fontWeight: 700, marginBottom: 4 }}>
              {profile.nickname || profile.username}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>@{profile.username}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>보유잔액</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#f5e642" }}>
              {Number(profile.balance || 0).toLocaleString()}원
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(106,191,64,0.2)",
          }}
        >
          <div>
            <span style={{ fontSize: 12, color: "#888" }}>포인트 롤링</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#00bfff", marginLeft: 8 }}>
              {Number(profile.point_rolling || 0).toLocaleString()}P
            </span>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#888" }}>가입일</span>
            <span style={{ fontSize: 12, color: "#aaa", marginLeft: 8 }}>
              {profile.created_at ? new Date(profile.created_at).toLocaleDateString("ko-KR") : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            background: message.type === "success" ? "rgba(106,191,64,0.15)" : "rgba(255,68,68,0.15)",
            border: `1px solid ${message.type === "success" ? "#6abf40" : "#ff4444"}`,
            color: message.type === "success" ? "#6abf40" : "#ff4444",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 0,
          borderBottom: "1px solid #333",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "12px 24px",
              background: activeTab === tab.key ? "#1a1a1a" : "transparent",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #6abf40" : "2px solid transparent",
              color: activeTab === tab.key ? "#6abf40" : "#666",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Noto Sans KR', sans-serif",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          padding: 28,
        }}
      >
        {activeTab === "info" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                아이디
              </label>
              <input
                value={profile.username}
                disabled
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#0d0d0d",
                  color: "#555",
                  fontSize: 14,
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                닉네임
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                전화번호
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
            </div>
            <button
              onClick={handleUpdateProfile}
              disabled={saving}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #6abf40, #4a9a2e)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                fontFamily: "'Noto Sans KR', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {saving ? "저장 중..." : "정보 수정"}
            </button>
          </div>
        )}

        {activeTab === "password" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6자 이상"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={saving}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #6abf40, #4a9a2e)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                fontFamily: "'Noto Sans KR', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {saving ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        )}

        {activeTab === "bank" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                은행명
              </label>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="예: 국민은행"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                계좌번호
              </label>
              <input
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="계좌번호 입력"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                예금주
              </label>
              <input
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="예금주명"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
            </div>
            <button
              onClick={handleUpdateBank}
              disabled={saving}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #6abf40, #4a9a2e)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                fontFamily: "'Noto Sans KR', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {saving ? "저장 중..." : "은행정보 수정"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
