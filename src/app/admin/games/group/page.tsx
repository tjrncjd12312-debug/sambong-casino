"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const groups = [
  "111test1", "111test6", "aa01매장 / 통합", "ace01 매장 올파싱",
  "admin002매장/ 통합", "ahskal9999 매장 / 파싱 10%", "alal매장 / 올파싱", "alo00 매장 / 달실장 / 하브",
];

export default function GameGroupPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-xs text-white/60 space-y-1 mb-3">
          <p>※ 회원 최초설정은 그룹없음(게임사스위칭/전체)로 적용됩니다.</p>
          <p>※ 회원인 경우 직속상위 파트너의 그룹설정으로 통합 적용 가능합니다.</p>
          <p>※ 회원 개별 설정인 경우 상위 그룹보다 우선 시 적용 됩니다.</p>
        </div>
        <div className="text-green-400 font-bold text-sm mb-5">게임사스위칭(그룹별)</div>

        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              <TableHead className="text-xs text-white/70 font-bold py-3">그룹명</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">노출/비노출 설정</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">그룹명 수정</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">그룹삭제</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group} className="border-green-900/10 hover:bg-white/[0.02]">
                <TableCell>
                  <input defaultValue={group} className="w-full h-9 bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3" />
                </TableCell>
                <TableCell className="text-center">
                  <button className="px-4 py-1.5 bg-neutral-600 text-white text-xs font-bold rounded-lg hover:bg-neutral-500">게임 설정</button>
                </TableCell>
                <TableCell className="text-center">
                  <button className="px-4 py-1.5 bg-neutral-600 text-white text-xs font-bold rounded-lg hover:bg-neutral-500">수정</button>
                </TableCell>
                <TableCell className="text-center">
                  <button className="px-4 py-1.5 bg-neutral-600 text-white text-xs font-bold rounded-lg hover:bg-neutral-500">삭제</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
