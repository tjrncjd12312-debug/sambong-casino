"use client";

import { useState, useEffect } from "react";

interface OneLineNotice {
  id?: string;
  content: string;
  is_active: boolean;
}

export default function OneLineNoticePage() {
  const [notices, setNotices] = useState<OneLineNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings?type=one-line-notice")
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || [];
        if (data.length === 0) {
          setNotices([{ content: "", is_active: false }]);
        } else {
          setNotices(data);
        }
      })
      .catch(() => {
        setNotices([{ content: "", is_active: false }]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (index: number) => {
    const notice = notices[index];
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings?type=one-line-notice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notice),
      });
      const json = await res.json();
      if (json.data) {
        const updated = [...notices];
        updated[index] = json.data;
        setNotices(updated);
        alert("저장되었습니다.");
      } else {
        alert(json.error || "저장에 실패했습니다.");
      }
    } catch {
      alert("저장에 실패했습니다.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-white/50">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_80px] bg-white/5 border-b border-white/10">
            <div className="px-5 py-3 text-sm text-white/70 font-bold">내용</div>
            <div className="px-3 py-3 text-sm text-white/70 font-bold text-center">사용여부</div>
            <div className="px-3 py-3 text-sm text-white/70 font-bold text-center">기능</div>
          </div>
          {notices.map((notice, index) => (
            <div key={notice.id || index} className="grid grid-cols-[1fr_120px_80px] border-b border-white/5 last:border-b-0">
              <div className="p-5">
                <textarea
                  value={notice.content}
                  onChange={(e) => {
                    const updated = [...notices];
                    updated[index] = { ...notice, content: e.target.value };
                    setNotices(updated);
                  }}
                  className="w-full h-16 bg-neutral-900 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-green-500/50"
                  placeholder="한줄 공지글을 입력하세요"
                />
              </div>
              <div className="flex items-center justify-center">
                <button
                  onClick={() => {
                    const updated = [...notices];
                    updated[index] = { ...notice, is_active: !notice.is_active };
                    setNotices(updated);
                  }}
                  className={`w-12 h-6 rounded-full relative transition-colors ${notice.is_active ? "bg-blue-600" : "bg-neutral-700"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${notice.is_active ? "translate-x-6" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-center">
                <button
                  onClick={() => handleSave(index)}
                  disabled={saving}
                  className="px-4 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-400 disabled:opacity-50"
                >
                  {saving ? "..." : "수정"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
