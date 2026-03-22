"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MaxWinAlarmPage() {
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className="space-y-5">
      {/* Settings Cards */}
      <div className="grid grid-cols-2 gap-5">
        {[
          { title: "카지노", current: "10,000,000" },
          { title: "슬롯", current: "3,000,000" },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
            <div className="text-white font-bold text-lg mb-4">{item.title}</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/60 w-20">현재 금액</span>
                <Input defaultValue={item.current} className="w-48 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/60 w-20">변경 금액</span>
                <Input className="w-48 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-white/70">최대 당첨 알람 금액 변경</span>
              <button className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-500">변경</button>
            </div>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="flex justify-end mb-4 gap-2">
          <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["아이디", "POT", "구분", "게임사", "배팅금액", "당첨금액", "일시", "확인"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={8} className="text-center py-20 text-white/30 text-sm">데이터가 없습니다</TableCell></TableRow>
          </TableBody>
        </Table>
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5"><option>100줄</option></select>
        </div>
      </div>
    </div>
  );
}
