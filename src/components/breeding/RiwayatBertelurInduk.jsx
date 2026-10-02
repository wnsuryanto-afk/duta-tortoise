import { Egg } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ringkasProduksi } from "@/lib/hasilInkubasi";
import { terakhirBertelur } from "@/lib/cariInduk";

/**
 * Ringkasan riwayat bertelur untuk hasil pencarian induk.
 *
 * Dipisahkan dari BreedingAndEggs.jsx bukan demi kerapian: halaman itu sudah
 * 900 baris lebih, dan apa pun yang tinggal di dalamnya tidak bisa diuji
 * sendirian. Sebagai komponen, ia masuk ke daftar kasus render — jadi
 * "apakah ia mau tampil" dan "apakah tulisannya terpotong di layar 360px"
 * dijawab penjaga, bukan dijawab orang yang kebetulan membuka halamannya.
 *
 * @param cari kata yang sedang dicari (untuk pesan kosong)
 * @param indukDicari hasil kelompokkanPerInduk(): [{ kunci, nama, clutch }]
 */
export default function RiwayatBertelurInduk({ cari = "", indukDicari = [] }) {
  if (!cari) return null;

  if (!indukDicari || indukDicari.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Tidak ada catatan bertelur untuk &ldquo;{cari}&rdquo;.{" "}
        {/* Dibedakan dengan sengaja. Dari 89 betina dewasa, hanya delapan yang
            punya catatan bertelur — menyimpulkan "tidak bertelur" dari layar
            kosong akan salah untuk sebagian besarnya. */}
        Belum tentu kuranya tidak bertelur — bisa juga bertelurnya belum pernah dicatat.
      </div>
    );
  }

  return (
    <>
      {indukDicari.map((induk) => {
        const r = ringkasProduksi(induk.clutch);
        const akhir = terakhirBertelur(induk.clutch);
        return (
          <div key={induk.kunci} className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Egg className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-semibold text-sm">{induk.nama}</span>
              <span className="text-xs text-muted-foreground">riwayat bertelur</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-2 text-xs">
              <div className="min-w-0">
                <p className="text-muted-foreground">Clutch</p>
                <p className="font-semibold tabular-nums">{r.totalClutch}×</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Total telur</p>
                <p className="font-semibold tabular-nums">{r.totalTelur}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Menetas</p>
                {/* Angka tanpa penyebutnya menyesatkan: 15 dari 22 yang sudah
                    ada hasilnya tidak sama dengan 15 dari 44 yang tercatat. */}
                <p className="font-semibold tabular-nums">
                  {r.clutchAdaHasil === 0 ? (
                    <span className="text-muted-foreground font-normal">belum ada hasil</span>
                  ) : (
                    `${r.totalMenetas}/${r.telurAdaHasil} · ${r.hatchRate.toFixed(0)}%`
                  )}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Terakhir bertelur</p>
                <p className="font-semibold">
                  {akhir.tanggal ? (
                    <>
                      {format(new Date(akhir.tanggal), "d MMM yyyy", { locale: id })}{" "}
                      <span className="font-normal text-muted-foreground">({akhir.hariLalu} hari lalu)</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground font-normal">—</span>
                  )}
                </p>
              </div>
            </div>
            {r.telurMasihDierami > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">
                {r.telurMasihDierami} telur masih dierami — belum ikut dihitung dalam angka menetas.
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
