/**
 * TerimaDariScreenshot — catat pesanan marketplace dari screenshot.
 *
 * Belanja di peternakan ini lewat Shopee dan Tokopedia, dan bukti yang ada di
 * tangan adalah screenshot. Alur lama menuntut mengetik ulang tiap barang,
 * jumlah, dan harganya dari gambar yang sedang dilihat sendiri.
 *
 * ── Yang layar ini TIDAK lakukan, dan alasannya ──
 *
 * Versi pertama layar ini langsung menambah stok gudang, menulis StockMovement,
 * dan mencatat pengeluaran. Itu salah karena dua hal:
 *
 *   1. SCREENSHOT PESANAN BUKAN BUKTI BARANG DATANG. Yang terbaca di layar
 *      Shopee adalah "Belum Bayar" atau "Dikemas" — uangnya mungkin belum
 *      keluar, barangnya pasti belum ada di rak. Menambah stok di titik ini
 *      membuat gudang mengaku punya barang yang belum datang.
 *   2. APLIKASI INI SUDAH PUNYA SATU ALUR PENERIMAAN, di tab "Menunggu
 *      Barang". Alur itu membuat BatchBarang, mencatat kedaluwarsa, memotong
 *      sisa yang tidak datang kembali ke daftar belanja, dan memisahkan alat
 *      kerja (aset) dari biaya. Menambah jalan kedua ke gudang berarti dua
 *      definisi "barang masuk" yang pasti berbeda isinya.
 *
 * Jadi layar ini berhenti di PembelianBarang berstatus "dipesan". Stok dan
 * biaya baru bergerak ketika orangnya menekan "Barang Datang".
 *
 * ── Dua hal yang sengaja TIDAK ditebak ──
 *
 * 1. BARANG GUDANG MANA yang dimaksud. AI mengusulkan beserta keyakinan dan
 *    alasannya; orangnya yang memastikan. Nama marketplace tidak pernah sama
 *    dengan nama gudang — dari 16 baris pesanan nyata, nol yang cocok persis.
 *
 * 2. ANGKA DI STRUK itu harga satuan atau subtotal. Marketplace menampilkan
 *    keduanya dengan cara yang sama. Pada pesanan Zoetics: 3 x Rp 2.500 +
 *    5 x Rp 1.500 = Rp 15.000, sementara total pesanan tertulis Rp 13.000.
 *    Layar ini menampilkan KEDUA tafsiran beserta selisihnya terhadap total,
 *    dan menunggu orang memilih.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScanLine, Loader2, CheckCircle2, AlertTriangle, PackagePlus, Truck } from "lucide-react";
import { toast } from "sonner";
import MultiImagePicker from "@/components/ai/MultiImagePicker";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { KATEGORI_PEMBELIAN } from "@/lib/kategoriBarang";

const rp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const hariIni = () => new Date().toISOString().split("T")[0];

// Daftar kategori dan aturan aset/biaya ada di src/lib/kategoriBarang.js.
const KATEGORI = KATEGORI_PEMBELIAN;

/**
 * Satuan gudang yang dihitung CURAH, bukan per kemasan.
 *
 * Marketplace menjual "6 x 1 kg maltodextrin"; gudang menyimpannya dalam gram.
 * Kalau jumlah dari struk (6) dipakai apa adanya, stok hanya bertambah 6 gram
 * dan harga per gram tercatat Rp 19.900 — seribu kali lipat harga sebenarnya.
 * Kesalahan ini tidak melempar error apa pun; ia cuma membuat ongkos racikan
 * salah selamanya. Terjadi nyata pada tujuh bahan Duta Repro.
 */
