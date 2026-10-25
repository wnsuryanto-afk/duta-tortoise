import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, PackageCheck, Info } from "lucide-react";
import { base44, BATAS_AMBIL } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/common/PageHeader";
import { rupiah } from "@/lib/rupiah";
import { barangPerluHarga, barangTanpaHarga, hargaPerkiraan, GOLONGAN_BARANG } from "@/lib/hargaBarang";

/**
 * IsiHargaBarangPage — mengisi harga beli banyak barang sekaligus.
 *
 * ── Kenapa layar tersendiri ─────────────────────────────────────────────────
 *
 * 18 Okt 2026, 53 dari 87 barang bergudang punya stok tetapi harga belinya
 * Rp 0 — termasuk 18 dari 21 alat kerja. Akibatnya modal alat peternakan
 * praktis hanya lampu UVB, dan kolom Modal Kerja di beranda menyebut angka
 * yang jauh di bawah kenyataan.
 *
 * Membukanya satu per satu lewat dialog Gudang berarti 53 kali buka-tutup.
 * Pemiliknya meminta dua jalan sekaligus: isian massal DAN isian satuan.
 * Yang satuan sudah ada di dialog Gudang; ini yang massal.
 *
 * ── Kenapa subtotal ditampilkan per baris ───────────────────────────────────
 *
 * Yang diisi harga SATUAN, yang masuk modal stok × harga. Dua angka itu
 * berbeda jauh pada barang bersisa banyak — 15 botol Stone Breaker pada
 * Rp 20.000 adalah Rp 300.000, bukan Rp 20.000. Menampilkan hasil kalinya
 * sambil diketik membuat salah ketik sepuluh kali lipat langsung terlihat,
 * dan itu kesalahan yang paling sering terjadi pada isian massal.
 *
 * ── Kenapa yang berharga TAKSIRAN ikut ditampilkan ──────────────────────────
 *
 * 25-10-2026 pemilik meminta ke-53 barang itu diisi harga pasaran saja, dan
 * dikoreksi belakangan. Permintaannya dipenuhi — tetapi saringan layar ini
 * dulu `purchase_price === 0`, jadi begitu ke-53 terisi layarnya menjadi
 * KOSONG dan tautannya hilang dari beranda. Jalan koreksi yang menutup
 * dirinya sendiri begitu dipakai sekali sama saja dengan tidak ada, dan
 * "nanti dikoreksi" berubah jadi tidak pernah.
 *
 * Jadi yang ditampilkan di sini ada dua macam: yang belum ada harganya, dan
 * yang harganya masih taksiran. Keduanya dibedakan dengan jelas — yang
 * taksiran membawa angkanya sekarang sebagai titik awal, supaya mengoreksinya
 * berarti mengubah angka, bukan mengetik dari nol.
 */

