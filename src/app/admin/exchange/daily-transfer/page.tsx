"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DailyTransferPage() {
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/80 space-y-1">
          <div>총지급 : <span className="text-green-400 font-bold">0</span></div>
          <div>총회수 : <span className="text-red-400 font-bold">0</span></div>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="예:2025-05-01" className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          <Input type="date" defaultValue="2026-03-16" className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
          <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold">오늘</button>
          {["2026-03-20", "2026-03-19", "2026-03-18"].map((d) => (
            <button key={d} className="px-3 py-2 rounded-lg border border-white/10 text-white/60 text-xs">{d}</button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["날짜", "지급액", "회수액", "지급-회수", "상세내역"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={5} className="text-center py-20 text-white/30 text-sm">데이터가 없습니다</TableCell></TableRow>
          </TableBody>
        </Table>
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5"><option>100줄</option></select>
        </div>
      </div>
    </div>
  );
}
