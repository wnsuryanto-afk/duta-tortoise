/**
 * TermConditionSOPPage — SATU halaman pengaturan "Term & Condition" untuk owner,
 * dengan DUA TAB. Tiap tab mengedit entity aslinya langsung (satu sumber data).
 *
 * Tab 1 "SOP Harian"   → entity SOPTask          (struktur SOPTask dipertahankan).
 * Tab 2 "Treatment"    → entity TreatmentSchedule (struktur TreatmentSchedule dipertahankan).
 *
 * Owner-only. Tidak mengubah alur keeper, TreatmentLog, atau alur otomatis
 * treatment→SOP — panel ini hanya mengatur nilai field.
 */
import { useCurrentUser } from "@/lib/useCurrentUser";
import AccessDenied from "@/components/common/AccessDenied";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Pill } from "lucide-react";
import SOPTermConditionTable from "@/components/sop/SOPTermConditionTable";
import TreatmentTermConditionTable from "@/components/treatment/TreatmentTermConditionTable";

export default function TermConditionSOPPage() {
  const { role } = useCurrentUser();

  if (role !== "owner") return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
          <Settings2 className="w-7 h-7 text-primary" /> Term & Condition
        </h1>
        <p className="text-muted-foreground mt-1">
          Aturan default tiap task & treatment — dibaca langsung oleh checklist keeper. Perubahan langsung berlaku pada tugas yang dikerjakan.
        </p>
      </div>

      <Tabs defaultValue="sop">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="sop"><Settings2 className="w-4 h-4 mr-1.5" /> SOP Harian</TabsTrigger>
          <TabsTrigger value="treatment"><Pill className="w-4 h-4 mr-1.5" /> Treatment / Pengobatan</TabsTrigger>
        </TabsList>

        <TabsContent value="sop" className="mt-6">
          <SOPTermConditionTable />
        </TabsContent>
        <TabsContent value="treatment" className="mt-6">
          <TreatmentTermConditionTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}