const SATUAN_CURAH = new Set(["gram", "g", "gr", "kg", "ml", "cc", "liter", "l", "mg"]);

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
  const [sudahDibayar, setSudahDibayar] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  const reset = () => {
    setImages([]); setPesanan(null); setBaris([]); setError(""); setLoading(false);
  };

  const handleScan = async () => {
    setLoading(true); setError("");
    try {
      // img.file, BUKAN img.blob. Blob hasil canvas tidak punya nama berkas dan
      // ditolak Base44 dengan "'file' field is an empty object" — kegagalan yang
      // baru ketahuan saat lima screenshot Shopee sungguhan diunggah.
      const urls = [];
      for (const img of images) {
        const berkas = img.file || img.blob;
        if (!berkas) continue;
        const r = await base44.integrations.Core.UploadFile({ file: berkas });
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
          const cocok = b.sku_gudang ? warehouse.find((w) => w.sku === b.sku_gudang) : null;
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
            // Kategori menentukan biaya vs aset saat barangnya datang nanti.
            // Kalau padanan gudangnya sudah ketemu, ikut kategori barang itu.
            kategori: KATEGORI.includes(cocok?.category) ? cocok.category : "lainnya",
            satuan: cocok?.unit || "pcs",
            // Berapa satuan gudang dalam SATU kemasan yang dibeli. 1 untuk
            // barang hitungan (botol, pcs, ampul); harus diisi untuk barang
            // curah (gram, ml) yang dijual per kemasan.
            isi: 1,
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

  // Jumlah dan harga yang benar-benar disimpan: dalam SATUAN GUDANG, bukan
  // dalam kemasan marketplace.
  const jumlahGudang = (r) => (Number(r.jumlah) || 0) * (Number(r.isi) || 1);
  const hargaGudang = (r) => (jumlahGudang(r) > 0 ? subtotal(r) / jumlahGudang(r) : 0);
  const perluIsi = (r) => SATUAN_CURAH.has(String(r.satuan || "").toLowerCase()) && (Number(r.isi) || 1) === 1;

  const dipilih = baris.filter((r) => r.ikut);
  const belumDipetakan = dipilih.filter((r) => !r.sku).length;
  const totalNilai = dipilih.reduce((s, r) => s + subtotal(r), 0);

  // Ongkir dan biaya layanan bukan nilai stok, tapi tetap uang yang keluar.
  // Pada pesanan Vigantol E barangnya Rp 49.980 sementara total pesanan
  // Rp 50.980. Selisih itu disimpan di kolom ongkir pesanan, dan alur
  // penerimaan membagikannya ke harga per satuan saat barang datang.
  const pesananDipakai = new Set(dipilih.map((r) => r.iPesanan));
  const ongkirTotal = (pesanan?.pesanan || []).reduce(
    (s, p, i) => (pesananDipakai.has(i) ? s + (Number(p.ongkir) || 0) : s),
    0,
  );

  const handleSimpan = async () => {
    if (dipilih.length === 0) return;
    setMenyimpan(true);
    const gagal = [];
    let pesananDibuat = 0;
    let barangDicatat = 0;

    // Satu screenshot = satu pesanan = satu PembelianBarang. Menggabungkan
    // beberapa toko jadi satu pesanan membuat ongkir tidak bisa dibagi benar
    // dan pembatalan satu toko ikut menghapus toko lain.
    for (const i of [...pesananDipakai].sort((a, b) => a - b)) {
      const p = (pesanan?.pesanan || [])[i] || {};
      const rows = dipilih.filter((r) => r.iPesanan === i);
      const barangTotal = rows.reduce((s, r) => s + subtotal(r), 0);
      const ongkir = Number(p.ongkir) || 0;

      try {
        await base44.entities.PembelianBarang.create({
          tanggal_pesan: p.tanggal || hariIni(),
          status: "dipesan",
          platform: [p.marketplace, p.toko].filter(Boolean).join(" — ") || "Online",
          ongkir,
          biaya_admin: 0,
          total_barang: barangTotal,
          total_bayar: barangTotal + ongkir,
          bukti_pesanan_url: rows[0]?.buktiUrl || "",
          dibayar_oleh_email: sudahDibayar ? (user?.email || "") : "",
          dibayar_oleh_nama: sudahDibayar ? (user?.full_name || user?.email || "") : "",
          is_talangan: sudahDibayar,
          status_utang: "belum_dibayar",
          catatan: sudahDibayar
            ? `Dicatat dari screenshot pesanan ${p.toko || ""}. Sudah dibayar, menunggu barang datang.`
            : `Dicatat dari screenshot pesanan ${p.toko || ""}. BELUM DIBAYAR saat dicatat — pastikan pembayarannya sebelum menandai barang datang.`,
          items: rows.map((r) => ({
            nama_barang: (Number(r.isi) || 1) > 1
              ? `${r.namaStruk} — ${r.jumlah} kemasan @${r.isi} ${r.satuan}`
              : r.namaStruk,
            jumlah_pesan: jumlahGudang(r),
            jumlah_diterima: 0,
            satuan: r.satuan || "pcs",
            harga_satuan: hargaGudang(r),
            kategori: r.kategori || "lainnya",
            label_per_butir: false,
            item_sku: r.sku || "",
            warehouse_item_id: (r.sku && warehouse.find((w) => w.sku === r.sku)?.id) || "",
          })),
        });
        pesananDibuat++;
        barangDicatat += rows.length;
      } catch (e) {
        gagal.push(`${p.toko || `pesanan ${i + 1}`}: ${e?.message || "gagal"}`);
      }
    }

    qc.invalidateQueries({ queryKey: ["pembelian-list"] });
    setMenyimpan(false);

    if (gagal.length === 0) {
      toast.success(`${pesananDibuat} pesanan · ${barangDicatat} barang masuk daftar "Menunggu Barang".`);
      setOpen(false); reset(); onSelesai?.();
    } else {
      toast.error(`${pesananDibuat} tersimpan, ${gagal.length} gagal: ${gagal[0]}`);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <ScanLine className="w-4 h-4" /> Catat pesanan dari screenshot
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" /> Catat pesanan dari screenshot
            </DialogTitle>
          </DialogHeader>

          {!pesanan ? (
            <div className="space-y-3">
              <MultiImagePicker
                images={images}
                onChange={setImages}
                hint="Satu screenshot per pesanan — tiap gambar dibaca sebagai pesanan yang berbeda. Maksimal 5 sekali baca; kalau pesanannya lebih banyak, simpan dulu yang lima ini lalu ulangi. Tiap putaran berdiri sendiri, tidak ada yang tertimpa."
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <Button type="button" className="w-full" disabled={images.length === 0 || loading} onClick={handleScan}>
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membaca dan mencocokkan ke gudang…</>
                  : `Baca ${images.length} screenshot`}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                AI membaca nama, jumlah, dan harga, lalu mengusulkan barang gudang yang cocok.
                Usulannya <strong>selalu ditampilkan untuk Anda pastikan</strong>. Yang tersimpan
                adalah <strong>pesanan</strong>, bukan stok — stok bertambah nanti di tab
                “Menunggu Barang” saat barangnya benar-benar datang.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {belumDipetakan > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <PackagePlus className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>{belumDipetakan} barang belum punya padanan di gudang.</strong> Kalau
                    dibiarkan, barang gudang baru akan dibuatkan saat barangnya datang. Kalau
                    sebenarnya sudah ada, pilih barangnya di kolom kanan supaya stoknya tidak
                    terpecah dua.
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
                        <Select
                          value={r.sku || "__baru__"}
                          onValueChange={(v) => {
                            const w = v === "__baru__" ? null : warehouse.find((x) => x.sku === v);
                            ubah(r.kunci, {
                              sku: v === "__baru__" ? "" : v,
                              kategori: KATEGORI.includes(w?.category) ? w.category : r.kategori,
                              satuan: w?.unit || r.satuan,
                            });
                          }}
                        >
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

                    {/*
                      Isi per kemasan — hanya muncul kalau satuan gudangnya curah.
                      Untuk botol/pcs/ampul tidak ada yang perlu dikonversi.
                    */}
                    {SATUAN_CURAH.has(String(r.satuan || "").toLowerCase()) && (
                      <div className="space-y-1">
                        <div className="flex items-end gap-2">
                          <div className="w-32">
                            <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                              Isi per kemasan ({r.satuan})
                            </p>
                            <Input
                              type="number" min={1} className="h-8 text-xs"
                              value={r.isi}
                              onChange={(e) => ubah(r.kunci, { isi: Number(e.target.value) || 1 })}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground pb-1.5">
                            {r.jumlah} kemasan × {r.isi} = <strong>{jumlahGudang(r).toLocaleString("id-ID")} {r.satuan}</strong>
                          </p>
                        </div>
                        {perluIsi(r) && (
                          <p className="text-[10px] text-amber-700 leading-snug">
                            Gudang menyimpan barang ini dalam <strong>{r.satuan}</strong>, tapi marketplace
                            menjualnya per kemasan. Isi berapa {r.satuan} dalam satu kemasan (mis. 1 kg = 1000),
                            kalau tidak stoknya hanya bertambah {r.jumlah} {r.satuan}.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[11px] text-muted-foreground font-mono flex-1">
                        {jumlahGudang(r).toLocaleString("id-ID")} {r.satuan} × {rp(hargaGudang(r))} = <strong>{rp(subtotal(r))}</strong>
                      </p>
                      {/* Kategori menentukan alat kerja dicatat sebagai aset, bukan biaya. */}
                      <select
                        className="h-7 text-[11px] px-2 rounded-lg border border-border bg-background"
                        value={r.kategori}
                        onChange={(e) => ubah(r.kunci, { kategori: e.target.value })}
                      >
                        {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-medium">Status pesanan ini</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSudahDibayar(true)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${sudahDibayar ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                  >
                    <span className="font-semibold block">Sudah dibayar</span>
                    <span className="text-muted-foreground">Dikemas / dikirim. Dicatat sebagai talangan.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSudahDibayar(false)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${!sudahDibayar ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                  >
                    <span className="font-semibold block">Belum dibayar</span>
                    <span className="text-muted-foreground">Masih “Belum Bayar” di marketplace.</span>
                  </button>
                </div>
              </div>

              {dipilih.some(perluIsi) && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>{dipilih.filter(perluIsi).length} barang curah belum diisi berapa per kemasannya.</strong>{" "}
                    Kalau dibiarkan, stoknya bertambah sejumlah kemasan (mis. 6) alih-alih isinya
                    (6.000 gram), dan harga per gramnya tercatat seribu kali lipat.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                <p className="text-sm">
                  <span className="text-muted-foreground">{dipilih.length} barang · </span>
                  <span className="font-semibold font-mono">{rp(totalNilai)}</span>
                  {ongkirTotal > 0 && (
                    <span className="text-muted-foreground"> + ongkir {rp(ongkirTotal)} = <span className="font-mono">{rp(totalNilai + ongkirTotal)}</span></span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={reset} disabled={menyimpan}>Ulangi</Button>
                  <Button type="button" onClick={handleSimpan} disabled={menyimpan || dipilih.length === 0}>
                    {menyimpan
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan…</>
                      : <><CheckCircle2 className="w-4 h-4 mr-1" /> Simpan sebagai pesanan</>}
                  </Button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <Truck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Menyimpan <strong>tidak menambah stok dan tidak mencatat biaya</strong>. Pesanan masuk
                ke tab “Menunggu Barang”. Saat barangnya datang, tekan “Barang Datang” di sana —
                di situlah stok bertambah, kedaluwarsa dicatat, dan biayanya masuk laba rugi.
              </p>
              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Ongkir disimpan di pesanan dan dibagi ke harga per satuan saat barang datang, supaya
                harga pokoknya sama dengan uang yang benar-benar keluar.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
