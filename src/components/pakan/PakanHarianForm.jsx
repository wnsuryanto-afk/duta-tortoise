import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { skuPakanBaru } from "@/lib/skuBarang";
import { pilihBarisPakan } from "@/lib/namaMirip";
import { KELAS_PAKAN } from "@/lib/kelasPakan";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Camera, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTestMode } from "@/lib/useTestMode";

const SOURCES = [
  { value: "rumput", label: "Rumput" },
  { value: "sayur_pasar", label: "Sayur Pasar" },
  { value: "campur", label: "Campur" },
  { value: "lainnya", label: "Lainnya" },
];

const SOURCE_BADGE = {
  rumput: "bg-green-100 text-green-700",
  sayur_pasar: "bg-orange-100 text-orange-700",
  campur: "bg-blue-100 text-blue-700",
  lainnya: "bg-muted text-foreground",
};

/**
 * Satuan pencatatan.
 *
 * Sampai 27-09-2026 hanya ada satu kolom jumlah, dan namanya "jumlah
 * keranjang". Tapi yang sungguh dilakukan di lapangan adalah MENIMBANG:
 * catatan 8 September berbunyi Mentimun 64,97 — enam puluh lima kilogram,
 * tersimpan sebagai enam puluh lima keranjang.
 *
 * Akibatnya bukan cuma label yang salah. Integrasi stok mencocokkan bahan
 * dengan `unit === "keranjang"`, jadi "Mentimun" yang sudah ada di daftar
 * pakan DALAM KILOGRAM tidak pernah ketemu — yang dibuat malah "Mentimun"
 * kedua bersatuan keranjang. Satu bahan, dua baris stok, dua angka yang
 * sama-sama tidak bisa dipakai merencanakan belanja.
 */
const SATUAN = [
  // Label dijaga pendek: di lebar 390px "Kilogram (timbangan)" terpotong di
  // dalam kotak pilihan menjadi "Kilogram (timban…".
  { value: "kg", label: "Kilogram", singkat: "kg" },
  { value: "keranjang", label: "Keranjang", singkat: "keranjang" },
];

const EMPTY = {
  log_date: format(new Date(), "yyyy-MM-dd"),
  feed_source: "rumput",
  feed_type_detail: "",
  satuan: "kg",
  jumlah: "",
  notes: "",
  trip_cost_solar: "",
  trip_cost_rokok: "",
};

