"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface MemberPartner {
  id: string;
  username: string;
  nickname: string;
  level: string;
  parent_id: string | null;
}

interface Member {
  id: string;
  username: string;
  nickname: string;
  status: string;
  phone: string | null;
  balance: number;
  point_rolling: number;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  max_win_amount: number | null;
  is_bet_blocked: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  memo: string | null;
  password_plain: string | null;
  created_at: string;
  updated_at: string;
  store_id: string;
  partners: MemberPartner | null;
}

const LEVEL_LABEL: Record<string, string> = {
  admin: "관리자",
  head: "본사",
  sub_head: "부본사",
  distributor: "총판",
  store: "매장",
};

const TABS = [
  "회원정보",
  "최근 로그인 기록",
  "쪽지",
  "보유머니 변동내역",
  "충전받은 내역",
  "환전나간 내역",
  "알지급 내역",
  "알회수 내역",
  "게임실행목록",
  "게임배팅내역",
  "유저로그이력",
];

const COLOR_OPTIONS = [
  { label: "흰색", value: "white", bg: "bg-white", border: "border-white/40" },
  { label: "노랑", value: "yellow", bg: "bg-yellow-400", border: "border-yellow-400" },
  { label: "녹색", value: "green", bg: "bg-green-500", border: "border-green-500" },
  { label: "하늘", value: "sky", bg: "bg-sky-400", border: "border-sky-400" },
  { label: "분홍", value: "pink", bg: "bg-pink-400", border: "border-pink-400" },
  { label: "파랑", value: "blue", bg: "bg-blue-500", border: "border-blue-500" },
  { label: "빨강", value: "red", bg: "bg-red-500", border: "border-red-500" },
];

const BANK_LIST = [
  "하나은행",
  "국민은행",
  "신한은행",
  "우리은행",
  "농협은행",
  "기업은행",
  "SC제일은행",
  "카카오뱅크",
  "토스뱅크",
  "케이뱅크",
  "수협은행",
  "대구은행",
  "부산은행",
  "경남은행",
  "광주은행",
  "전북은행",
  "제주은행",
];

function generatePercentOptions() {
  const options: string[] = [];
  for (let i = 0; i <= 50; i++) {
    options.push((i / 10).toFixed(1) + "%");
  }
  return options;
}

const PERCENT_OPTIONS = generatePercentOptions();

