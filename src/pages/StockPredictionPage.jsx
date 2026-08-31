import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Package, Leaf, Clock } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { hitungSisaHari, gabungRiwayatPemakaian, tingkatUrgensi, adalahPemakaian, AMBANG_GAWAT_HARI } from "@/lib/urgensiStok";
import { dilacak } from "@/lib/stokMenipis";

/**
 * Halaman ini dulu menghitung sendiri siapa yang "kritis": `sisaHari < 7`.
 * Karena hitungSisaHari mengembalikan -1 untuk stok kosong, SETIAP barang
 * berstok nol lolos saringan itu — termasuk gelas ukur, pinset, dan termometer
 * yang tidak dipakai habis dan memang tidak distok. Hasilnya spanduk merah
 * "41 item kritis (stok < 7 hari)" yang isinya sebagian besar bukan masalah,
 * dan yang tidak bisa dipadamkan dengan bekerja — jadi lama-lama tidak dibaca.
 *
 * Sekarang penilaiannya diserahkan ke tingkatUrgensi() di lib/urgensiStok.js,
 * aturan yang sama dengan beranda dan daftar belanja. Stok kosong hanya gawat
 * bila barangnya ditandai wajib distok.
 */
function urgencyLabel(days, tingkat) {
  if (days === null || days === Infinity) return { label: "—", color: "text-muted-foreground bg-muted border-border", icon: null };
  if (days < 0 && tingkat !== "gawat") return { label: "Kosong — tidak wajib distok", color: "text-muted-foreground bg-muted border-border", icon: "⚪" };
  if (days < 0) return { label: "Stok Habis!", color: "text-red-700 bg-red-100 border-red-200", icon: "🚨" };
  if (days <= AMBANG_GAWAT_HARI) return { label: `${Math.round(days)} hari — Segera Restock!`, color: "text-red-700 bg-red-100 border-red-200", icon: "🔴" };
  if (days < 7) return { label: `${Math.round(days)} hari — Perlu Dipesan`, color: "text-amber-700 bg-amber-100 border-amber-200", icon: "🟠" };
  if (days < 14) return { label: `${Math.round(days)} hari — Perhatian`, color: "text-amber-700 bg-amber-100 border-amber-200", icon: "🟡" };
  return { label: `${Math.round(days)} hari — Aman`, color: "text-green-700 bg-green-100 border-green-200", icon: "🟢" };
}

