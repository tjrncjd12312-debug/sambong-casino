"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const levels = ["파트너 전체", "본 사전체", "부본사전체", "총 판전체", "매 장전체"];

const partners = [
  { id: "test1", type: "본사" }, { id: "오카다본사", type: "본사" }, { id: "black1", type: "본사" }, { id: "zb777", type: "본사" },
  { id: "test2", type: "부본사" }, { id: "맥스부본", type: "부본사" }, { id: "winxxx1001부본", type: "부본사" }, { id: "test21", type: "부본사" },
];

function Toggle({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button onClick={() => setOn(!on)} className={`w-12 h-6 rounded-full relative transition-colors ${on ? "bg-blue-600" : "bg-neutral-700"}`}>
      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${on ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function TransferAuthPage() {
  return (
    <div className="space-y-5">
      {/* Bulk Settings */}
      <div className="grid grid-cols-2 gap-5">
        {["머니 지급 기능 전체 설정", "머니 회수 기능 전체 설정"].map((title, idx) => (
          <div key={title} className="rounded-2xl border border-green-900/15 p-5 text-center" style={{ background: "rgba(17,17,17,0.9)" }}>
            <div className="text-white font-bold mb-4">[ {title} ]</div>
            <div className="space-y-2">
              {levels.map((level) => (
                <div key={level} className="flex items-center justify-center gap-2">
                  <button className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded">
                    [ {level} ] {idx === 0 ? "지급" : "회수"} 기능 ON
                  </button>
                  <button className="px-4 py-1.5 bg-red-500 text-white text-xs font-bold rounded">
                    [ {level} ] {idx === 0 ? "지급" : "회수"} 기능 OFF
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Partner Table */}
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["접속ID", "구분", "머니 지급기능 설정", "머니 회수기능 설정"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((p) => (
              <TableRow key={p.id} className="border-green-900/10 hover:bg-white/[0.02]">
                <TableCell className="text-center text-sm text-white/80">{p.id}</TableCell>
                <TableCell className="text-center text-xs text-white/70">{p.type}</TableCell>
                <TableCell className="text-center"><Toggle /></TableCell>
                <TableCell className="text-center"><Toggle /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
