import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { HeartPulse, AlertTriangle, Check, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoHint from "@/components/ui/info-hint";
import { periksaTandaSakit, perubahanSakit } from "@/lib/statusKura";
import { jalankanMassal, ringkasHasil } from "@/lib/tugasMassal";
import { cn } from "@/lib/utils";

/**
 * PenandaSakit — menyelaraskan dua penanda sakit pada data kura.
 *
 * Sakit ditandai dua kali: lewat `status` dan lewat centang "Sedang Sakit".
 * Keduanya seharusnya selalu sepakat, tapi tidak ada satu pun yang menjaganya —
 * beberapa layar hanya menulis salah satunya, dan begitu keduanya berselisih,
 * kura itu menghilang dari sebagian aplikasi: terlihat sakit di penghitung
 * beranda tapi tidak muncul di daftar perawatan keeper, atau sebaliknya.
 *
 * Alat ini memakai pengaman yang sama dengan penyambungan nomor kandang:
 *
 *   1. Laporan lebih dulu, tanpa mengubah apa pun.
 *   2. Hanya yang PASTI yang diperbaiki massal. Selisih yang tidak bisa
 *      dijawab riwayat kesehatan sengaja dilewati dan diserahkan ke pemilik
 *      satu per satu — menebaknya berarti mengeluarkan kura yang benar-benar
 *      sakit dari daftar perawatan, atau menghidupkan kembali kasus yang
 *      sengaja ditutup.
 *   3. Aman diulang. Kura yang penandanya sudah selaras tidak disentuh.
 *
 * Alat ini membereskan data lama. Sumber selisihnya sendiri sudah ditutup:
 * semua layar yang menandai sakit atau sembuh kini menulis kedua penandanya
 * bersamaan lewat `statusKura.js`.
 */

// Amber untuk perbaikan yang MENAMBAH kura ke daftar sakit — di situlah ada
// kura yang selama ini luput dari perawatan. Hijau untuk yang membersihkan
// penanda basi: tidak ada yang terlewat, hanya sisa data yang dirapikan.
const KETERANGAN = {
  nyalakan: { label: "centang sakitnya dinyalakan", warna: "text-amber-600", ikon: AlertTriangle },
  sakitkan: { label: "statusnya dikembalikan ke sakit", warna: "text-amber-600", ikon: AlertTriangle },
  matikan: { label: "centang sakitnya dilepas", warna: "text-accent", ikon: Check },
  sembuhkan: { label: "statusnya ditutup sebagai sembuh", warna: "text-accent", ikon: Check },
};

export default function PenandaSakit() {
  const qc = useQueryClient();
  const [sibuk, setSibuk] = useState(null);
  const [hasilAkhir, setHasilAkhir] = useState(null);
  const [satuan, setSatuan] = useState(null);

  const { data: tortoises = [], isLoading: tLoad } = useQuery({
    queryKey: ["tortoises-penanda-sakit"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 1000),
  });
  const { data: healthRecords = [], isLoading: hLoad } = useQuery({
    queryKey: ["health-records-penanda-sakit"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 1000),
  });

  const laporan = periksaTandaSakit(tortoises, healthRecords);

  const segarkan = () => {
    qc.invalidateQueries({ queryKey: ["tortoises-penanda-sakit"] });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    qc.invalidateQueries({ queryKey: ["sick-tortoises-today"] });
    qc.invalidateQueries({ queryKey: ["sick-tortoises-close-panel"] });
  };

  const jalankan = async () => {
    if (laporan.perbaikan.length === 0 || sibuk) return;
    setSibuk({ sudah: 0, total: laporan.perbaikan.length });
    setHasilAkhir(null);

    const hasil = await jalankanMassal(
      laporan.perbaikan,
      ({ kura, perubahan }) => base44.entities.Tortoise.update(kura.id, perubahan),
      { serentak: 4, onKemajuan: (sudah, t) => setSibuk({ sudah, total: t }) }
    );

    setSibuk(null);
    setHasilAkhir(hasil);
    segarkan();

    const { nada, teks } = ringkasHasil(hasil, "kura");
    if (nada === "berhasil") toast.success(teks);
    else if (nada === "gagal") toast.error(teks);
    else toast.warning(teks);
  };

  /**
   * Keputusan pemilik untuk satu kura yang riwayatnya tidak menjawab.
   *
   * "Sudah sembuh" hanya melepas centangnya dan tidak menyentuh status. Kura di
   * kelompok ini statusnya memang bukan "sakit" — kalau statusnya ikut
   * "dipulihkan", kura yang sedang dikarantina justru dikeluarkan dari
   * karantina hanya karena centang sakitnya dilepas.
   */
  const putuskan = async (kura, masihSakit) => {
    if (satuan) return;
    setSatuan(kura.id);
    try {
      await base44.entities.Tortoise.update(
        kura.id,
        masihSakit
          ? perubahanSakit(kura)
          : { is_currently_sick: false, last_status_change: new Date().toISOString().split("T")[0] }
      );
      segarkan();
      toast.success(
        masihSakit
          ? `${kura.name} ditandai masih sakit.`
          : `${kura.name} tidak lagi ditandai sakit; statusnya tidak diubah.`
      );
    } catch (e) {
      toast.error("Gagal menyimpan: " + (e.message || e));
    }
    setSatuan(null);
  };

  if (tLoad || hLoad) {
    return <div className="h-32 rounded-xl shimmer" />;
  }

  // Dikelompokkan per ALASAN, bukan per jenis: dua kura bisa sama-sama
  // dilepas centangnya karena sebab yang berbeda — satu sudah mati, satu sudah
  // ada catatan sembuhnya — dan menampilkan sebab yang pertama untuk keduanya
  // membuat laporan ini salah menerangkan apa yang akan terjadi.
  const perAlasan = laporan.perbaikan.reduce((acc, p) => {
    const kunci = `${p.jenis}|${p.alasan}`;
    acc[kunci] = acc[kunci] || { jenis: p.jenis, alasan: p.alasan, daftar: [] };
    acc[kunci].daftar.push(p);
    return acc;
  }, {});

  const beres = laporan.perbaikan.length === 0 && laporan.ragu.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
          <HeartPulse className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-[15px] leading-tight flex items-center gap-1">
            Selaraskan penanda kura sakit
            <InfoHint title="Kenapa perlu" variant="info" size={13}>
              Sakit ditandai dua kali di data kura: lewat <b>status</b> dan lewat
              centang <b>Sedang Sakit</b>. Bila keduanya berselisih, kura itu
              terhitung sakit di sebagian layar dan sehat di sebagian lainnya —
              termasuk hilang dari daftar perawatan harian keeper.
            </InfoHint>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Membereskan data lama · aman diulang · tidak wajib
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 border border-border px-3 py-1.5 divide-y divide-border/60">
        <div className="flex items-start gap-2.5 py-1.5">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
          <p className="text-sm min-w-0 flex-1">
            <span className="font-bold tabular">{laporan.selaras}</span>{" "}
            <span className="text-muted-foreground">
              dari {tortoises.length} kura penandanya sudah selaras
            </span>
          </p>
        </div>

        {Object.entries(perAlasan).map(([kunci, { jenis, alasan, daftar }]) => (
          <div key={kunci} className="flex items-start gap-2.5 py-1.5">
            {(() => {
              const Ikon = KETERANGAN[jenis].ikon;
              return <Ikon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", KETERANGAN[jenis].warna)} />;
            })()}
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{daftar.length}</span>{" "}
                <span className="text-muted-foreground">{KETERANGAN[jenis].label}</span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                {alasan}
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">
                {daftar.slice(0, 6).map((p) => p.kura.name || p.kura.code || p.kura.id).join(", ")}
                {daftar.length > 6 && ` dan ${daftar.length - 6} lainnya`}
              </p>
            </div>
          </div>
        ))}

        {laporan.ragu.length > 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{laporan.ragu.length}</span>{" "}
                <span className="text-muted-foreground">perlu keputusan Anda</span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                Centang sakitnya terisi, statusnya bukan sakit, dan tidak ada catatan
                kesehatan yang menjelaskan mana yang benar.
              </p>
            </div>
          </div>
        )}
      </div>

      {beres && (
        <p className="text-[11px] text-accent flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 flex-shrink-0" />
          Semua kura penandanya sudah selaras. Tidak ada yang perlu dikerjakan.
        </p>
      )}

      {sibuk && (
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">
            Menyelaraskan… <span className="tabular">{sibuk.sudah}/{sibuk.total}</span>
          </span>
          <div className="w-24 bar-track h-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${sibuk.total ? (sibuk.sudah / sibuk.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {hasilAkhir && !sibuk && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            hasilAkhir.gagal.length === 0
              ? "bg-accent/8 border-accent/25 text-accent"
              : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300"
          )}
        >
          {hasilAkhir.berhasil} kura diselaraskan
          {hasilAkhir.gagal.length > 0 && (
            <> · {hasilAkhir.gagal.length} gagal: {hasilAkhir.gagal[0].pesan}</>
          )}
        </div>
      )}

      {laporan.perbaikan.length > 0 && (
        <Button onClick={jalankan} disabled={!!sibuk} className="gap-1.5" size="sm">
          <HeartPulse className="w-3.5 h-3.5" />
          Selaraskan {laporan.perbaikan.length} kura
        </Button>
      )}

      {laporan.ragu.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Perlu keputusan Anda
          </p>
          {laporan.ragu.map(({ kura }) => (
            <div
              key={kura.id}
              className="flex items-center gap-2 flex-wrap rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {kura.name || kura.code || kura.id}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Statusnya "{kura.status || "—"}", tapi centang sakitnya terisi.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={satuan === kura.id}
                onClick={() => putuskan(kura, true)}
                className="h-8 text-xs"
              >
                Masih sakit
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={satuan === kura.id}
                onClick={() => putuskan(kura, false)}
                className="h-8 text-xs"
              >
                Tidak sakit
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
