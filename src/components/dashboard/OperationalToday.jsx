import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Syringe, Tent } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

export default function OperationalToday() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  // Tugas hari ini
  const { data: todayChecklists = [] } = useQuery({
    queryKey: ["today-checklists-op"],
    queryFn: () => base44.entities.DailyChecklist.filter({ date: today }),
  });

  // Treatment hari ini
  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments-op"],
    queryFn: () => base44.entities.TreatmentSchedule.list(),
  });
  const todayTreatments = treatments.filter(t => t.next_due === today);

  // Kartu "Perawatan Kandang" DIHAPUS 31-08-2026.
  //
  // Ia membaca MaintenanceSchedule — tabel yang barisnya memang ada tapi
  // SELURUHNYA is_active: false, dan tidak ada satu pun berkas di aplikasi ini
  // yang bisa membuat atau mengaktifkannya kembali. Jadi kartunya selamanya
  // menampilkan 0 dan menautkan ke halaman yang tidak menampilkan jadwal apa
  // pun. Angka nol yang tidak pernah berubah mengajari orang mengabaikan
  // seluruh baris kartu ini — termasuk kartu di sebelahnya yang isinya nyata.
  //
  // Pekerjaan berulang di peternakan ini ditangani tugas SOP, dan hasilnya
  // dicatat ke MaintenanceLog oleh Tugas Hari Ini. Itu yang hidup; ini roda
  // ketiga yang tidak menyentuh tanah.

  // Karantina aktif
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-quarantine"],
    queryFn: () => base44.entities.Tortoise.filter({ in_quarantine: true, status: 'aktif' }),
  });

  const cards = [
    {
      title: "Tugas Hari Ini",
      icon: ClipboardList,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => navigate("/sop"),
      content: (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {todayChecklists.filter(c => c.status === 'approved').length}/{todayChecklists.length}
            </span>
          </div>
          <Progress 
            value={todayChecklists.length > 0 ? (todayChecklists.filter(c => c.status === 'approved').length / todayChecklists.length) * 100 : 0}
            className="h-2"
          />
          {todayChecklists.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Tidak ada tugas hari ini</p>
          )}
        </div>
      ),
    },
    {
      title: "Treatment",
      icon: Syringe,
      color: "text-accent",
      bgColor: "bg-accent/10",
      onClick: () => navigate("/treatment"),
      content: (
        <div>
          <p className="text-2xl font-bold text-accent">{todayTreatments.length}</p>
          <p className="text-xs text-muted-foreground">kura-kura perlu treatment</p>
          {todayTreatments.slice(0, 3).map((t, i) => (
            <p key={i} className="text-xs text-muted-foreground mt-1 truncate">
              {t.tortoise_name} - {t.type}
            </p>
          ))}
        </div>
      ),
    },
    {
      title: "Karantina",
      icon: Tent,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      onClick: () => navigate("/tortoise?filter=quarantine"),
      hide: tortoises.length === 0,
      content: (
        <div>
          <p className="text-2xl font-bold text-orange-500">{tortoises.length}</p>
          <p className="text-xs text-muted-foreground">kura-kura dalam karantina</p>
          {tortoises.slice(0, 2).map((t, i) => (
            <p key={i} className="text-xs text-muted-foreground mt-1 truncate">
              {t.name} - {t.quarantine_reason}
            </p>
          ))}
        </div>
      ),
    },
  ].filter(card => !card.hide);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.title}
            onClick={card.onClick}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <h3 className="font-semibold text-sm mb-2">{card.title}</h3>
              {card.content}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}