"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const percentButtons = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

const stores = [
  { bonsa: "test1", storeId: "cvv7969", nickname: "홀덤매1", betting: 0, winning: 0, rolling: 0, loss: 0 },
  { bonsa: "test1", storeId: "popo11", nickname: "홀덤매2", betting: 0, winning: 0, rolling: 0, loss: 0 },
  { bonsa: "오카다본사", storeId: "ass00", nickname: "남지매장", betting: 0, winning: 0, rolling: 0, loss: 0 },
  { bonsa: "test1", storeId: "as5903", nickname: "as5903", betting: 0, winning: 0, rolling: 0, loss: 0 },
  { bonsa: "오카다본사", storeId: "winaa111", nickname: "winaa111매장", betting: 0, winning: 0, rolling: 0, loss: 0 },
  { bonsa: "오카다본사", storeId: "winbb111", nickname: "winbb111매장", betting: 0, winning: 0, rolling: 0, loss: 0 },
  { bonsa: "오카다본사", storeId: "wincc111", nickname: "wincc111매장", betting: 0, winning: 0, rolling: 0, loss: 0 },
  { bonsa: "오카다본사", storeId: "windd111", nickname: "windd1111매장", betting: 0, winning: 0, rolling: 0, loss: 0 },
  { bonsa: "test1", storeId: "test4", nickname: "test4", betting: 0, winning: 0, rolling: 0, loss: 0 },
  { bonsa: "오카다본사", storeId: "pss691501", nickname: "대천매장", betting: 0, winning: 0, rolling: 0, loss: 0 },
];

export default function CasinoPublicBettingPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-xs text-white/60 space-y-1 mb-4">
          <p>※ 아래 수치는 확률의 기반이므로 절대값의 수치가 아닙니다. (예 : 전체 50설정시 38~45% 적용이 다수의 예)</p>
          <p>※ 배팅,당첨 누락은 적용되지 않습니다.</p>
        </div>
        <div className="flex gap-2 mb-5 flex-wrap">
          {percentButtons.map((p) => (
            <button key={p} className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition-colors">
              전체 {p}으로
            </button>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["소속본사", "매장 ID", "매장 닉네임", "전일 카지노베팅", "전일 카지노당첨", "전일 카지노롤링", "빼기", "LOSS", "더하기"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.map((store, i) => (
              <TableRow key={i} className="border-green-900/10 hover:bg-white/[0.02]">
                <TableCell className="text-center text-xs text-white/80">{store.bonsa}</TableCell>
                <TableCell className="text-center text-xs text-white/80">{store.storeId}</TableCell>
                <TableCell className="text-center text-xs text-white/80">{store.nickname}</TableCell>
                <TableCell className="text-center text-xs text-white/80 font-mono">{store.betting.toLocaleString()}</TableCell>
                <TableCell className="text-center text-xs text-white/80 font-mono">{store.winning.toLocaleString()}</TableCell>
                <TableCell className="text-center text-xs text-white/80 font-mono">{store.rolling.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded">-10</button>
                    <button className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded">-</button>
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm text-white font-bold">{store.loss}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button className="px-2 py-1 bg-blue-700 text-white text-[10px] font-bold rounded">+</button>
                    <button className="px-2 py-1 bg-blue-700 text-white text-[10px] font-bold rounded">+10</button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
