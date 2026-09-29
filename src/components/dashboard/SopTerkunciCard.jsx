/**
 * SopTerkunciCard — SOP yang sedang tidak bisa dikerjakan.
 *
 * Ini jawaban atas satu keadaan yang selama berbulan-bulan tidak terlihat di
 * layar mana pun: tugas harian tetap muncul dan tetap berpoin walau bahannya
 * nol. Contoh nyatanya pemberian Vitamin Reproduksi — tugasnya aktif tiap hari
 * jam 08:30 dengan 10 poin, sementara stok racikannya 0 dari minimum 3.000 g.
 *
 * ── DUA JENIS KUNCI, DAN KENAPA BEDANYA PENTING ────────────────────────────
 *
 * `terkunci_bahan` dipakai dua hal yang sangat berbeda:
 *
 *   butuh_bahan_gudang = true   Dikunci OTOMATIS oleh fungsi kunciBahanSOP saat
 *                               stok SKU-nya nol, dan DIBUKA otomatis begitu
 *                               stoknya ada lagi. Jawabannya memang di Gudang.
 *
 *   butuh_bahan_gudang ≠ true   Dikunci MANUAL oleh orang. Fungsi itu sengaja
 *                               tidak menyentuhnya — ia tidak punya cara tahu
 *                               kapan boleh dibuka. Tidak ada yang akan
 *                               membukanya kecuali manusia.
 *
 * Kartu ini dulu memperlakukan keduanya sama dan menaruh satu tautan: "Gudang →".
 * Untuk kunci manual itu arah yang salah. Contoh yang sedang berjalan saat ini:
 * "Panen azolla untuk pakan" dikunci manual 18-09-2026 dengan catatan "BUKA
 * KEMBALI begitu kolam siap panen". Azolla ditumbuhkan, bukan dibeli — tidak ada
 * apa pun di Gudang yang bisa membukanya. Yang menentukan justru tugas
 * pemupukan, dan dua dari tiganya sedang terlewat (UREA terakhir 8 September,
 * "Ganti pupuk asola" nol kali sepanjang September).
 *
 * Maka sekarang umur kuncinya ditampilkan, dan kunci manual diberi tautan ke
 * halaman SOP — tempat ia sebenarnya bisa dibuka.
 *
 * ── KENAPA UMURNYA PERLU TERLIHAT ──────────────────────────────────────────
 *
 * Tugas yang terkunci TIDAK dihitung sebagai kewajiban, jadi kunci yang
 * terlupakan menaikkan angka kepatuhan diam-diam: semakin lama dibiarkan,
 * semakin bagus angkanya. Fungsi kunciBahanSOP sudah melaporkan kunci manual
 * yang lewat 14 hari lewat notifikasi dan WhatsApp; kartu ini menunjukkan
 * hitungannya sejak hari pertama, supaya tidak ada yang kaget di hari ke-14.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { selisihHari, tanggalHariIni } from "@/lib/safeDate";

/** Sudah berapa hari kunci ini tidak disentuh. */
function umurKunci(t) {
  const disentuh = String(t?.updated_date || t?.created_date || "").slice(0, 10);
  const n = selisihHari(disentuh, tanggalHariIni());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Kunci manual tidak akan terbuka sendiri — tidak ada yang memantaunya. */
const manual = (t) => t?.butuh_bahan_gudang !== true;

export default function SopTerkunciCard() {
  const { data: terkunci = [] } = useQuery({
    queryKey: ["sop-terkunci"],
    queryFn: () => base44.entities.SOPTask.filter({ terkunci_bahan: true, is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  if (!terkunci.length) return null;

  const totalPoin = terkunci.reduce((s, t) => s + Number(t.points || 0), 0);
  const adaManual = terkunci.some(manual);
  const semuaManual = terkunci.every(manual);

  return (
    <div className="bg-card rounded-xl border border-red-200 dark:border-red-900 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
        <h2 className="font-semibold text-sm text-foreground min-w-0">
          {terkunci.length} SOP terhenti
          {semuaManual ? " — dikunci manual" : " karena bahan habis"}
        </h2>
        {/* Tautannya mengikuti jenis kuncinya. Mengirim orang ke Gudang untuk
            kunci manual adalah mengirimnya ke tempat yang tidak bisa
            menyelesaikan apa pun. */}
        <Link
          to={semuaManual ? "/sop" : "/stok-unified"}
          className="ml-auto text-xs text-primary hover:underline flex-shrink-0"
        >
          {semuaManual ? "Buka di SOP →" : "Gudang →"}
        </Link>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Tugas ini tidak bisa dicentang keeper sampai kuncinya dibuka. Senilai {totalPoin} poin
        per hari yang tidak bisa mereka dapatkan
        {adaManual && (
          <> — dan selama terkunci, tugasnya tidak dihitung sebagai kewajiban, jadi angka
          kepatuhan terlihat lebih baik dari kenyataannya.</>
        )}
      </p>

      <div className="space-y-2">
        {terkunci.slice(0, 6).map((t) => {
          const hari = umurKunci(t);
          const lama = hari !== null && hari >= 14;
          return (
            <div
              key={t.id}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900"
            >
              <span className="text-base mt-0.5 flex-shrink-0">🔒</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-red-800 dark:text-red-300 font-medium leading-snug break-words">
                  {t.title}
                </p>
                <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5 break-words">
                  {manual(t) && (
                    <span className={lama ? "font-bold" : "font-semibold"}>
                      {hari === null
                        ? "Dikunci manual"
                        : `Dikunci manual, sudah ${hari} hari`}
                      {lama && " — perlu ditinjau"}
                      {t.terkunci_alasan ? " · " : ""}
                    </span>
                  )}
                  {t.terkunci_alasan}
                </p>
              </div>
              <span className="text-[11px] text-red-700/70 dark:text-red-400/70 tabular-nums flex-shrink-0">
                {t.points} poin
              </span>
            </div>
          );
        })}
        {terkunci.length > 6 && (
          <p className="text-xs text-muted-foreground">dan {terkunci.length - 6} lainnya</p>
        )}
      </div>
    </div>
  );
}
