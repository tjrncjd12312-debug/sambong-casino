"use client";

import { useState, useEffect } from "react";

interface Notice {
  id: string;
  title: string;
  content: string;
  notice_type: string;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
}

export default function UserNoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch("/api/user/notices");
        const json = await res.json();
        if (json.data) setNotices(json.data);
      } catch {
        console.error("Failed to fetch notices");
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const noticeTypeLabel = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      general: { label: "일반", color: "#888" },
      event: { label: "이벤트", color: "#f5e642" },
      maintenance: { label: "점검", color: "#ff8c00" },
      important: { label: "중요", color: "#ff4444" },
    };
    return map[type] || { label: type, color: "#888" };
  };

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "30px 15px", minHeight: "60vh" }}>
      <h1 style={{
        fontSize: 24,
        fontWeight: 900,
        color: "#6abf40",
        marginBottom: 25,
        borderBottom: "2px solid #6abf40",
        paddingBottom: 12,
      }}>
        공지사항
      </h1>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#555" }}>
          로딩 중...
        </div>
      ) : notices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#555" }}>
          등록된 공지사항이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 120px",
            padding: "12px 20px",
            background: "#1a1a1a",
            borderBottom: "1px solid #333",
            fontWeight: 700,
            fontSize: 14,
            color: "#6abf40",
          }}>
            <span style={{ textAlign: "center" }}>구분</span>
            <span>제목</span>
            <span style={{ textAlign: "center" }}>등록일</span>
          </div>

          {notices.map((notice) => {
            const typeInfo = noticeTypeLabel(notice.notice_type);
            const isExpanded = expandedId === notice.id;

            return (
              <div key={notice.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 120px",
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
                    color: typeInfo.color,
                    border: `1px solid ${typeInfo.color}`,
                    borderRadius: 4,
                    padding: "2px 8px",
                    display: "inline-block",
                  }}>
                    {typeInfo.label}
                  </span>
                  <span style={{
                    fontSize: 14,
                    color: "#ddd",
                    fontWeight: notice.is_pinned ? 700 : 400,
                  }}>
                    {notice.is_pinned && (
                      <span style={{ color: "#ff4444", marginRight: 8, fontSize: 12 }}>[공지]</span>
                    )}
                    {notice.title}
                  </span>
                  <span style={{ textAlign: "center", fontSize: 12, color: "#666" }}>
                    {formatDate(notice.created_at)}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{
                    padding: "20px 30px",
                    background: "#1a1a1a",
                    borderBottom: "1px solid #333",
                    borderLeft: "3px solid #6abf40",
                  }}>
                    <div style={{
                      color: "#ccc",
                      fontSize: 14,
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                    }}>
                      {notice.content}
                    </div>
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
