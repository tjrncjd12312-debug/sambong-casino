"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PendingMembersPage() {
  return (
    <div className="space-y-5">
      {/* Table */}
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">#</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">접속ID</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">닉네임</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">소속 본사</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">소속 부본사</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">소속 총판</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">소속 매장</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">가입일시</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">전화번호</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">은행명</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">예금주</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">승인</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">반려</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-green-900/10">
              <TableCell colSpan={13} className="text-center py-32 text-white/30 text-sm">
                승인 대기중인 회원이 없습니다
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Bottom Buttons */}
        <div className="flex justify-end gap-2 p-4 border-t border-green-900/10">
          <button className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors">
            일괄승인
          </button>
          <button className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-colors">
            일괄반려
          </button>
        </div>
      </div>
    </div>
  );
}
