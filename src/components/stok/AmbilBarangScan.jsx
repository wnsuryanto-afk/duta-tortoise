/**
 * AmbilBarangScan — ambil barang dari gudang dengan memindai QR-nya.
 *
 * Ini sisi yang hilang dari aplikasi. Sampai 31 Agustus 2026 tidak ada SATU PUN
 * catatan barang keluar; stok hanya bisa naik. Formulir pergerakan stok yang
 * lama sebenarnya ada, tapi menuntut memilih barang dari daftar 125 baris,
 * mengetik harga, dan memilih jenis transaksi — di depan rak, sambil memegang
 * botol, dengan satu tangan. Yang tidak dipakai bukan berarti tidak
 * dibutuhkan; ia cuma terlalu mahal untuk dipakai.
 *
 * Layar ini menukar semua itu dengan satu pindaian:
 *
 *   pindai label rak / label batch → barangnya ketemu → isi jumlah →
 *   pilih keperluan → (kalau untuk pengobatan) pindai atau pilih kuranya →
 *   simpan
 *
 * Yang tercatat sekali simpan:
 *   - StockMovement "keluar": siapa yang mengambil (by_email/by_name diambil
 *     dari yang sedang login, tidak bisa diketik sendiri), berapa, untuk apa,
 *     untuk kura mana, dan berapa nilainya.
 *   - Stok barangnya berkurang.
 *   - Sisa batch berkurang, bila yang dipindai label batch.
 *   - Biaya obatnya menempel ke kura, dan ikut terhitung di harga pokoknya.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Loader2, PackageMinus, AlertTriangle, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import QRScannerDialog from "@/components/stock/QRScannerDialog";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { diPeternakan } from "@/lib/populasiKura";
import {
  KEPERLUAN_GUDANG,
  perluPilihKura,
  nilaiPengambilan,
  cariDariPindaian,
} from "@/lib/pemakaianBarang";
import { statusKedaluwarsaBatch, alasanKedaluwarsaBatch } from "@/lib/kedaluwarsaBatch";

const rp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
const hariIni = () => new Date().toISOString().split("T")[0];

export default function AmbilBarangScan({ trigger = "button", onSelesai }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();

  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanUntuk, setScanUntuk] = useState("barang"); // "barang" | "kura"
  const [item, setItem] = useState(null);
  const [batch, setBatch] = useState(null);
  const [menandaiBuka, setMenandaiBuka] = useState(false);
  const [jumlah, setJumlah] = useState(1);
  const [keperluan, setKeperluan] = useState("pengobatan_kura");
  const [kodeKura, setKodeKura] = useState("");
  const [catatan, setCatatan] = useState("");
  const [pesan, setPesan] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  const { data: warehouse = [] } = useQuery({
    queryKey: ["warehouse-items", "-name", 500],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 500),
    enabled: open,
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["batch-barang"],
    queryFn: () => base44.entities.BatchBarang.list("-tanggal_terima", 500),
    enabled: open,
  });
  const { data: kuraSemua = [] } = useQuery({
    queryKey: ["tortoises", "-code", 500],
    queryFn: () => base44.entities.Tortoise.list("-code", 500),
    enabled: open,
  });

  const kuraAktif = useMemo(() => kuraSemua.filter(diPeternakan), [kuraSemua]);

  const reset = () => {
    setItem(null); setBatch(null); setJumlah(1);
    setKeperluan("pengobatan_kura"); setKodeKura(""); setCatatan(""); setPesan("");
  };

  const handleScan = (teks) => {
    if (scanUntuk === "kura") {
      // Label kura bisa berisi kodenya langsung. Kalau tidak ketemu di daftar,
      // tetap diisi apa adanya supaya orangnya bisa memperbaiki, bukan
      // dibuang diam-diam.
      const cocok = kuraAktif.find((k) => (k.code || "").toUpperCase() === String(teks || "").toUpperCase());
      setKodeKura(cocok?.code || String(teks || "").toUpperCase());
      return;
    }
    const hasil = cariDariPindaian(teks, warehouse, batches);
    if (!hasil.item) {
      setPesan(`Kode "${hasil.kode}" tidak ada di gudang. Periksa labelnya, atau barangnya memang belum terdaftar.`);
      setItem(null); setBatch(null);
      return;
    }
    setPesan("");
    setItem(hasil.item);
    setBatch(hasil.batch);
    setJumlah(1);
  };

  const nilai = item ? nilaiPengambilan(item, jumlah) : { hargaSatuan: 0, total: 0 };
  const stokSekarang = Number(item?.current_stock) || 0;
  const jumlahAngka = Number(jumlah) || 0;
  const stokKurang = item && jumlahAngka > stokSekarang;
  const butuhKura = perluPilihKura(keperluan);
  const siapMenyimpan =
    item && jumlahAngka > 0 && !stokKurang && (!butuhKura || !!kodeKura) && !menyimpan;

  const simpan = async () => {
    if (!siapMenyimpan) return;
    setMenyimpan(true);
    try {
      // by_email diisi dari sesi yang sedang login, BUKAN dari kolom isian.
      // Inti permintaannya adalah tahu siapa yang mengambil; kolom yang bisa
      // diketik sendiri membuat jawabannya bisa salah tanpa niat buruk.
      await base44.entities.StockMovement.create({
        item_id: item.id,
        item_type: "warehouse",
        item_name: item.name,
        item_sku: item.sku || "",
        type: "keluar",
        quantity: jumlahAngka,
        unit: item.unit || "pcs",
        unit_price: nilai.hargaSatuan,
        total_value: nilai.total,
        stock_after: stokSekarang - jumlahAngka,
        keperluan,
        tortoise_code: butuhKura ? kodeKura : "",
        date: hariIni(),
        status: "selesai",
        by_email: user?.email || "",
        by_name: user?.full_name || user?.email || "",
        notes:
          (batch ? `Dari batch ${batch.batch_code}. ` : "") +
          (catatan || "") ||
          (batch ? `Dari batch ${batch.batch_code}.` : ""),
      });

      await base44.entities.WarehouseItem.update(item.id, {
        current_stock: stokSekarang - jumlahAngka,
      });

      if (batch) {
        await base44.entities.BatchBarang.update(batch.id, {
          jumlah_sisa: Math.max(0, (Number(batch.jumlah_sisa) || 0) - jumlahAngka),
        });
      }

      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["batch-barang"] });

      toast.success(
        `${jumlahAngka} ${item.unit || "pcs"} ${item.name} keluar${butuhKura ? ` untuk ${kodeKura}` : ""} — ${rp(nilai.total)}`
      );
      reset();
      setOpen(false);
      onSelesai?.();
    } catch (e) {
      setPesan("Gagal menyimpan: " + (e?.message || ""));
    }
    setMenyimpan(false);
  };

  return (
    <>
      {trigger === "button" ? (
        <Button type="button" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
          <ScanLine className="w-4 h-4" /> Ambil Barang (scan)
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors text-left"
        >
          <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <QrCode className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Ambil Barang dari Gudang</span>
            <span className="block text-xs text-muted-foreground">Pindai label, isi jumlah — tercatat atas nama Anda</span>
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageMinus className="w-5 h-5 text-primary" /> Ambil Barang dari Gudang
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              type="button"
              className="w-full gap-2"
              onClick={() => { setScanUntuk("barang"); setScanOpen(true); }}
            >
              <QrCode className="w-4 h-4" /> {item ? "Pindai barang lain" : "Pindai label barang"}
            </Button>

            {pesan && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">{pesan}</p>
              </div>
            )}

            {item && (
              <>
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">{item.name}</p>
                    <Badge variant="outline" className="font-mono text-[10px] flex-shrink-0">{item.sku}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stok sekarang <strong className="text-foreground">{stokSekarang} {item.unit}</strong>
                    {" · "}{rp(item.purchase_price)} per {item.unit}
                  </p>
                  {batch && (
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Batch {batch.batch_code} · sisa {batch.jumlah_sisa} {batch.satuan || item.unit}
                    </p>
                  )}
                </div>

                {/*
                  Peringatan kedaluwarsa ditampilkan DI SINI, pada satu-satunya
                  saat orangnya memegang botolnya. Tanggal yang cuma tersimpan
                  di basis data tidak pernah menghentikan siapa pun.

                  Untuk botol multi-dosis yang berlaku adalah mana yang lebih
                  dulu tiba: tanggal cetak, atau tanggal dibuka + masa pakainya.
                  Aturannya satu, di lib/kedaluwarsaBatch.js.
                */}
                {batch && (
                  <div className="space-y-2">
                    {(() => {
                      const st = statusKedaluwarsaBatch(batch, item);
                      const warna =
                        st.keadaan === "lewat"
                          ? "bg-red-50 border-red-300 text-red-800"
                          : st.keadaan === "segera"
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : "bg-muted/40 border-border text-muted-foreground";
                      return (
                        <div className={`rounded-lg border p-2.5 text-xs ${warna}`}>
                          {st.keadaan === "lewat" && (
                            <p className="font-semibold mb-0.5">JANGAN DIPAKAI — periksa dulu ke dokter hewan.</p>
                          )}
                          {alasanKedaluwarsaBatch(batch, item)}
                        </div>
                      );
                    })()}

                    {!batch.tanggal_buka && Number(item.hari_pakai_setelah_dibuka) > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={menandaiBuka}
                        onClick={async () => {
                          setMenandaiBuka(true);
                          const tgl = hariIni();
                          try {
                            await base44.entities.BatchBarang.update(batch.id, { tanggal_buka: tgl });
                            setBatch((b) => ({ ...b, tanggal_buka: tgl }));
                            qc.invalidateQueries({ queryKey: ["batch-barang"] });
                            toast.success(`Botol ditandai dibuka ${tgl}`);
                          } catch (e) {
                            toast.error("Gagal menandai: " + (e?.message || ""));
                          }
                          setMenandaiBuka(false);
                        }}
                      >
                        {menandaiBuka && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                        Botol ini baru dibuka hari ini
                      </Button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-medium mb-1">Jumlah diambil</p>
                    <Input
                      type="number" min={0} step="any"
                      value={jumlah}
                      onChange={(e) => setJumlah(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">Nilai</p>
                    <div className="h-10 flex items-center px-3 rounded-lg border border-border bg-muted/30 text-sm font-mono">
                      {rp(nilai.total)}
                    </div>
                  </div>
                </div>

                {stokKurang && (
                  <p className="text-xs text-red-600">
                    Stok tercatat cuma {stokSekarang} {item.unit}. Kalau di rak sebenarnya lebih banyak,
                    berarti ada penerimaan yang belum dicatat — perbaiki dulu di sana, jangan dipaksakan di sini.
                  </p>
                )}

                <div>
                  <p className="text-xs font-medium mb-1">Untuk keperluan</p>
                  <Select value={keperluan} onValueChange={(v) => { setKeperluan(v); if (!perluPilihKura(v)) setKodeKura(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KEPERLUAN_GUDANG.map((k) => (
                        <SelectItem key={k.nilai} value={k.nilai}>{k.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {butuhKura && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">Untuk kura mana</p>
                    <div className="flex gap-2">
                      <Select value={kodeKura || undefined} onValueChange={setKodeKura}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih kura" /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {kuraAktif
                            .slice()
                            .sort((a, b) => (a.code || "").localeCompare(b.code || ""))
                            .map((k) => (
                              <SelectItem key={k.id} value={k.code}>
                                {k.code}{k.name ? ` — ${k.name}` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button" variant="outline" size="icon"
                        onClick={() => { setScanUntuk("kura"); setScanOpen(true); }}
                        aria-label="Pindai kode kura"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                      {kodeKura && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setKodeKura("")} aria-label="Kosongkan">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Biaya {rp(nilai.total)} ini akan menempel ke harga pokok kura tersebut.
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium mb-1">Catatan (opsional)</p>
                  <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. dosis kedua, luka tempurung" />
                </div>

                <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-[11px] text-muted-foreground">
                  Tercatat atas nama <strong className="text-foreground">{user?.full_name || user?.email || "—"}</strong>.
                  Nama pengambil diambil dari akun yang sedang dipakai, tidak bisa diketik sendiri.
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={menyimpan}>Batal</Button>
            <Button onClick={simpan} disabled={!siapMenyimpan} className="gap-1.5">
              {menyimpan ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageMinus className="w-4 h-4" />}
              Catat Pengambilan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QRScannerDialog open={scanOpen} onClose={() => setScanOpen(false)} onResult={handleScan} />
    </>
  );
}
