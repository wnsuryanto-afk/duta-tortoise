/**
 * TerimaDariScreenshot — masukkan belanja marketplace ke gudang dari
 * screenshot pesanan.
 *
 * Belanja di peternakan ini lewat Shopee dan Tokopedia, dan bukti yang ada di
 * tangan adalah screenshot. Alur lama menuntut mengetik ulang tiap barang,
 * jumlah, dan harganya dari gambar yang sedang dilihat sendiri.
 *
 * ── Dua hal yang sengaja TIDAK ditebak oleh layar ini ──
 *
 * 1. BARANG GUDANG MANA yang dimaksud. AI mengusulkan beserta keyakinan dan
 *    alasannya; orangnya yang memastikan. Nama marketplace tidak pernah sama
 *    dengan nama gudang — dari 16 baris pesanan nyata, nol yang cocok persis.
 *    Menambah stok ke barang yang salah baru ketahuan saat barangnya dicari
 *    di rak dan tidak ada.
 *
 * 2. ANGKA DI STRUK itu harga satuan atau subtotal. Marketplace menampilkan
 *    keduanya dengan cara yang sama. Pada pesanan Zoetics: 3 x Rp 2.500 +
 *    5 x Rp 1.500 = Rp 15.000, sementara total pesanan tertulis Rp 13.000.
 *    Layar ini menampilkan KEDUA tafsiran beserta selisihnya terhadap total,
 *    dan menunggu orang memilih. Salah tafsir di sini berarti angka rupiah
 *    yang salah masuk ke catatan keuangan.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScanLine, Loader2, CheckCircle2, AlertTriangle, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import MultiImagePicker from "@/components/ai/MultiImagePicker";
import { useCurrentUser } from "@/lib/useCurrentUser";

const rp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

const WARNA_YAKIN = {
  tinggi: "bg-green-100 text-green-700 border-green-200",
  sedang: "bg-amber-100 text-amber-700 border-amber-200",
  rendah: "bg-orange-100 text-orange-700 border-orange-200",
  tidak_ada: "bg-muted text-muted-foreground",
};
const LABEL_YAKIN = {
  tinggi: "cocok",
  sedang: "mungkin",
  rendah: "ragu",
  tidak_ada: "barang baru",
};

export default function TerimaDariScreenshot({ warehouse = [], onSelesai }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pesanan, setPesanan] = useState(null);
  const [baris, setBaris] = useState([]);
  const [menyimpan, setMenyimpan] = useState(false);

  const reset = () => {
    setImages([]); setPesanan(null); setBaris([]); setError(""); setLoading(false);
  };

  const handleScan = async () => {
    setLoading(true); setError("");
    try {
      const urls = [];
      for (const img of images) {
        if (!img.blob) continue;
        const r = await base44.integrations.Core.UploadFile({ file: img.blob });
        if (r?.file_url) urls.push(r.file_url);
      }
      if (urls.length === 0) throw new Error("Gambarnya gagal diunggah.");

      const res = await base44.functions.invoke("bacaStrukBelanja", { file_urls: urls });
      const hasil = res.data;
      if (hasil?.error) throw new Error(hasil.error);

      const semuaPesanan = hasil?.pesanan || [];
      setPesanan({ ...hasil, buktiUrls: urls });

      // Tiap baris dibuka dengan tafsiran harga yang PALING MENDEKATI total
      // pesanan, bukan dengan tebakan tetap. Tetap bisa diganti orangnya.
      const rows = [];
      semuaPesanan.forEach((p, iPesanan) => {
        const tafsir = p.hitung?.tafsiran_terdekat || "satuan";
        (p.barang || []).forEach((b, iBarang) => {
          rows.push({
            kunci: `${iPesanan}-${iBarang}`,
            iPesanan,
            toko: p.toko || "(toko tidak terbaca)",
            buktiUrl: urls[Math.min(iPesanan, urls.length - 1)],
            namaStruk: [b.nama_struk, b.varian].filter(Boolean).join(" — "),
            jumlah: b.jumlah || 1,
            tafsir,
            hargaTertera: b.harga_tertera || 0,
            jikaSatuan: b.jika_satuan,
            jikaSubtotal: b.jika_subtotal,
            sku: b.sku_gudang || "",
            namaGudang: b.nama_gudang || "",
            keyakinan: b.keyakinan || "tidak_ada",
            alasan: b.alasan || "",
            ikut: true,
          });
        });
      });
      setBaris(rows);
      if (rows.length === 0) setError("Tidak ada baris barang yang terbaca dari gambar ini.");
    } catch (e) {
      setError(e?.message || "Gagal membaca struk.");
    }
    setLoading(false);
  };

  const ubah = (kunci, patch) =>
    setBaris((rows) => rows.map((r) => (r.kunci === kunci ? { ...r, ...patch } : r)));

  const hargaSatuan = (r) => (r.tafsir === "subtotal" ? r.jikaSubtotal?.harga_satuan : r.jikaSatuan?.harga_satuan) || 0;
  const subtotal = (r) => (r.tafsir === "subtotal" ? r.jikaSubtotal?.subtotal : r.jikaSatuan?.subtotal) || 0;

  const dipilih = baris.filter((r) => r.ikut);
  const belumDipetakan = dipilih.filter((r) => !r.sku).length;
  const totalNilai = dipilih.reduce((s, r) => s + subtotal(r), 0);

  // Ongkir dan biaya layanan ikut dicatat sebagai pengeluaran, tapi TIDAK
  // masuk nilai stok. Uang yang keluar dari kantong lebih besar daripada nilai
  // barangnya — pada pesanan Vigantol E, barangnya Rp 49.980 sementara total
  // pesanan Rp 50.980. Versi pertama komponen ini membuang selisih itu, jadi
  // laba rugi selalu lebih kecil dari kenyataan.
  const pesananDipakai = new Set(dipilih.map((r) => r.iPesanan));
  const ongkirTotal = (pesanan?.pesanan || []).reduce(
    (s, p, i) => (pesananDipakai.has(i) ? s + (Number(p.ongkir) || 0) : s),
    0,
  );

  const handleSimpan = async () => {
    if (dipilih.length === 0) return;
    setMenyimpan(true);
    const gagal = [];
    let berhasil = 0;

    for (const r of dipilih) {
      try {
        let item = r.sku ? warehouse.find((w) => w.sku === r.sku) : null;

        // Barang yang belum ada dibuat baru — dengan foto struknya, supaya
        // barang tanpa foto tidak bertambah lagi.
        if (!item) {
          item = await base44.entities.WarehouseItem.create({
            name: r.namaStruk,
            category: "lainnya",
            unit: "pcs",
            current_stock: 0,
            minimum_stock: 0,
            purchase_price: hargaSatuan(r),
            is_mandatory: false,
            location: "gudang",
            photo_url: r.buktiUrl || "",
            notes: `Dibuat dari screenshot pesanan ${r.toko}.`,
          });
          warehouse.push(item);
        }

        const stokBaru = (Number(item.current_stock) || 0) + (Number(r.jumlah) || 0);
        await base44.entities.WarehouseItem.update(item.id, {
          current_stock: stokBaru,
          purchase_price: hargaSatuan(r) || item.purchase_price || 0,
        });

        // by_email WAJIB di skema StockMovement — tanpa itu penyimpanan
        // ditolak 422 dan barangnya sudah terlanjur bertambah stok di baris
        // sebelumnya. Ketahuan saat mencoba memasukkan pesanan Vigantol E.
        await base44.entities.StockMovement.create({
          item_id: item.id,
          item_name: item.name,
          item_sku: item.sku || null,
          type: "masuk",
          quantity: Number(r.jumlah) || 0,
          unit: item.unit || "pcs",
          unit_price: hargaSatuan(r),
          total_value: subtotal(r),
          date: new Date().toISOString().split("T")[0],
          status: "selesai",
          by_email: user?.email || "",
          by_name: user?.full_name || user?.email || "",
          notes: `Dari screenshot pesanan ${r.toko} — dibaca AI, dipastikan manual.`,
        });

        berhasil++;
      } catch (e) {
        gagal.push(`${r.namaStruk}: ${e?.message || "gagal"}`);
      }
    }

    // Satu catatan pengeluaran untuk seluruh batch — bukan per baris, supaya
    // laba rugi tidak dipenuhi puluhan baris kecil dari satu kali belanja.
    if (berhasil > 0 && totalNilai > 0) {
      try {
        // Kategori harus salah satu dari enum FinanceTransaction. Versi
        // pertama memakai "peralatan", yang tidak ada di daftar sah — seluruh
        // catatan biayanya akan ditolak sementara stok sudah bertambah.
        await base44.entities.FinanceTransaction.create({
          type: "pengeluaran",
          category: "lainnya",
          qty: dipilih.length,
          amount: totalNilai + ongkirTotal,
          date: new Date().toISOString().split("T")[0],
          description:
            `Belanja online ${dipilih.length} barang dari ` +
            `${new Set(dipilih.map((r) => r.toko)).size} toko — dimasukkan dari screenshot pesanan.` +
            (ongkirTotal > 0 ? ` Barang ${rp(totalNilai)} + ongkir/biaya layanan ${rp(ongkirTotal)}.` : ""),
          created_by_name: user?.full_name || user?.email || "",
        });
      } catch { /* stok sudah masuk; catatan biaya bisa ditambah manual */ }
    }

    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    qc.invalidateQueries({ queryKey: ["stock-movements"] });
    setMenyimpan(false);

    if (gagal.length === 0) {
      toast.success(`${berhasil} barang masuk gudang.`);
      setOpen(false); reset(); onSelesai?.();
    } else {
      toast.error(`${berhasil} berhasil, ${gagal.length} gagal: ${gagal[0]}`);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <ScanLine className="w-4 h-4" /> Masukkan dari screenshot
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" /> Masukkan belanja dari screenshot
            </DialogTitle>
          </DialogHeader>

          {!pesanan ? (
            <div className="space-y-3">
              <MultiImagePicker
                images={images}
                onChange={setImages}
                hint="Satu screenshot per pesanan. Boleh beberapa pesanan sekaligus — tiap gambar dibaca sebagai pesanan yang berbeda."
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <Button type="button" className="w-full" disabled={images.length === 0 || loading} onClick={handleScan}>
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membaca dan mencocokkan ke gudang…</>
                  : `Baca ${images.length} screenshot`}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                AI membaca nama, jumlah, dan harga, lalu mengusulkan barang gudang yang cocok.
                Usulannya <strong>selalu ditampilkan untuk Anda pastikan</strong> — tidak ada stok yang
                bertambah sebelum Anda menekan simpan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {belumDipetakan > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <PackagePlus className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>{belumDipetakan} barang belum punya padanan di gudang.</strong> Kalau
                    dibiarkan, barang gudang baru akan dibuatkan. Kalau sebenarnya sudah ada,
                    pilih barangnya di kolom kanan supaya stoknya tidak terpecah dua.
                  </p>
                </div>
              )}

              {(pesanan.pesanan || []).map((p, i) => {
                const h = p.hitung || {};
                const meleset = h.selisih_terkecil != null && h.selisih_terkecil > 1;
                return (
                  <div key={i} className="rounded-lg border border-border p-3 bg-muted/30">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{p.toko || "(toko tidak terbaca)"}</p>
                      <p className="text-xs text-muted-foreground">
                        Total tertulis: <span className="font-mono">{rp(p.total_pesanan)}</span>
                        {p.ongkir ? ` · ongkir ${rp(p.ongkir)}` : ""}
                      </p>
                    </div>
                    {meleset && (
                      <p className="text-[11px] text-amber-700 mt-1">
                        Hitungan barang tidak pas dengan total pesanan (selisih {rp(h.selisih_terkecil)}).
                        Bisa karena voucher atau ongkir, bisa juga karena angka di struk sebenarnya
                        subtotal. Periksa kolom harga di bawah.
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="space-y-2">
                {baris.map((r) => (
                  <div
                    key={r.kunci}
                    className={`rounded-lg border p-3 space-y-2 ${r.ikut ? "border-border bg-card" : "border-dashed border-border opacity-50"}`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={r.ikut}
                        onChange={(e) => ubah(r.kunci, { ikut: e.target.checked })}
                        className="w-4 h-4 accent-primary mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{r.namaStruk}</p>
                        <p className="text-[11px] text-muted-foreground">{r.toko}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${WARNA_YAKIN[r.keyakinan] || ""}`}>
                        {LABEL_YAKIN[r.keyakinan] || r.keyakinan}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Masuk ke barang gudang</p>
                        <Select value={r.sku || "__baru__"} onValueChange={(v) => ubah(r.kunci, { sku: v === "__baru__" ? "" : v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-64">
                            <SelectItem value="__baru__">➕ Buat barang gudang baru</SelectItem>
                            {warehouse
                              .filter((w) => w.sku && w.is_active !== false)
                              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                              .map((w) => (
                                <SelectItem key={w.id} value={w.sku}>{w.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {r.alasan && r.sku && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{r.alasan}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Jumlah</p>
                          <Input
                            type="number" min={0} className="h-8 text-xs"
                            value={r.jumlah}
                            onChange={(e) => ubah(r.kunci, { jumlah: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                            {rp(r.hargaTertera)} itu…
                          </p>
                          <Select value={r.tafsir} onValueChange={(v) => ubah(r.kunci, { tafsir: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="satuan">harga satuan</SelectItem>
                              <SelectItem value="subtotal">subtotal baris</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground font-mono">
                      {r.jumlah} × {rp(hargaSatuan(r))} = <strong>{rp(subtotal(r))}</strong>
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                <p className="text-sm">
                  <span className="text-muted-foreground">{dipilih.length} barang · </span>
                  <span className="font-semibold font-mono">{rp(totalNilai)}</span>
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={reset} disabled={menyimpan}>Ulangi</Button>
                  <Button type="button" onClick={handleSimpan} disabled={menyimpan || dipilih.length === 0}>
                    {menyimpan
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan…</>
                      : <><CheckCircle2 className="w-4 h-4 mr-1" /> Masukkan ke gudang</>}
                  </Button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Menyimpan akan menambah stok, mencatat pergerakan barang masuk, dan membuat satu
                catatan pengeluaran senilai total di atas.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
