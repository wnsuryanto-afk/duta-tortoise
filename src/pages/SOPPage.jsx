import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SOPChecklist from "@/components/sop/SOPChecklist";
import TugasHariIni from "@/components/sop/TugasHariIni";
import SOPApproval from "@/components/sop/SOPApproval";
import SOPTaskManager from "@/components/sop/SOPTaskManager";
import SOPKPI from "@/components/sop/SOPKPI";
import AuditMingguan from "@/components/sop/AuditMingguan";
import PengingatPersetujuan from "@/components/sop/PengingatPersetujuan";
import PageHeader from "@/components/common/PageHeader";
import { ClipboardList } from "lucide-react";
import { TeamArt } from "@/components/common/Illustration";

export default function SOPPage() {
  const { user, role } = useCurrentUser();
  const isAdmin = ["owner", "admin", "manajer", "kepala_feeder"].includes(role);
  const canManageSOP = ["owner", "admin", "manajer"].includes(role);
  const isKepalaFeeder = role === "kepala_feeder";

  return (
    <div className="space-y-6">
      {/* Layar yang paling sering dibuka di aplikasi ini. Judul `text-3xl`
          dengan anak kalimat dua baris memakan 100px pertama tiap kali
          dibuka — padahal yang dicari orang ada di tab pertama. */}
      <PageHeader
        title="SOP Harian & KPI"
        subtitle="Tugas harian, poin, dan bonus"
        icon={ClipboardList}
        art={<TeamArt size="md" />}
      />

      <Tabs defaultValue="tugas">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="tugas">📋 Tugas Hari Ini</TabsTrigger>
          <TabsTrigger value="checklist">Checklist Poin</TabsTrigger>
          {isAdmin && <TabsTrigger value="approval">Verifikasi</TabsTrigger>}
          <TabsTrigger value="kpi">KPI & Poin</TabsTrigger>
          {canManageSOP && <TabsTrigger value="tasks">Kelola SOP</TabsTrigger>}
          {role === "owner" && <TabsTrigger value="audit">Audit Mingguan</TabsTrigger>}
        </TabsList>

        <TabsContent value="tugas" className="mt-6 space-y-4">
          {/* Pengingat untuk penyetuju — checklist yang menggantung lebih dari
              sehari. Ditaruh di tab yang memang dibuka tiap hari. */}
          <PengingatPersetujuan />
          <TugasHariIni user={user} showTeamView={isAdmin} />
        </TabsContent>

        <TabsContent value="checklist" className="mt-6">
          <SOPChecklist />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="approval" className="mt-6">
            <SOPApproval />
          </TabsContent>
        )}
        <TabsContent value="kpi" className="mt-6">
          <SOPKPI />
        </TabsContent>
        {canManageSOP && (
          <TabsContent value="tasks" className="mt-6">
            <SOPTaskManager />
          </TabsContent>
        )}
        {role === "owner" && (
          <TabsContent value="audit" className="mt-6">
            <AuditMingguan />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}