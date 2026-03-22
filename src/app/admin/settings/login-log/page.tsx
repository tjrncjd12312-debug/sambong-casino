"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LoginLog {
  id: string;
  username: string;
  group_name: string;
  ip_address: string;
  device_type: string;
  created_at: string;
}

export default function LoginLogPage() {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 9 * 86400000).toISOString().split("T")[0];

  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [blockIp, setBlockIp] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "login-log");
      if (search) params.set("search", search);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`/api/admin/settings?${params.toString()}`);
      const json = await res.json();
      setLogs(json.data || []);
    } catch {}
    setLoading(false);
  }, [search, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = () => {
    fetchLogs();
  };

  const handleBlockIp = async () => {
    if (!blockIp.trim()) {
      alert("IP 주소를 입력해주세요.");
      return;
    }
    try {
      const res = await fetch("/api/admin/settings?type=blocked-ip", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_address: blockIp.trim() }),
      });
      const json = await res.json();
      if (json.data) {
        alert("차단되었습니다.");
        setBlockIp("");
      } else {
        alert(json.error || "차단에 실패했습니다.");
      }
    } catch {
      alert("차단에 실패했습니다.");
    }
  };

  const handleBlockFromLog = async (ip: string) => {
    if (!confirm(`${ip} 주소를 차단하시겠습니까?`)) return;
    try {
      const res = await fetch("/api/admin/settings?type=blocked-ip", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_address: ip }),
      });
      const json = await res.json();
      if (json.data) {
        alert("차단되었습니다.");
      } else {
        alert(json.error || "차단에 실패했습니다.");
      }
    } catch {
      alert("차단에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-white font-bold text-lg mb-5 text-right">로그인 기록 조회</div>

        {/* Search Bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="아이디, IP주소 검색"
              className="w-52 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
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
              className="px-5 py-2 rounded-lg bg-neutral-800 text-white text-xs font-bold border border-white/10 hover:bg-neutral-700"
            >
              검색
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={blockIp}
              onChange={(e) => setBlockIp(e.target.value)}
              placeholder="IP주소 입력"
              className="w-48 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
            />
            <button
              onClick={handleBlockIp}
              className="px-5 py-2 rounded-lg bg-neutral-800 text-white text-xs font-bold border border-white/10 hover:bg-neutral-700"
            >
              차단하기
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-white/50">로딩 중...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-green-900/15 hover:bg-transparent">
                {["#", "접속ID", "소속", "접속 IP", "접속시간", "구분", "강제종료", "차단"].map((h) => (
                  <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20 text-white/30 text-sm">
                    로그인 기록이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, idx) => (
                  <TableRow key={log.id} className="border-green-900/10 hover:bg-white/[0.02]">
                    <TableCell className="text-center text-xs text-white/60">{idx + 1}</TableCell>
                    <TableCell className="text-center text-xs text-white/80">{log.username}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-600/20 border border-yellow-600/30 rounded text-xs text-yellow-400">
                        {log.group_name || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/70 font-mono">
                      {log.ip_address}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/60">
                      {log.created_at ? new Date(log.created_at).toLocaleString("ko-KR") : "-"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/70">
                      {log.device_type || "PC"}
                    </TableCell>
                    <TableCell className="text-center">
                      <button className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-400">
                        종료하기
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleBlockFromLog(log.ip_address)}
                        className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-500"
                      >
                        차단하기
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
