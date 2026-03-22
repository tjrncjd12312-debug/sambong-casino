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

export interface PartnerData {
  no: number;
  [key: string]: any;
}

interface ColumnDef {
  key: string;
  label: string;
  render?: (row: PartnerData) => React.ReactNode;
}

interface Props {
  columns: ColumnDef[];
  data?: PartnerData[];
  emptyText?: string;
  loading?: boolean;
  level?: string;
  fetchFromApi?: boolean;
  mapPartner?: (partner: any, index: number, allPartners: any[]) => PartnerData;
}

export default function PartnerListTemplate({
  columns,
  data: externalData,
  emptyText = "데이터가 없습니다",
  loading: externalLoading,
  level,
  fetchFromApi = false,
  mapPartner,
}: Props) {
  const [activeSort, setActiveSort] = useState("최신가입 순");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [apiData, setApiData] = useState<PartnerData[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const sortTabs = ["아이디 순", "최신가입 순", "보유머니 순", "보유롤링금 순"];

  // Initialize dates
  useEffect(() => {
    setStartDate(today);
    setEndDate(today);
  }, [today]);

  const fetchData = useCallback(async () => {
    if (!fetchFromApi || !level || !mapPartner) return;
    setApiLoading(true);
    try {
      const res = await fetch("/api/partners");
      const json = await res.json();
      if (json.data) {
        const allPartners = json.data as any[];
        const filtered = allPartners.filter((p: any) => p.level === level);
        const mapped = filtered.map((p: any, i: number) => mapPartner(p, i, allPartners));
        setApiData(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch partners:", err);
    } finally {
      setApiLoading(false);
    }
  }, [fetchFromApi, level, mapPartner]);

  useEffect(() => {
    if (fetchFromApi) {
      fetchData();
    }
  }, [fetchFromApi, fetchData]);

  const isLoading = externalLoading ?? apiLoading;
  const data = fetchFromApi ? apiData : (externalData ?? []);

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    switch (activeSort) {
      case "아이디 순":
        return (a.name || "").localeCompare(b.name || "");
      case "최신가입 순":
        return (b.regDate || "").localeCompare(a.regDate || "");
      case "보유머니 순":
        return (b.money ?? 0) - (a.money ?? 0);
      case "보유롤링금 순":
        return (b.rolling ?? 0) - (a.rolling ?? 0);
      default:
        return 0;
    }
  });

  // Filter by keyword
  const filteredData = searchKeyword
    ? sortedData.filter((row) => {
        const keyword = searchKeyword.toLowerCase();
        return (
          (row.name && row.name.toLowerCase().includes(keyword)) ||
          (row.nickname && row.nickname.toLowerCase().includes(keyword)) ||
          (row.bonsa && row.bonsa.toLowerCase().includes(keyword)) ||
          (row.bubon && row.bubon.toLowerCase().includes(keyword)) ||
          (row.chongpan && String(row.chongpan).toLowerCase().includes(keyword))
        );
      })
    : sortedData;

  // Paginate
  const paginatedData = filteredData.slice(0, rowsPerPage);

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
          <Input
            placeholder="검색어"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-32 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
          />
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
              {columns.map((col) => (
                <TableHead key={col.key} className="text-center text-xs text-white/70 font-bold py-3">
                  <span dangerouslySetInnerHTML={{ __html: col.label.replace(/\n/g, "<br/>") }} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-green-900/10">
                <TableCell colSpan={columns.length} className="text-center py-32">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-green-500" size={20} />
                    <span className="text-white/50 text-sm">데이터를 불러오는 중...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow className="border-green-900/10">
                <TableCell colSpan={columns.length} className="text-center py-32 text-white/30 text-sm">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={row.no} className="border-green-900/10 hover:bg-white/[0.02] transition-colors">
                  {columns.map((col) => (
                    <TableCell key={col.key} className="text-center text-xs py-3">
                      {col.render ? col.render(row) : <span className="text-white/80">{row[col.key]}</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

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
