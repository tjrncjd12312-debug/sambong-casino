"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const providers = ["인베스트", "아너링크", "슬롯시티", "onx", "Hive", "노출안함"];
const casinoGames = [
  { order: 1, name: "evolution", active: "슬롯시티" },
  { order: 2, name: "dreamgame", active: "슬롯시티" },
  { order: 3, name: "playace", active: "슬롯시티" },
  { order: 4, name: "pragmaticplay live", active: "슬롯시티" },
  { order: 7, name: "sagaming", active: "노출안함" },
  { order: 0, name: "live88", active: "노출안함" },
];

export default function GameDefaultPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-xs text-white/60 space-y-1 mb-3">
          <p>※ 최초 기본설정은 직속상위 그룹에 따라 세팅됩니다. ※ 적용예시:그룹없음 설정으로 되어있을 시 적용, 로그인 하지 않은 상태의 유저페이지에 노출되는 게임사설정.</p>
        </div>
        <div className="text-green-400 font-bold text-sm mb-5">게임사 기본설정(그룹없음)</div>

        <div className="mb-3">
          <span className="text-white font-bold text-lg">카지노</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">배열</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3">게임사</TableHead>
              <TableHead className="text-center text-xs text-white/70 font-bold py-3" colSpan={6}>
                <div className="text-center">사용</div>
                <div className="flex justify-around mt-1 text-[10px] text-white/50">
                  {providers.map((p) => <span key={p}>{p}</span>)}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {casinoGames.map((game, i) => (
              <TableRow key={i} className="border-green-900/10 hover:bg-white/[0.02]">
                <TableCell className="text-center">
                  <input type="number" defaultValue={game.order} className="w-14 h-8 bg-neutral-900 border border-white/10 text-white text-center text-sm rounded-lg" />
                </TableCell>
                <TableCell className="text-center text-sm text-white/80">{game.name}</TableCell>
                {providers.map((p) => (
                  <TableCell key={p} className="text-center">
                    <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      game.active === p
                        ? p === "노출안함" ? "bg-green-600 text-white" : "bg-green-600 text-white"
                        : "bg-neutral-800 text-white/40 border border-white/5 hover:bg-neutral-700"
                    }`}>
                      {p}
                    </button>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
