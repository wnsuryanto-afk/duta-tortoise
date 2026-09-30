import { useCurrentUser } from "@/lib/useCurrentUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TugasHariIni from "@/components/sop/TugasHariIni";
import SOPApproval from "@/components/sop/SOPApproval";
import SOPTaskManager from "@/components/sop/SOPTaskManager";
import SOPKPI from "@/components/sop/SOPKPI";
import AuditMingguan from "@/components/sop/AuditMingguan";
import TenggatVsNyata from "@/components/sop/TenggatVsNyata";
import TugasTidakDikerjakan from "@/components/sop/TugasTidakDikerjakan";
import PengingatPersetujuan from "@/components/sop/PengingatPersetujuan";
import PageHeader from "@/components/common/PageHeader";
import { ClipboardList } from "lucide-react";
import { TeamArt } from "@/components/common/Illustration";
import { useSearchParams } from "react-router-dom";
import TugasInsidentilTab from "@/components/sop/TugasInsidentilTab";
import PerpustakaanSOPTab from "@/components/sop/PerpustakaanSOPTab";
import CatatanUntukSayaTab from "@/components/sop/CatatanUntukSayaTab";

export default function SOPPage() {
  const { user, role } = useCurrentUser();
  const isAdmin = ["owner", "admin", "manajer", "kepala_feeder"].includes(role);
  const canManageSOP = ["owner", "admin", "manajer"].includes(role);
  const isKepalaFeeder = role === "kepala_feeder";

  /*
   * Tab disimpan di URL, bukan di useState.
   *
   * Sebelumnya `defaultValue="tugas"` saja. Begitu tiga halaman lain
   * menyatu ke sini, tab tanpa URL berarti pengalihan dari /tugas-insidentil
   * mendarat di tab yang salah, dan tidak ada cara menautkan "buka tugas
   * insidentil" dari mana pun.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const TAB_SAH = ["tugas", "catatan", "approval", "kpi", "tasks", "audit", "insidentil", "perpustakaan"];
  // Tab yang dibatasi peran tidak boleh bisa dibuka lewat URL oleh peran yang
  // tidak berhak — kalau tidak, ?tab=tasks memberi kiper layar Kelola SOP.
  const tabBoleh = (t) =>
    TAB_SAH.includes(t) &&
    (t !== "approval" || isAdmin) &&
    (t !== "tasks" || canManageSOP) &&
    (t !== "audit" || role === "owner") &&
    (t !== "insidentil" || isAdmin) &&
    (t !== "perpustakaan" || canManageSOP);
  const tabDariUrl = searchParams.get("tab");
  const activeTab = tabBoleh(tabDariUrl) ? tabDariUrl : "tugas";
  const setActiveTab = (nilai) => {
    const next = new URLSearchParams(searchParams);
    if (nilai === "tugas") next.delete("tab");
    else next.set("tab", nilai);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Layar yang paling sering dibuka di aplikasi ini. Judul `text-3xl`
          dengan anak kalimat dua baris memakan 100px pertama tiap kali
          dibuka — padahal yang dicari orang ada di tab pertama. */}
      <PageHeader
        title="SOP & Tugas"
        subtitle="Tugas harian, tugas dadakan, poin, dan dokumen prosedur"
        icon={ClipboardList}
        art={<TeamArt size="md" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="tugas">Tugas Hari Ini</TabsTrigger>
          {/* Tanpa penjaga peran, dan itu disengaja: isinya disaring
              `employee_email: user.email` — tiap orang hanya melihat catatan
              atas tugasnya sendiri. Ditaruh di sebelah "Tugas Hari Ini"
              karena di situlah kiper mendarat tiap pagi. */}
          <TabsTrigger value="catatan">Catatan untuk Saya</TabsTrigger>
          {/* `isAdmin` dan `canManageSOP`, bukan tanpa penjaga: hak akses tidak
              boleh melebar hanya karena halamannya pindah jadi tab.
              "tugas-insidentil" dimiliki owner/admin/manajer/kepala_feeder —
              tepat isi `isAdmin`. "sop-library" hanya owner/admin/manajer —
              tepat isi `canManageSOP`, dan kepala_feeder TIDAK termasuk.
              Catatan: TugasInsidentilTab punya jalur khusus kiper ("Usulkan
              Tugas"), jadi memberi kiper akses ke tab ini kelak cukup
              menambah "tugas-insidentil" di lib/permissions.js. */}
          {isAdmin && <TabsTrigger value="insidentil">Tugas Insidentil</TabsTrigger>}
          {isAdmin && <TabsTrigger value="approval">Verifikasi</TabsTrigger>}
          <TabsTrigger value="kpi">KPI &amp; Poin</TabsTrigger>
          {canManageSOP && <TabsTrigger value="tasks">Kelola SOP</TabsTrigger>}
          {canManageSOP && <TabsTrigger value="perpustakaan">Dokumen SOP</TabsTrigger>}
          {role === "owner" && <TabsTrigger value="audit">Audit Mingguan</TabsTrigger>}
        </TabsList>

        <TabsContent value="tugas" className="mt-6 space-y-4">
          {/* Pengingat untuk penyetuju — checklist yang menggantung lebih dari
              sehari. Ditaruh di tab yang memang dibuka tiap hari. */}
          <PengingatPersetujuan />
          <TugasHariIni user={user} showTeamView={isAdmin} />
        </TabsContent>

        <TabsContent value="catatan" className="mt-6">
          <CatatanUntukSayaTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="insidentil" className="mt-6">
            <TugasInsidentilTab />
          </TabsContent>
        )}

        {canManageSOP && (
          <TabsContent value="perpustakaan" className="mt-6">
            <PerpustakaanSOPTab />
          </TabsContent>
        )}

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
          <TabsContent value="audit" className="mt-6 space-y-6">
            <AuditMingguan />
            {/* Ditaruh di tab audit, bukan di layar kiper: yang bisa mengubah
                tenggat adalah pemilik, dan pertanyaan "kenapa kepatuhannya
                rendah" memang pertanyaan yang dibawa ke sini. */}
            <TenggatVsNyata />
            {/* Dua pertanyaan berbeda, sengaja berdampingan: yang di atas
                mengukur KETERLAMBATAN, yang di bawah mengukur KETIADAAN.
                Selama hanya ada yang pertama, tugas yang tidak pernah
                dikerjakan sama sekali tidak muncul di mana pun — ia tidak
                meninggalkan baris untuk dibaca. */}
            <TugasTidakDikerjakan />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}