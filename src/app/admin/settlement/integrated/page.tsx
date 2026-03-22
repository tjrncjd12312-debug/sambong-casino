"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TreeWithSearch from "@/components/admin/TreeWithSearch";
import { Loader2 } from "lucide-react";

interface SettlementRow {
  id: string;
  type: string;
  partner: string;
  totalBetSlot: number;
  totalBetCasino: number;
  totalBet: number;
  totalWinSlot: number;
  totalWinCasino: number;
  totalWin: number;
  bwSlot: number;
  bwCasino: number;
  bwTotal: number;
  rollingPct: string;
  totalRollingSlot: number;
  totalRollingCasino: number;
  totalRolling: number;
  realRollingSlot: number;
  realRollingCasino: number;
  bdrSlot: number;
  bdrCasino: number;
  bdrTotal: number;
  losing: string;
  bdrLSlot: number;
  bdrLCasino: number;
  bdrLTotal: number;
  holdMoney: number;
  holdRolling: number;
  rollingConvert: number;
}

function MultiLineCell({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <div className="font-mono text-xs">
      {text.split("\n").map((line, i, arr) => (
        <div key={i} className={
          highlight && i === arr.length - 1
            ? "font-bold text-white"
            : "text-white/80"
        }>{line}</div>
      ))}
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString();

const settlementHeaders = [
  "#", "구분", "아이디",
  "총베팅(슬)\n총베팅(카)\n합계",
  "총당첨(슬)\n총당첨(카)\n합계",
  "베팅-당첨(슬)\n베팅-당첨(카)\n합계",
  "롤링%\n롤링%(카)",
  "총 롤링(슬)\n총 롤링(카)\n합계",
  "실 롤링(슬)\n실 롤링(카)",
  "배-당-롤(슬)\n배-당-롤(카)\n합계",
  "루징",
  "배-당-롤*루(슬)\n배-당-롤*루(카)\n합계",
  "보유금", "보유롤링금", "롤링전환금",
];

function SettlementTable({
  title,
  rows,
  loading,
  searched,
  showAction,
}: {
  title: string;
  rows: SettlementRow[];
  loading: boolean;
  searched: boolean;
  showAction?: boolean;
}) {
  const headers = showAction ? [...settlementHeaders, "자당정산"] : settlementHeaders;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full" />
        <span className="text-white font-bold text-sm">{title}</span>
      </div>
      <div className="rounded-2xl border border-green-900/15 overflow-x-auto" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {headers.map((h) => (
                <TableHead key={h} className="text-center text-[10px] text-white/70 font-bold py-2 whitespace-nowrap">
                  <span dangerouslySetInnerHTML={{ __html: h.replace(/\n/g, "<br/>") }} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={headers.length} className="text-center py-16">
                  <Loader2 className="animate-spin text-green-500 mx-auto" size={24} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length} className="text-center py-16 text-white/30 text-sm">
                  {searched ? "데이터가 없습니다" : "날짜를 선택하고 검색하세요"}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={i} className="border-green-900/10 hover:bg-white/[0.02]">
                  <TableCell className="text-center text-xs text-white/60">{i + 1}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded text-white ${
                      row.type === "관리자" ? "bg-purple-600" :
                      row.type === "본사" ? "bg-blue-600" :
                      row.type === "부본" ? "bg-cyan-600" :
                      row.type === "총판" ? "bg-orange-600" :
                      "bg-green-600"
                    }`}>{row.type}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {row.partner.split("\n").map((l, j) => (
                      <div key={j} className="text-white/80">{l}</div>
                    ))}
                  </TableCell>
                  <TableCell className="text-center">
                    <MultiLineCell text={`${fmt(row.totalBetSlot)}\n${fmt(row.totalBetCasino)}\n${fmt(row.totalBet)}`} highlight />
                  </TableCell>
                  <TableCell className="text-center">
                    <MultiLineCell text={`${fmt(row.totalWinSlot)}\n${fmt(row.totalWinCasino)}\n${fmt(row.totalWin)}`} highlight />
                  </TableCell>
                  <TableCell className="text-center">
                    <MultiLineCell text={`${fmt(row.bwSlot)}\n${fmt(row.bwCasino)}\n${fmt(row.bwTotal)}`} highlight />
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/70">
                    {row.rollingPct.split("\n").map((l, j) => (
                      <div key={j}>{l}</div>
                    ))}
                  </TableCell>
                  <TableCell className="text-center">
                    <MultiLineCell text={`${fmt(row.totalRollingSlot)}\n${fmt(row.totalRollingCasino)}\n${fmt(row.totalRolling)}`} highlight />
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/70">
                    <div>{fmt(row.realRollingSlot)}</div>
                    <div>{fmt(row.realRollingCasino)}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-mono text-xs">
                      <div className="text-green-400">{fmt(row.bdrSlot)}</div>
                      <div>{fmt(row.bdrCasino)}</div>
                      <div className="font-bold text-green-400">{fmt(row.bdrTotal)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-amber-400">
                    {row.losing.split("\n").map((l, j) => (
                      <div key={j}>{l}</div>
                    ))}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-mono text-xs">
                      <div className="text-sky-400">{fmt(row.bdrLSlot)}</div>
                      <div>{fmt(row.bdrLCasino)}</div>
                      <div className="font-bold text-sky-400">{fmt(row.bdrLTotal)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.holdMoney)}</TableCell>
                  <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.holdRolling)}</TableCell>
                  <TableCell className="text-center text-xs text-white/80 font-mono">{fmt(row.rollingConvert)}</TableCell>
                  {showAction && (
                    <TableCell className="text-center">
                      <button className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-500">
                        지급
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// localStorage 키
const SETTLEMENT_STORAGE = "settlement_cache_v1";

function loadSettlementCache(): { my: SettlementRow[]; sub: SettlementRow[]; partnerId: string } | null {
  try {
    const stored = localStorage.getItem(SETTLEMENT_STORAGE);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveSettlementCache(my: SettlementRow[], sub: SettlementRow[], partnerId: string) {
  try {
    localStorage.setItem(SETTLEMENT_STORAGE, JSON.stringify({ my, sub, partnerId }));
  } catch {}
}

export default function SettlementPage() {
  const today = new Date().toISOString().split("T")[0];

  // localStorage에서 기존 데이터 복원
  const cached = typeof window !== "undefined" ? loadSettlementCache() : null;

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedPartnerId, setSelectedPartnerId] = useState(cached?.partnerId || "");
  const [mySettlement, setMySettlement] = useState<SettlementRow[]>(cached?.my || []);
  const [subSettlement, setSubSettlement] = useState<SettlementRow[]>(cached?.sub || []);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(!!cached);

  // 정산 데이터 조회 + 저장
  const fetchSettlement = useCallback(async (sd: string, ed: string, pid: string) => {
    try {
      let url = `/api/settlement?start_date=${sd}&end_date=${ed}`;
      if (pid) url += `&partner_id=${pid}`;

      const res = await fetch(url);
      const json = await res.json();

      const my: SettlementRow[] = json.mySettlement || [];
      const sub: SettlementRow[] = json.subSettlement || [];

      // 데이터가 있으면 업데이트 + 저장
      if (my.length > 0 && (my[0].totalBet > 0 || mySettlement.length === 0)) {
        setMySettlement(my);
        setSubSettlement(sub);
        saveSettlementCache(my, sub, pid);
      }
      setSearched(true);
    } catch {}
  }, [mySettlement.length]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    await fetchSettlement(startDate, endDate, selectedPartnerId);
    setLoading(false);
  }, [startDate, endDate, selectedPartnerId, fetchSettlement]);

  // 페이지 진입 시 자동 조회 + 30초마다 갱신
  useEffect(() => {
    fetchSettlement(today, today, selectedPartnerId);
    const interval = setInterval(() => {
      fetchSettlement(today, today, selectedPartnerId);
    }, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 파트너 선택 시 자동 검색
  const handlePartnerSelect = async (id: string) => {
    setSelectedPartnerId(id);
    setLoading(true);
    await fetchSettlement(startDate, endDate, id);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="flex items-center justify-end gap-2">
        <select className="h-9 bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3">
          <option>1.배-당-롤</option>
        </select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold disabled:opacity-50"
        >
          {loading ? "검색중..." : "검색"}
        </button>
      </div>

      <div className="flex gap-5">
        <TreeWithSearch
          buttonLabel="회원목록 바로가기"
          onSelect={handlePartnerSelect}
          selectedId={selectedPartnerId}
        />

        <div className="flex-1 space-y-6">
          {/* Info */}
          <div className="text-xs text-white/60">
            ※ 정산금 = (베팅 - 당첨 - 총롤링금) x 루징% ; ※ 실지급금 = 정산금 - 하부정산금
          </div>

          {/* 나의 정산데이터 */}
          <SettlementTable
            title="나의 정산데이터"
            rows={mySettlement}
            loading={loading}
            searched={searched}
            showAction
          />

          {/* 하부 정산데이터 */}
          <SettlementTable
            title="하부 정산데이터"
            rows={subSettlement}
            loading={loading}
            searched={searched}
          />
        </div>
      </div>
    </div>
  );
}
