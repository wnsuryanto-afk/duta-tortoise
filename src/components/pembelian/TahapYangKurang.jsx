import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AlertTriangle, Clock, Wrench, Check, Loader2, ShoppingCart, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import InfoHint from "@/components/ui/info-hint";
import Illustration from "@/components/common/Illustration";
import { nilaiUrgensiStok, gabungRiwayatPemakaian, AMBANG_GAWAT_HARI } from "@/lib/urgensiStok";
import { jalankanMassal, ringkasHasil } from "@/lib/tugasMassal";
import { cn } from "@/lib/utils";

/**
 * TahapYangKurang — tahap pertama alur belanja: apa yang sebenarnya kurang.
 *
 * Sebelumnya pertanyaan ini dijawab tiga halaman terpisah — Harus Dibeli,
 * Prediksi Stok, dan Ringkasan Stok — dan tidak satu pun dari ketiganya
 * bersambung ke tempat barangnya dipesan. Orang membaca daftar di satu layar,
 * lalu mengetik ulang isinya di layar lain.
 *
 * Di sini daftarnya berdiri tepat sebelum tahap "Daftar Belanja", dengan satu
 * tombol yang memindahkannya ke sana. Tidak ada pengetikan ulang.
 *
 * Ukuran "kurang" memakai sisa hari pakai, bukan "stok di bawah minimum".
 * Bedanya nyata: sekarung sekam yang habis tiga hari lagi lebih mendesak
 * daripada sekotak vitamin yang sedikit di bawah minimum tapi cukup sebulan.
 */

const NADA = {
  gawat: {
    label: "Gawat",
    ikon: AlertTriangle,
    wrap: "border-red-200 bg-red-50/60 dark:bg-red-950/25 dark:border-red-900",
    teks: "text-red-700 dark:text-red-300",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
  },
  waspada: {
    label: "Perlu dibeli minggu ini",
    ikon: Clock,
    wrap: "border-amber-200 bg-amber-50/60 dark:bg-amber-950/25 dark:border-amber-900",
    teks: "text-amber-700 dark:text-amber-300",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  },
  rusak: {
    label: "Rusak, perlu diganti",
    ikon: Wrench,
    wrap: "border-border bg-muted/40",
    teks: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
  },
};

