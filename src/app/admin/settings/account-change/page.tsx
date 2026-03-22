"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AccountChangePage() {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="flex justify-end mb-4 gap-2">
          <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["구분", "회원ID", "닉네임", "(구)은행명", "(구)계좌번호", "(구)예금주", "(신)은행명", "(신)계좌번호", "(신)예금주", "변경일시"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={10} className="text-center py-20 text-white/30 text-sm">데이터가 없습니다</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5">
            <option>100줄</option>
          </select>
        </div>
      </div>
    </div>
  );
}
