"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PublicBettingRestorePage() {
  const [activeSort, setActiveSort] = useState("아이디 순");
  const today = new Date().toISOString().split("T")[0];
  const sortTabs = ["아이디 순", "최신가입 순", "최신활동 순"];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <p className="text-xs text-white/60 mb-4">※ 당일 및 전일 데이터만 복구가 가능 합니다.</p>
        <div className="flex items-center justify-end gap-2 mb-4">
          {sortTabs.map((tab) => (
            <button key={tab} onClick={() => setActiveSort(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${activeSort === tab ? "bg-white/10 text-white border-white/20" : "text-white/50 border-white/5"}`}
            >{tab}</button>
          ))}
          <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <Input placeholder="매장 ID" className="w-32 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["#", "파트너ID", "사용자ID", "게임명", "날짜", "베팅금", "당첨금", "롤링금", "매장소속 복구여부", "유저별 개별복구", "상태"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={11} className="text-center py-20 text-white/30 text-sm">복구할 데이터가 없습니다</TableCell></TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
