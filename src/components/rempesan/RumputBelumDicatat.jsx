import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Leaf, Image as ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { hariRumputBelumDicatat, hariPakanBelumDicatat } from "@/lib/rempesan";
import RempesanRecordForm from "@/components/rempesan/RempesanRecordForm";

/**
 * RumputBelumDicatat — jembatan antara jejak absensi dan catatan rempesan.
 *
 * Sejak check-in menanyakan alasan, hari yang dipakai mengambil rumput
 * meninggalkan baris absensi ber-`late_reason: "cari_rumput"` lengkap dengan
 * fotonya. Komponen ini menagih hari-hari itu: yang fotonya ada tetapi
 * rempesannya belum pernah dicatat.
 *
 * Tanpa penagih ini, jejaknya hanya tersimpan. `RempesanLog` sudah punya
 * halaman, formulir, alur persetujuan, dan tarif per trip sejak lama — dan
 * isinya nol catatan. Perangkatnya tidak pernah kurang; yang kurang adalah
 * sesuatu yang mengingatkan bahwa ia ada.
 *
 * Barisnya TIDAK dibuat otomatis. `weight_kg` wajib, dan berat itu tidak
 * diketahui siapa pun saat check-in — lihat lib/rempesan.js.
 *
 * `milikSendiri` membedakan dua pembaca: keeper melihat harinya sendiri dan
 * bisa langsung mencatat; pemilik melihat seluruh tim dan hanya membacanya,
 * karena rempesan dicatat oleh yang mengerjakannya.
 */
export default function RumputBelumDicatat({ email, milikSendiri = false, batas = 7 }) {
  const qc = useQueryClient();
  const [isi, setIsi] = useState(null);

  const { data: absensi = [] } = useQuery({
    queryKey: ["absensi-rumput", email || "semua"],
    queryFn: () =>
      email
        ? base44.entities.Attendance.filter({ employee_email: email }, "-date", 120)
        : base44.entities.Attendance.list("-date", 300),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["rempesan-logs"],
    queryFn: () => base44.entities.RempesanLog.list("-date", 300),
  });
  // Catatan Pakan Harian bersumber sayur/campur dulu ikut dibayar di slip
  // BULANAN lewat jalurnya sendiri. Sejak upah trip hanya berasal dari
  // RempesanLog, hari yang cuma tercatat di sana tidak lagi menghasilkan uang
  // — jadi ia ikut ditagih di sini, bukan dibiarkan hilang tanpa suara.
  const { data: pakan = [] } = useQuery({
    queryKey: ["pakan-harian-trip"],
    queryFn: () => base44.entities.PakanHarian.list("-log_date", 300),
  });

  const hari = [
    ...hariRumputBelumDicatat(absensi, logs, { email }),
    ...hariPakanBelumDicatat(pakan, logs, { email }),
  ]
    // Satu hari cukup ditagih sekali meski jejaknya ada di absensi DAN di pakan.
    .filter((h, i, a) => a.findIndex((x) => x.email === h.email && x.tanggal === h.tanggal) === i)
    .sort((x, y) => String(y.tanggal).localeCompare(String(x.tanggal)));
  if (hari.length === 0) return null;

  const tampil = hari.slice(0, batas);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4">
      <div className="flex items-start gap-2.5">
        <Leaf className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">
            {hari.length} hari ambil rumput, belum dicatat rempesannya
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {milikSendiri
              ? "Absensimu mencatat kamu ambil rumput di hari-hari ini. Catat beratnya supaya tripnya bisa disetujui."
              : "Fotonya ada di absensi, tapi belum ada catatan rempesan — jadi tripnya belum bisa disetujui."}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {tampil.map((h) => (
          <div
            key={h.id}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {format(parseISO(h.tanggal), "EEEE, d MMM", { locale: idLocale })}
              </p>
              {/* Hari yang jejaknya dari Pakan Harian tidak punya jam masuk —
                  jangan menulis "Masuk " yang kosong di belakangnya. */}
              <p className="text-[11px] text-muted-foreground">
                {[
                  milikSendiri ? null : h.nama,
                  h.jamMasuk ? `masuk ${h.jamMasuk}` : null,
                  h.catatan || null,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
            {h.fotoUrl && (
              <a
                href={h.fotoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline flex-shrink-0"
              >
                <ImageIcon className="w-3 h-3" /> Foto
              </a>
            )}
            {milikSendiri && (
              <Button size="sm" variant="outline" className="h-8 flex-shrink-0" onClick={() => setIsi(h)}>
                Catat
              </Button>
            )}
          </div>
        ))}
        {hari.length > tampil.length && (
          <p className="text-[11px] text-muted-foreground px-1">
            dan {hari.length - tampil.length} hari lagi
          </p>
        )}
      </div>

      {isi && (
        <RempesanRecordForm
          tanggalAwal={isi.tanggal}
          fotoAwal={isi.fotoUrl}
          catatanAwal={isi.catatan}
          onClose={() => setIsi(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["rempesan-logs"] });
            qc.invalidateQueries({ queryKey: ["absensi-rumput"] });
          }}
        />
      )}
    </div>
  );
}
