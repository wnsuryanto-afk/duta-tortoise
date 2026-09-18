import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  ambilLaporanMakan, catatTidakMakan, catatMakanLagi,
} from "@/lib/laporMakan";
import { laporanTerbukaPerKura, selisihHari } from "@/lib/jadwalTimbang";
import { hariIniWIB } from "@/lib/laporMakan";

/**
 * LaporMakanPanel — tombol "tidak makan" / "sudah makan lagi" di halaman kura.
 *
 * Salah satu dari dua pintu masuk laporan; yang satunya pertanyaan di tugas
 * pakan harian. Dua pintu sengaja: pertanyaan di tugas pakan adalah jaring
 * utama (setiap sesi pakan ditanya), tombol ini untuk laporan sewaktu-waktu —
 * kiper yang kebetulan lewat dan melihat pakan kemarin masih utuh.
 *
 * Laporan yang terbuka menjadi alasan kura ini muncul di tugas timbang besok
 * pagi. Itu sebabnya panel ini menyebutkan akibatnya, bukan hanya menyimpan
 * diam-diam: orang yang tahu apa yang akan terjadi lebih berhati-hati menekan.
 */
export default function LaporMakanPanel({ tortoise }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const { data: laporan = [] } = useQuery({
    queryKey: ["laporan-makan"],
    queryFn: ambilLaporanMakan,
  });
  const terbuka = laporanTerbukaPerKura(laporan).get(tortoise?.id) || null;
  const lama = terbuka ? selisihHari(terbuka.date, hariIniWIB()) : null;

  const segarkan = () => {
    qc.invalidateQueries({ queryKey: ["laporan-makan"] });
    qc.invalidateQueries({ queryKey: ["tugas-timbang"] });
  };

  const lapor = async () => {
    setSibuk(true);
    try {
      const { dibuat } = await catatTidakMakan(tortoise, {
        sumber: "halaman_kura", catatan, user,
      });
      setCatatan("");
      segarkan();
      toast.success(
        dibuat
          ? `Dicatat. ${tortoise.code || tortoise.name} masuk daftar timbang.`
          : "Sudah ada laporan terbuka untuk kura ini.",
      );
    } catch (e) {
      toast.error("Gagal mencatat: " + (e?.message || ""));
    }
    setSibuk(false);
  };

  const tutup = async () => {
    setSibuk(true);
    try {
      await catatMakanLagi(tortoise, { catatan, user });
      setCatatan("");
      segarkan();
      toast.success("Dicatat sudah makan lagi.");
    } catch (e) {
      toast.error("Gagal mencatat: " + (e?.message || ""));
    }
    setSibuk(false);
  };

  if (!tortoise?.id) return null;

  return (
    <div className="rounded-xl border border-border p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-medium">Nafsu makan</p>
      </div>

      {terbuka ? (
        <>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            Dilaporkan tidak makan sejak <strong>{terbuka.date}</strong>
            {lama > 0 ? ` (${lama} hari)` : ""}
            {terbuka.dilaporkan_oleh_nama ? ` oleh ${terbuka.dilaporkan_oleh_nama}` : ""}.
            {terbuka.catatan ? <span className="block mt-1">“{terbuka.catatan}”</span> : null}
            <span className="block mt-1">
              {terbuka.sudah_ditimbang
                ? "Sudah ditimbang sesudah laporan ini."
                : "Kura ini ada di daftar timbang sampai ditimbang."}
            </span>
          </div>
          <Input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan (opsional)"
            className="h-9 text-sm"
          />
          <Button size="sm" className="w-full gap-1.5" onClick={tutup} disabled={sibuk}>
            {sibuk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Sudah makan lagi
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Tekan kalau pakannya tidak disentuh. Kura ini akan masuk daftar timbang
            besok pagi — berat adalah tanda paling awal sebelum kura terlihat sakit.
          </p>
          <Input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="cth: pakan pagi disisakan utuh"
            className="h-9 text-sm"
          />
          <Button
            size="sm" variant="outline"
            className="w-full gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
            onClick={lapor} disabled={sibuk}
          >
            {sibuk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UtensilsCrossed className="w-3.5 h-3.5" />}
            Tidak makan hari ini
          </Button>
        </>
      )}
    </div>
  );
}