export default function PakanHarianForm({ open, onClose, user, onSaved, sopTaskId = "", judul = "Catat Pengambilan Pakan" }) {
  const { testModeTag } = useTestMode();
  const [form, setForm] = useState(EMPTY);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addToStock, setAddToStock] = useState(true);
  const qc = useQueryClient();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /*
    Jenis pakan DIPILIH dari Stok Pakan, tidak lagi diketik bebas.

    Sampai 16 Nov 2026 kolom ini kotak ketik, dan 41 dari 46 catatan lahir
    kosong — cukup untuk membuat porsi hijauan mustahil dihitung: tidak ada
    satu pun angka yang bisa dicocokkan dengan golongan bahannya.

    Hanya bahan AKTIF yang ditawarkan: bahan yang sudah dimatikan bukan lagi
    yang diambil di lapangan. Bahan yang belum ada dibuat lewat tombol
    "Bahan baru" — yang menulis FeedStock sungguhan, bukan teks lepas yang
    nanti tidak dikenali siapa pun.
  */
  const { data: daftarPakan = [] } = useQuery({
    queryKey: ["feedstocks"],
    queryFn: () => base44.entities.FeedStock.list("-created_date", 300),
    enabled: open,
  });
  const pilihanPakan = useMemo(
    () => (daftarPakan || [])
      .filter(f => f.is_active !== false)
      .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [daftarPakan],
  );
  const [bahanBaru, setBahanBaru] = useState(null); // { name, category, kelas_pakan } | null
  const [membuatBahan, setMembuatBahan] = useState(false);

  const pilihJenis = (nama) => {
    const bahan = daftarPakan.find(f => f.name === nama);
    // Satuannya ikut bahan yang dipilih. Nama yang sudah tercatat dalam
    // satuan lain ditolak pilihBarisPakan saat menyimpan; menyamakan
    // satuannya sejak di sini menghapus pertanyaan itu sebelum muncul.
    const satuanBahan = bahan?.unit === "keranjang" ? "keranjang" : "kg";
    setForm(f => ({ ...f, feed_type_detail: nama, satuan: satuanBahan }));
  };

  const simpanBahanBaru = async () => {
    const nama = String(bahanBaru?.name || "").trim();
    if (!nama) { toast.error("Nama bahan belum diisi"); return; }
    setMembuatBahan(true);
    try {
      // SKU diberikan di sini juga, dan dari daftar GABUNGAN pakan + gudang —
      // awalan yang sama dipakai keduanya, jadi nomor dari daftar pakan saja
      // bisa bertabrakan dengan barang gudang yang sudah ada.
      const semuaGudang = await base44.entities.WarehouseItem.list("-name", 500);
      const skuTerpakai = [
        ...daftarPakan.map(f => f.sku),
        ...semuaGudang.map(w => w.sku),
      ].filter(Boolean);
      const dibuat = await base44.entities.FeedStock.create({
        name: nama,
        category: bahanBaru.category,
        kelas_pakan: bahanBaru.kelas_pakan,
        sku: skuPakanBaru(bahanBaru.category, skuTerpakai),
        unit: form.satuan,
        current_stock: 0,
        minimum_stock: 1,
        price_per_unit: 0,
        is_active: true,
        notes: "Dibuat dari Pakan Harian",
        last_edited_by: user?.email || "",
        last_edited_at: new Date().toISOString(),
      });
      setBahanBaru(null);
      setForm(f => ({ ...f, feed_type_detail: dibuat.name }));
      qc.invalidateQueries({ queryKey: ["feedstocks"] });
    } catch (e) {
      toast.error("Gagal membuat bahan baru: " + (e?.message || e));
    } finally {
      setMembuatBahan(false);
    }
  };

  const handlePhoto = (file) => {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSave = async () => {
    const jumlah = Number(form.jumlah);
    if (!form.log_date || !(jumlah > 0)) {
      toast.error(`Lengkapi tanggal & jumlah (${form.satuan === "kg" ? "kilogram" : "keranjang"})`);
      return;
    }
    if (!String(form.feed_type_detail || "").trim()) {
      toast.error("Pilih jenis pakan lebih dulu — pilihannya dari daftar Stok Pakan");
      return;
    }
    if (!photoFile && !photoPreview) {
      toast.error("Foto timbangan wajib diunggah");
      return;
    }

    /*
      Nama pakan yang HAMPIR sama dengan yang sudah ada dihentikan di sini,
      sebelum satu baris pun ditulis.

      Di bawah, nama yang tidak cocok persis membuat baris FeedStock BARU
      tanpa bertanya. Satu huruf meleset berarti satu stok tandingan: pada
      10 Okt 2026 "Reumput" lahir di sebelah "Rumput", menampung 30 kg yang
      sejak itu tidak pernah diberikan ke kura mana pun.

      Diperiksa di MUKA, bukan di tengah penyimpanan, supaya tidak ada
      PakanHarian yang tersimpan sementara stoknya gagal. Dan hanya salah
      ketik yang dihentikan — nama yang memuat nama lain secara utuh
      ("Melon BS" di samping "Melon") memang barang berbeda dan lolos.
      Rinciannya di lib/namaMirip.js.
    */
    const detailNama = String(form.feed_type_detail || "").trim();
    if (detailNama) {
      try {
        const adaPakan = await base44.entities.FeedStock.list("-created_date", 200);
        /*
          SATU panggilan memutuskan boleh-tidaknya DAN baris mana yang dipakai.

          Dua pemeriksaan terpisah di sini dulu memakai kunci yang berbeda:
          penjaganya melihat nama saja, pencarinya di bawah melihat nama DAN
          satuan. Celahnya persis di antara keduanya — nama yang sudah ada
          dengan satuan baru lolos penjaga, lalu gagal ditemukan pencarinya,
          lalu melahirkan baris kedua tanpa sepatah pun peringatan. Rinciannya
          di lib/namaMirip.js.
        */
        const putusan = pilihBarisPakan({ nama: detailNama, satuan: form.satuan, daftar: adaPakan });
        if (!putusan.boleh) {
          toast.error(putusan.sebab, { duration: 10000 });
          return;
        }
      } catch {
        /* Daftar pakan gagal diambil: penyimpanan TIDAK dihentikan. Penjaga
           ini mencegah baris kembar, dan kehilangan catatan pakan hari itu
           jauh lebih mahal daripada satu baris kembar yang bisa digabung. */
      }
    }

    setSaving(true);
    try {
      let photo_url = photoPreview;
      if (photoFile) {
        const res = await base44.integrations.Core.UploadFile({ file: photoFile });
        photo_url = res.file_url;
      }

      const solar = Number(form.trip_cost_solar) || 0;
      const rokok = Number(form.trip_cost_rokok) || 0;
      const hasTrip = form.feed_source === "sayur_pasar" && (solar > 0 || rokok > 0);

      let trip_finance_tx_id = "";
      if (hasTrip) {
        const tx = await base44.entities.FinanceTransaction.create({
          type: "pengeluaran",
          category: "pakan",
          amount: solar + rokok,
          date: form.log_date,
          description: `Biaya ambil sayur pasar (solar Rp${solar.toLocaleString("id-ID")} + rokok Rp${rokok.toLocaleString("id-ID")}) - ${form.log_date}`,
          ...testModeTag,
        });
        trip_finance_tx_id = tx.id;
      }

      // Angkanya masuk ke kolom yang sesuai satuannya, tidak lagi selalu ke
      // basket_count. Kolom yang tidak dipakai dibiarkan kosong, bukan diisi
      // nol — nol berarti "ditimbang dan hasilnya nol", dan itu bukan
      // yang terjadi.
      const pakanHarian = await base44.entities.PakanHarian.create({
        log_date: form.log_date,
        session: "pagi",
        feed_source: form.feed_source,
        feed_type_detail: form.feed_type_detail,
        ...(form.satuan === "kg" ? { weight_kg: jumlah } : { basket_count: jumlah }),
        sop_task_id: sopTaskId || "",
        photo_url,
        notes: form.notes,
        recorded_by_name: user?.full_name || user?.email,
        recorded_by_email: user?.email,
        trip_cost_solar: solar,
        trip_cost_rokok: rokok,
        trip_finance_tx_id,
        ...testModeTag,
      });

      // ── INTEGRASI STOK PAKAN (anti-dobel via linked_pakan_harian_id) ──
      let stokGagal = null;
      if (addToStock && pakanHarian?.id) {
        try {
          const existingMove = await base44.entities.StockMovement.filter({
            linked_pakan_harian_id: pakanHarian.id,
          });
          if (existingMove.length === 0) {
            const SOURCE_MAP = {
              rumput: { name: "Rumput", category: "rumput", feed_source: "kebun_sendiri" },
              sayur_pasar: { name: "Sayur Pasar", category: "sayuran", feed_source: "beli_pasar" },
              campur: { name: "Pakan Campur", category: "lainnya", feed_source: "beli_pasar" },
              lainnya: { name: "Pakan Lainnya", category: "lainnya", feed_source: "lainnya" },
            };
            const mapping = SOURCE_MAP[form.feed_source] || SOURCE_MAP.lainnya;

            // Nama stok mengikuti JENIS pakannya bila keeper menyebutkannya.
            //
            // Sebelum ini yang dipakai selalu nama ember dari SOURCE_MAP, dan
            // `feed_type_detail` dibuang begitu saja. Akibatnya makanan yang
            // berbeda menumpuk jadi satu: pada 8 September 2026, Mentimun 64,97
            // keranjang dan Waloh 7 keranjang sama-sama masuk ke "Pakan
            // Lainnya", sehingga stoknya berbunyi 71,97 keranjang "lainnya" —
            // angka yang tidak bisa dipakai merencanakan apa pun.
            const detail = String(form.feed_type_detail || "").trim();
            const namaStok = detail || mapping.name;

            const allFeed = await base44.entities.FeedStock.list("-created_date", 200);
            // Satuannya HARUS ikut dicocokkan. Ada "Mentimun" dalam kg di daftar
            // pakan; menambahkan keranjang ke sana akan mencampur dua satuan
            // pada satu angka stok.
            // Satuannya ikut satuan yang dicatat, bukan selalu "keranjang".
            // Dengan begitu "Mentimun" dalam kg yang sudah ada di daftar pakan
            // benar-benar ketemu, dan tidak lahir "Mentimun" kedua.
            // Pencari yang SAMA dengan penjaganya di atas — lihat
            // pilihBarisPakan di lib/namaMirip.js. Keduanya tidak bisa lagi
            // berselisih, karena keduanya tidak lagi dua.
            let feedItem = pilihBarisPakan({
              nama: namaStok, satuan: form.satuan, daftar: allFeed,
            }).cocok;
            if (!feedItem) {
              /*
               * SKU diberikan SEKARANG, bukan nanti lewat "Generate SKU
               * Massal".
               *
               * potongStokPakan mencocokkan bahan lewat SKU, jadi baris tanpa
               * SKU tidak bisa dipilih sebagai bahan terpakai dan tidak akan
               * pernah memotong stok. Per 30-09-2026 dua pakan yang
               * benar-benar ada isinya — Melon BS 400 kg dan Rumput 65 kg —
               * keduanya lahir di sini tanpa SKU, sementara sembilan baris
               * ber-SKU di daftar yang sama semuanya nonaktif bersisa nol.
               *
               * Tombol backfill-nya ada dan berfungsi, tapi selama sisi
               * pembuat ini tidak ikut diperbaiki, hal yang sama lahir lagi
               * tiap kali jenis pakan baru dicatat.
               *
               * Dan SKU-nya dibuat dari daftar GABUNGAN pakan + gudang.
               *
               * Awalan LNN, SPM, dan PKN dipakai FeedStock maupun
               * WarehouseItem. Selama nomornya diambil dari daftar pakan saja,
               * baris pakan baru bisa lahir ber-SKU sama dengan barang gudang
               * yang sudah ada — dan itu sudah terjadi: LNN-0003 menunjuk
               * "Pakan Lainnya" di pakan dan "Gas Elpiji Kecil" di gudang.
               * Akibatnya pencarian lewat SKU menemukan barang yang salah,
               * tanpa error apa pun.
               *
               * Daftar gudang diambil di sini, bukan lewat useQuery di atas,
               * karena hanya dibutuhkan saat jenis pakan BARU dicatat — bukan
               * pada setiap pembukaan formulir.
               */
              const semuaGudang = await base44.entities.WarehouseItem.list("-name", 500);
              const skuTerpakai = [
                ...allFeed.map((f) => f.sku),
                ...semuaGudang.map((w) => w.sku),
              ].filter(Boolean);
              feedItem = await base44.entities.FeedStock.create({
                name: namaStok,
                category: mapping.category,
                sku: skuPakanBaru(mapping.category, skuTerpakai),
                unit: form.satuan,
                current_stock: 0,
                minimum_stock: 1,
                price_per_unit: 0,
                notes: "Auto-created dari Pakan Harian",
                last_edited_by: user?.email || "",
                last_edited_at: new Date().toISOString(),
              });
            }

            const qtyMasuk = jumlah;
            const newStock = (feedItem.current_stock || 0) + qtyMasuk;

            await base44.entities.StockMovement.create({
              item_id: feedItem.id,
              item_type: "feedstock",
              item_name: feedItem.name,
              item_sku: feedItem.sku || "",
              type: "masuk",
              quantity: qtyMasuk,
              unit: form.satuan,
              stock_after: newStock,
              feed_source: mapping.feed_source,
              by_email: user?.email || "",
              by_name: user?.full_name || user?.email || "",
              notes: `Auto dari Pakan Harian (${form.feed_source})${form.feed_type_detail ? ` - ${form.feed_type_detail}` : ""}`,
              date: form.log_date,
              status: "selesai",
              photo_urls: photo_url ? [photo_url] : [],
              linked_pakan_harian_id: pakanHarian.id,
              ...testModeTag,
            });

            await base44.entities.FeedStock.update(feedItem.id, {
              current_stock: newStock,
              last_restocked_date: form.log_date,
              last_restocked_qty: qtyMasuk,
              last_edited_by: user?.email || "",
              last_edited_at: new Date().toISOString(),
            });

            qc.invalidateQueries({ queryKey: ["feedstocks"] });
            qc.invalidateQueries({ queryKey: ["feed-movements"] });
          }
        } catch (e) {
          // Dulu kegagalan di sini hanya masuk console, lalu layar tetap
          // mengumumkan "stok diperbarui". Orang yang mencatat pakan tidak
          // punya cara tahu bahwa stoknya sebenarnya tidak bertambah.
          stokGagal = e?.message || "penyebabnya tidak terbaca";
        }
      }

      if (stokGagal) {
        toast.warning(`Pengambilan pakan tercatat, tetapi stok GAGAL diperbarui — ${stokGagal}`);
      } else {
        toast.success(
          `Pakan tercatat ${jumlah} ${form.satuan}` + (addToStock ? " & stok diperbarui" : ""),
        );
      }
      onSaved?.();
      setForm(EMPTY);
      clearPhoto();
      onClose();
    } catch (e) {
      toast.error("Gagal menyimpan: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tanggal *</Label>
              <Input type="date" value={form.log_date} onChange={e => set("log_date", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Sumber *</Label>
              <Select value={form.feed_source} onValueChange={v => set("feed_source", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {bahanBaru ? (
            <div className="rounded-lg border border-dashed p-3 space-y-2">
              <p className="text-xs font-semibold">+ Bahan baru di Stok Pakan</p>
              <Input
                placeholder="Nama bahan (cth: Rumput Gajah)"
                value={bahanBaru.name}
                onChange={e => setBahanBaru({ ...bahanBaru, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={bahanBaru.category} onValueChange={v => setBahanBaru({ ...bahanBaru, category: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["rumput", "sayuran", "buah", "hay", "pelet", "suplemen", "lainnya"].map(k => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={bahanBaru.kelas_pakan} onValueChange={v => setBahanBaru({ ...bahanBaru, kelas_pakan: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KELAS_PAKAN.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tersimpan dalam {form.satuan}. Golongan dipakai menghitung porsi hijauan — kosong berarti tidak dihitung hijauan.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setBahanBaru(null)}>Batal</Button>
                <Button type="button" size="sm" className="flex-1" onClick={simpanBahanBaru} disabled={membuatBahan || !bahanBaru.name.trim()}>
                  {membuatBahan ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />} Buat & pilih
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs">Jenis pakan *</Label>
              <div className="flex gap-2 mt-1">
                <Select value={form.feed_type_detail} onValueChange={pilihJenis}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih dari Stok Pakan" /></SelectTrigger>
                  <SelectContent>
                    {pilihanPakan.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">Belum ada bahan aktif di Stok Pakan</p>
                    ) : (
                      pilihanPakan.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Bahan baru"
                  onClick={() => setBahanBaru({ name: "", category: "rumput", kelas_pakan: "hijauan_utama" })}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Hanya bahan aktif. Belum ada di daftar? Tekan + untuk membuatnya.
              </p>
            </div>
          )}

          {/* Satuan dipilih lebih dulu, karena ia yang menentukan arti angkanya
              — dan sebelum ini tidak ada pilihan sama sekali, sehingga berat
              terpaksa ditulis ke kolom "keranjang". */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Satuan *</Label>
              <Select value={form.satuan} onValueChange={v => set("satuan", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SATUAN.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">
                {form.satuan === "kg" ? "Berat timbangan (kg) *" : "Jumlah keranjang *"}
              </Label>
              <Input
                type="number"
                min={0}
                step={form.satuan === "kg" ? "0.01" : "1"}
                inputMode="decimal"
                value={form.jumlah}
                onChange={e => set("jumlah", e.target.value)}
                className="mt-1"
                placeholder={form.satuan === "kg" ? "64.97" : "5"}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">
              {form.satuan === "kg" ? "Foto timbangan *" : "Foto bukti ambilan *"}
            </Label>
            {photoPreview ? (
              <div className="relative mt-1">
                <img loading="lazy" decoding="async" src={photoPreview} alt="Bukti" className="w-full h-40 object-cover rounded-lg border" />
                <button type="button" onClick={clearPhoto} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="mt-1 flex flex-col items-center justify-center gap-1 h-28 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 text-muted-foreground">
                <Camera className="w-6 h-6" />
                <span className="text-xs">
                  {form.satuan === "kg" ? "Foto layar timbangannya" : "Buka kamera / pilih foto"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
              </label>
            )}
          </div>

          {form.feed_source === "sayur_pasar" && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-orange-800">Biaya Trip ke Pasar</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-orange-700">Biaya Solar (Rp)</Label>
                  <Input type="number" min={0} value={form.trip_cost_solar} onChange={e => set("trip_cost_solar", e.target.value)} className="mt-0.5" placeholder="50000" />
                </div>
                <div>
                  <Label className="text-[11px] text-orange-700">Biaya Rokok (Rp)</Label>
                  <Input type="number" min={0} value={form.trip_cost_rokok} onChange={e => set("trip_cost_rokok", e.target.value)} className="mt-0.5" placeholder="25000" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Upah anak tidak dicatat di sini — sudah masuk gaji harian</p>
            </div>
          )}

          <div>
            <Label className="text-xs">Catatan (opsional)</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" rows={2} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addToStock}
              onChange={e => setAddToStock(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-xs">Masukkan ke stok pakan? (otomatis tercatat sebagai Pakan Masuk)</span>
          </label>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Batal</Button>
            <Button type="button" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { SOURCES, SOURCE_BADGE };