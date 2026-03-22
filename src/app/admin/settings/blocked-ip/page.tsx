"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BlockedIP {
  id: string;
  ip_address: string;
  username: string;
  group_name: string;
  created_at: string;
}

export default function BlockedIpPage() {
  const [blockedIps, setBlockedIps] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const fetchBlockedIps = async () => {
    try {
      const res = await fetch("/api/admin/settings?type=blocked-ip");
      const json = await res.json();
      setBlockedIps(json.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchBlockedIps();
  }, []);

  const handleBlock = async () => {
    if (!newIp.trim()) {
      alert("IP 주소를 입력해주세요.");
      return;
    }
    try {
      const res = await fetch("/api/admin/settings?type=blocked-ip", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: newIp.trim(),
          username: newUsername.trim() || null,
          group_name: null,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setBlockedIps([json.data, ...blockedIps]);
        setNewIp("");
        setNewUsername("");
      } else {
        alert(json.error || "차단에 실패했습니다.");
      }
    } catch {
      alert("차단에 실패했습니다.");
    }
  };

  const handleUnblock = async (id: string) => {
    if (!confirm("차단을 해제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/settings?type=blocked-ip&id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setBlockedIps(blockedIps.filter((b) => b.id !== id));
      } else {
        alert(json.error || "해제에 실패했습니다.");
      }
    } catch {
      alert("해제에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-white/50">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
        <div className="text-red-400 font-bold text-lg mb-5">IP 차단목록</div>

        {/* Add IP form */}
        <div className="flex items-center gap-3 mb-5">
          <Input
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="IP 주소 입력"
            className="w-48 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
          />
          <Input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="접속 ID (선택)"
            className="w-36 h-9 text-sm bg-neutral-900 border-white/10 text-white rounded-lg placeholder:text-white/30"
          />
          <button
            onClick={handleBlock}
            className="px-5 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500"
          >
            차단하기
          </button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["#", "IP 주소", "접속ID", "소속", "등록일시", "차단해제"].map((h) => (
                <TableHead key={h} className="text-center text-xs text-white/70 font-bold py-3">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {blockedIps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-white/30 text-sm">
                  차단된 IP가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              blockedIps.map((ip, idx) => (
                <TableRow key={ip.id} className="border-green-900/10 hover:bg-white/[0.02]">
                  <TableCell className="text-center text-xs text-white/60">{idx + 1}</TableCell>
                  <TableCell className="text-center text-xs text-white/80 font-mono">
                    {ip.ip_address}
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/80">
                    {ip.username || "-"}
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/60">
                    {ip.group_name || "-"}
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/60">
                    {ip.created_at ? new Date(ip.created_at).toLocaleString("ko-KR") : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleUnblock(ip.id)}
                      className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-500"
                    >
                      해제
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex justify-center py-4 border-t border-green-900/10">
          <select className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5">
            <option>100줄</option>
          </select>
        </div>
      </div>
    </div>
  );
}
