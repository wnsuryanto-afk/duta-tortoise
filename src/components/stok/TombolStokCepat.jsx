import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackagePlus, PackageMinus } from "lucide-react";
import FormPergerakanStok from "@/components/stok/FormPergerakanStok";

/**
 * TombolStokCepat — barang masuk & keluar langsung dari beranda.
 *
 * ── Kenapa ada ─────────────────────────────────────────────────────────────
 *
 * Pemiliknya menyebutnya langsung: keluar-masuk barang terasa sulit. Dan
 * memang begitu keadaannya — diperiksa 2 Okt 2026, ketiga beranda (Owner,
 * Admin, Investor) TIDAK punya satu pun tombol stok. Satu-satunya jalan
 * adalah membuka halaman Stok, pindah ke tab Pergerakan, lalu menekan tambah.
 * Tiga langkah sebelum formulirnya terlihat.
 *
 * Kiper sudah punya jalurnya sendiri sejak lama (AmbilBarangScan di beranda
 * kiper dan kepala feeder), tetapi itu khusus barang KELUAR dan lewat
 * pindaian QR. Yang masuk tidak pernah punya jalan pendek.
 *
 * ── Kenapa memanggil formulir yang sudah ada ──────────────────────────────
 *
 * Formulirnya satu: FormPergerakanStok, yang dipakai juga oleh tab Pergerakan.
 * Menulis dialog baru untuk beranda akan membuat JALUR KEDUA yang menulis
 * StockMovement dan mengubah current_stock — dan dua jalur yang menggerakkan
 * angka yang sama adalah cacat yang sudah berkali-kali ditemukan di aplikasi
 * ini. Yang berbeda cuma tombol mana yang menyala saat dibuka.
 */
export default function TombolStokCepat({ threshold = 500000 }) {
  const [buka, setBuka] = useState(null); // "masuk" | "keluar" | null

  /*
    Daftar barang baru diambil SETELAH tombolnya ditekan (`enabled: !!buka`).
    Dua daftar penuh — 125 barang gudang dan stok pakan — tidak perlu ikut
    membebani setiap pembukaan beranda hanya demi dua tombol yang mungkin
    tidak disentuh hari itu.
  */
  const { data: feedstocks = [] } = useQuery({
    queryKey: ["feedstocks"],
    queryFn: () => base44.entities.FeedStock.list("name", 300),
    enabled: !!buka,
  });
  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => base44.entities.WarehouseItem.list("name", 500),
    enabled: !!buka,
  });

  return (
    <>
      <Card className="p-3">
        <p className="text-xs text-muted-foreground mb-2">Catat pergerakan barang</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 h-11 border-green-300 text-green-800 hover:bg-green-50"
            onClick={() => setBuka("masuk")}
          >
            <PackagePlus className="w-4 h-4 flex-shrink-0" />
            Barang Masuk
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 h-11 border-amber-300 text-amber-800 hover:bg-amber-50"
            onClick={() => setBuka("keluar")}
          >
            <PackageMinus className="w-4 h-4 flex-shrink-0" />
            Barang Keluar
          </Button>
        </div>
      </Card>

      <Dialog open={!!buka} onOpenChange={(v) => !v && setBuka(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {buka === "keluar" ? "Barang Keluar" : "Barang Masuk"}
            </DialogTitle>
          </DialogHeader>
          {buka && (
            <FormPergerakanStok
              feedstocks={feedstocks}
              warehouseItems={warehouseItems}
              threshold={threshold}
              tipeAwal={buka}
              onClose={() => setBuka(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