export default function TahapYangKurang({ onSelesai }) {
  const qc = useQueryClient();
  const [dipilih, setDipilih] = useState(() => new Set());
  const [sibuk, setSibuk] = useState(null);

  const { data: warehouse = [], isLoading: wLoad } = useQuery({
    queryKey: ["pembelian-warehouse"],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 300),
  });
  const { data: sopTasks = [] } = useQuery({
    queryKey: ["sop-tasks"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: transaksi = [] } = useQuery({
    queryKey: ["warehouse-transactions"],
    queryFn: () => base44.entities.WarehouseTransaction.list("-created_date", 300),
    staleTime: 5 * 60 * 1000,
  });

  // StockMovement adalah buku pergerakan stok yang sebenarnya — delapan layar
  // menulis ke sana, sementara WarehouseTransaction hanya ditulis satu layar
  // gudang. Perkiraan pemakaian dulu membaca yang kedua saja.
  const { data: pergerakan = [] } = useQuery({
    queryKey: ["stock-movements", "-date", 500],
    queryFn: () => base44.entities.StockMovement.list("-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: shopping = [] } = useQuery({
    queryKey: ["pembelian-shopping"],
    queryFn: () => base44.entities.ShoppingList.list("-priority", 300),
  });

  // Nama yang sudah menunggu di daftar belanja — supaya tidak ditawarkan dua kali
  const sudahDidaftar = useMemo(() => {
    const s = new Set();
    shopping
      .filter((x) => x.status === "belum_dibeli")
      .forEach((x) => s.add(String(x.nama_barang || "").trim().toLowerCase()));
    return s;
  }, [shopping]);

  const baris = useMemo(() => {
    const dinilai = nilaiUrgensiStok(warehouse, gabungRiwayatPemakaian(pergerakan, transaksi), sopTasks);
    const hasil = [];

    dinilai.forEach((i) => {
      if (i.tingkat === "aman") return;
      hasil.push({ ...i, nada: i.tingkat });
    });

    // Barang yang ditandai rusak perlu diganti berapa pun sisa stoknya —
    // penilaian sisa hari tidak menangkap ini.
    const sudahAda = new Set(hasil.map((i) => i.id));
    warehouse
      .filter((w) => w.needs_replacement === true && !sudahAda.has(w.id))
      .forEach((w) => hasil.push({ ...w, nada: "rusak", alasan: "ditandai rusak" }));

    return hasil.map((i) => ({
      ...i,
      terdaftar: sudahDidaftar.has(String(i.name || "").trim().toLowerCase()),
    }));
  }, [warehouse, transaksi, sopTasks, sudahDidaftar]);

  const bisaDipilih = baris.filter((i) => !i.terdaftar);
  const terdaftarCount = baris.length - bisaDipilih.length;

  const kelompok = useMemo(
    () => ["gawat", "waspada", "rusak"].map((n) => ({ nada: n, isi: baris.filter((i) => i.nada === n) })).filter((g) => g.isi.length),
    [baris]
  );

  const toggle = (id) =>
    setDipilih((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const pilihSemua = (daftar) => {
    setDipilih((p) => {
      const n = new Set(p);
      const semuaTerpilih = daftar.every((i) => n.has(i.id));
      daftar.forEach((i) => (semuaTerpilih ? n.delete(i.id) : n.add(i.id)));
      return n;
    });
  };

  const tambahKeDaftar = async () => {
    const target = bisaDipilih.filter((i) => dipilih.has(i.id));
    if (target.length === 0 || sibuk) return;
    setSibuk({ sudah: 0, total: target.length });

    const hasil = await jalankanMassal(
      target,
      (i) =>
        base44.entities.ShoppingList.create({
          nama_barang: i.name,
          jumlah: Math.max(1, i.minimum_stock || 1),
          satuan: i.unit || "",
          // Hanya yang gawat yang berhak menyandang "segera" — kalau semuanya
          // segera, urutan prioritas di tahap berikutnya kehilangan artinya.
          priority: i.nada === "gawat" ? "segera" : "minggu_ini",
          status: "belum_dibeli",
          // Baris ini memang lahir dari sebuah barang gudang, jadi id-nya
          // disimpan. Penerimaan barang bisa mencocokkannya tanpa menebak
          // dari nama — nama yang beda satu spasi membuatnya membuat barang
          // gudang baru, bukan menambah stok yang lama.
          warehouse_item_id: i.id || undefined,
          item_sku: i.sku || undefined,
          notes: `Dari tahap "Yang Kurang" — ${i.alasan}.`,
        }),
      { serentak: 4, onKemajuan: (sudah, total) => setSibuk({ sudah, total }) }
    );

    setSibuk(null);
    setDipilih(new Set());
    qc.invalidateQueries({ queryKey: ["pembelian-shopping"] });
    qc.invalidateQueries({ queryKey: ["shopping-list-belum"] });

    const { nada, teks } = ringkasHasil(hasil, "barang");
    if (nada === "berhasil") {
      toast.success(`${teks} Lanjut ke tahap Daftar Belanja.`);
      onSelesai?.();
    } else if (nada === "gagal") {
      toast.error(teks);
    } else {
      toast.warning(teks);
    }
  };

  if (wLoad) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  if (baris.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <Illustration name="warehouse" size="md" className="animate-float" />
        <p className="font-heading font-semibold text-foreground mt-2">Tidak ada yang perlu dibeli</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Semua barang stoknya masih cukup, tidak ada yang menghentikan SOP, dan tidak ada
          yang ditandai rusak.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-lg">
          Dihitung dari <strong>sisa hari pakai</strong>, bukan sekadar stok di bawah minimum.
          <InfoHint title="Bagaimana dihitungnya" variant="info" size={13} className="ml-1">
            Rata-rata pemakaian 30 hari terakhir dibagi ke stok yang tersisa. Sisa{" "}
            {AMBANG_GAWAT_HARI} hari atau kurang, atau barang yang menghentikan SOP,
            masuk kelompok gawat. Barang tanpa riwayat pemakaian tidak ditebak gawat.
          </InfoHint>
        </p>
        {terdaftarCount > 0 && (
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5 text-accent" />
            {terdaftarCount} sudah ada di daftar belanja
          </span>
        )}
      </div>

      {kelompok.map(({ nada, isi }) => {
        const n = NADA[nada];
        const Ikon = n.ikon;
        const dapatDipilih = isi.filter((i) => !i.terdaftar);
        const semuaTerpilih = dapatDipilih.length > 0 && dapatDipilih.every((i) => dipilih.has(i.id));

        return (
          <div key={nada} className={cn("rounded-xl border overflow-hidden", n.wrap)}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-inherit">
              <Ikon className={cn("w-4 h-4 flex-shrink-0", n.teks)} />
              <span className={cn("text-xs font-bold", n.teks)}>{n.label}</span>
              <span className={cn("badge-pill text-[10px] px-2 tabular", n.chip)}>{isi.length}</span>
              {dapatDipilih.length > 0 && (
                <button
                  onClick={() => pilihSemua(dapatDipilih)}
                  className="ml-auto text-[11px] font-semibold text-primary hover:underline"
                >
                  {semuaTerpilih ? "Batalkan pilihan" : `Pilih ${dapatDipilih.length}`}
                </button>
              )}
            </div>

            <ul className="divide-y divide-border/60">
              {isi.map((i) => (
                <li
                  key={i.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5",
                    i.terdaftar && "opacity-55"
                  )}
                >
                  {i.terdaftar ? (
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  ) : (
                    <Checkbox
                      checked={dipilih.has(i.id)}
                      onCheckedChange={() => toggle(i.id)}
                      aria-label={`Pilih ${i.name}`}
                      className="flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{i.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {i.alasan}
                      {i.unit ? ` · stok ${i.current_stock ?? 0} ${i.unit}` : ""}
                      {i.terdaftar && " · sudah di daftar belanja"}
                    </p>
                  </div>
                  {i.menguncSOP && (
                    <span className="badge-pill text-[10px] px-2 bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 flex-shrink-0">
                      SOP
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* Bilah aksi — menempel di bawah supaya tetap terjangkau pada daftar panjang */}
      {(dipilih.size > 0 || sibuk) && (
        <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-xl border border-border surface-glass p-3 shadow-modal">
          {sibuk ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">
                Menambahkan… <span className="tabular">{sibuk.sudah}/{sibuk.total}</span>
              </span>
              <div className="w-24 bar-track h-2">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${sibuk.total ? (sibuk.sudah / sibuk.total) * 100 : 0}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground flex-1">
                <strong className="text-foreground tabular">{dipilih.size}</strong> barang dipilih
              </span>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDipilih(new Set())}>
                Batal
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={tambahKeDaftar}>
                <ShoppingCart className="w-3.5 h-3.5" />
                Tambah ke daftar belanja
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
