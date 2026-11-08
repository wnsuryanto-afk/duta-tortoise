import { Card } from "@/components/ui/card";
import { Split } from "lucide-react";

/**
 * PanelPakanTerpecah — pakan yang sama tersimpan di lebih dari satu satuan.
 *
 * ── Kenapa ini perlu kelihatan ──────────────────────────────────────────────
 *
 * Per 8 Nov 2026 daftar pakan memuat DUA baris "Pakan Lainnya": 410 kg dan
 * 71,97 keranjang. Yang keranjang lahir 8 Sep 2026 dari cacat yang sudah
 * diperbaiki — PakanHarianForm dulu membuang `feed_type_detail` dan menumpuk
 * Mentimun 64,97 keranjang bersama Waloh 7 keranjang ke satu baris "Pakan
 * Lainnya". Kodenya sudah dibetulkan; barisnya tidak.
 *
 * Selama ia tinggal, tidak ada satu angka pun yang menjawab "berapa pakan
 * lainnya yang kita punya": ada dua, dalam satuan yang tidak bisa dijumlahkan.
 * Dan potongStokPakan mencocokkan lewat SKU, jadi resep yang menunjuk salah
 * satunya tidak akan pernah menyentuh yang lain.
 *
 * ── Kenapa TIDAK digabung otomatis ──────────────────────────────────────────
 *
 * Berapa kilogram satu keranjang hanya diketahui orang yang mengangkatnya.
 * Menebaknya berarti mengarang angka stok — dan angka stok yang dikarang
 * lebih buruk daripada dua angka yang jujur-jujur terpisah. Yang ditawarkan
 * panel ini hanya daftarnya; penggabungannya keputusan orangnya.
 */
export default function PanelPakanTerpecah({ kelompok = [] }) {
  if (!kelompok.length) return null;

  return (
    <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <Split className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200 break-words">
            {kelompok.length} pakan tersimpan di dua satuan
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
            Nama yang sama, satuan berbeda — jadi tidak ada satu angka pun yang
            menjawab berapa stoknya. Gabungkan kalau memang barang yang sama;
            beri nama berbeda kalau memang bukan.
          </p>
          <div className="mt-3 space-y-2">
            {kelompok.map((baris) => (
              <div
                key={baris.map((f) => f.id || f.sku || f.unit).join("|")}
                className="bg-white/70 dark:bg-background/50 rounded-lg p-2.5 border border-amber-200 dark:border-amber-800"
              >
                <p className="text-sm font-semibold text-foreground break-words">
                  {baris[0]?.name}
                </p>
                <div className="mt-1 space-y-0.5">
                  {baris.map((f) => (
                    <p key={f.id || f.sku || f.unit} className="text-[11px] text-muted-foreground break-words">
                      <span className="tabular-nums text-foreground font-medium">
                        {Number(f.current_stock) || 0} {f.unit}
                      </span>
                      {f.sku ? ` · ${f.sku}` : " · tanpa SKU"}
                      {f.is_active === false ? " · nonaktif" : ""}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
