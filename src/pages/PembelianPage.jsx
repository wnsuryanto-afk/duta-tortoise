/**
 * PembelianPage — alur pembelian barang dari pesan sampai stok bertambah.
 *
 * Tiga tahap, tiga tab:
 *   1. Belum Dibeli  → centang barang, isi harga aktual + ongkir + admin,
 *                      unggah bukti pesanan → terbentuk PembelianBarang (dipesan)
 *   2. Menunggu Barang → diterima penuh / sebagian / dibatalkan penjual
 *   3. Riwayat & Utang → pelunasan talangan
 *
 * Saat barang diterima:
 *   - BatchBarang dibuat per item (dasar pelacakan kedaluwarsa & label QR)
 *   - Stok WarehouseItem bertambah; SKU dibuat otomatis bila barang baru
 *   - FinanceTransaction dibuat, KECUALI alat kerja yang dihitung aset
 *   - Sisa yang tidak datang otomatis kembali ke daftar belanja
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingCart, Package, Truck, CheckCircle2, XCircle, Loader2,
  Wallet, Receipt, AlertTriangle, ChevronRight,
} from "lucide-react";
import TahapYangKurang from "@/components/pembelian/TahapYangKurang";
import InvoiceVisionUpload from "@/components/ai/InvoiceVisionUpload";
import TerimaDariScreenshot from "@/components/pembelian/TerimaDariScreenshot";
// Halaman /stock-prediction digabungkan ke sini sebagai satu tahap. Isinya
// menjawab pertanyaan yang sama dengan tahap "Yang Kurang" — kapan sebuah
// barang habis — hanya lebih rinci per barang. Selama ia berdiri sendiri,
// ia menghitung ulang urgensinya sendiri dan menyebut angka yang berbeda.
import StockPredictionPage from "@/pages/StockPredictionPage";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useTestMode } from "@/lib/useTestMode";

const rp = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const today = () => format(new Date(), "yyyy-MM-dd");

// Kategori menentukan perlakuan uang: alat kerja = aset, sisanya = biaya
const KATEGORI = ["obat", "vitamin", "alat_kerja", "pakan", "lainnya"];
const KATEGORI_FINANCE = {
  obat: "obat_perawatan",
  vitamin: "vitamin_suplemen",
  pakan: "pakan",
  lainnya: "operasional",
};

// ShoppingList hanya punya SATU kolom nama: `nama_barang` (ada di skema,
// wajib). `item_name` adalah sisa impor generasi pertama yang tidak pernah
// masuk skema, isinya sudah lama tidak sinkron, dan datanya sudah dihapus
// dari seluruh baris. Membacanya sebagai cadangan berarti menampilkan nama
// barang yang berbeda dari SKU yang tersimpan di baris yang sama.
const nm = (i) => i.nama_barang || "(tanpa nama)";
const jml = (i) => i.jumlah ?? i.qty_needed ?? 0;
const sat = (i) => i.satuan || i.unit || "pcs";

function Section({ title, icon: Icon, children, count }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold flex-1">{title}</span>
        {count != null && <Badge variant="secondary">{count}</Badge>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export default function PembelianPage() {
  const { testModeTag } = useTestMode();
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [tab, setTab] = useState("belum");
  const [selected, setSelected] = useState(() => new Set());
  const [pesanOpen, setPesanOpen] = useState(false);
  const [terimaTarget, setTerimaTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ platform: "", ongkir: 0, biaya_admin: 0, bukti: "" });
  const [hargaItem, setHargaItem] = useState({});
  const [terimaForm, setTerimaForm] = useState({});

  const { data: shopping = [], isLoading } = useQuery({
    queryKey: ["pembelian-shopping"],
    queryFn: () => base44.entities.ShoppingList.list("-priority", 300),
  });
  const { data: pembelian = [] } = useQuery({
    queryKey: ["pembelian-list"],
    queryFn: () => base44.entities.PembelianBarang.list("-tanggal_pesan", 100),
  });
  const { data: warehouse = [] } = useQuery({
    queryKey: ["pembelian-warehouse"],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 300),
  });

  const belumDibeli = useMemo(
    () => shopping.filter((s) => s.status === "belum_dibeli"),
    [shopping]
  );
  const menunggu = useMemo(() => pembelian.filter((p) => p.status === "dipesan"), [pembelian]);
  const riwayat = useMemo(() => pembelian.filter((p) => p.status !== "dipesan"), [pembelian]);
  const utang = useMemo(
    () => pembelian.filter((p) => p.is_talangan && p.status_utang === "belum_dibayar" && p.status !== "dibatalkan"),
    [pembelian]
  );
  const totalUtang = utang.reduce((t, p) => t + (p.total_bayar || 0), 0);

  const toggle = (id) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ── Tahap 1: tandai dipesan ──
  const bukaDialogPesan = () => {
    if (selected.size === 0) return;
    const init = {};
    belumDibeli
      .filter((s) => selected.has(s.id))
      .forEach((s) => {
        init[s.id] = { harga: s.total_est || 0, kategori: "obat", per_butir: false };
      });
    setHargaItem(init);
    setForm({ platform: "", ongkir: 0, biaya_admin: 0, bukti: "" });
    setPesanOpen(true);
  };

  const totalBarang = Object.values(hargaItem).reduce((t, v) => t + Number(v.harga || 0), 0);
  const totalBayar = totalBarang + Number(form.ongkir || 0) + Number(form.biaya_admin || 0);

  const simpanPesanan = async () => {
    setBusy(true);
    try {
      const items = belumDibeli
        .filter((s) => selected.has(s.id))
        .map((s) => ({
          shopping_list_id: s.id,
          nama_barang: nm(s),
          jumlah_pesan: jml(s),
          jumlah_diterima: 0,
          satuan: sat(s),
          harga_satuan: jml(s) > 0 ? Number(hargaItem[s.id]?.harga || 0) / jml(s) : 0,
          kategori: hargaItem[s.id]?.kategori || "lainnya",
          label_per_butir: !!hargaItem[s.id]?.per_butir,
          item_sku: s.item_sku || "",
          warehouse_item_id: s.warehouse_item_id || "",
        }));

      const rec = await base44.entities.PembelianBarang.create({
        tanggal_pesan: today(),
        status: "dipesan",
        platform: form.platform,
        ongkir: Number(form.ongkir || 0),
        biaya_admin: Number(form.biaya_admin || 0),
        total_barang: totalBarang,
        total_bayar: totalBayar,
        bukti_pesanan_url: form.bukti,
        dibayar_oleh_email: user?.email,
        dibayar_oleh_nama: user?.full_name || user?.email,
        is_talangan: true,
        status_utang: "belum_dibayar",
        items,
      });

      for (const it of items) {
        await base44.entities.ShoppingList.update(it.shopping_list_id, {
          status: "sudah_dipesan",
          pembelian_id: rec.id,
          tanggal_dibeli: today(),
        });
      }

      qc.invalidateQueries({ queryKey: ["pembelian-shopping"] });
      qc.invalidateQueries({ queryKey: ["pembelian-list"] });
      setSelected(new Set());
      setPesanOpen(false);
      toast.success(`${items.length} barang ditandai dipesan — ${rp(totalBayar)}`);
    } catch (e) {
      toast.error("Gagal menyimpan pesanan: " + (e?.message || ""));
    }
    setBusy(false);
  };

  // ── Tahap 2: penerimaan ──
  const bukaDialogTerima = (p) => {
    const init = {};
    (p.items || []).forEach((it, idx) => {
      init[idx] = { diterima: it.jumlah_pesan, expired: "", per_butir: !!it.label_per_butir };
    });
    setTerimaForm(init);
    setTerimaTarget(p);
  };

  const prosesTerima = async () => {
    if (!terimaTarget) return;
    setBusy(true);
    try {
      const p = terimaTarget;
      const items = p.items || [];
      let adaKurang = false;
      let totalBiaya = 0;

      // Porsi ongkir & admin dibagi rata ke tiap item sesuai nilainya
      const nilaiTotal = items.reduce((t, it) => t + (it.harga_satuan || 0) * (it.jumlah_pesan || 0), 0);
      const tambahan = Number(p.ongkir || 0) + Number(p.biaya_admin || 0);

      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        const f = terimaForm[idx] || {};
        const diterima = Number(f.diterima || 0);
        if (diterima <= 0) continue;

        const nilaiItem = (it.harga_satuan || 0) * (it.jumlah_pesan || 0);
        const porsi = nilaiTotal > 0 ? (nilaiItem / nilaiTotal) * tambahan : 0;
        const hargaSatuanFinal =
          diterima > 0 ? ((it.harga_satuan || 0) * diterima + porsi) / diterima : 0;

        // Cari / buat WarehouseItem.
        //
        // Urutannya sengaja: id dulu, lalu SKU, nama paling belakang. Nama
        // adalah pencocokan yang paling mudah meleset — beda satu spasi atau
        // satu huruf besar dan barangnya dianggap belum ada, lalu dibuatkan
        // barang gudang BARU dengan stok 0 sementara stok yang lama tidak
        // pernah bertambah. Itu sumber barang kembar yang selama ini harus
        // dibereskan lewat alat pembersih duplikat.
        let wi =
          (it.warehouse_item_id && warehouse.find((w) => w.id === it.warehouse_item_id)) ||
          (it.item_sku && warehouse.find((w) => w.sku === it.item_sku)) ||
          warehouse.find(
            (w) => (w.name || "").trim().toLowerCase() === (it.nama_barang || "").trim().toLowerCase()
          );
        if (!wi) {
          const kat = it.kategori === "pakan" ? "lainnya" : it.kategori || "lainnya";
          wi = await base44.entities.WarehouseItem.create({
            name: it.nama_barang,
            category: kat,
            unit: it.satuan || "pcs",
            current_stock: 0,
            minimum_stock: 0,
            purchase_price: hargaSatuanFinal,
            sku: it.item_sku || "",
            location: "gudang_utama",
          });
        }

        await base44.entities.WarehouseItem.update(wi.id, {
          current_stock: (wi.current_stock || 0) + diterima,
          purchase_price: hargaSatuanFinal,
          last_restocked_date: today(),
          expired_date: f.expired || wi.expired_date || null,
        });

        const kode = `BATCH-${(wi.sku || wi.id).slice(-6).toUpperCase()}-${format(new Date(), "yyMMdd")}-${idx + 1}`;
        await base44.entities.BatchBarang.create({
          batch_code: kode,
          item_id: wi.id,
          item_sku: wi.sku || "",
          nama_barang: it.nama_barang,
          jumlah_awal: diterima,
          jumlah_sisa: diterima,
          satuan: it.satuan || "pcs",
          harga_satuan: hargaSatuanFinal,
          tanggal_terima: today(),
          tanggal_expired: f.expired || null,
          pembelian_id: p.id,
          label_per_butir: !!f.per_butir,
          label_dicetak: false,
          status: "aktif",
        });

        // Alat kerja dianggap aset, tidak masuk biaya operasional
        if (it.kategori !== "alat_kerja") {
          totalBiaya += hargaSatuanFinal * diterima;
        }

        // Sisa yang tidak datang kembali ke daftar belanja
        const kurang = (it.jumlah_pesan || 0) - diterima;
        if (it.shopping_list_id) {
          if (kurang > 0) {
            adaKurang = true;
            await base44.entities.ShoppingList.update(it.shopping_list_id, {
              status: "belum_dibeli",
              jumlah: kurang,
              qty_kurang: kurang,
              pembelian_id: null,
              notes: `Sisa ${kurang} ${it.satuan} dari pesanan ${p.tanggal_pesan} yang belum datang`,
            });
          } else {
            await base44.entities.ShoppingList.update(it.shopping_list_id, {
              status: "sudah_dibeli",
              qty_aktual: diterima,
              tanggal_diterima: today(),
            });
          }
        }
      }

      if (totalBiaya > 0) {
        const katUtama = items[0]?.kategori || "lainnya";
        await base44.entities.FinanceTransaction.create({
          type: "pengeluaran",
          category: KATEGORI_FINANCE[katUtama] || "operasional",
          amount: Math.round(totalBiaya),
          date: today(),
          description: `Pembelian ${items.length} barang${p.platform ? ` via ${p.platform}` : ""} — dibayar ${p.dibayar_oleh_nama}`,
          reference_id: p.id,
          invoice_photo_url: p.bukti_pesanan_url || "",
          created_by_name: user?.full_name || user?.email,
          ...testModeTag,
        });
      }

      await base44.entities.PembelianBarang.update(p.id, {
        status: adaKurang ? "diterima_sebagian" : "diterima_penuh",
        tanggal_terima: today(),
        diterima_oleh_email: user?.email,
        items: items.map((it, idx) => ({
          ...it,
          jumlah_diterima: Number(terimaForm[idx]?.diterima || 0),
          tanggal_expired: terimaForm[idx]?.expired || null,
          label_per_butir: !!terimaForm[idx]?.per_butir,
        })),
      });

      qc.invalidateQueries();
      setTerimaTarget(null);
      toast.success(adaKurang ? "Diterima sebagian — sisa kembali ke daftar belanja" : "Barang diterima, stok bertambah");
    } catch (e) {
      toast.error("Gagal memproses penerimaan: " + (e?.message || ""));
    }
    setBusy(false);
  };

  const batalkanPesanan = async (p) => {
    if (!confirm("Pesanan dibatalkan penjual? Semua barang kembali ke daftar belanja dan tidak ada biaya tercatat.")) return;
    setBusy(true);
    try {
      for (const it of p.items || []) {
        if (it.shopping_list_id) {
          await base44.entities.ShoppingList.update(it.shopping_list_id, {
            status: "belum_dibeli",
            pembelian_id: null,
          });
        }
      }
      await base44.entities.PembelianBarang.update(p.id, {
        status: "dibatalkan",
        status_utang: "lunas",
        catatan: "Dibatalkan penjual — barang kembali ke daftar belanja",
      });
      qc.invalidateQueries();
      toast.success("Pesanan dibatalkan, barang kembali ke daftar belanja");
    } catch (e) {
      toast.error("Gagal membatalkan: " + (e?.message || ""));
    }
    setBusy(false);
  };

  const lunasi = async (p) => {
    await base44.entities.PembelianBarang.update(p.id, {
      status_utang: "lunas",
      tanggal_lunas: today(),
    });
    qc.invalidateQueries({ queryKey: ["pembelian-list"] });
    toast.success("Ditandai lunas");
  };

  // Empat tahap satu alur. Sebelumnya tahap pertama — "apa yang sebenarnya
  // kurang" — dijawab tiga halaman terpisah yang tidak bersambung ke sini,
  // sehingga orang membaca daftar di satu layar lalu mengetik ulang isinya
  // di layar lain.
  const TABS = [
    { id: "kurang", label: "Yang Kurang", n: null },
    { id: "prediksi", label: "Prediksi Habis", n: null },
    { id: "belum", label: "Daftar Belanja", n: belumDibeli.length },
    { id: "menunggu", label: "Menunggu Barang", n: menunggu.length },
    { id: "riwayat", label: "Riwayat", n: riwayat.length },
  ];

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-xl font-bold font-heading flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" /> Pembelian Barang
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Satu alur: apa yang kurang, dipesan, diterima, lalu stok dan biayanya tercatat.
        </p>
        <div className="mt-3">
          {/*
            Jalan pintas untuk belanja yang TIDAK lewat daftar belanja aplikasi —
            barang yang sudah terlanjur dipesan di marketplace. Tanpa ini, satu-satunya
            cara memasukkannya adalah mengetik ulang tiap barang dari screenshot yang
            sedang dilihat sendiri.

            Hasilnya masuk ke tab "Menunggu Barang", BUKAN langsung ke gudang.
            Screenshot pesanan hanya membuktikan barangnya dipesan; stok dan biaya
            baru bergerak lewat tombol "Barang Datang" seperti pembelian lain.
          */}
          <TerimaDariScreenshot
            warehouse={warehouse}
            onSelesai={() => {
              qc.invalidateQueries({ queryKey: ["pembelian-list"] });
              qc.invalidateQueries({ queryKey: ["pembelian-warehouse"] });
              setTab("menunggu");
            }}
          />
        </div>
      </div>

      {totalUtang > 0 && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <Wallet className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Talangan belum dilunasi: {rp(totalUtang)}</strong> dari {utang.length} pesanan.
            Lihat tab Riwayat untuk menandai lunas.
          </span>
        </div>
      )}

      {/* Panah di antara tahap menunjukkan barang bergerak ke satu arah —
          dengan pil terpisah, keempatnya terbaca sebagai penyaring sejajar,
          bukan sebagai urutan pekerjaan. */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t, i) => (
          <div key={t.id} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />}
            <button
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="font-semibold">{t.label}</span>
              {t.n !== null && <span className="ml-1 tabular opacity-80">({t.n})</span>}
            </button>
          </div>
        ))}
      </div>

      {tab === "kurang" ? (
        <Section title="Barang yang stoknya menipis atau habis" icon={AlertTriangle}>
          <TahapYangKurang onSelesai={() => setTab("belum")} />
        </Section>
      ) : tab === "prediksi" ? (
        <StockPredictionPage />
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : tab === "belum" ? (
        <Section title="Pilih barang untuk dipesan" icon={ShoppingCart} count={belumDibeli.length}>
          {belumDibeli.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Tidak ada barang yang menunggu dibeli. Ini kabar baik.
            </p>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <Button size="sm" variant="outline"
                  onClick={() => setSelected(new Set(belumDibeli.map((s) => s.id)))}>
                  Pilih semua ({belumDibeli.length})
                </Button>
                <Button size="sm" disabled={selected.size === 0} onClick={bukaDialogPesan} className="ml-auto">
                  Tandai Dipesan ({selected.size})
                </Button>
              </div>
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {belumDibeli.map((s) => (
                  <button key={s.id} onClick={() => toggle(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      selected.has(s.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    }`}>
                    <p className="text-sm font-medium">{nm(s)}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {s.priority === "segera" && (
                        <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">SEGERA</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{jml(s)} {sat(s)}</span>
                      {s.total_est > 0 && (
                        <span className="text-xs font-semibold">{rp(s.total_est)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>
      ) : tab === "menunggu" ? (
        <Section title="Pesanan menunggu barang datang" icon={Truck} count={menunggu.length}>
          {menunggu.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Tidak ada pesanan berjalan.</p>
          ) : (
            <div className="space-y-2">
              {menunggu.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {(p.items || []).length} barang · {rp(p.total_bayar)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.tanggal_pesan}{p.platform ? ` · ${p.platform}` : ""} · dibayar {p.dibayar_oleh_nama}
                      </p>
                    </div>
                    {p.bukti_pesanan_url && (
                      <a href={p.bukti_pesanan_url} target="_blank" rel="noreferrer"
                        className="text-xs text-primary underline flex-shrink-0">Bukti</a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(p.items || []).map((i) => `${i.nama_barang} ×${i.jumlah_pesan}`).join(" · ")}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" onClick={() => bukaDialogTerima(p)} className="gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Barang Datang
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => batalkanPesanan(p)}
                      className="gap-1.5 text-destructive border-destructive/40">
                      <XCircle className="w-3.5 h-3.5" /> Dibatalkan Penjual
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : (
        <Section title="Riwayat pembelian" icon={Receipt} count={riwayat.length}>
          {riwayat.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada riwayat.</p>
          ) : (
            <div className="space-y-2">
              {riwayat.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{rp(p.total_bayar)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.tanggal_terima || p.tanggal_pesan} · {(p.items || []).length} barang · {p.dibayar_oleh_nama}
                    </p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                      {p.is_talangan && (
                        <Badge className={`text-[10px] ${
                          p.status_utang === "lunas"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}>
                          {p.status_utang === "lunas" ? "Lunas" : "Belum dilunasi"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {p.is_talangan && p.status_utang !== "lunas" && p.status !== "dibatalkan" && (
                    <Button size="sm" variant="outline" onClick={() => lunasi(p)} className="flex-shrink-0">
                      Tandai Lunas
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Dialog tandai dipesan ── */}
      <Dialog open={pesanOpen} onOpenChange={setPesanOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tandai Dipesan</DialogTitle></DialogHeader>
          <div className="space-y-3">

            {/*
              Belanja di peternakan ini lewat marketplace, jadi bukti yang ADA
              di tangan adalah screenshot pesanan — bukan URL. Pemindai ini
              sudah dipakai di Barang Masuk dan Keuangan; sebelumnya dialog di
              sini hanya menyediakan kolom teks "URL screenshot", yang berarti
              screenshot harus diunggah ke tempat lain dulu, dan platform,
              ongkir, serta biaya admin diketik ulang dari gambar yang sedang
              dilihat sendiri.
            */}
            <InvoiceVisionUpload
              buttonLabel="Scan screenshot pesanan"
              hint="Tokopedia / Shopee / nota toko — platform, ongkir, dan total terisi sendiri"
              onApplied={({ invoice, photoUrls }) =>
                setForm((f) => ({
                  ...f,
                  platform: invoice?.toko || f.platform,
                  ongkir: invoice?.ongkir ?? f.ongkir,
                  bukti: photoUrls?.[0] || f.bukti,
                }))
              }
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium mb-1">Platform</p>
                <Input value={form.platform} placeholder="Tokopedia / Distributor"
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Bukti pesanan</p>
                <Input value={form.bukti} placeholder="terisi otomatis dari scan"
                  onChange={(e) => setForm((f) => ({ ...f, bukti: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Ongkir (Rp)</p>
                <Input type="number" value={form.ongkir}
                  onChange={(e) => setForm((f) => ({ ...f, ongkir: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Biaya admin (Rp)</p>
                <Input type="number" value={form.biaya_admin}
                  onChange={(e) => setForm((f) => ({ ...f, biaya_admin: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-2">
              {belumDibeli.filter((s) => selected.has(s.id)).map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-2 space-y-1.5">
                  <p className="text-sm font-medium">{nm(s)} <span className="text-xs text-muted-foreground">×{jml(s)} {sat(s)}</span></p>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <p className="text-[11px] text-muted-foreground mb-0.5">Harga aktual total</p>
                      <Input type="number" className="h-8 text-xs"
                        value={hargaItem[s.id]?.harga ?? 0}
                        onChange={(e) => setHargaItem((h) => ({ ...h, [s.id]: { ...h[s.id], harga: e.target.value } }))} />
                    </div>
                    <select className="h-8 text-xs px-2 rounded-lg border border-border bg-background"
                      value={hargaItem[s.id]?.kategori || "obat"}
                      onChange={(e) => setHargaItem((h) => ({ ...h, [s.id]: { ...h[s.id], kategori: e.target.value } }))}>
                      {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <input type="checkbox" checked={!!hargaItem[s.id]?.per_butir}
                      onChange={(e) => setHargaItem((h) => ({ ...h, [s.id]: { ...h[s.id], per_butir: e.target.checked } }))} />
                    Label QR per butir (untuk ampul/vial yang perlu dilacak satuan)
                  </label>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/40 p-2 text-sm">
              <div className="flex justify-between"><span>Barang</span><span>{rp(totalBarang)}</span></div>
              <div className="flex justify-between text-muted-foreground text-xs"><span>Ongkir + admin</span><span>{rp(Number(form.ongkir || 0) + Number(form.biaya_admin || 0))}</span></div>
              <div className="flex justify-between font-bold border-t border-border mt-1 pt-1"><span>Total dibayar</span><span>{rp(totalBayar)}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPesanOpen(false)}>Batal</Button>
            <Button onClick={simpanPesanan} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Simpan Pesanan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog penerimaan ── */}
      <Dialog open={!!terimaTarget} onOpenChange={(v) => !v && setTerimaTarget(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Barang Datang</DialogTitle></DialogHeader>
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Isi jumlah yang benar-benar datang. Selisihnya otomatis kembali ke daftar belanja.
              Tanggal kedaluwarsa jadi dasar urutan pengambilan stok.
            </span>
          </div>
          <div className="space-y-2">
            {(terimaTarget?.items || []).map((it, idx) => (
              <div key={idx} className="rounded-lg border border-border p-2 space-y-1.5">
                <p className="text-sm font-medium">{it.nama_barang}
                  <span className="text-xs text-muted-foreground"> · pesan {it.jumlah_pesan} {it.satuan}</span>
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[11px] text-muted-foreground mb-0.5">Jumlah datang</p>
                    <Input type="number" className="h-8 text-xs"
                      value={terimaForm[idx]?.diterima ?? 0}
                      onChange={(e) => setTerimaForm((f) => ({ ...f, [idx]: { ...f[idx], diterima: e.target.value } }))} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-muted-foreground mb-0.5">Kedaluwarsa</p>
                    <Input type="date" className="h-8 text-xs"
                      value={terimaForm[idx]?.expired || ""}
                      onChange={(e) => setTerimaForm((f) => ({ ...f, [idx]: { ...f[idx], expired: e.target.value } }))} />
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input type="checkbox" checked={!!terimaForm[idx]?.per_butir}
                    onChange={(e) => setTerimaForm((f) => ({ ...f, [idx]: { ...f[idx], per_butir: e.target.checked } }))} />
                  Cetak label per butir ({terimaForm[idx]?.diterima || 0} label)
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerimaTarget(null)}>Batal</Button>
            <Button onClick={prosesTerima} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Terima & Tambah Stok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
