"use client";

import { useState, useEffect, useCallback } from "react";

interface Inquiry {
  id: string;
  title: string;
  content: string;
  status: string;
  answer_content: string | null;
  answered_at: string | null;
  created_at: string;
}

export default function UserInquiryPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchInquiries = useCallback(async () => {
    try {
      const res = await fetch("/api/user/inquiries");
      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      const json = await res.json();
      if (json.data) setInquiries(json.data);
    } catch {
      console.error("Failed to fetch inquiries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle, content: formContent }),
      });
      if (res.ok) {
        setFormTitle("");
        setFormContent("");
        setShowForm(false);
        fetchInquiries();
        alert("문의가 접수되었습니다.");
      } else {
        const err = await res.json();
        alert(err.error || "문의 접수에 실패했습니다.");
      }
    } catch {
      alert("서버에 연결할 수 없습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const statusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: "대기중", color: "#f5e642", bg: "rgba(245,230,66,0.15)" },
      in_progress: { label: "처리중", color: "#00bfff", bg: "rgba(0,191,255,0.15)" },
      done: { label: "답변완료", color: "#6abf40", bg: "rgba(106,191,64,0.15)" },
    };
    return map[status] || { label: status, color: "#888", bg: "rgba(136,136,136,0.15)" };
  };

  if (!isLoggedIn) {
    return (
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "30px 15px", minHeight: "60vh" }}>
        <h1 style={{
          fontSize: 24, fontWeight: 900, color: "#6abf40",
          marginBottom: 25, borderBottom: "2px solid #6abf40", paddingBottom: 12,
        }}>
          1:1 문의
        </h1>
        <div style={{
          textAlign: "center", padding: "80px 0", color: "#888",
          background: "#151515", borderRadius: 12,
        }}>
          <p style={{ fontSize: 16, marginBottom: 20 }}>로그인이 필요한 서비스입니다.</p>
          <a href="/login" style={{
            display: "inline-block", padding: "10px 30px",
            background: "linear-gradient(135deg, #6abf40, #4a9a2e)",
            color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 14,
            textDecoration: "none",
          }}>
            로그인하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "30px 15px", minHeight: "60vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25, borderBottom: "2px solid #6abf40", paddingBottom: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#6abf40" }}>1:1 문의</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "10px 24px",
            background: showForm ? "#333" : "linear-gradient(135deg, #6abf40, #4a9a2e)",
            color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 14,
            border: "none", cursor: "pointer", transition: "all 0.3s",
          }}
        >
          {showForm ? "취소" : "문의하기"}
        </button>
      </div>

      {/* Inquiry Form */}
      {showForm && (
        <div style={{
          background: "#1a1a1a", borderRadius: 12, padding: 24,
          marginBottom: 24, border: "1px solid #333",
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#6abf40", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              제목 <span style={{ color: "#ff4444" }}>*</span>
            </label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="문의 제목을 입력하세요"
              style={{
                width: "100%", padding: "10px 14px", background: "#111",
                border: "1px solid #333", borderRadius: 8, color: "#fff",
                fontSize: 14, outline: "none",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#6abf40"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#333"}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#6abf40", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              내용 <span style={{ color: "#ff4444" }}>*</span>
            </label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="문의 내용을 상세히 입력해주세요"
              rows={8}
              style={{
                width: "100%", padding: "10px 14px", background: "#111",
                border: "1px solid #333", borderRadius: 8, color: "#fff",
                fontSize: 14, outline: "none", resize: "none",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#6abf40"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#333"}
            />
          </div>
          <div style={{ textAlign: "right" }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "10px 30px",
                background: submitting ? "#555" : "linear-gradient(135deg, #6abf40, #4a9a2e)",
                color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 14,
                border: "none", cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "접수 중..." : "문의 접수"}
            </button>
          </div>
        </div>
      )}

      {/* Inquiry List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#555" }}>
          로딩 중...
        </div>
      ) : inquiries.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 0", color: "#555",
          background: "#151515", borderRadius: 12,
        }}>
          문의 내역이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 120px 120px",
            padding: "12px 20px",
            background: "#1a1a1a",
            borderBottom: "1px solid #333",
            fontWeight: 700,
            fontSize: 14,
            color: "#6abf40",
          }}>
            <span style={{ textAlign: "center" }}>상태</span>
            <span>제목</span>
            <span style={{ textAlign: "center" }}>등록일</span>
            <span style={{ textAlign: "center" }}>답변일</span>
          </div>

          {inquiries.map((inq) => {
            const st = statusInfo(inq.status);
            const isExpanded = expandedId === inq.id;

            return (
              <div key={inq.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : inq.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 120px 120px",
                    padding: "14px 20px",
                    background: isExpanded ? "#1e1e1e" : "#151515",
                    borderBottom: "1px solid #222",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "#1a1a1a"; }}
                  onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "#151515"; }}
                >
                  <span style={{
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: st.color,
                    background: st.bg,
                    borderRadius: 4,
                    padding: "3px 8px",
                    display: "inline-block",
                  }}>
                    {st.label}
                  </span>
                  <span style={{ fontSize: 14, color: "#ddd" }}>{inq.title}</span>
                  <span style={{ textAlign: "center", fontSize: 12, color: "#666" }}>{formatDate(inq.created_at)}</span>
                  <span style={{ textAlign: "center", fontSize: 12, color: inq.answered_at ? "#6abf40" : "#444" }}>
                    {inq.answered_at ? formatDate(inq.answered_at) : "-"}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{
                    padding: "20px 30px",
                    background: "#1a1a1a",
                    borderBottom: "1px solid #333",
                  }}>
                    {/* Original inquiry */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, color: "#6abf40", fontWeight: 700, marginBottom: 8 }}>문의 내용</div>
                      <div style={{
                        color: "#ccc", fontSize: 14, lineHeight: 1.8,
                        whiteSpace: "pre-wrap", background: "#111",
                        borderRadius: 8, padding: 16,
                        border: "1px solid #222",
                      }}>
                        {inq.content}
                      </div>
                    </div>

                    {/* Answer */}
                    {inq.answer_content ? (
                      <div>
                        <div style={{ fontSize: 12, color: "#6abf40", fontWeight: 700, marginBottom: 8 }}>
                          관리자 답변 {inq.answered_at && <span style={{ color: "#666", fontWeight: 400, marginLeft: 8 }}>{formatDate(inq.answered_at)}</span>}
                        </div>
                        <div style={{
                          color: "#ccc", fontSize: 14, lineHeight: 1.8,
                          whiteSpace: "pre-wrap", background: "rgba(106,191,64,0.05)",
                          borderRadius: 8, padding: 16,
                          border: "1px solid rgba(106,191,64,0.2)",
                          borderLeft: "3px solid #6abf40",
                        }}>
                          {inq.answer_content}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        textAlign: "center", padding: "20px 0",
                        color: "#555", fontSize: 13,
                      }}>
                        아직 답변이 등록되지 않았습니다.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
