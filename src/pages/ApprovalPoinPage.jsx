import { ShieldCheck } from "lucide-react";
import SOPApproval from "@/components/sop/SOPApproval";

export default function ApprovalPoinPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-primary" /> Approval Poin Checklist
        </h1>
        <p className="text-muted-foreground mt-1">
          Tinjau, koreksi, dan setujui poin checklist harian karyawan. Poin disetujui dipakai untuk KPI slip gaji.
        </p>
      </div>
      <SOPApproval />
    </div>
  );
}