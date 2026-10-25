import { Link } from "react-router-dom";
import { rupiah } from "@/lib/rupiah";

/**
 * KartuModalAset — modal kerja dan estimasi total aset, berdampingan.
 *
 * ── Kenapa keduanya satu komponen ───────────────────────────────────────────
 *
 * Diminta pemiliknya 18 Okt 2026. Keduanya berdampingan karena SELISIHNYA
 * yang jadi kabarnya: modal adalah yang sudah keluar, estimasi adalah yang
 * dipegang sekarang. Memisahkannya ke dua tempat berbeda membuat satu-satunya
 * angka yang penting harus dihitung di kepala pembacanya.
 *
 * ── Kenapa dikeluarkan dari OwnerDashboard ──────────────────────────────────
 *
 * Bukan demi kerapian. Selama markup-nya tinggal di dalam beranda, satu-satunya
 * cara penjaga lebar menggambarnya adalah lewat kasus "OwnerDashboard tanpa
 * data" — dan tanpa data berarti `modal.barangPerkiraan` nol, `aset.adaRentang`
 * false, dan semua angka rupiah Rp 0. Jadi justru bentuk-bentuk yang paling
 * mungkin meluap — "Rp 1.354.818.451", rentang "Rp 1,67 M – Rp 2,03 M", dan
 * baris peringatan taksiran yang baru ditambahkan 25-10-2026 — tidak pernah
 * sekali pun digambar pada lebar mana pun.
 *
 * Sebagai komponen tersendiri ia bisa diberi angka sungguhan di harness, dan
 * cek-lebar/cek-lipat mengukurnya di 280–768px seperti layar lain.
 *
 * ── Bilah persentase itu bukan hiasan ───────────────────────────────────────
 *
 * Modal dihitung dari data yang belum lengkap, dan estimasi dari kawanan yang
 * baru sebagian berharga. Tanpa bilah itu, dua angka setengah jadi akan
 * terbaca sebagai neraca yang utuh.
 *
 * Dan sejak 25-10-2026 bilah modal hanya menghitung harga yang berasal dari
 * NOTA. Hari itu 53 barang diisi harga pasaran atas permintaan pemilik;
 * kalau taksiran ikut dihitung lengkap, bilahnya melompat ke 100% dan
 * berhenti mengatakan satu-satunya hal yang perlu dikatakannya.
 */
export default function KartuModalAset({ modal, aset, asetKura, hargaBarang }) {
  if (!modal || !aset || !asetKura || !hargaBarang) return null;

  return (
    <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Modal Kerja</p>
          <Link to="/finance?tab=pengaturan" className="text-[11px] text-primary hover:underline flex-shrink-0">Atur</Link>
        </div>
        <p className="text-xl font-bold text-foreground tabular-nums mt-1 leading-tight break-words">{rupiah(modal.total)}</p>
        <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${modal.persenLengkap}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
          {modal.persenLengkap}% data terisi — kura {rupiah(modal.bagian[0].nilai)}, alat &amp; vitamin {rupiah(modal.bagian[1].nilai)}
          {modal.kandangBelumDiisi
            ? <>, <span className="text-amber-700 dark:text-amber-400 font-semibold">kandang belum diisi</span></>
            : <>, kandang {rupiah(modal.bagian[2].nilai)}</>}
        </p>
        {/*
          Taksiran disebut terpisah dari kelengkapan, bukan dilebur ke dalamnya.
          Nilainya ikut dihitung — kalau tidak, modal alat kembali terbaca
          nyaris nol — tetapi orang yang membaca angka ini berhak tahu bagian
          mana yang belum berdasar nota.
        */}
        {modal.barangPerkiraan > 0 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
            {modal.barangPerkiraan} barang harganya masih <strong>taksiran pasaran</strong>, belum dari nota —
            nilainya ikut dihitung di atas.
          </p>
        )}
        {/* Jalurnya disebut, bukan dibiarkan dicari sendiri: barang tanpa harga
            adalah sebab terbesar modal alat tampak kecil. */}
        {hargaBarang.kosong > 0 ? (
          <Link to="/isi-harga-barang" className="text-[11px] text-primary hover:underline mt-1 inline-block">
            {hargaBarang.kosong} barang berstok belum ada harganya — isi sekaligus
          </Link>
        ) : hargaBarang.perkiraan > 0 ? (
          /* Tautannya tidak boleh hilang hanya karena kolomnya sudah terisi:
             yang terisi taksiran justru yang paling perlu disentuh lagi, dan
             tanpa pintu ini "nanti dikoreksi" tidak punya tempat dikerjakan. */
          <Link to="/isi-harga-barang" className="text-[11px] text-primary hover:underline mt-1 inline-block">
            {hargaBarang.perkiraan} harga masih taksiran — cocokkan dengan nota
          </Link>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Estimasi Total Aset</p>
          <Link to="/harga-kura" className="text-[11px] text-primary hover:underline flex-shrink-0">Isi harga</Link>
        </div>
        {aset.adaRentang ? (
          <p className="text-xl font-bold text-foreground tabular-nums mt-1 leading-tight break-words">
            {rupiah(aset.min)}{aset.maks !== aset.min && <span className="text-muted-foreground font-normal"> – </span>}
            {aset.maks !== aset.min && rupiah(aset.maks)}
          </p>
        ) : (
          <p className="text-base font-semibold text-muted-foreground mt-1 leading-tight">belum bisa dihitung</p>
        )}
        <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
          <div className="h-full bg-accent rounded-full" style={{ width: `${asetKura.persenTernilai}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
          {asetKura.persenTernilai === 0
            ? <>Belum ada kelompok kura yang diberi harga. Isi dari baris teratas di layar Harga Estimasi Kura.</>
            : <>{asetKura.persenTernilai}% kawanan sudah berharga — {asetKura.ekorTernilai} dari {asetKura.totalEkor} ekor{asetKura.ekorBelum > 0 && <>, {asetKura.ekorBelum} ekor belum</>}</>}
        </p>
      </div>
    </div>
  );
}