function LogTab({ memberId, type, columns, renderRow }: {
  memberId: string;
  type: string;
  columns: string[];
  renderRow: (log: any, i: number) => React.ReactNode;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/members/${memberId}/logs?type=${type}`)
      .then(r => r.json())
      .then(j => setData(j.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [memberId, type]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-500" size={24} /></div>;
  if (data.length === 0) return <div className="flex items-center justify-center h-48 text-white/30 text-sm">데이터가 없습니다</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map(c => <th key={c} className="px-3 py-2 text-center text-xs text-white/50 font-bold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((log, i) => (
            <tr key={log.id || i} className="border-b border-white/5 hover:bg-white/[0.02]">
              {renderRow(log, i)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MemberDetailPage() {
  const searchParams = useSearchParams();
  const memberId = searchParams.get("id");

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("회원정보");

  // Form states
  const [showPassword, setShowPassword] = useState(false);
  const [selectedColor, setSelectedColor] = useState("white");
  const [groupSetting, setGroupSetting] = useState("기본");
  const [settlementMethod, setSettlementMethod] = useState("베/당");
  const [memo, setMemo] = useState("");
  const [nickname, setNickname] = useState("");
  const [casinoEnabled, setCasinoEnabled] = useState(true);
  const [blockStatus, setBlockStatus] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");

  // Right column states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [confirmWithdrawPassword, setConfirmWithdrawPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("하나은행");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [rollingSlot, setRollingSlot] = useState("0.0%");
  const [losingSlot, setLosingSlot] = useState("0.0%");
  const [rollingCasino, setRollingCasino] = useState("0.0%");
  const [losingCasino, setLosingCasino] = useState("0.0%");

  const fetchMember = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}`);
      const json = await res.json();
      if (json.data) {
        const m = json.data as Member;
        setMember(m);
        setMemo(m.memo || "");
        setNickname(m.nickname || "");
        setPhone(m.phone || "");
        setBankName(m.bank_name || "하나은행");
        setBankAccount(m.bank_account || "");
        setBankHolder(m.bank_holder || "");
        setBlockStatus(m.status === "blocked");
        setCasinoEnabled(!m.is_bet_blocked);
      }
    } catch {
      console.error("Failed to fetch member");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const handlePatch = async (data: Record<string, unknown>, successMsg: string) => {
    if (!memberId) return;
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        alert(successMsg);
        const m = json.data as Member;
        setMember(m);
      } else {
        alert(json.error || "오류가 발생했습니다.");
      }
    } catch {
      alert("서버 오류가 발생했습니다.");
    }
  };

  const formatNumber = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "0";
    return Number(n).toLocaleString();
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("ko-KR");
  };

  if (!memberId) {
    return (
      <div className="flex items-center justify-center h-96 text-white/50 text-sm">
        회원 ID가 지정되지 않았습니다.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="animate-spin text-green-500" size={28} />
        <div className="text-white/30 text-sm mt-3">로딩 중...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center h-96 text-white/50 text-sm">
        회원 정보를 찾을 수 없습니다.
      </div>
    );
  }

  const storeLevel = member.partners ? LEVEL_LABEL[member.partners.level] || member.partners.level : "-";
  const storeName = member.partners ? (member.partners.nickname || member.partners.username) : "-";

  const headerCards = [
    { label: "구분", value: storeLevel, borderColor: "border-l-orange-500", textColor: "text-orange-400" },
    { label: "접속ID", value: member.username, borderColor: "border-l-blue-500", textColor: "text-blue-400" },
    { label: "닉네임", value: member.nickname, borderColor: "border-l-green-500", textColor: "text-green-400" },
    { label: "보유머니", value: formatNumber(member.balance), borderColor: "border-l-yellow-500", textColor: "text-yellow-400" },
    { label: "보유롤링금", value: formatNumber(member.point_rolling), borderColor: "border-l-purple-500", textColor: "text-purple-400" },
    { label: "소속", value: storeName, borderColor: "border-l-cyan-500", textColor: "text-cyan-400" },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header Bar */}
      <div className="grid grid-cols-6 gap-3">
        {headerCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border border-white/10 border-l-4 ${card.borderColor} p-3`}
            style={{ background: "rgba(17,17,17,0.9)" }}
          >
            <div className="text-[10px] text-white/40 mb-1">{card.label}</div>
            <div className={`text-sm font-bold ${card.textColor} truncate`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-xs font-bold transition-colors ${
              activeTab === tab
                ? "bg-red-600 text-white"
                : "bg-neutral-800 text-white/40 hover:text-white/70 hover:bg-neutral-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className="rounded-xl border border-white/10 p-6"
        style={{ background: "rgba(17,17,17,0.9)" }}
      >
        {activeTab === "최근 로그인 기록" ? (
          <LogTab memberId={member.id} type="login" columns={["#", "접속IP", "브라우저", "결과", "일시"]}
            renderRow={(log: any, i: number) => (
              <>
                <td className="px-3 py-2 text-center text-xs text-white/60">{i + 1}</td>
                <td className="px-3 py-2 text-center text-xs text-white/80 font-mono">{log.ip_address || "-"}</td>
                <td className="px-3 py-2 text-xs text-white/50 max-w-[200px] truncate">{log.user_agent?.slice(0, 50) || "-"}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.result === "success" ? "bg-green-600/20 text-green-400" : log.result === "blocked" ? "bg-red-600/20 text-red-400" : "bg-yellow-600/20 text-yellow-400"}`}>
                    {log.result === "success" ? "성공" : log.result === "blocked" ? "차단" : "실패"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-xs text-white/60">{new Date(log.logged_at).toLocaleString("ko-KR")}</td>
              </>
            )} />
        ) : activeTab === "충전받은 내역" ? (
          <LogTab memberId={member.id} type="deposit" columns={["#", "금액", "보너스", "입금자", "상태", "신청일시", "처리일시"]}
            renderRow={(log: any, i: number) => (
              <>
                <td className="px-3 py-2 text-center text-xs text-white/60">{i + 1}</td>
                <td className="px-3 py-2 text-center text-xs text-green-400 font-mono font-bold">{Number(log.amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-center text-xs text-yellow-400 font-mono">{Number(log.bonus_amount || 0).toLocaleString()}</td>
                <td className="px-3 py-2 text-center text-xs text-white/70">{log.depositor_name || "-"}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.status === "approved" ? "bg-green-600/20 text-green-400" : log.status === "rejected" ? "bg-red-600/20 text-red-400" : "bg-yellow-600/20 text-yellow-400"}`}>
                    {log.status === "approved" ? "승인" : log.status === "rejected" ? "거절" : "대기"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-xs text-white/60">{new Date(log.created_at).toLocaleString("ko-KR")}</td>
                <td className="px-3 py-2 text-center text-xs text-white/60">{log.processed_at ? new Date(log.processed_at).toLocaleString("ko-KR") : "-"}</td>
              </>
            )} />
        ) : activeTab === "환전나간 내역" ? (
          <LogTab memberId={member.id} type="withdraw" columns={["#", "금액", "은행", "계좌", "예금주", "상태", "신청일시"]}
            renderRow={(log: any, i: number) => (
              <>
                <td className="px-3 py-2 text-center text-xs text-white/60">{i + 1}</td>
                <td className="px-3 py-2 text-center text-xs text-red-400 font-mono font-bold">{Number(log.amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-center text-xs text-white/70">{log.bank_name || "-"}</td>
                <td className="px-3 py-2 text-center text-xs text-white/70 font-mono">{log.bank_account || "-"}</td>
                <td className="px-3 py-2 text-center text-xs text-white/70">{log.bank_holder || "-"}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.status === "approved" ? "bg-green-600/20 text-green-400" : log.status === "rejected" ? "bg-red-600/20 text-red-400" : "bg-yellow-600/20 text-yellow-400"}`}>
                    {log.status === "approved" ? "승인" : log.status === "rejected" ? "거절" : "대기"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-xs text-white/60">{new Date(log.created_at).toLocaleString("ko-KR")}</td>
              </>
            )} />
        ) : activeTab === "보유머니 변동내역" || activeTab === "알지급 내역" || activeTab === "알회수 내역" ? (
          <LogTab memberId={member.id} type="money_transfer" columns={["#", "유형", "금액", "이전 잔액", "이후 잔액", "메모", "일시"]}
            renderRow={(log: any, i: number) => (
              <>
                <td className="px-3 py-2 text-center text-xs text-white/60">{i + 1}</td>
                <td className="px-3 py-2 text-center text-xs text-white/70">{log.transfer_type}</td>
                <td className="px-3 py-2 text-center text-xs text-green-400 font-mono font-bold">{Number(log.amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-center text-xs text-white/60 font-mono">{log.to_balance_before != null ? Number(log.to_balance_before).toLocaleString() : "-"}</td>
                <td className="px-3 py-2 text-center text-xs text-white/60 font-mono">{log.to_balance_after != null ? Number(log.to_balance_after).toLocaleString() : "-"}</td>
                <td className="px-3 py-2 text-xs text-white/50 max-w-[150px] truncate">{log.memo || "-"}</td>
                <td className="px-3 py-2 text-center text-xs text-white/60">{new Date(log.created_at).toLocaleString("ko-KR")}</td>
              </>
            )} />
        ) : activeTab === "게임배팅내역" ? (
          <LogTab memberId={member.id} type="slot_bet" columns={["#", "게임사", "게임명", "배팅금", "당첨금", "손익", "롤링금", "일시"]}
            renderRow={(log: any, i: number) => (
              <>
                <td className="px-3 py-2 text-center text-xs text-white/60">{i + 1}</td>
                <td className="px-3 py-2 text-center text-xs text-white/70">{log.provider_name || "-"}</td>
                <td className="px-3 py-2 text-xs text-white/80">{log.game_name || "-"}</td>
                <td className="px-3 py-2 text-center text-xs text-white/80 font-mono">{Number(log.bet_amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-center text-xs text-green-400 font-mono">{Number(log.win_amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-center text-xs font-mono" style={{ color: log.net_amount > 0 ? "#f87171" : "#4ade80" }}>{Number(log.net_amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-center text-xs text-yellow-400 font-mono">{Number(log.rolling_amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-center text-xs text-white/60">{new Date(log.bet_at).toLocaleString("ko-KR")}</td>
              </>
            )} />
        ) : activeTab !== "회원정보" ? (
          <div className="flex items-center justify-center h-64 text-white/30 text-sm">준비 중</div>
        ) : (
          <div className="grid grid-cols-2 gap-x-10 gap-y-0">
            {/* ========== ROW 1 ========== */}
            {/* Left: # */}
            <FormRow label="#">
              <div className="text-sm text-white font-mono">{member.id.slice(0, 8)}</div>
            </FormRow>
            {/* Right: 변경할 비밀번호 */}
            <FormRow label="변경할 비밀번호">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력"
                className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500"
              />
            </FormRow>

            {/* ========== ROW 2 ========== */}
            {/* Left: 접속ID */}
            <FormRow label="접속ID">
              <div className="text-sm text-white font-bold">{member.username}</div>
            </FormRow>
            {/* Right: 비밀번호확인 */}
            <FormRow label="비밀번호확인">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 확인"
                className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500"
              />
            </FormRow>

            {/* ========== ROW 3 ========== */}
            {/* Left: 비밀번호 */}
            <FormRow label="비밀번호">
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1 flex-1 h-9 px-3 bg-neutral-900 border border-white/10 rounded-lg">
                  <span className="text-sm text-white font-mono">
                    {showPassword ? (member?.password_plain || "••••••••") : "••••••••"}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-auto text-white/40 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (!newPassword) { alert("새 비밀번호를 입력해주세요."); return; }
                    if (newPassword !== confirmPassword) { alert("비밀번호가 일치하지 않습니다."); return; }
                    alert("비밀번호 강제 변경 기능은 별도 API가 필요합니다.");
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                >
                  비밀번호 강제 변경
                </button>
              </div>
            </FormRow>
            {/* Right: empty */}
            <div />

            {/* ========== ROW 4 ========== */}
            {/* Left: 환전 비밀번호 */}
            <FormRow label="환전 비밀번호">
              <div className="text-sm text-white font-mono">1234</div>
            </FormRow>
            {/* Right: 환전비밀번호 변경 */}
            <FormRow label="환전비밀번호">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="password"
                  value={withdrawPassword}
                  onChange={(e) => setWithdrawPassword(e.target.value)}
                  placeholder="환전비밀번호"
                  className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500"
                />
                <input
                  type="password"
                  value={confirmWithdrawPassword}
                  onChange={(e) => setConfirmWithdrawPassword(e.target.value)}
                  placeholder="환전비밀번호 확인"
                  className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => {
                    if (!withdrawPassword) { alert("환전비밀번호를 입력해주세요."); return; }
                    if (withdrawPassword !== confirmWithdrawPassword) { alert("환전비밀번호가 일치하지 않습니다."); return; }
                    alert("환전비밀번호 변경 기능은 별도 API가 필요합니다.");
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                >
                  환전비밀번호 변경
                </button>
              </div>
            </FormRow>

            {/* ========== ROW 5 ========== */}
            {/* Left: 색상표시 */}
            <FormRow label="색상표시">
              <div className="flex items-center gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedColor(c.value)}
                    className={`w-7 h-7 rounded border-2 ${
                      selectedColor === c.value ? c.border + " ring-2 ring-offset-1 ring-offset-black ring-white/30" : "border-white/10"
                    } ${c.bg} transition-all`}
                    title={c.label}
                  />
                ))}
              </div>
            </FormRow>
            {/* Right: 전화번호 */}
            <FormRow label="전화번호">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="전화번호"
                  className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handlePatch({ phone }, "전화번호가 변경되었습니다.")}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                >
                  전화번호 변경
                </button>
              </div>
            </FormRow>

            {/* ========== ROW 6 ========== */}
            {/* Left: 그룹설정 */}
            <FormRow label="그룹설정">
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={groupSetting}
                  onChange={(e) => setGroupSetting(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg outline-none focus:border-purple-500"
                >
                  <option value="기본">기본</option>
                  <option value="VIP">VIP</option>
                  <option value="VVIP">VVIP</option>
                </select>
                <button className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors">
                  그룹 저장
                </button>
              </div>
            </FormRow>
            {/* Right: 은행명 */}
            <FormRow label="은행명">
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg outline-none focus:border-purple-500"
              >
                {BANK_LIST.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </FormRow>

            {/* ========== ROW 7 ========== */}
            {/* Left: 정산방식 */}
            <FormRow label="정산방식">
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={settlementMethod}
                  onChange={(e) => setSettlementMethod(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg outline-none focus:border-purple-500"
                >
                  <option value="베/당">베/당</option>
                  <option value="롤링">롤링</option>
                  <option value="루징">루징</option>
                </select>
                <button className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors">
                  정산방식 저장
                </button>
              </div>
            </FormRow>
            {/* Right: 계좌번호 */}
            <FormRow label="계좌번호">
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="계좌번호"
                className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500"
              />
            </FormRow>

            {/* ========== ROW 8 ========== */}
            {/* Left: 메모 */}
            <FormRow label="메모" alignTop>
              <div className="flex items-start gap-2 flex-1">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                  placeholder="메모를 입력하세요"
                  className="flex-1 px-3 py-2 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500 resize-none"
                />
                <button
                  onClick={() => handlePatch({ memo }, "메모가 저장되었습니다.")}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                >
                  메모 저장
                </button>
              </div>
            </FormRow>
            {/* Right: 예금주 + 계좌정보 변경 */}
            <FormRow label="예금주">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  placeholder="예금주"
                  className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500"
                />
                <button
                  onClick={() =>
                    handlePatch(
                      { bank_name: bankName, bank_account: bankAccount, bank_holder: bankHolder },
                      "계좌정보가 변경되었습니다."
                    )
                  }
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                >
                  계좌정보 변경
                </button>
              </div>
            </FormRow>

            {/* ========== ROW 9 ========== */}
            {/* Left: 닉네임 */}
            <FormRow label="닉네임">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임"
                  className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handlePatch({ nickname }, "닉네임이 변경되었습니다.")}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                >
                  닉네임변경
                </button>
              </div>
            </FormRow>
            {/* Right: 롤링 비율 (슬롯) */}
            <FormRow label="롤링 비율 (슬롯)">
              <select
                value={rollingSlot}
                onChange={(e) => setRollingSlot(e.target.value)}
                className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg outline-none focus:border-purple-500"
              >
                {PERCENT_OPTIONS.map((p) => (
                  <option key={`rs-${p}`} value={p}>{p}</option>
                ))}
              </select>
            </FormRow>

            {/* ========== ROW 10 ========== */}
            {/* Left: 보유머니 */}
            <FormRow label="보유머니">
              <div className="text-sm text-yellow-400 font-bold">{formatNumber(member.balance)} 원</div>
            </FormRow>
            {/* Right: 루징비율 (슬롯) */}
            <FormRow label="루징비율 (슬롯)">
              <select
                value={losingSlot}
                onChange={(e) => setLosingSlot(e.target.value)}
                className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg outline-none focus:border-purple-500"
              >
                {PERCENT_OPTIONS.map((p) => (
                  <option key={`ls-${p}`} value={p}>{p}</option>
                ))}
              </select>
            </FormRow>

            {/* ========== ROW 11 ========== */}
            {/* Left: 롤링금 */}
            <FormRow label="롤링금">
              <div className="text-sm text-purple-400 font-bold">{formatNumber(member.point_rolling)} P</div>
            </FormRow>
            {/* Right: 롤링 비율 (카지노) */}
            <FormRow label="롤링 비율 (카지노)">
              <select
                value={rollingCasino}
                onChange={(e) => setRollingCasino(e.target.value)}
                className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg outline-none focus:border-purple-500"
              >
                {PERCENT_OPTIONS.map((p) => (
                  <option key={`rc-${p}`} value={p}>{p}</option>
                ))}
              </select>
            </FormRow>

            {/* ========== ROW 12 ========== */}
            {/* Left: 가입일시 */}
            <FormRow label="가입일시">
              <div className="text-sm text-white/70">{formatDate(member.created_at)}</div>
            </FormRow>
            {/* Right: 루징비율 (카지노) + 롤링 & 루징 수정 */}
            <FormRow label="루징비율 (카지노)">
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={losingCasino}
                  onChange={(e) => setLosingCasino(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg outline-none focus:border-purple-500"
                >
                  {PERCENT_OPTIONS.map((p) => (
                    <option key={`lc-${p}`} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  onClick={() => alert("롤링 & 루징 수정 기능은 별도 API가 필요합니다.")}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                >
                  롤링 &amp; 루징 수정
                </button>
              </div>
            </FormRow>

            {/* ========== ROW 13 ========== */}
            {/* Left: 카지노 사용여부 */}
            <FormRow label="카지노 사용여부">
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setCasinoEnabled(!casinoEnabled)}
                  className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${
                    casinoEnabled ? "bg-green-600" : "bg-neutral-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      casinoEnabled ? "left-5" : "left-0.5"
                    }`}
                  />
                </div>
                <button
                  onClick={() => {
                    setCasinoEnabled(true);
                    handlePatch({ is_bet_blocked: false }, "카지노 사용이 활성화되었습니다.");
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg transition-colors"
                >
                  카지노 사용하기
                </button>
                <button
                  onClick={() => {
                    setCasinoEnabled(false);
                    handlePatch({ is_bet_blocked: true }, "카지노 사용이 해제되었습니다.");
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition-colors"
                >
                  카지노 사용해제
                </button>
              </div>
            </FormRow>
            {/* Right: empty */}
            <div />

            {/* ========== ROW 14 ========== */}
            {/* Left: 차단상태 */}
            <FormRow label="차단상태">
              <div className="flex items-center gap-2 flex-1">
                <div
                  onClick={() => setBlockStatus(!blockStatus)}
                  className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors flex-shrink-0 ${
                    blockStatus ? "bg-red-600" : "bg-neutral-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      blockStatus ? "left-5" : "left-0.5"
                    }`}
                  />
                </div>
                <input
                  type="text"
                  value={blockMessage}
                  onChange={(e) => setBlockMessage(e.target.value)}
                  placeholder="차단 메세지"
                  className="flex-1 h-9 px-3 text-sm bg-neutral-900 border border-white/10 text-white rounded-lg placeholder:text-white/30 outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => {
                    setBlockStatus(true);
                    handlePatch({ status: "blocked" }, "회원이 차단되었습니다.");
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                >
                  차단하기
                </button>
                <button
                  onClick={() => {
                    setBlockStatus(false);
                    handlePatch({ status: "active" }, "차단이 해제되었습니다.");
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                >
                  차단해제
                </button>
              </div>
            </FormRow>
            {/* Right: empty */}
            <div />
          </div>
        )}
      </div>
    </div>
  );
}

function FormRow({
  label,
  children,
  alignTop,
}: {
  label: string;
  children: React.ReactNode;
  alignTop?: boolean;
}) {
  return (
    <div
      className={`flex ${alignTop ? "items-start" : "items-center"} gap-3 py-2.5 border-b border-white/5`}
    >
      <div className="w-36 flex-shrink-0 text-xs text-white/60 font-bold">{label}</div>
      <div className="flex-1 flex items-center">{children}</div>
    </div>
  );
}
