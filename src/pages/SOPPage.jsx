import { useCurrentUser } from "@/lib/useCurrentUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TugasHariIni from "@/components/sop/TugasHariIni";
import SOPApproval from "@/components/sop/SOPApproval";
import SOPTaskManager from "@/components/sop/SOPTaskManager";
import SOPKPI from "@/components/sop/SOPKPI";

export default function SOPPage() {
  const { user, role } = useCurrentUser();
  const isAdmin = ["owner", "admin", "manajer", "kepala_feeder"].includes(role);
  const canManageSOP = ["owner", "admin", "manajer"].includes(role);
  const isKepalaFeeder = role === "kepala_feeder";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">SOP Harian & KPI</h1>
        <p className="text-muted-foreground mt-1">Jadwal kerja harian, checklist tugas, poin, dan bonus karyawan</p>
      </div>

      <Tabs defaultValue="tugas">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="tugas">📋 Tugas Hari Ini</TabsTrigger>
          {isAdmin && <TabsTrigger value="approval">Verifikasi</TabsTrigger>}
          <TabsTrigger value="kpi">KPI & Poin</TabsTrigger>
          {canManageSOP && <TabsTrigger value="tasks">Kelola SOP</TabsTrigger>}
        </TabsList>

        <TabsContent value="tugas" className="mt-6">
          <TugasHariIni user={user} showTeamView={isAdmin} />
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