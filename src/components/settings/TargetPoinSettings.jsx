/**
 * TargetPoinSettings — tampilan ringkas nilai & target poin (read-only).
 *
 * Mengedit nilai per poin kini hanya boleh dilakukan di halaman
 * /pengaturan-poin (PengaturanPoinPage) yang punya simulasi dampak.
 * Komponen ini hanya menampilkan nilai saat ini + tautan ke sana,
 * supaya tidak ada dua tempat yang mengedit sumber sekaligus.
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Target, AlertTriangle, ArrowRight } from "lucide-react";
import { useCompanySettings } from "@/lib/useCompanySettings";

function formatRp(val) {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
}

export default function TargetPoinSettings() {
  const settings = useCompanySettings();
  const nilai = Number(settings.nilai_per_poin) || 0;
  const target = Number(settings.min_poin_bulanan) || 0;
  const targetTim = Number(settings.target_poin_tim) || 0;
  const targetBagus = Number(settings.target_poin_bagus) || 0;
  const targetLuarBiasa = Number(settings.target_poin_luar_biasa) || 0;
  const nilaiUnset = nilai === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
          Target & Poin Bulanan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" /> Lantai Poin Pribadi
            </p>
            <p className="text-lg font-bold mt-1 tabular-nums">{target.toLocaleString("id-ID")} poin</p>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-green-600" /> Nilai per Poin
            </p>
            <p className="text-lg font-bold mt-1 text-green-700">{formatRp(nilai)}</p>
          </div>
        </div>

        {nilaiUnset && (
          <div className="flex items-center gap-2 text-xs text-red-700 p-2.5 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Nilai per poin belum diatur. Bonus poin dihitung Rp 0.
          </div>
        )}

        {/* Angka tingkatan ditampilkan apa adanya, tanpa penilaian "terlalu mudah /
            terlalu berat" yang dipatok di kode. Peringatan seperti itu pernah ada
            di sini dan menjadi salah begitu targetnya diubah — nasihat yang basi
            lebih berbahaya daripada tidak ada nasihat, karena tetap terlihat resmi. */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Tingkatan bonus bulanan</p>
          </div>
          <div className="divide-y divide-border text-sm">
            <div className="flex items-baseline justify-between px-3 py-2 gap-3">
              <span>Dasar</span>
              <span className="text-right text-xs text-muted-foreground">
                tim <strong className="text-foreground tabular-nums">{targetTim.toLocaleString("id-ID")}</strong> poin
                {" · "}pribadi minimal <strong className="text-foreground tabular-nums">{target.toLocaleString("id-ID")}</strong>
              </span>
            </div>
            <div className="flex items-baseline justify-between px-3 py-2 gap-3">
              <span>Bagus</span>
              <span className="text-right text-xs text-muted-foreground">
                pribadi <strong className="text-foreground tabular-nums">{targetBagus.toLocaleString("id-ID")}</strong> poin
              </span>
            </div>
            <div className="flex items-baseline justify-between px-3 py-2 gap-3">
              <span>Luar biasa</span>
              <span className="text-right text-xs text-muted-foreground">
                pribadi <strong className="text-foreground tabular-nums">{targetLuarBiasa.toLocaleString("id-ID")}</strong> poin
              </span>
            </div>
          </div>
          <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
            Tingkat Dasar dihitung dari poin seluruh tim, supaya kiper terdorong saling bantu
            alih-alih berebut tugas. Tingkat di atasnya dihitung per orang.
          </p>
        </div>

        <Button asChild variant="outline" className="gap-2 w-full sm:w-auto">
          <Link to="/pengaturan-poin">
            <ArrowRight className="w-4 h-4" /> Buka Pengaturan Poin & Simulasi
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Pengaturan nilai poin & target kini di satu halaman dengan simulasi dampak biaya.
        </p>
      </CardContent>
    </Card>
  );
}