"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const blockedUsers = [
  { no: 57, id: "ass16", nickname: "동포동16", date: "2025-11-14 22:38:25", status: "삭제" },
  { no: 58, id: "ass17", nickname: "동포동17", date: "2025-11-14 22:38:25", status: "삭제" },
  { no: 59, id: "ass18", nickname: "동포동18", date: "2025-11-14 22:38:25", status: "삭제" },
  { no: 60, id: "ass19", nickname: "동포동19", date: "2025-11-14 22:38:25", status: "삭제" },
  { no: 61, id: "ass20", nickname: "동포동20", date: "2025-11-14 22:38:25", status: "삭제" },
  { no: 62, id: "qq389", nickname: "add00", date: "2025-11-23 15:21:53", status: "차단" },
  { no: 63, id: "qq01", nickname: "qq01", date: "2025-11-23 15:22:41", status: "차단" },
  { no: 64, id: "qq02", nickname: "qq02", date: "2025-11-23 15:22:41", status: "차단" },
  { no: 65, id: "qq03", nickname: "qq03", date: "2025-11-23 15:22:41", status: "차단" },
  { no: 66, id: "qq04", nickname: "qq04", date: "2025-11-23 15:22:41", status: "차단" },
];

export default function BlockedAccountsPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["#", "접속ID", "닉네임", "가입일시", "상태", "복구", "삭제", "상세정보"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {blockedUsers.map((u) => (
              <TableRow key={u.no} className="border-green-900/10 hover:bg-white/[0.02]">
                <TableCell className="text-center text-xs text-white/60">{u.no}</TableCell>
                <TableCell className="text-center text-xs text-white/80">{u.id}</TableCell>
                <TableCell className="text-center text-xs text-white/80">{u.nickname}</TableCell>
                <TableCell className="text-center text-xs text-white/60">{u.date}</TableCell>
                <TableCell className="text-center text-xs text-white/70">{u.status}</TableCell>
                <TableCell className="text-center">
                  <button className="px-4 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-400">복구</button>
                </TableCell>
                <TableCell className="text-center"></TableCell>
                <TableCell className="text-center">
                  <button className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500">자세히</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5"><option>100줄</option></select>
        </div>
      </div>
    </div>
  );
}
