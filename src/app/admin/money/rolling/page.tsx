"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rollingData = [
  { no: 8070821, date: "2026-03-21 06:03:13.583", userId: "assa01", nickname: "assa01", belonging: "max1", type: "[배팅]슬롯", betAmount: 400, rate: "5.00%", held: "57,881,546", acquired: "20", cumulative: "57,881,566", acquirer: "max2\n맥스부본" },
  { no: 8070820, date: "2026-03-21 06:02:49.287", userId: "assa01", nickname: "assa01", belonging: "max1", type: "[배팅]슬롯", betAmount: 400, rate: "5.00%", held: "57,881,526", acquired: "20", cumulative: "57,881,546", acquirer: "max2\n맥스부본" },
  { no: 8070819, date: "2026-03-21 06:02:45.953", userId: "assa01", nickname: "assa01", belonging: "max1", type: "[배팅]슬롯", betAmount: 400, rate: "5.00%", held: "57,881,506", acquired: "20", cumulative: "57,881,526", acquirer: "max2\n맥스부본" },
  { no: 8070818, date: "2026-03-21 06:02:41.903", userId: "assa01", nickname: "assa01", belonging: "max1", type: "[배팅]슬롯", betAmount: 400, rate: "5.00%", held: "57,881,486", acquired: "20", cumulative: "57,881,506", acquirer: "max2\n맥스부본" },
  { no: 8070817, date: "2026-03-21 06:02:38.627", userId: "assa01", nickname: "assa01", belonging: "max1", type: "[배팅]슬롯", betAmount: 400, rate: "5.00%", held: "57,881,466", acquired: "20", cumulative: "57,881,486", acquirer: "max2\n맥스부본" },
];

export default function RollingHistoryPage() {
  const [activeTab, setActiveTab] = useState("통합");
  const today = new Date().toISOString().split("T")[0];
  const tabs = ["통합", "슬롯", "카지노"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${activeTab === tab ? "bg-white/10 text-white border-white/20" : "text-white/50 border-white/5"}`}
            >{tab}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="검색어" className="w-28 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
          <Input type="date" defaultValue="2026-03-19" className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
          <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold">오늘</button>
          {["2026-03-20", "2026-03-19", "2026-03-18"].map((d) => (
            <button key={d} className="px-3 py-2 rounded-lg border border-white/10 text-white/60 text-xs font-semibold hover:text-white">{d}</button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["#", "날짜", "유저ID(닉네임)", "소속", "타입", "배팅액", "취득율", "보유롤링\n취득롤링\n누적롤링", "취득자"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">
                  <span dangerouslySetInnerHTML={{ __html: h.replace(/\n/g, "<br/>") }} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rollingData.map((row) => (
              <TableRow key={row.no} className="border-green-900/10 hover:bg-white/[0.02]">
                <TableCell className="text-center text-xs text-white/60 font-mono">{row.no}</TableCell>
                <TableCell className="text-center text-xs text-white/70">{row.date}</TableCell>
                <TableCell className="text-center text-xs">
                  <div className="text-white/80">{row.userId}</div>
                  <div className="text-white/50">{row.nickname}</div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 text-[10px] text-white/70">
                    <span className="w-3 h-3 bg-amber-600 rounded-sm text-[7px] text-white flex items-center justify-center font-bold">본</span>
                    {row.belonging}
                  </span>
                </TableCell>
                <TableCell className="text-center text-xs text-white/70">{row.type}</TableCell>
                <TableCell className="text-center text-xs text-white/80 font-mono">{row.betAmount.toLocaleString()}</TableCell>
                <TableCell className="text-center text-xs text-white/80">{row.rate}</TableCell>
                <TableCell className="text-center text-xs font-mono">
                  <div className="text-white/70">{row.held}</div>
                  <div className="text-green-400">{row.acquired}</div>
                  <div className="text-green-300">{row.cumulative}</div>
                </TableCell>
                <TableCell className="text-center text-xs">
                  {row.acquirer.split("\n").map((line, i) => (
                    <div key={i} className={i === 0 ? "text-white/80" : "text-white/50"}>{line}</div>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
