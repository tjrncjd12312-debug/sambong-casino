"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  title: string;
  columns: string[];
  emptyText?: string;
  hasDateSearch?: boolean;
  hasTextSearch?: boolean;
}

export default function SettingsPlaceholder({ title, columns, emptyText = "데이터가 없습니다", hasDateSearch = true, hasTextSearch = true }: Props) {
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-white font-bold text-lg mb-5">{title}</div>
        {(hasDateSearch || hasTextSearch) && (
          <div className="flex justify-end mb-4 gap-2">
            {hasTextSearch && <Input placeholder="검색어" className="w-40 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30" />}
            {hasDateSearch && (
              <>
                <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
                <Input type="date" defaultValue={today} className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg" />
              </>
            )}
            <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold">검색</button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {columns.map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={columns.length} className="text-center py-20 text-white/30 text-sm">{emptyText}</TableCell></TableRow>
          </TableBody>
        </Table>
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5"><option>100줄</option></select>
        </div>
      </div>
    </div>
  );
}