export default function IsiHargaBarangPage() {
  const qc = useQueryClient();
  const [draf, setDraf] = useState({});
  const [menyimpan, setMenyimpan] = useState(false);

  const { data: barang = [], isLoading } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", BATAS_AMBIL),
  });

  const kosong = useMemo(() => barangPerluHarga(barang), [barang]);
  const belumAda = useMemo(() => barangTanpaHarga(barang), [barang]);
  const taksiran = useMemo(() => kosong.filter(hargaPerkiraan), [kosong]);
  const berstok = useMemo(() => barang.filter((b) => Number(b?.current_stock) > 0), [barang]);

  /* Dikelompokkan supaya alat kerja — yang paling banyak kosong — bisa
     diselesaikan sekali duduk tanpa diselingi obat dan vitamin. */
  const perGolongan = useMemo(() => {
    const peta = new Map();
    for (const b of kosong) {
      const g = GOLONGAN_BARANG[b.category] || "Lain-lain";
      if (!peta.has(g)) peta.set(g, []);
      peta.get(g).push(b);
    }
    return [...peta.entries()]
      .map(([nama, isi]) => ({ nama, isi: isi.sort((a, b) => String(a.name).localeCompare(String(b.name))) }))
      .sort((a, b) => b.isi.length - a.isi.length);
  }, [kosong]);

  const angkaDraf = (id) => (id in draf ? draf[id] : "");
  const bacaAngka = (v) => {
    const t = String(v ?? "").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const terisi = useMemo(
    () => kosong.filter((b) => bacaAngka(angkaDraf(b.id)) !== null),
    [kosong, draf],
  );

  /* Berapa modal yang akan bertambah — stok × harga, bukan harga saja. */
  const tambahan = useMemo(
    () => terisi.reduce((s, b) => s + Number(b.current_stock || 0) * bacaAngka(angkaDraf(b.id)), 0),
    [terisi, draf],
  );

  const simpan = async () => {
    if (terisi.length === 0) return;
    setMenyimpan(true);
    let berhasil = 0;
    try {
      for (const b of terisi) {
        /* harga_perkiraan dimatikan: angka yang diketik orang di layar ini
           adalah pernyataannya sendiri, bukan taksiran aplikasi lagi. */
        await base44.entities.WarehouseItem.update(b.id, {
          purchase_price: bacaAngka(angkaDraf(b.id)),
          harga_perkiraan: false,
        });
        berhasil += 1;
      }
      toast.success(`${berhasil} harga barang disimpan`);
      setDraf({});
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    } catch (e) {
      /* Sebagian sudah tersimpan sebelum gagal — disebutkan, bukan
         disembunyikan, supaya yang mengisi tahu harus mengulang dari mana. */
      const pesan = e?.message || "";
      toast.error(
        berhasil > 0
          ? `${berhasil} tersimpan, lalu gagal: ${pesan || "kesalahan tidak diketahui"}`
          : `Gagal menyimpan: ${pesan || "kesalahan tidak diketahui"}`,
      );
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Isi Harga Barang"
        subtitle="Barang yang ada stoknya tapi harganya belum ada atau masih taksiran"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground px-1">Memuat…</p>
      ) : kosong.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <PackageCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Semua harga barang bergudang sudah pasti</p>
          <p className="text-xs mt-1">{berstok.length} barang berstok, tidak ada yang kosong maupun taksiran.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <b className="text-foreground tabular-nums">{kosong.length} dari {berstok.length}</b> barang berstok
              harganya belum pasti{belumAda.length > 0 && taksiran.length > 0
                ? <> — {belumAda.length} belum ada sama sekali, {taksiran.length} masih taksiran</>
                : taksiran.length > 0
                  ? <> — semuanya masih taksiran, menunggu dicocokkan dengan nota</>
                  : null}.
              Yang diisi harga <b>satuan</b>; yang masuk modal adalah stok × harga, dan hasil kalinya tampil di sebelah kanan
              tiap baris begitu diketik.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Tidak perlu diisi semuanya sekarang. Yang dikosongkan tetap seperti sekarang. Begitu
                sebuah harga diketik di sini, ia berhenti dihitung sebagai taksiran — jadi isilah dari
                nota atau dari yang Anda ingat betul, bukan dari kira-kira.
              </span>
            </p>
          </div>

          {/* ── Bilah simpan ──────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-2 flex-wrap sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
            <p className="text-xs text-muted-foreground">
              {terisi.length === 0
                ? "Belum ada yang diisi."
                : <>{terisi.length} barang diisi · modal bertambah <b className="text-foreground tabular-nums">{rupiah(tambahan)}</b></>}
            </p>
            <Button size="sm" className="gap-1.5" disabled={terisi.length === 0 || menyimpan} onClick={simpan}>
              <Save className="w-4 h-4" /> {menyimpan ? "Menyimpan…" : `Simpan ${terisi.length || ""}`}
            </Button>
          </div>

          {perGolongan.map((g) => (
            <div key={g.nama}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                {g.nama} · {g.isi.length} barang
              </p>
              <div className="space-y-2">
                {g.isi.map((b) => {
                  const harga = bacaAngka(angkaDraf(b.id));
                  const sub = harga === null ? null : Number(b.current_stock || 0) * harga;
                  return (
                    <div key={b.id} className="rounded-xl border border-border bg-card p-3">
                      <p className="text-sm font-medium text-foreground break-words">{b.name}</p>
                      {hargaPerkiraan(b) && (
                        <p className="text-[11px] text-amber-700 leading-snug mt-0.5">
                          Sekarang <b className="tabular-nums">{rupiah(b.purchase_price)}</b> per {b.unit || "satuan"} —
                          taksiran harga pasaran, bukan dari nota. Ganti dengan angka yang sebenarnya.
                        </p>
                      )}
                      <div className="flex items-end gap-2 mt-2 flex-wrap">
                        <div className="min-w-0 flex-1" style={{ minWidth: "128px" }}>
                          <label className="text-[11px] text-muted-foreground">Harga per {b.unit || "satuan"}</label>
                          <Input
                            type="number" inputMode="numeric" min="0" placeholder="Rp"
                            className="mt-0.5 h-9"
                            value={angkaDraf(b.id)}
                            onChange={(e) => setDraf((p) => ({ ...p, [b.id]: e.target.value }))}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground tabular-nums pb-2 flex-shrink-0">
                          × {b.current_stock} {b.unit || ""}
                          {sub !== null && <> = <b className="text-foreground">{rupiah(sub)}</b></>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
