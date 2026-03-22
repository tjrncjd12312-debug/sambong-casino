"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Loader2 } from "lucide-react";
import TreeWithSearch from "@/components/admin/TreeWithSearch";

interface Message {
  id: string;
  title: string;
  content: string;
  is_broadcast: boolean;
  broadcast_target: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  recipient_partner: {
    id: string;
    username: string;
    nickname: string;
    level: string;
  } | null;
  recipient_member: {
    id: string;
    username: string;
    nickname: string;
  } | null;
}

export default function SupportMessagePage() {
  const [selectedPartner, setSelectedPartner] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [includeUser, setIncludeUser] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const filterButtons = [
    { label: "전체선택", color: "bg-neutral-700 hover:bg-neutral-600" },
    { label: "본사전체", color: "bg-red-600 hover:bg-red-500" },
    { label: "부본전체", color: "bg-orange-600 hover:bg-orange-500" },
    { label: "총판전체", color: "bg-neutral-600 hover:bg-neutral-500" },
    { label: "매장전체", color: "bg-neutral-800 hover:bg-neutral-700 border border-white/10" },
  ];

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set("search", searchKeyword);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`/api/support/messages?${params}`);
      const json = await res.json();
      if (json.data) setMessages(json.data);
    } catch {
      console.error("Failed to fetch messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [searchKeyword, dateFrom, dateTo]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }
    if (!selectedPartner) {
      alert("수신 대상을 선택해주세요.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          recipient_partner_id: selectedPartner,
          is_broadcast: false,
        }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        fetchMessages();
        alert("쪽지가 전송되었습니다.");
      } else {
        const err = await res.json();
        alert(err.error || "전송에 실패했습니다.");
      }
    } catch {
      alert("서버 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMsgIds.size === 0) return;
    if (!confirm(`선택한 ${selectedMsgIds.size}건을 삭제하시겠습니까?`)) return;
    // Messages don't have a delete API built but we can skip for now
    alert("삭제 기능은 준비 중입니다.");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const toggleMsgSelect = (id: string) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllMsgSelect = () => {
    if (selectedMsgIds.size === messages.length) {
      setSelectedMsgIds(new Set());
    } else {
      setSelectedMsgIds(new Set(messages.map((m) => m.id)));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-5">
        {/* Left - Tree & Search */}
        <div className="w-64 shrink-0 space-y-4">
          <div className="text-sm text-white font-bold">쪽지 보내기 대상 목록</div>
          <TreeWithSearch
            buttonLabel="회원목록 바로가기"
            showBlockedBtn={false}
            onSelect={(id) => setSelectedPartner(id)}
            selectedId={selectedPartner}
          />
        </div>

        {/* Middle - Message Form */}
        <div className="w-80 shrink-0 space-y-4">
          {/* Title Input */}
          <div className="rounded-xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
            <div className="px-4 py-2 border-b border-green-900/15">
              <span className="text-sm text-white/70">제목 <span className="text-red-400">*</span></span>
            </div>
            <div className="p-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
              />
            </div>
          </div>

          {/* Content Input */}
          <div className="rounded-xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
            <div className="px-4 py-2 border-b border-green-900/15">
              <span className="text-sm text-white/70">내용</span>
            </div>
            <div className="p-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                className="w-full text-sm bg-neutral-900 border border-white/10 text-white rounded-lg p-3 resize-none focus:outline-none focus:border-green-500/30"
              />
            </div>
          </div>

          {/* User Include Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeUser}
              onChange={() => setIncludeUser(!includeUser)}
              className="w-4 h-4 rounded border-white/20 bg-neutral-800"
            />
            <span className="text-sm text-white/70">유저 포함</span>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            <Check size={16} />
            {sending ? "전송 중..." : "전송하기"}
          </button>
        </div>

        {/* Right - Message History */}
        <div className="flex-1 space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterButtons.map((btn) => (
              <button key={btn.label} className={`px-4 py-2 rounded-lg text-white text-xs font-bold transition-colors ${btn.color}`}>
                {btn.label}
              </button>
            ))}
            <Input
              placeholder="검색어"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-28 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
            />
            <button onClick={fetchMessages} className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold hover:from-green-400 hover:to-emerald-500 transition-all">
              검색
            </button>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
            {/* Delete Button */}
            <div className="p-3 border-b border-green-900/15">
              <button onClick={handleDeleteSelected} className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors">
                선택삭제
              </button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-green-900/15 hover:bg-transparent">
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3 w-10">
                    <input
                      type="checkbox"
                      checked={messages.length > 0 && selectedMsgIds.size === messages.length}
                      onChange={toggleAllMsgSelect}
                      className="w-4 h-4 rounded border-white/20 bg-neutral-800"
                    />
                  </TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">제목</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">내용</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">수신파트너</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">등록일시</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">읽음여부</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">유저포함여부</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMessages ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                    </TableCell>
                  </TableRow>
                ) : messages.length === 0 ? (
                  <TableRow className="border-green-900/10">
                    <TableCell colSpan={7} className="text-center py-20 text-white/30 text-sm">
                      쪽지 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((msg) => (
                    <TableRow key={msg.id} className="border-green-900/10 hover:bg-white/[0.02]">
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedMsgIds.has(msg.id)}
                          onChange={() => toggleMsgSelect(msg.id)}
                          className="w-4 h-4 rounded border-white/20 bg-neutral-800"
                        />
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/80">{msg.title}</TableCell>
                      <TableCell className="text-center text-xs text-white/60 max-w-[200px] truncate">{msg.content}</TableCell>
                      <TableCell className="text-center text-xs text-purple-400">
                        {msg.recipient_partner?.nickname || msg.recipient_partner?.username || msg.recipient_member?.nickname || msg.recipient_member?.username || (msg.is_broadcast ? "전체" : "-")}
                      </TableCell>
                      <TableCell className="text-center text-xs text-white/60">{formatDate(msg.created_at)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${msg.is_read ? "bg-green-600 text-white" : "bg-neutral-700 text-white/50"}`}>
                          {msg.is_read ? "읽음" : "안읽음"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${msg.recipient_member ? "bg-blue-600 text-white" : "bg-neutral-700 text-white/50"}`}>
                          {msg.recipient_member ? "포함" : "미포함"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex justify-center py-4 border-t border-green-900/10">
              <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5">
                <option>100줄</option>
                <option>50줄</option>
                <option>200줄</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
