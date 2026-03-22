"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check } from "lucide-react";
import TreeWithSearch from "@/components/admin/TreeWithSearch";

export default function MessagePage() {
  const [selectedPartner, setSelectedPartner] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [includeUser, setIncludeUser] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const filterButtons = [
    { label: "전체선택", color: "bg-neutral-700 hover:bg-neutral-600" },
    { label: "본사전체", color: "bg-red-600 hover:bg-red-500" },
    { label: "부본전체", color: "bg-orange-600 hover:bg-orange-500" },
    { label: "총판전체", color: "bg-neutral-600 hover:bg-neutral-500" },
    { label: "매장전체", color: "bg-neutral-800 hover:bg-neutral-700 border border-white/10" },
  ];

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
          <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2">
            <Check size={16} />
            전송하기
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
            <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
            <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
            <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold hover:from-green-400 hover:to-emerald-500 transition-all">
              검색
            </button>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
            {/* Delete Button */}
            <div className="p-3 border-b border-green-900/15">
              <button className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors">
                선택삭제
              </button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-green-900/15 hover:bg-transparent">
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3 w-10">
                    <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-neutral-800" />
                  </TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">제목</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">내용</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">수신파트너</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">등록일시</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">회원수신여부</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">유저포함여부</TableHead>
                  <TableHead className="text-center text-xs text-white/70 font-bold py-3">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-green-900/10">
                  <TableCell colSpan={8} className="text-center py-20 text-white/30 text-sm">
                    쪽지 내역이 없습니다
                  </TableCell>
                </TableRow>
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
