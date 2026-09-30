import { useQuery } from "@tanstack/react-query";
import { layakTampil } from "@/lib/keyakinanAI";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { MessageCircle, Loader2 } from "lucide-react";
import { HeaderChip } from "@/components/common/PageHeader";
import KeadaanKosong from "@/components/common/KeadaanKosong";

/**
 * CatatanUntukSayaTab — apresiasi + saran AI dan catatan owner atas tugas
 * yang dikerjakan orang yang sedang membuka aplikasi.
 *
 * Dulu halaman /catatan-saran. Dipindah jadi tab di SOP & Tugas pada
 * 30 September 2026, karena halaman itu TIDAK BISA DIBUKA SIAPA PUN.
 *
 * ── Kenapa tidak bisa dibuka ────────────────────────────────────────
 *
 * Pintunya terdaftar di menu area ORANG dengan section "catatan-saran".
 * Section itu tidak ada di satu pun daftar NAV_ACCESS. `canAccess()`
 * mengembalikan false untuk SEMUA peran, dan HubPage serta CommandPalette
 * keduanya menyaring dengan canAccess. Jadi pintunya tidak pernah muncul —
 * tidak di menu, tidak di Ctrl+K. Tidak ada satu pun tautan ke halaman ini
 * di seluruh aplikasi. Hanya bisa dibuka dengan mengetik URL-nya.
 *
 * Dan area ORANG sendiri memang tidak bisa dibuka kiper, padahal halaman
 * ini menyaring `employee_email: user.email` — isinya milik kiper.
 * Halaman kiper diparkir di area pemilik, dengan kunci yang tidak ada.
 *
 * ── Apa yang selama ini tidak terbaca ───────────────────────────────
 *
 * Dihitung dari 199 baris DailyChecklist pada 30-09-2026:
 *
 *     170 ai_apresiasi   106 untuk Soleh, 64 untuk Angsolo
 *     160 ai_saran       101 untuk Soleh, 59 untuk Angsolo
 *       0 owner_note
 *
 * 330 pesan tertulis untuk dua orang — pujian dan koreksi kerja, dibuat
 * terus sampai hari ini — dan tidak satu pun pernah bisa dibaca orang yang
 * dituju. Bukan fitur yang salah hitung: fitur yang tidak punya pintu.
 *
 * Sebagai tab di SOP & Tugas, ia berada di layar yang memang dibuka kiper
 * tiap pagi, dan hak aksesnya ikut "sop" — yang dimiliki semua peran
 * lapangan. Tidak ada pintu menu baru yang ditambahkan.
 *
 * Angka owner_note 0 dibiarkan apa adanya: itu bukan cacat, itu berarti
 * fiturnya belum pernah dipakai — mungkin justru karena hasilnya tidak
 * pernah kelihatan.
 *
 * Penilaian teknis (keyakinan, sesuai/tidak) TIDAK ditampilkan di sini.
 */
export default function CatatanUntukSayaTab() {
  const { user } = useCurrentUser();

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["catatan-saran", user?.email],
    queryFn: () => base44.entities.DailyChecklist.filter({ employee_email: user.email }, "-date", 50),
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  const entries = (checklists || [])
    .flatMap(c =>
      (c.completed_tasks || [])
        .filter(t => t.ai_apresiasi || t.ai_saran || t.owner_note)
        .map(t => ({
          date: c.date,
          task: t.task_title,
          apresiasi: t.ai_apresiasi,
          saran: t.ai_saran,
          keyakinan: t.ai_confidence,
          ownerNote: t.owner_note,
        }))
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Sembunyikan saran AI jika keyakinan < 60 (hindari teguran keliru).
  // Tapi owner_note selalu tampil.
  //
  // `layakTampil`, bukan `e.keyakinan >= 60`: keyakinan tersimpan bisa
  // berupa pecahan (0.95), dan perbandingan langsung membuat SETIAP
  // apresiasi dan saran tersaring habis. Itulah sebab kedua kenapa 330
  // pesan ini tidak pernah terbaca — bukan hanya pintunya yang hilang,
  // ambangnya juga memakai skala yang salah.
  const visibleEntries = entries.filter(e =>
    (layakTampil(e.keyakinan) && (e.apresiasi || e.saran)) || e.ownerNote
  );

  return (
    <div className="space-y-4">
      {/* Judul halaman dibuang — induknya sudah punya satu. Jumlah
          catatannya tetap: itu yang memberi tahu ada yang baru dibaca. */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          Masukan dari owner dan dari foto tugasmu
        </p>
        {visibleEntries.length > 0 && (
          <HeaderChip label="Catatan" value={visibleEntries.length} />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : visibleEntries.length === 0 ? (
        <KeadaanKosong
          gambar="tim"
          judul="Belum ada catatan"
          keterangan="Kerjakan tugas sambil memotret hasilnya — sarannya muncul di sini."
        />
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((e, i) => {
            const aiVisible = layakTampil(e.keyakinan);
            return (
              <div key={i} className="card-base p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">{e.task}</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {e.date ? format(new Date(e.date), "EEEE, d MMM", { locale: idLocale }) : "-"}
                  </span>
                </div>
                {aiVisible && e.apresiasi && (
                  <p className="text-sm text-green-700">✅ {e.apresiasi}</p>
                )}
                {aiVisible && e.saran && (
                  <p className="text-sm text-blue-700">💡 {e.saran}</p>
                )}
                {e.ownerNote && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 space-y-0.5">
                    <p className="text-[10px] font-bold text-amber-600">📣 Dari Owner</p>
                    <p className="text-sm text-amber-800">{e.ownerNote}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}