function StockCard({ item, estimatedDays }) {
  const u = urgencyLabel(estimatedDays, item.tingkat);

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{item.name}</h3>
            {item.category && (
              <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 capitalize flex-shrink-0">
                {item.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span>Stok: <strong className="text-foreground">{item.current_stock} {item.unit}</strong></span>
            <span>Min: {item.minimum_stock} {item.unit}</span>
          </div>
        </div>
        <span className={`text-[11px] font-medium border rounded-full px-2.5 py-1 flex-shrink-0 flex items-center gap-1 ${u.color}`}>
          {u.icon && <span>{u.icon}</span>}
          {u.label}
        </span>
      </div>
      {item.supplier && (
        <p className="text-[11px] text-muted-foreground mt-2">Supplier: {item.supplier}</p>
      )}
    </div>
  );
}

export default function StockPredictionPage() {
  const { role } = useCurrentUser();

  const { data: warehouseItems = [], isLoading: wLoading } = useQuery({
    queryKey: ["warehouse-items", "-name", 500],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 500),
  });

  const { data: feedStockItems = [], isLoading: fLoading } = useQuery({
    queryKey: ["feedstocks", "-name", 300],
    queryFn: () => base44.entities.FeedStock.list("-name", 300),
  });

// WarehouseTransaction DIHAPUS dari layar ini 31-08-2026. Tabel itu dibaca tiga
// layar tapi TIDAK ADA satu pun berkas yang menulisnya — buku stok kedua yang
// permanen kosong. Menggabungkannya dengan StockMovement tidak merusak angka,
// tapi membuat tiap layar menunggu satu panggilan jaringan untuk daftar yang
// selalu kosong, dan membuat pembaca kode berikutnya mengira ada dua buku yang
// sama-sama hidup.
  const { data: pergerakan = [] } = useQuery({
    queryKey: ["stock-movements", "-date", 500],
    queryFn: () => base44.entities.StockMovement.list("-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const riwayatPakai = useMemo(
    () => gabungRiwayatPemakaian(pergerakan),
    [pergerakan]
  );

  // Ada berapa baris yang benar-benar berarti "barang keluar"? Kalau nol,
  // halaman ini tidak bisa memprediksi apa pun — dan lebih baik mengatakannya
  // daripada memasang angka yang terlihat seperti hasil hitungan.
  const jumlahPemakaian = useMemo(
    () => riwayatPakai.filter(adalahPemakaian).length,
    [riwayatPakai]
  );

  // Barang yang dinonaktifkan tidak ikut diprediksi. Tanpa saringan ini,
  // 3 barang bertanda [DUPLIKAT - ABAIKAN] dan 9 bahan pakan yang sengaja
  // tidak dilacak tetap muncul sebagai "kritis" — halaman ini menyebut 55 item
  // kritis sementara daftar belanja hanya menyebut 39. Aturan yang sama
  // dipakai seluruh layar stok: lib/stokMenipis.js.
  const warehouseWithDays = useMemo(() =>
    warehouseItems.filter(dilacak).map(i => {
      const estimatedDays = hitungSisaHari(i, riwayatPakai);
      return { ...i, estimatedDays, tingkat: tingkatUrgensi({ sisaHari: estimatedDays, wajib: !!i.is_mandatory }) };
    })
      .sort((a, b) => {
        const da = a.estimatedDays === Infinity ? 9999 : a.estimatedDays;
        const db = b.estimatedDays === Infinity ? 9999 : b.estimatedDays;
        return da - db;
      }),
    [warehouseItems, riwayatPakai]
  );

  const feedWithDays = useMemo(() =>
    feedStockItems.filter(dilacak).map(i => {
      const daily = i.daily_ideal || 0;
      const days = daily > 0 ? i.current_stock / daily : Infinity;
      const estimatedDays = i.current_stock <= 0 ? -1 : days;
      return { ...i, estimatedDays, tingkat: tingkatUrgensi({ sisaHari: estimatedDays, wajib: !!i.is_mandatory }) };
    }).sort((a, b) => {
      const da = a.estimatedDays === Infinity ? 9999 : a.estimatedDays;
      const db = b.estimatedDays === Infinity ? 9999 : b.estimatedDays;
      return da - db;
    }),
    [feedStockItems]
  );

  if (!canAccess(role, "warehouse")) return <AccessDenied />;

  const criticalWarehouse = warehouseWithDays.filter(i => i.tingkat === "gawat");
  const criticalFeed = feedWithDays.filter(i => i.tingkat === "gawat");

  const isLoading = wLoading || fLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" /> Prediksi Stok
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Estimasi waktu habisnya stok berdasarkan pola konsumsi</p>
      </div>

      {/*
        Halaman ini menjanjikan prediksi, dan prediksi butuh catatan pemakaian.
        Selama belum ada satu pun baris "barang keluar", tidak ada pola yang
        bisa dibaca — tiap barang cuma bisa dinilai "masih ada" atau "habis".
        Menyembunyikan kenyataan itu di balik angka hari membuat orang percaya
        pada hitungan yang tidak pernah terjadi.
      */}
      {!isLoading && jumlahPemakaian === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <strong>Belum ada satu pun catatan barang keluar, jadi belum ada yang bisa diprediksi.</strong>{" "}
            Yang tampil di bawah hanya membedakan barang yang masih ada dari yang habis.
            Prediksi baru berjalan setelah pengambilan barang dari gudang mulai dicatat —
            pembelian sudah tercatat rapi, pemakaiannya belum.
          </p>
        </div>
      )}

      {/* Critical alert */}
      {(criticalWarehouse.length > 0 || criticalFeed.length > 0) && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="font-semibold text-red-800">
              {criticalWarehouse.length + criticalFeed.length} barang perlu diputuskan hari ini
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...criticalWarehouse, ...criticalFeed].map(i => (
              <span key={i.id} className="text-xs bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 font-medium">
                🔴 {i.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: "🟢 Aman (>14 hari)", color: "text-green-700 bg-green-50 border-green-200" },
          { label: "🟡 Perhatian (7–14 hari)", color: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: `🔴 Gawat (≤${AMBANG_GAWAT_HARI} hari, atau habis & wajib distok)`, color: "text-red-700 bg-red-50 border-red-200" },
          { label: "⚪ Kosong tapi tidak wajib distok", color: "text-muted-foreground bg-muted border-border" },
        ].map(l => (
          <span key={l.label} className={`px-3 py-1 rounded-full border font-medium ${l.color}`}>{l.label}</span>
        ))}
      </div>

      <Tabs defaultValue="gudang">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gudang" className="gap-1.5">
            <Package className="w-4 h-4" /> Gudang ({warehouseWithDays.length})
          </TabsTrigger>
          <TabsTrigger value="pakan" className="gap-1.5">
            <Leaf className="w-4 h-4" /> Pakan ({feedWithDays.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gudang" className="mt-4 space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />)
          ) : warehouseWithDays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada item gudang</p>
            </div>
          ) : (
            warehouseWithDays.map(i => (
              <StockCard key={i.id} item={i} estimatedDays={i.estimatedDays} type="warehouse" />
            ))
          )}
        </TabsContent>

        <TabsContent value="pakan" className="mt-4 space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />)
          ) : feedWithDays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Leaf className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada data pakan</p>
            </div>
          ) : (
            feedWithDays.map(i => (
              <StockCard key={i.id} item={i} estimatedDays={i.estimatedDays} type="feed" />
            ))
          )}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        💡 Estimasi gudang dihitung dari transaksi keluar 30 hari terakhir. Pakan dihitung dari field "Konsumsi Harian Ideal".
      </p>
    </div>
  );
}