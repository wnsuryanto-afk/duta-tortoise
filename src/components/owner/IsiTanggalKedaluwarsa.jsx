import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CalendarClock, Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InfoHint from "@/components/ui/info-hint";
import { barangTanpaTanggal, HARI_PAKAI_SETELAH_DIBUKA } from "@/lib/kedaluwarsa";

/**
 * IsiTanggalKedaluwarsa — mengisi tanggal kedaluwarsa obat & vitamin sekaligus.
 *
 * Aplikasi ini punya delapan layar peringatan kedaluwarsa dan satu pemindai
 * foto kemasan ber-AI. Kedelapannya diam, karena dari 64 barang obat dan
 * vitamin tidak satu pun punya `expired_date`. Yang kurang bukan alatnya,
 * melainkan satu tempat untuk mengisi tanggalnya tanpa membuka 29 halaman.
 *
 * Layar ini hanya mengisi. Ia tidak menghitung, tidak menghapus, dan tidak
 * mengubah stok. Barang yang tanggalnya sudah ada tidak muncul di sini.
 */
export default function IsiTanggalKedaluwarsa() {
  const qc = useQueryClient();
  const [isian, setIsian] = useState({});
  const [sibuk, setSibuk] = useState(false);
  const [buka, setBuka] = useState(false);

  const { data: gudang = [], isLoading } = useQuery({
    queryKey: ["gudang-tanpa-tanggal"],
    queryFn: () => base44.entities.WarehouseItem.list("-current_stock", 500),
  });

  const antre = useMemo(() => barangTanpaTanggal(gudang), [gudang]);

  const terisi = useMemo(
    () => Object.entries(isian).filter(([, v]) => v?.tanggal),
    [isian],
  );

  const set = (id, kunci, nilai) =>
    setIsian((p) => ({ ...p, [id]: { ...(p[id] || {}), [kunci]: nilai } }));

  const simpan = async () => {
    if (terisi.length === 0) return;
    setSibuk(true);
    let berhasil = 0;
    const gagal = [];

    for (const [id, nilai] of terisi) {
      const patch = { expired_date: nilai.tanggal };
      // Botol terbuka hanya ikut tersimpan bila memang diisi — mengisi nol ke
      // barang yang bukan multi-dosis hanya menambah data yang tidak berarti.
      if (Number(nilai.botolTerbuka || 0) > 0) {
        patch.botol_terbuka = Number(nilai.botolTerbuka);
        patch.tanggal_botol_dibuka = nilai.tanggalDibuka || null;
        patch.hari_pakai_setelah_dibuka =
          Number(nilai.hariPakai || 0) > 0
            ? Number(nilai.hariPakai)
            : HARI_PAKAI_SETELAH_DIBUKA;
      }
      try {
        await base44.entities.WarehouseItem.update(id, patch);
        berhasil++;
      } catch (e) {
        const nama = antre.find((x) => x.id === id)?.name || id;
        gagal.push(`${nama}: ${e?.message || "gagal"}`);
      }
    }

    // Kegagalan sebagian dilaporkan apa adanya. Menyembunyikannya di sini
    // berarti pemilik mengira tanggalnya sudah tersimpan padahal belum, lalu
    // percaya pada peringatan yang tetap tidak akan menyala.
    if (berhasil > 0) {
      toast.success(`${berhasil} tanggal tersimpan`);
      setIsian({});
      qc.invalidateQueries({ queryKey: ["gudang-tanpa-tanggal"] });
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    }
    if (gagal.length > 0) toast.error(`${gagal.length} gagal — ${gagal[0]}`);
    setSibuk(false);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa tanggal kedaluwarsa…
      </div>
    );
  }

  if (antre.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Tanggal kedaluwarsa lengkap</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Semua obat &amp; vitamin yang ada stoknya sudah punya tanggal. Peringatan
            kedaluwarsa di beranda dan Dashboard Stok bekerja dengan sendirinya.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setBuka((b) => !b)}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/40 transition-colors"
      >
        <CalendarClock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            Isi Tanggal Kedaluwarsa
            <InfoHint>
              Aplikasi punya delapan layar peringatan kedaluwarsa, tetapi semuanya diam
              selama tanggalnya belum diisi. Di layar Barang Datang ada pemindai foto
              kemasan yang bisa membaca tanggal secara otomatis — layar ini untuk stok
              yang sudah terlanjur ada di gudang.
            </InfoHint>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <strong className="text-amber-700 dark:text-amber-500">{antre.length} obat &amp; vitamin</strong>{" "}
            punya stok tetapi belum punya tanggal kedaluwarsa. Selama kosong, tidak ada
            satu pun peringatan yang bisa menyala.
          </p>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">{buka ? "Tutup" : "Buka"}</span>
      </button>

      {buka && (
        <div className="border-t border-border">
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-border flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Urut dari stok terbanyak — di situlah kerugian terbesar bila terlewat.
              Kolom <strong>botol terbuka</strong> hanya untuk obat suntik multi-dosis:
              yang menua adalah botolnya, bukan dosisnya. Botol yang sudah ditusuk
              biasanya hanya aman {HARI_PAKAI_SETELAH_DIBUKA} hari meski dosisnya masih
              banyak. Kosongkan bila tidak berlaku.
            </p>
          </div>

          <div className="max-h-[28rem] overflow-y-auto divide-y divide-border">
            {antre.map((item) => {
              const nilai = isian[item.id] || {};
              return (
                <div key={item.id} className="p-3.5">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                      {item.sku ? `${item.sku} · ` : ""}stok {item.current_stock} {item.unit}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Kedaluwarsa kemasan</Label>
                      <Input
                        type="date"
                        value={nilai.tanggal || ""}
                        onChange={(e) => set(item.id, "tanggal", e.target.value)}
                        className="mt-0.5 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Botol terbuka</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={nilai.botolTerbuka ?? ""}
                        onChange={(e) => set(item.id, "botolTerbuka", e.target.value)}
                        className="mt-0.5 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Tanggal dibuka</Label>
                      <Input
                        type="date"
                        disabled={Number(nilai.botolTerbuka || 0) <= 0}
                        value={nilai.tanggalDibuka || ""}
                        onChange={(e) => set(item.id, "tanggalDibuka", e.target.value)}
                        className="mt-0.5 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        Aman berapa hari
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        disabled={Number(nilai.botolTerbuka || 0) <= 0}
                        placeholder={String(HARI_PAKAI_SETELAH_DIBUKA)}
                        value={nilai.hariPakai ?? ""}
                        onChange={(e) => set(item.id, "hariPakai", e.target.value)}
                        className="mt-0.5 h-9"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-border flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {terisi.length === 0
                ? "Isi minimal satu tanggal untuk menyimpan."
                : `${terisi.length} dari ${antre.length} siap disimpan.`}
            </p>
            <Button onClick={simpan} disabled={sibuk || terisi.length === 0} size="sm">
              {sibuk ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {sibuk ? "Menyimpan…" : `Simpan ${terisi.length || ""} tanggal`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
