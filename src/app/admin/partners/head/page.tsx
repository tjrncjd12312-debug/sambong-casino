"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";

interface Partner {
  id: string;
  parent_id: string | null;
  username: string;
  nickname: string;
  level: string;
  status: string;
  balance: number;
  rolling_balance: number;
  slot_rolling_pct: number;
  casino_rolling_pct: number;
  slot_losing_pct: number;
  casino_losing_pct: number;
  created_at: string;
}

interface HeadOfficeRow {
  no: number;
  id: string;
  name: string;
  nickname: string;
  settlement: string;
  money: number;
  rolling: number;
  pointGiven: number;
  pointGivenRolling: number;
  pointTaken: number;
  pointTakenRolling: number;
  rollingPctSlot: string;
  rollingPctCasino: string;
  losingPctSlot: string;
  losingPctCasino: string;
  rollingAmtSlot: number;
  rollingAmtCasino: number;
  subMoney: number;
  subRolling: number;
  subBonsa: number;
  subChongpan: number;
  subMaejang: number;
  members: number;
  regDate: string;
}

function getDescendants(partnerId: string, allPartners: Partner[]): Partner[] {
  const children = allPartners.filter((p) => p.parent_id === partnerId);
  let result: Partner[] = [...children];
  for (const child of children) {
    result = result.concat(getDescendants(child.id, allPartners));
  }
  return result;
}

function countByLevel(descendants: Partner[], level: string): number {
  return descendants.filter((p) => p.level === level).length;
}

function sumField(descendants: Partner[], field: "balance" | "rolling_balance"): number {
  return descendants.reduce((sum, p) => sum + (Number(p[field]) || 0), 0);
}

export default function HeadOfficePage() {
  const [activeSort, setActiveSort] = useState("최신가입 순");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HeadOfficeRow[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const sortTabs = ["아이디 순", "최신가입 순", "보유머니 순", "보유롤링금 순"];

  useEffect(() => {
    setStartDate(today);
    setEndDate(today);
  }, [today]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partners");
      const json = await res.json();
      if (json.data) {
        const allPartners: Partner[] = json.data;
        const headPartners = allPartners.filter((p) => p.level === "head");
        const mapped: HeadOfficeRow[] = headPartners.map((p, i) => {
          const descendants = getDescendants(p.id, allPartners);
          return {
            no: i + 1,
            id: p.id,
            name: p.username,
            nickname: p.nickname || p.username,
            settlement: "배/당",
            money: Number(p.balance) || 0,
            rolling: Number(p.rolling_balance) || 0,
            pointGiven: 0,
            pointGivenRolling: 0,
            pointTaken: 0,
            pointTakenRolling: 0,
            rollingPctSlot: `${p.slot_rolling_pct}%`,
            rollingPctCasino: `${p.casino_rolling_pct}%`,
            losingPctSlot: `${p.slot_losing_pct}%`,
            losingPctCasino: `${p.casino_losing_pct}%`,
            rollingAmtSlot: 0,
            rollingAmtCasino: 0,
            subMoney: sumField(descendants, "balance"),
            subRolling: sumField(descendants, "rolling_balance"),
            subBonsa: countByLevel(descendants, "sub_head"),
            subChongpan: countByLevel(descendants, "distributor"),
            subMaejang: countByLevel(descendants, "store"),
            members: 0,
            regDate: p.created_at ? new Date(p.created_at).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/\. /g, "-").replace(".", "") : "-",
          };
        });
        setRows(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch partners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort
  const sortedRows = [...rows].sort((a, b) => {
    switch (activeSort) {
      case "아이디 순":
        return a.name.localeCompare(b.name);
      case "최신가입 순":
        return b.regDate.localeCompare(a.regDate);
      case "보유머니 순":
        return b.money - a.money;
      case "보유롤링금 순":
        return b.rolling - a.rolling;
      default:
        return 0;
    }
  });

  // Filter by keyword
  const filteredRows = searchKeyword
    ? sortedRows.filter((row) => {
        const kw = searchKeyword.toLowerCase();
        return row.name.toLowerCase().includes(kw) || row.nickname.toLowerCase().includes(kw);
      })
    : sortedRows;

  const paginatedRows = filteredRows.slice(0, rowsPerPage);

  return (
    <div className="space-y-5">
      {/* Sort Tabs & Search */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sortTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSort(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                  activeSort === tab
                    ? "bg-white/10 text-white border-white/20"
                    : "text-white/50 border-white/5 hover:text-white hover:border-white/15"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
            <Input placeholder="검색어" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="w-32 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />
            <button className="w-9 h-9 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center hover:from-green-400 hover:to-emerald-500 transition-all">
              <Search size={16} className="text-black" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
          <Table>
            <TableHeader>
              <TableRow className="border-green-900/15 hover:bg-transparent">
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">#</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">본사</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">정산방식</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">보유머니<br/>보유롤링금</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">알지급(받음)<br/>알회수(보냄)</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">입출금</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">롤링 % (슬)<br/>롤링 % (카)</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">루징 % (슬)<br/>루징 % (카)</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">롤링금(슬)<br/>롤링금(카)</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">하부 총 보유머니<br/>하부 총 보유롤링금</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">부본사수<br/>총판수<br/>매장수</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">회원수</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">등록일시</TableHead>
                <TableHead className="text-center text-xs text-white/70 font-bold py-3">상세정보</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-green-900/10">
                  <TableCell colSpan={14} className="text-center py-32">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-green-500" size={20} />
                      <span className="text-white/50 text-sm">데이터를 불러오는 중...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow className="border-green-900/10">
                  <TableCell colSpan={14} className="text-center py-32 text-white/30 text-sm">
                    본사 데이터가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((office) => (
                  <TableRow key={office.no} className="border-green-900/10 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-center text-xs text-white/60">{office.no}</TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm font-bold text-white">{office.name}</div>
                      <div className="text-xs text-green-400">({office.nickname})</div>
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/80">{office.settlement}</TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      <div className="text-white/80">{office.money.toLocaleString()}</div>
                      <div className="text-green-400">{office.rolling.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      <div className="text-white/80">{office.pointGiven.toLocaleString()}</div>
                      <div className="text-green-400">{office.pointGivenRolling.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-500 transition-colors">알지급</button>
                        <button className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-400 transition-colors">알회수</button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-white/80">
                      <div>{office.rollingPctSlot}</div>
                      <div>{office.rollingPctCasino}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-white/80">
                      <div>{office.losingPctSlot}</div>
                      <div>{office.losingPctCasino}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      <div className="text-white/80">{office.rollingAmtSlot.toLocaleString()}</div>
                      <div className="text-white/60">{office.rollingAmtCasino.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      <div className="text-white font-semibold">{office.subMoney.toLocaleString()}</div>
                      <div className="text-green-400">{office.subRolling.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-white/80">
                      <div>{office.subBonsa}</div>
                      <div>{office.subChongpan}</div>
                      <div>{office.subMaejang}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/80 font-mono">{office.members.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs text-white/60">{office.regDate}</TableCell>
                    <TableCell className="text-center">
                      <button className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-500 transition-colors">
                        회원정보/수정
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-center py-4 border-t border-green-900/10">
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5"
            >
              <option value={50}>50줄</option>
              <option value={100}>100줄</option>
              <option value={200}>200줄</option>
            </select>
          </div>
        </div>
    </div>
  );
}
