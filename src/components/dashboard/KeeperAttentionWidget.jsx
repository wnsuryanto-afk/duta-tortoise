import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { sedangSakit } from "@/lib/populasiKura";


export default function KeeperAttentionWidget() {
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-keeper-attention"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const today = new Date().toISOString().split("T")[0];
  const { data: rotasi = { babies: [], dewasa: [] } } = useQuery({
    queryKey: ["rotasi-ukur", today],
    queryFn: async () => {
      const res = await base44.functions.invoke("getRotasiUkur", { date: today });
      return { babies: res.data?.babies || [], dewasa: res.data?.dewasa || [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["health-reminders-keeper"],
    queryFn: () => base44.entities.HealthReminder.filter({ is_done: false }, "due_date", 100),
    staleTime: 5 * 60 * 1000,
  });

  // 1. Kura sakit
  const sickTortoises = tortoises.filter(sedangSakit);

  // 2. Belum ditimbang (lewat interval)
  // Dibaca dari getRotasiUkur — sumber yang sama dengan daftar tugas harian.
  //
  // Sebelumnya widget ini menghitung sendiri dengan aturannya sendiri (ambang
  // > interval, hanya membaca last_weighed_date yang kosong pada 93 dari 120
  // kura dewasa), sementara daftar tugas memakai getRotasiUkur (ambang per
  // kelompok 14/60 hari, membaca MeasurementHistory). Dua layar menyuruh
  // menimbang kura yang berbeda pada hari yang sama.
  const notWeighed = [...(rotasi.dewasa || []), ...(rotasi.babies || [])].slice(0, 3);

  // 3. Pengingat perawatan yang sudah lewat jatuh tempo.
  //
  // Versi lama menyaring TreatmentSchedule dengan `t.next_date < today` — dan
  // `next_date` TIDAK ADA di skema TreatmentSchedule. Nilainya selalu undefined,
  // penyaringnya selalu kosong, dan bagian ini tidak pernah sekali pun muncul.
  // Tampilannya pun membaca `tortoise_name` dan `medicine_name` yang juga tidak
  // ada di sana (skemanya punya `tortoise_names`, jamak).
  //
  // Jatuh tempo perawatan sebenarnya disimpan di HealthReminder — entitas yang
  // memang punya `due_date`, dimajukan otomatis saat pengingatnya diselesaikan.
  // Sampai sekarang pengingat itu hanya tampil di beranda cadangan yang tidak
  // dilihat peran mana pun kecuali peninjau, jadi tidak pernah sampai ke keeper.
  const overdueTreatments = reminders
    .filter(r => !r.is_done && r.due_date && r.due_date <= today)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
    .slice(0, 3);

  const hasAlert = sickTortoises.length > 0 || notWeighed.length > 0 || overdueTreatments.length > 0;

  if (!hasAlert) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">⚠️ Perlu Perhatian</h2>
        </div>
        <p className="text-sm text-green-600 font-medium">✓ Semua kondisi normal hari ini</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-orange-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <h2 className="font-semibold text-sm">⚠️ Perlu Perhatian</h2>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
          {sickTortoises.length + notWeighed.length + overdueTreatments.length} item
        </span>
      </div>
      <div className="space-y-2">
        {sickTortoises.slice(0, 3).map(t => (
          <Link key={t.id} to="/health" className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
            <span className="text-sm">🤒</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800 truncate">{t.name}</p>
              <p className="text-xs text-red-600">{t.enclosure || "—"} · Sakit</p>
            </div>
          </Link>
        ))}
        {notWeighed.map(t => (
          <div key={t.id} className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-sm">⚖️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 truncate">{t.code || t.name}</p>
              <p className="text-xs text-amber-600">
                {t.daysAgo === null ? "belum ada catatan ukur" : `terakhir diukur ${t.daysAgo} hari lalu`}
              </p>
            </div>
          </div>
        ))}
        {overdueTreatments.map(tr => (
          <Link key={tr.id} to="/treatment" className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
            <span className="text-sm">💊</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 truncate">
                {tr.tortoise_name || tr.enclosure || "Semua kura"}
              </p>
              <p className="text-xs text-amber-600 truncate">
                {tr.title || tr.type || "Perawatan"} — jatuh tempo {tr.due_date}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}