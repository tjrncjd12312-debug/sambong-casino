"use client";
import PartnerStatsPage from "@/components/admin/PartnerStatsPage";

export default function HeadStatsPage() {
  return <PartnerStatsPage statsType="head" nameLabel="본사명" depositLabel="입금(통장)" withdrawLabel="출금(통장)" />;
}
