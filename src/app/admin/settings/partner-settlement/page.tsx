"use client";

import { useState } from "react";

export default function PartnerSettlementPage() {
  const [option, setOption] = useState("total");
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-green-400 font-bold text-sm mb-5">파트너 정산통합페이지 설정</div>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-white/10">
            <div className="p-4 text-center text-sm text-white/80">파트너 정산통합페이지 설정</div>
            <div className="p-4 flex items-center justify-center gap-4">
              <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                <input type="radio" name="settlement" checked={option === "total"} onChange={() => setOption("total")} className="w-4 h-4" />
                총롤링,총배팅금
              </label>
              <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                <input type="radio" name="settlement" checked={option === "real"} onChange={() => setOption("real")} className="w-4 h-4" />
                실롤링,실배팅금
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
