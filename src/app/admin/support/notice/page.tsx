"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, X } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  content: string;
  notice_type: string;
  is_published: boolean;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
  return (
    <button onClick={() => onChange(!enabled)} className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? "bg-blue-600" : "bg-neutral-700"}`}>
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function NoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState("general");
  const [formPublished, setFormPublished] = useState(true);
  const [formPinned, setFormPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchNotices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/support/notices?${params}`);
      const json = await res.json();
      if (json.data) setNotices(json.data);
    } catch {
      console.error("Failed to fetch notices");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const openCreateModal = () => {
    setEditingNotice(null);
    setFormTitle("");
    setFormContent("");
    setFormType("general");
    setFormPublished(true);
    setFormPinned(false);
    setShowModal(true);
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setFormTitle(notice.title);
    setFormContent(notice.content);
    setFormType(notice.notice_type || "general");
    setFormPublished(notice.is_published);
    setFormPinned(notice.is_pinned);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: formTitle,
        content: formContent,
        notice_type: formType,
        is_published: formPublished,
        is_pinned: formPinned,
      };

      let res;
      if (editingNotice) {
        res = await fetch(`/api/support/notices/${editingNotice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/support/notices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setShowModal(false);
        fetchNotices();
      } else {
        const err = await res.json();
        alert(err.error || "저장에 실패했습니다.");
      }
    } catch {
      alert("서버 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/support/notices/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchNotices();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch {
      alert("서버 오류가 발생했습니다.");
    }
  };

  const handleTogglePublished = async (notice: Notice, val: boolean) => {
    try {
      await fetch(`/api/support/notices/${notice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: val }),
      });
      setNotices((prev) =>
        prev.map((n) => (n.id === notice.id ? { ...n, is_published: val } : n))
      );
    } catch {}
  };

  const handleTogglePinned = async (notice: Notice, val: boolean) => {
    try {
      await fetch(`/api/support/notices/${notice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: val }),
      });
      setNotices((prev) =>
        prev.map((n) => (n.id === notice.id ? { ...n, is_pinned: val } : n))
      );
    } catch {}
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const noticeTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      general: "일반",
      event: "이벤트",
      maintenance: "점검",
      important: "중요",
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-white font-bold text-lg mb-5">공지사항</div>
        <div className="flex justify-end mb-4 gap-2">
          <Input
            placeholder="검색어"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchNotices()}
            className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
          />
          <button onClick={fetchNotices} className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["#", "공지구분", "제목", "등록일시", "조회수", "상단고정", "유저보이기", "수정", "삭제"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-20">
                  <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                </TableCell>
              </TableRow>
            ) : notices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-20 text-white/30 text-sm">
                  등록된 공지사항이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              notices.map((n, idx) => (
                <TableRow key={n.id} className="border-green-900/10 hover:bg-white/[0.02]">
                  <TableCell className="text-center text-xs text-white/60">{notices.length - idx}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      n.notice_type === "important" ? "bg-red-600 text-white" :
                      n.notice_type === "event" ? "bg-yellow-600 text-white" :
                      n.notice_type === "maintenance" ? "bg-orange-600 text-white" :
                      "bg-neutral-700 text-white/70"
                    }`}>
                      {noticeTypeLabel(n.notice_type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/80">
                    {n.is_pinned && <span className="text-red-400 mr-1">[고정]</span>}
                    {n.title}
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/60">{formatDate(n.created_at)}</TableCell>
                  <TableCell className="text-center text-xs text-white/60">{n.view_count}</TableCell>
                  <TableCell className="text-center">
                    <Toggle enabled={n.is_pinned} onChange={(val) => handleTogglePinned(n, val)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Toggle enabled={n.is_published} onChange={(val) => handleTogglePublished(n, val)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <button onClick={() => openEditModal(n)} className="px-3 py-1 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-500">수정</button>
                  </TableCell>
                  <TableCell className="text-center">
                    <button onClick={() => handleDelete(n.id)} className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-500">삭제</button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5"><option>100줄</option></select>
        </div>
      </div>
      <button onClick={openCreateModal} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold">신규 공지 작성</button>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div className="w-[600px] max-h-[85vh] overflow-y-auto rounded-2xl border border-green-900/20 p-6 space-y-4" style={{ background: "#1a1a1a" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">{editingNotice ? "공지 수정" : "신규 공지 작성"}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/70 mb-1 block">공지구분</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full h-9 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg px-3"
                >
                  <option value="general">일반</option>
                  <option value="important">중요</option>
                  <option value="event">이벤트</option>
                  <option value="maintenance">점검</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/70 mb-1 block">제목 <span className="text-red-400">*</span></label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
                  placeholder="공지 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="text-sm text-white/70 mb-1 block">내용 <span className="text-red-400">*</span></label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={12}
                  className="w-full text-sm bg-neutral-900 border border-white/10 text-white rounded-lg p-3 resize-none focus:outline-none focus:border-green-500/30"
                  placeholder="공지 내용을 입력하세요"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input type="checkbox" checked={formPublished} onChange={() => setFormPublished(!formPublished)} className="w-4 h-4 rounded" />
                  유저에게 보이기
                </label>
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input type="checkbox" checked={formPinned} onChange={() => setFormPinned(!formPinned)} className="w-4 h-4 rounded" />
                  상단 고정
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg bg-neutral-700 text-white text-sm font-bold hover:bg-neutral-600">취소</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-sm font-bold disabled:opacity-50">
                {saving ? "저장 중..." : editingNotice ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
