import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, ShieldCheck, Info, TriangleAlert } from "lucide-react";
import { base44, BATAS_AMBIL } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/common/PageHeader";
import { rupiah } from "@/lib/rupiah";
import { LABEL_SPESIES, LABEL_SUMBER, judulKura } from "@/lib/labelKura";
import {
  perSumberHargaBeli, kelengkapanHargaBeli, muatanIsian,
  bacaAngkaRupiah, JENIS_HARGA, JENIS_SENDIRI,
} from "@/lib/hargaBeliKura";

/**
 * IsiHargaBeliPage — harga beli 44 kura, sekaligus.
 *
 * ── Kenapa layar ini ada ────────────────────────────────────────────────────
 *
 * Harga beli diminta pemiliknya 18 Okt 2026 untuk menentukan HPP saat kura
 * dijual. Kolomnya dibuat hari itu dan pemeriksa kelengkapannya ikut
 * menandai, tetapi satu-satunya tempat mengisinya adalah dialog kura satu
 * per satu — 44 kali buka-tutup untuk pekerjaan yang isinya empat angka
 * berbeda.
 *
 * Dan ada akibat kedua yang baru terlihat sehari kemudian, saat kartu
 * Rincian Estimasi Aset dijalankan terhadap kawanan sebenarnya: selisih
 * nilai terhadap modal hanya bisa dihitung dari 91 ekor yang punya KEDUA
 * angkanya. Empat puluh empat ekor berada di luar perbandingan itu, bukan
 * karena nilainya tidak diketahui — seluruh 135 ekor sudah berharga —
 * melainkan karena biayanya tidak pernah dicatat.
 *
 * ── Kenapa subtotal per rombongan ditampilkan ───────────────────────────────
 *
 * Berbeda dari isian harga barang, di sini yang diisi langsung jadi modal:
 * satu ekor satu angka, tanpa dikali stok. Yang mudah salah justru
 * sebaliknya — mengetukkan satu harga ke seluruh rombongan tanpa melihat
 * berapa jadinya. Dua puluh dua ekor pada Rp 8 juta adalah Rp 176 juta, dan
 * angka itu harus terlihat SEBELUM disimpan.
 *
 * ── Dua jawaban per baris, dan kenapa yang kedua membawa tanggal ────────────
 *
 * Tiga belas dari 44 ekor bersumber "tidak diketahui" — deretan F, HF, H,
 * RD, 8BESAR, 8KECIL, A38, A41 — dan pemiliknya (19 Okt 2026) menjawab
 * bahwa mereka campur: "saya tentukan satu per satu". Jadi tiap baris bisa
 * dijawab dua cara: harga belinya, atau pernyataan bahwa kura itu hasil
 * tetasan sendiri.
 *
 * Jawaban kedua WAJIB membawa tanggal menetas. Mengubah `source` memang
 * menghapus tagihan harga belinya, tetapi ia juga memindahkan hitungan umur
 * di peternakan dari `purchase_date` ke `birth_date` — dan untuk ketiga belas
 * kura itu birth_date juga kosong. Tanpa tanggalnya, HPP mereka kehilangan
 * seluruh biaya pemeliharaan tanpa satu pun tanda. Barisnya tidak dihitung
 * siap disimpan sampai tanggalnya ada, dan sebabnya tertulis di barisnya.
 */

/* Isian satu baris: { jenis, harga, lahir }. Bentuknya satu objek, bukan tiga
   peta terpisah, supaya mengganti jenis tidak pernah meninggalkan sisa isian
   jenis sebelumnya di tempat yang tidak terlihat. */
const isiBaris = (draf, id) => draf[id] || { jenis: JENIS_HARGA, harga: "", lahir: "" };

/** Keterangan sebaris seekor kura: ukuran, kelamin, spesies bila bukan sulcata. */
function rincianKura(k) {
  const bagian = [];
  if (k.shell_length_cm) bagian.push(`${k.shell_length_cm} cm`);
  if (k.gender && k.gender !== "belum_diketahui") bagian.push(k.gender);
  if (k.is_proven) bagian.push("proven");
  if (k.species && k.species !== "sulcata") bagian.push(judulKura(LABEL_SPESIES, k.species));
  return bagian.join(" · ") || "belum ada keterangan";
}

