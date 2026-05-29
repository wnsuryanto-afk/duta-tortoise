import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SOPChecklist from "@/components/sop/SOPChecklist";
import SOPApproval from "@/components/sop/SOPApproval";
import SOPTaskManager from "@/components/sop/SOPTaskManager";
import SOPKPI from "@/components/sop/SOPKPI";

export default function SOPPage() {
  const { role } = useCurrentUser();
  const isAdmin = ["owner", "admin", "manajer", "kepala_feeder"].includes(role);
  const canManageSOP = role === "owner" || role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">SOP Harian & KPI</h1>
        <p className="text-muted-foreground mt-1">Checklist tugas harian, poin, dan bonus karyawan</p>
      </div>

      <Tabs defaultValue={isAdmin ? "approval" : "checklist"}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="checklist">Checklist Saya</TabsTrigger>
          {isAdmin && <TabsTrigger value="approval">Verifikasi</TabsTrigger>}
          <TabsTrigger value="kpi">KPI & Poin</TabsTrigger>
          {canManageSOP && <TabsTrigger value="tasks">Kelola SOP</TabsTrigger>}
        </TabsList>

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
      </Tabs>
    </div>
  );
}