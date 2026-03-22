"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const data = [
  { userId: "ooo389", nickname: "ooo389", prevMoney: 0, rollingConvert: 701099, currentMoney: 701099, date: "2026-03-21 03:42:29" },
  { userId: "mm389", nickname: "mm389", prevMoney: 983826, rollingConvert: 701099, currentMoney: 282727, date: "2026-03-21 03:42:29" },
  { userId: "coc389", nickname: "coc389", prevMoney: 200001, rollingConvert: 35733, currentMoney: 235734, date: "2026-03-21 00:12:30" },
  { userId: "black3", nickname: "black3", prevMoney: 1337693, rollingConvert: 35733, currentMoney: 1301960, date: "2026-03-21 00:12:30" },
  { userId: "coc389", nickname: "coc389", prevMoney: 1, rollingConvert: 200000, currentMoney: 200001, date: "2026-03-20 18:47:47" },
  { userId: "black3", nickname: "black3", prevMoney: 1537693, rollingConvert: 200000, currentMoney: 1337693, date: "2026-03-20 18:47:47" },
  { userId: "coc15", nickname: "coc15", prevMoney: 250, rollingConvert: 341770, currentMoney: 342020, date: "2026-03-20 18:46:19" },
  { userId: "coc389", nickname: "coc389", prevMoney: 341771, rollingConvert: 341770, currentMoney: 1, date: "2026-03-20 18:46:19" },
  { userId: "coc389", nickname: "coc389", prevMoney: 1, rollingConvert: 160000, currentMoney: 160001, date: "2026-03-20 17:44:10" },
  { userId: "black3", nickname: "black3", prevMoney: 1697693, rollingConvert: 160000, currentMoney: 1537693, date: "2026-03-20 17:44:10" },
  { userId: "bbeckdo", nickname: "bbeckdo", prevMoney: 2503656, rollingConvert: 865347, currentMoney: 3369003, date: "2026-03-20 16:11:25" },
  { userId: "max3", nickname: "맥스총판", prevMoney: 1000000, rollingConvert: 865347, currentMoney: 134653, date: "2026-03-20 16:11:25" },
];

export default function RollingConvertPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["회원ID", "닉네임", "이전보유금", "롤링전환금", "현재보유금", "변환일시"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i} className="border-green-900/10 hover:bg-white/[0.02]">
                <TableCell className="text-center text-xs text-white/80">{row.userId}</TableCell>
                <TableCell className="text-center text-xs text-purple-400">{row.nickname}</TableCell>
                <TableCell className="text-center text-xs text-white/70 font-mono">{row.prevMoney.toLocaleString()}</TableCell>
                <TableCell className="text-center text-xs text-green-400 font-mono font-semibold">{row.rollingConvert.toLocaleString()}</TableCell>
                <TableCell className="text-center text-xs text-white/80 font-mono">{row.currentMoney.toLocaleString()}</TableCell>
                <TableCell className="text-center text-xs text-white/60">{row.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