export default function IsiHargaBeliPage() {
  const qc = useQueryClient();
  const [draf, setDraf] = useState({});
  const [menyimpan, setMenyimpan] = useState(false);

  const { data: kura = [], isLoading } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", BATAS_AMBIL),
  });

  const lengkap = useMemo(() => kelengkapanHargaBeli(kura), [kura]);
  const perSumber = useMemo(() => perSumberHargaBeli(kura), [kura]);
  const kosong = useMemo(() => perSumber.flatMap((g) => g.isi), [perSumber]);

  /* Satu sumber kebenaran untuk "baris ini siap" dan "apa yang dikirim":
     tombol Simpan dan muatannya harus setuju. */
  const niat = useMemo(() => {
    const peta = new Map();
    for (const k of kosong) peta.set(k.id, muatanIsian(isiBaris(draf, k.id), k));
    return peta;
  }, [kosong, draf]);

  const terisi = useMemo(() => kosong.filter((k) => niat.get(k.id)?.siap), [kosong, niat]);
  const terisiHarga = useMemo(
    () => terisi.filter((k) => niat.get(k.id)?.jenis === JENIS_HARGA),
    [terisi, niat],
  );
  const terisiSendiri = terisi.length - terisiHarga.length;
  const tambahan = useMemo(
    () => terisiHarga.reduce((s, k) => s + bacaAngkaRupiah(isiBaris(draf, k.id).harga), 0),
    [terisiHarga, draf],
  );

  const ubahBaris = (id, bagian) =>
    setDraf((p) => ({ ...p, [id]: { ...isiBaris(p, id), ...bagian } }));

  /* Isian massal hanya menyentuh baris yang masih berjenis harga: baris yang
     sudah dinyatakan hasil sendiri tidak boleh diam-diam diberi harga beli
     oleh satu ketukan pada kepala rombongan. */
  const setSerombongan = (isi, nilai) =>
    setDraf((p) => {
      const baru = { ...p };
      for (const k of isi) {
        const kini = isiBaris(p, k.id);
        if (kini.jenis === JENIS_SENDIRI) continue;
        baru[k.id] = { ...kini, jenis: JENIS_HARGA, harga: nilai };
      }
      return baru;
    });

  const simpan = async () => {
    if (terisi.length === 0) return;
    setMenyimpan(true);
    let berhasil = 0;
    try {
      for (const k of terisi) {
        await base44.entities.Tortoise.update(k.id, niat.get(k.id).muatan);
        berhasil += 1;
      }
      toast.success(
        terisiSendiri > 0
          ? `${berhasil} kura disimpan — ${terisiHarga.length} harga beli, ${terisiSendiri} hasil sendiri`
          : `${berhasil} harga beli disimpan`,
      );
      setDraf({});
      qc.invalidateQueries({ queryKey: ["tortoises"] });
      qc.invalidateQueries({ queryKey: ["owner-tortoises"] });
    } catch (e) {
      const pesan = e?.message || "kesalahan tidak diketahui";
      /* Sebagian sudah tersimpan — disebutkan, supaya yang mengisi tahu
         harus mengulang dari mana, bukan mengulang semuanya. */
      toast.error(berhasil > 0 ? `${berhasil} tersimpan, lalu gagal: ${pesan}` : `Gagal menyimpan: ${pesan}`);
      qc.invalidateQueries({ queryKey: ["tortoises"] });
      qc.invalidateQueries({ queryKey: ["owner-tortoises"] });
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Isi Harga Beli Kura"
        subtitle="Modal per ekor — dasar HPP dan selisih nilai aset"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground px-1">Memuat…</p>
      ) : kosong.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Semua kura yang dibeli sudah ada harga belinya</p>
          <p className="text-xs mt-1">{lengkap.dari} ekor dibeli, tidak ada yang tertinggal.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <b className="text-foreground tabular-nums">{lengkap.kosong} dari {lengkap.dari}</b> kura yang DIBELI belum ada
              harga belinya. Anakan hasil tetasan sendiri tidak dihitung di sini — modalnya biaya induk, bukan harga beli.
            </p>
            <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${lengkap.persen}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Ini angka yang menahan satu hitungan lain: selisih nilai aset terhadap modal di beranda hanya
                dihitung dari kura yang punya <b>kedua</b> angkanya. Selama {lengkap.kosong} ekor ini kosong,
                ke-{lengkap.kosong} ekor itu berada di luar perbandingan.
              </span>
            </p>
            {/* Nol disebut lebih dulu, bukan disembunyikan: tanpa itu, kura
                hadiah dan kura yang harganya tidak bisa lagi ditelusuri akan
                dibiarkan kosong selamanya. */}
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5 flex items-start gap-1.5">
              <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                Isi <b className="text-foreground">0</b> untuk hadiah, warisan, atau kura yang harga belinya tidak
                bisa lagi ditelusuri. Nol adalah jawaban yang sah dan menghentikan penandaannya — dibiarkan kosong
                tidak.
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
            <p className="text-xs text-muted-foreground">
              {terisi.length === 0
                ? "Belum ada yang diisi."
                : <>
                    {terisi.length} kura siap
                    {terisiSendiri > 0 && <> ({terisiHarga.length} berharga, {terisiSendiri} hasil sendiri)</>}
                    {" · modal bertambah "}
                    <b className="text-foreground tabular-nums">{rupiah(tambahan)}</b>
                  </>}
            </p>
            <Button size="sm" className="gap-1.5" disabled={terisi.length === 0 || menyimpan} onClick={simpan}>
              <Save className="w-4 h-4" /> {menyimpan ? "Menyimpan…" : `Simpan ${terisi.length || ""}`}
            </Button>
          </div>

          {perSumber.map((g) => {
            const diisiGrup = g.isi.filter((k) => niat.get(k.id)?.jenis === JENIS_HARGA && niat.get(k.id)?.siap);
            const totalGrup = diisiGrup.reduce((s, k) => s + bacaAngkaRupiah(isiBaris(draf, k.id).harga), 0);
            return (
              <div key={g.sumber}>
                <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    {judulKura(LABEL_SUMBER, g.sumber)} · {g.isi.length} ekor
                  </p>
                  {/* Hasil kali rombongan tampil di samping judulnya, karena
                      itu satu-satunya tempat kesalahan isian massal terlihat
                      sebelum disimpan. */}
                  {diisiGrup.length > 0 && (
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {diisiGrup.length} diisi = <b className="text-foreground">{rupiah(totalGrup)}</b>
                    </p>
                  )}
                </div>

                {/* Satu rombongan biasanya seharga; satu angka menutup
                    belasan ekor, dan tetap bisa diubah per ekor. */}
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-2.5 mb-2 flex items-end gap-2 flex-wrap">
                  <div className="min-w-0 flex-1" style={{ minWidth: "132px" }}>
                    <label className="text-[11px] text-muted-foreground" htmlFor={`semua-${g.sumber}`}>
                      Satu harga untuk {g.isi.length} ekor
                    </label>
                    <Input
                      id={`semua-${g.sumber}`}
                      type="number" inputMode="numeric" min="0" placeholder="Rp"
                      className="mt-0.5 h-9"
                      onChange={(e) => setSerombongan(g.isi, e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="outline" className="h-9 flex-shrink-0"
                    onClick={() => setSerombongan(g.isi, "")}>
                    Kosongkan
                  </Button>
                </div>

                <div className="space-y-2">
                  {g.isi.map((k) => {
                    const isi = isiBaris(draf, k.id);
                    const n = niat.get(k.id);
                    const sendiri = isi.jenis === JENIS_SENDIRI;
                    return (
                      <div key={k.id} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-end justify-between gap-2 flex-wrap">
                          <div className="min-w-0 flex-1" style={{ minWidth: "120px" }}>
                            <p className="text-sm font-medium text-foreground break-words">{k.code || k.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 break-words">{rincianKura(k)}</p>
                          </div>
                          <div className="flex-shrink-0" style={{ width: "132px" }}>
                            <label className="text-[11px] text-muted-foreground" htmlFor={sendiri ? `lahir-${k.id}` : `harga-${k.id}`}>
                              {sendiri ? "Tanggal menetas" : "Harga beli"}
                            </label>
                            {sendiri ? (
                              <Input
                                id={`lahir-${k.id}`} type="date" className="mt-0.5 h-9"
                                value={isi.lahir}
                                onChange={(e) => ubahBaris(k.id, { lahir: e.target.value })}
                              />
                            ) : (
                              <Input
                                id={`harga-${k.id}`} type="number" inputMode="numeric" min="0" placeholder="Rp"
                                className="mt-0.5 h-9"
                                value={isi.harga}
                                onChange={(e) => ubahBaris(k.id, { harga: e.target.value })}
                              />
                            )}
                          </div>
                        </div>

                        {/* Jawaban kedua. Diletakkan sebagai tombol kecil, bukan
                            pilihan setara: dari 44 ekor, yang benar-benar hasil
                            tetasan sendiri cuma sebagian deretan F dan HF —
                            menaruhnya sejajar akan membuat 31 baris lain
                            menawarkan jawaban yang salah untuk mereka. */}
                        <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
                          <button type="button"
                            className="text-[11px] text-primary hover:underline"
                            onClick={() => ubahBaris(k.id, { jenis: sendiri ? JENIS_HARGA : JENIS_SENDIRI })}>
                            {sendiri ? "← Ternyata dibeli, isi harganya" : "Bukan dibeli — hasil tetasan sendiri"}
                          </button>
                          {sendiri && !n?.siap && (
                            <span className="text-[11px] text-amber-700 dark:text-amber-400">
                              {n?.sebab}
                            </span>
                          )}
                        </div>

                        {/* Sebabnya ditulis sekali, di baris yang pertama kali
                            memintanya — bukan di keterangan halaman yang sudah
                            dilewati saat orang sampai ke sini. */}
                        {sendiri && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">
                            Tanggal menetas dipakai menghitung umur di peternakan, dan HPP kura hasil sendiri
                            dihitung dari situ — bukan dari tanggal beli. Tanpa tanggalnya, biaya pemeliharaannya
                            hilang dari HPP tanpa tanda apa pun, jadi barisnya belum bisa disimpan.
                            {!String(k.asal_genetik || "").trim() && " Asal genetiknya ikut diisi CB."}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
