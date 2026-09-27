import { ShieldCheck } from "lucide-react";
import SOPApproval from "@/components/sop/SOPApproval";
import AlurGaji from "@/components/salary/AlurGaji";
import PageHeader from "@/components/common/PageHeader";
import { TeamArt } from "@/components/common/Illustration";

export default function ApprovalPoinPage() {
  return (
    <div className="space-y-6">
      <AlurGaji aktif="poin" />
      <PageHeader
        title="Approval Poin Checklist"
        subtitle="Tinjau, koreksi, dan setujui poin harian"
        icon={ShieldCheck}
        art={<TeamArt size="md" />}
        description="Hanya poin yang disetujui yang masuk hitungan KPI dan slip gaji."
      />
      <SOPApproval />
    </div>
  );
}