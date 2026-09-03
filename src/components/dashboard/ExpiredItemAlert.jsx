/**
 * ExpiredItemAlert — peringatan barang yang mendekati atau melewati kedaluwarsa.
 *
 * KENAPA DITULIS ULANG (03-09-2026).
 *
 * Versi lama membaca SATU kolom saja: WarehouseItem.expired_date. Pada hari ini
 * seluruh 129 barang gudang berisi null di kolom itu — tidak satu pun terisi.
 * Jadi kartu ini selalu mengembalikan null dan tidak pernah tampil sekali pun
 * sejak dibuat. Peringatan yang tidak pernah bisa bunyi lebih buruk daripada
 * tidak ada peringatan: dari beranda, diamnya terbaca sebagai "tidak ada yang
 * kedaluwarsa".
 *
 * Sementara itu tanggal kedaluwarsa yang SEBENARNYA ada di tempat lain —
 * BatchBarang.tanggal_expired, per botol, karena satu jenis barang bisa dibeli
 * berkali-kali dengan tanggal berbeda. Kolom di WarehouseItem hanya masuk akal
 * kalau satu barang cuma punya satu tanggal, dan itu tidak pernah benar di sini.
 *
 * Sekarang kartu ini membaca batch, memakai aturan kedaluwarsa efektif di
 * lib/kedaluwarsaBatch.js — yang lebih dulu tiba antara tanggal cetak kemasan
 * dan (tanggal botol dibuka + masa pakainya). Untuk botol multi-dosis seperti
 * INJEKVIT B PLEX 100 dosis, tanggal cetak bisa terlihat aman berbulan-bulan
 * setelah isinya tidak layak.
 */

import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { statusKedaluwarsaBatch, HARI_PERINGATAN_BATCH } from "@/lib/kedaluwarsaBatch";

export default function ExpiredItemAlert() {
  const { data: items = [] } = useQuery({
    queryKey: ["warehouse-items", "-name", 500],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 500),
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["batch-barang", "aktif", 500],
    queryFn: () => base44.entities.BatchBarang.filter({ status: "aktif" }, "-tanggal_terima", 500),
  });

  const barangById = new Map(items.map((i) => [String(i.id), i]));

  // Batch yang sudah habis isinya tidak perlu diperingatkan — tidak ada yang
  // bisa terpakai darinya.
  const perlu = batches
    .filter((b) => Number(b.jumlah_sisa) > 0)
    .map((b) => {
      const item = barangById.get(String(b.item_id)) || null;
      return { batch: b, item, st: statusKedaluwarsaBatch(b, item) };
    })
    .filter((x) => x.st.keadaan === "lewat" || x.st.keadaan === "segera")
    .sort((a, b) => a.st.sisaHari - b.st.sisaHari);

  if (perlu.length === 0) return null;

  const lewat = perlu.filter((x) => x.st.keadaan === "lewat").length;

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4" />
          Kedaluwarsa ({perlu.length}{lewat > 0 ? ` — ${lewat} sudah lewat` : ""})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {perlu.slice(0, 8).map(({ batch, item, st }) => {
          const sudah = st.keadaan === "lewat";
          return (
            <div
              key={batch.id}
              className="flex items-center justify-between gap-2 py-1 border-b border-red-100 dark:border-red-900/60 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item?.name || batch.nama_barang || batch.batch_code}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Sisa {batch.jumlah_sisa} {batch.satuan || item?.unit || ""}
                    {/* Kenapa tanggalnya segitu HARUS ikut tertulis: kalau botol
                        bertanggal cetak 2027 ditolak aplikasi tanpa penjelasan,
                        orang akan menganggap aplikasinya rusak lalu memakainya. */}
                    {st.sebab === "buka" && " · dihitung dari tanggal botol dibuka"}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge className={sudah ? "bg-red-600 text-white" : "bg-amber-100 text-amber-700"}>
                  {sudah ? `Lewat ${Math.abs(st.sisaHari)}h` : `${st.sisaHari} hari lagi`}
                </Badge>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(st.tanggal, "d MMM yyyy", { locale: id })}
                </p>
              </div>
            </div>
          );
        })}

        {perlu.length > 8 && (
          <p className="text-xs text-muted-foreground pt-1">
            …dan {perlu.length - 8} batch lain — buka menu Stok
          </p>
        )}

        <p className="text-[11px] text-muted-foreground pt-1 border-t border-red-100 dark:border-red-900/60">
          Diperingatkan {HARI_PERINGATAN_BATCH} hari sebelum jatuh tempo. Batch tanpa tanggal
          kedaluwarsa tidak muncul di sini — bukan karena aman, melainkan karena tanggalnya
          belum diisi.
        </p>
      </CardContent>
    </Card>
  );
}
