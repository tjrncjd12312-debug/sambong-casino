"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Column { key: string; label: string; }
interface Props {
  columns: Column[];
  data: Record<string, any>[];
  sortTabs?: string[];
  searchPlaceholder?: string;
  emptyText?: string;
  renderCell?: (key: string, value: any, row: Record<string, any>) => React.ReactNode;
}

export default function StatsTableTemplate({ columns, data, sortTabs, searchPlaceholder, emptyText = "데이터가 없습니다", renderCell }: Props) {
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        {sortTabs ? (
          <div className="flex gap-1">
            {sortTabs.map((t, i) => (
              <button key={t} className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${i === 0 ? "bg-white/10 text-white border-white/20" : "text-white/50 border-white/5"}`}>{t}</button>
            ))}
          </div>
        ) : <div />}
        <div className="flex items-center gap-2">
          {searchPlaceholder && <Input placeholder={searchPlaceholder} className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />}
          <Input type="date" defaultValue="2026-03-16" className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
          <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
        </div>
      </div>
      <div className="rounded-2xl border border-green-900/15 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {columns.map((c) => (
                <TableHead key={c.key} className="text-center text-xs text-white/70 font-bold py-3">{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="text-center py-20 text-white/30 text-sm">{emptyText}</TableCell></TableRow>
            ) : data.map((row, i) => {
              const isTotal = row.name === "합계" || row.date === "합계";
              return (
                <TableRow key={i} className={`border-green-900/10 ${isTotal ? "bg-white/5 font-bold" : "hover:bg-white/[0.02]"}`}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className="text-center text-xs py-3">
                      {renderCell ? renderCell(c.key, row[c.key], row) : (
                        <span className={`font-mono ${typeof row[c.key] === "number" ? (row[c.key] < 0 ? "text-red-400" : "text-white/80") : "text-white/80"}`}>
                          {typeof row[c.key] === "number" ? row[c.key].toLocaleString() : row[c.key]}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5"><option>100줄</option></select>
        </div>
      </div>
    </div>
  );
}
