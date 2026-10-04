import { Egg, TrendingUp, TrendingDown } from "lucide-react";
import { rekapTahunan } from "@/lib/rekapTahunan";

/**
 * Jumlah telur per TAHUN — tahun ini di sebelah tahun kemarin.
 *
 * Halaman Statistik selama ini hanya menghitung tahun berjalan, tanpa
 * pembanding. Pertanyaan "tahun ini berapa, tahun kemarin berapa" hanya bisa
 * dijawab dengan menjumlahkan sendiri dari daftar clutch.
 *
 * Tahun tanpa catatan tetap ditampilkan, tetapi dengan kalimatnya sendiri —
 * bukan sebagai "0 telur". Untuk kebun ini 2025 kosong karena aplikasinya
 * belum dipakai (catatan pertama dibuat 17 Mei 2026), bukan karena tidak ada
 * induk yang bertelur.
 */
export default function RekapTahunan({ breedings = [], tahunIni }) {
  const baris = rekapTahunan(breedings, tahunIni ? { tahunIni } : undefined);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Egg className="w-4 h-4 text-primary flex-shrink-0" />
        <h3 className="font-semibold text-sm">Telur per tahun</h3>
      </div>

      <div className="space-y-2">
        {baris.map((t) => (
          <div
            key={t.tahun}
            className={`rounded-xl border p-3 ${t.adaCatatan ? "border-border bg-muted/30" : "border-dashed border-border"}`}
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <span className="font-semibold text-sm tabular-nums">{t.tahun}</span>
              {t.adaCatatan ? (
                <span className="text-2xl font-black tabular-nums text-primary leading-none">
                  {t.telur.toLocaleString("id-ID")}
                  <span className="text-xs font-medium text-muted-foreground ml-1">butir</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Belum ada catatan</span>
              )}
            </div>

            {t.adaCatatan ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="tabular-nums">{t.clutch} clutch</span>
                <span className="tabular-nums">{t.induk} induk</span>
                {t.telurMasihDierami > 0 && (
                  <span className="tabular-nums">{t.telurMasihDierami} masih dierami</span>
                )}
                {/* Tingkat penetasan hanya muncul bila ADA telur yang sudah
                    punya hasil. Menuliskan "0%" untuk tahun yang seluruh
                    telurnya masih dierami akan terbaca sebagai gagal total. */}
                {t.telurAdaHasil > 0 && (
                  <span className="tabular-nums">
                    {t.menetas} menetas dari {t.telurAdaHasil} ({t.hatchRate.toFixed(1)}%)
                  </span>
                )}
                {t.selisihTelur !== null && t.selisihTelur !== 0 && (
                  <span className={`inline-flex items-center gap-1 font-medium ${t.selisihTelur > 0 ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                    {t.selisihTelur > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span className="tabular-nums">
                      {t.selisihTelur > 0 ? "+" : ""}{t.selisihTelur.toLocaleString("id-ID")} dari {t.tahun - 1}
                    </span>
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                Kosong bukan berarti tidak ada yang bertelur — bisa juga pencatatannya belum dimulai.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
