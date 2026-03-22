"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Domain {
  id: string;
  domain: string;
  description: string;
  is_maintenance: boolean;
  maintenance_content: string;
  created_at: string;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-12 h-6 rounded-full relative transition-colors ${on ? "bg-blue-600" : "bg-neutral-700"}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${on ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function DomainListPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ domain: "", description: "", maintenance_content: "" });

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/admin/settings?type=domain");
      const json = await res.json();
      setDomains(json.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAdd = async () => {
    if (!form.domain.trim()) {
      alert("도메인을 입력해주세요.");
      return;
    }
    try {
      const res = await fetch("/api/admin/settings?type=domain", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: form.domain.trim(),
          description: form.description.trim(),
          is_maintenance: false,
          maintenance_content: form.maintenance_content.trim(),
        }),
      });
      const json = await res.json();
      if (json.data) {
        setDomains([json.data, ...domains]);
        setForm({ domain: "", description: "", maintenance_content: "" });
        setShowAdd(false);
      } else {
        alert(json.error || "추가에 실패했습니다.");
      }
    } catch {
      alert("추가에 실패했습니다.");
    }
  };

  const handleUpdate = async (domain: Domain) => {
    try {
      const res = await fetch("/api/admin/settings?type=domain", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(domain),
      });
      const json = await res.json();
      if (json.data) {
        setDomains(domains.map((d) => (d.id === json.data.id ? json.data : d)));
        setEditingId(null);
      }
    } catch {
      alert("수정에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/settings?type=domain&id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDomains(domains.filter((d) => d.id !== id));
      } else {
        alert(json.error || "삭제에 실패했습니다.");
      }
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  const handleToggleMaintenance = (domain: Domain) => {
    const updated = { ...domain, is_maintenance: !domain.is_maintenance };
    handleUpdate(updated);
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
        <p className="text-xs text-white/60 mb-4">
          ※ 도메인 입력 시 http://, https://, / 등의 접두어나 특수문자를 포함하지 마십시오.
        </p>
        <Table>
          <TableHeader>
            <TableRow className="border-green-900/15 hover:bg-transparent">
              {["#", "도메인", "설명", "점검여부", "점검내용", "", ""].map((h, i) => (
                <TableHead key={i} className="text-center text-xs text-white/70 font-bold py-3">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-white/30 text-sm">
                  등록된 도메인이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              domains.map((d, idx) => (
                <TableRow key={d.id} className="border-green-900/10 hover:bg-white/[0.02]">
                  <TableCell className="text-center text-xs text-white/60">{idx + 1}</TableCell>
                  <TableCell className="text-xs text-purple-400">{d.domain}</TableCell>
                  <TableCell className="text-xs text-white/80">{d.description}</TableCell>
                  <TableCell className="text-center">
                    <Toggle on={d.is_maintenance} onChange={() => handleToggleMaintenance(d)} />
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/60">
                    {d.maintenance_content || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => {
                        setEditingId(d.id);
                        setForm({
                          domain: d.domain,
                          description: d.description || "",
                          maintenance_content: d.maintenance_content || "",
                        });
                      }}
                      className="px-4 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-400"
                    >
                      수정
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="px-4 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-400"
                    >
                      삭제
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

      {/* Edit Modal */}
      {editingId && (
        <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
          <div className="text-yellow-400 font-bold text-sm mb-4">도메인 수정</div>
          <div className="space-y-3 max-w-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60 w-20">도메인</span>
              <Input
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                className="flex-1 h-9 text-sm bg-neutral-800 border-white/10 text-white rounded-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60 w-20">설명</span>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex-1 h-9 text-sm bg-neutral-800 border-white/10 text-white rounded-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60 w-20">점검내용</span>
              <Input
                value={form.maintenance_content}
                onChange={(e) => setForm({ ...form, maintenance_content: e.target.value })}
                className="flex-1 h-9 text-sm bg-neutral-800 border-white/10 text-white rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                const domain = domains.find((d) => d.id === editingId);
                if (domain) {
                  handleUpdate({
                    ...domain,
                    domain: form.domain,
                    description: form.description,
                    maintenance_content: form.maintenance_content,
                  });
                }
              }}
              className="px-5 py-2 bg-cyan-500 text-white text-xs font-bold rounded-lg hover:bg-cyan-400"
            >
              저장
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="px-5 py-2 bg-neutral-700 text-white text-xs font-bold rounded-lg hover:bg-neutral-600"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd ? (
        <div className="rounded-2xl border border-green-900/15 p-5" style={{ background: "rgba(17,17,17,0.9)" }}>
          <div className="text-green-400 font-bold text-sm mb-4">신규 도메인 추가</div>
          <div className="space-y-3 max-w-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60 w-20">도메인</span>
              <Input
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="example.com"
                className="flex-1 h-9 text-sm bg-neutral-800 border-white/10 text-white rounded-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60 w-20">설명</span>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="도메인 설명"
                className="flex-1 h-9 text-sm bg-neutral-800 border-white/10 text-white rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="px-5 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-500">
              추가
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setForm({ domain: "", description: "", maintenance_content: "" });
              }}
              className="px-5 py-2 bg-neutral-700 text-white text-xs font-bold rounded-lg hover:bg-neutral-600"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setShowAdd(true);
            setForm({ domain: "", description: "", maintenance_content: "" });
          }}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold"
        >
          신규 도메인 추가
        </button>
      )}
    </div>
  );
}
