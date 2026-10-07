/**
 * BayarInisiatifSurut — tombol sekali pakai untuk membayar poin Inisiatif yang
 * berhenti dibayar pada 28 Juli 2026.
 *
 * ── Kenapa ada layarnya, bukan dijalankan diam-diam ────────────────────────
 *
 * Yang dikerjakan fungsi di belakang tombol ini menaikkan `approved_points`
 * pada checklist yang SUDAH disetujui — dengan kata lain, ia mengubah angka
 * yang dibayarkan. Perubahan seperti itu tidak boleh terjadi tanpa seseorang
 * melihat dulu apa yang akan berubah, lalu memilih untuk melakukannya.
 *
 * Karena itu dua langkah, dan yang pertama tidak menulis apa pun:
 *
 *   1. "Lihat dulu" menjalankan fungsinya dalam mode kering dan menampilkan
 *      laporan lengkapnya — berapa catatan, berapa poin per orang per bulan,
 *      mana yang tidak dibayar dan kenapa;
 *   2. "Bayarkan sekarang" baru menulis, dan hanya bisa ditekan sesudah
 *      laporan kering dilihat.
 *
 * Aman dijalankan dua kali: fungsinya hanya mengambil catatan yang
 * `approval_status`-nya masih "pending", jadi yang sudah dibayar tidak
 * terambil lagi.
 */
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Coins, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { rupiah } from "@/lib/rupiah";

export default function BayarInisiatifSurut() {
  const [memuat, setMemuat] = useState("");
  const [kering, setKering] = useState(null);
  const [hasil, setHasil] = useState(null);

  const jalankan = async (modeKering) => {
    setMemuat(modeKering ? "kering" : "tulis");
    try {
      const jawab = await base44.functions.invoke("bayarInisiatifSurut", { kering: modeKering });
      const data = jawab?.data;
      if (!data?.ok) throw new Error(data?.error || "Fungsi menjawab tanpa hasil");
      if (modeKering) {
        setKering(data);
        setHasil(null);
        toast.success(`Laporan kering siap — ${data.catatan.dibayar} catatan akan dibayar`);
      } else {
        setHasil(data);
        toast.success(`Selesai — ${data.catatan.dibayar} catatan dibayar`);
      }
    } catch (e) {
      toast.error(`Gagal: ${e?.message || e}`);
    } finally {
      setMemuat("");
    }
  };

  const tampil = hasil || kering;
  const nilaiPoin = 50; // Rp per poin; hanya untuk perkiraan di layar

  return (
    <Card className="border-amber-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-600" />
          Bayar poin Inisiatif surut
        </CardTitle>
        <CardDescription>
          Sampai 27 Juli 2026 setiap Inisiatif masuk bernilai 5 poin dan dibayar. Pada 28 Juli
          satu baris kode berubah dan nilainya menjadi nol — 210 catatan sejak hari itu dibayar
          nol, bukan karena keputusan siapa pun. Tombol ini menilainya 5 poin, tarif yang dulu
          berlaku, dengan batas harian tetap dihormati dan pekerjaan yang sudah berpoin di
          checklist tidak dibayar dua kali.
          <br />
          <span className="block mt-1.5">
            Hanya <strong>28 Juli – 6 Oktober 2026</strong>. Catatan sejak 7 Oktober Anda nilai
            sendiri di layar Inisiatif yang sekarang berfungsi — dan empat pekerjaan yang paling
            sering dicatat sebagai Inisiatif sudah punya barisnya sendiri di checklist sejak hari
            itu, jadi membayarnya di sini berarti membayarnya dua kali.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => jalankan(true)}
            disabled={!!memuat}
            className="gap-2 whitespace-normal h-auto py-2"
          >
            {memuat === "kering" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Lihat dulu (tidak menulis)
          </Button>
          <Button
            onClick={() => jalankan(false)}
            disabled={!!memuat || !kering || !!hasil}
            className="gap-2 bg-amber-700 hover:bg-amber-800 whitespace-normal h-auto py-2"
          >
            {memuat === "tulis" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            Bayarkan sekarang
          </Button>
        </div>

        {!kering && !hasil && (
          <p className="text-xs text-muted-foreground">
            Tekan “Lihat dulu” lebih dahulu. Tombol bayar baru hidup sesudah laporannya terlihat.
          </p>
        )}

        {tampil && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2 text-sm">
            <p className="font-semibold">
              {tampil.kering ? "Laporan kering — belum ada yang ditulis" : "Sudah ditulis"}
            </p>
            <ul className="text-xs space-y-1">
              <li>
                {tampil.catatan.diperiksa} catatan diperiksa, {tampil.dari} sampai {tampil.sampai}
              </li>
              <li><strong>{tampil.catatan.dibayar} dibayar</strong> @ {tampil.poinSatuan} poin</li>
              {tampil.catatan.terpotongKuota > 0 && (
                <li>{tampil.catatan.terpotongKuota} terpotong batas harian {tampil.maksHarian} poin</li>
              )}
              {tampil.catatan.nolKarenaSudahDibayar > 0 && (
                <li>{tampil.catatan.nolKarenaSudahDibayar} dinilai nol — judulnya sudah berpoin di checklist hari itu</li>
              )}
              {tampil.catatan.nolKarenaKuota > 0 && (
                <li>{tampil.catatan.nolKarenaKuota} dinilai nol — kuota harian sudah habis</li>
              )}
              <li>
                {tampil.checklist.diubah} checklist diperbarui
                {tampil.checklist.approvedDinaikkan > 0 && `, ${tampil.checklist.approvedDinaikkan} di antaranya sudah disetujui sehingga poin bayarnya dinaikkan`}
              </li>
              {tampil.checklist.tanpaBaris > 0 && (
                <li className="text-amber-700">{tampil.checklist.tanpaBaris} baris tidak ditemukan di checklist — poinnya hanya tercatat pada Inisiatifnya</li>
              )}
              {tampil.checklist.tanpaChecklist > 0 && (
                <li className="text-amber-700">{tampil.checklist.tanpaChecklist} catatan tanpa checklist pada tanggalnya</li>
              )}
            </ul>

            <div className="pt-1">
              <p className="text-xs font-semibold mb-1">Poin per orang per bulan:</p>
              <div className="space-y-0.5">
                {Object.entries(tampil.poinPerOrangPerBulan || {}).map(([email, perBulan]) => (
                  <div key={email} className="text-xs">
                    <span className="font-medium">{email}</span>
                    {Object.entries(perBulan).sort().map(([bulan, poin]) => (
                      <span key={bulan} className="ml-2">
                        {bulan}: <strong>{poin}p</strong> (±{rupiah(poin * nilaiPoin)})
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {(tampil.galat || []).length > 0 && (
              <div className="text-xs text-red-700">
                <p className="font-semibold">{tampil.galat.length} galat saat menulis:</p>
                {tampil.galat.slice(0, 5).map((g, i) => <p key={i}>{g}</p>)}
              </div>
            )}

            {!tampil.kering && (
              <p className="text-xs text-amber-800 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Slip gaji yang sudah dibuat menyimpan angka poinnya sendiri. Buka slip bulan yang
                terkena lalu tekan Update supaya angkanya ikut terbarui.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
