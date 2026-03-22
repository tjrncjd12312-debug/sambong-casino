"use client";

import StatsTableTemplate from "@/components/admin/StatsTableTemplate";

const cols = [
  { key: "date", label: "날짜" },
  { key: "betting", label: "베팅금" },
  { key: "winning", label: "당첨금" },
  { key: "betCount", label: "베팅횟수" },
  { key: "winCount", label: "당첨횟수" },
  { key: "rollingBubon", label: "롤링(부본)" },
  { key: "rollingJisa", label: "롤링(지사)" },
  { key: "rollingChongpan", label: "롤링(총판)" },
  { key: "rollingMaejang", label: "롤링(매장)" },
  { key: "rollingTotal", label: "롤링(합계)" },
  { key: "rtp", label: "회수율" },
];

const data = [
  { date: "합계", name: "합계", betting: 0, winning: 0, betCount: 0, winCount: 0, rollingBubon: 0, rollingJisa: 0, rollingChongpan: 0, rollingMaejang: 0, rollingTotal: 0, rtp: "0.00" },
];

export default function MissingPage() {
  return <StatsTableTemplate columns={cols} data={data} emptyText="누락 데이터가 없습니다" />;
}
