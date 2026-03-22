"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function FixedReplyPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-green-400 font-bold text-sm mb-5">1:1 템플릿 관리</div>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["#", "매크로명", "내용", "등록일시", "수정", "삭제"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={6} className="text-center py-20 text-white/30 text-sm">등록된 템플릿이 없습니다</TableCell></TableRow>
          </TableBody>
        </Table>
        <div className="flex justify-end mt-4">
          <button className="px-5 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500">추가하기</button>
        </div>
      </div>
    </div>
  );
}
