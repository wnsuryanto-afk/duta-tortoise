import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, TrendingUp, AlertTriangle, Ruler } from "lucide-react";
import { base44, BATAS_AMBIL } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/common/PageHeader";
import { rupiah } from "@/lib/rupiah";
import { nilaiAsetKura, hargaBasi, HARI_HARGA_BASI, barisKembarAsal } from "@/lib/hargaEstimasi";
import { Link } from "react-router-dom";
import { LABEL_SPESIES, LABEL_MORPH, LABEL_KELAMIN, LABEL_ASAL, judulKura } from "@/lib/labelKura";

/**
 * HargaKuraPage — perkiraan harga jual per kelompok, untuk nilai aset.
 *
 * ── Kenapa per kelompok, bukan per ekor ─────────────────────────────────────
 *
 * Pemiliknya (18 Okt 2026) meminta estimasi total aset, dan untuk itu perlu
 * perkiraan harga jual sekarang. Mengisinya per ekor berarti 135 kotak yang
 * harus disentuh ulang setiap kali pasar bergerak — daftar seperti itu tidak
 * akan pernah terisi, dan yang setengah terisi lebih menyesatkan daripada
 * kosong.
 *
 * Jadi harga diisi per KELOMPOK — spesies, morph, pita ukuran, kelamin,
 * proven, asal — dan tiap kura menemukan kelompoknya sendiri. 135 ekor jatuh
 * ke 45 baris, dan dua belas baris teratas sudah menutup tiga perempat
 * kawanan.
 *
 * ── Rentang, bukan satu angka ───────────────────────────────────────────────
 *
 * "Yang diperlukan adalah rentang." Dua kotak per baris: terendah dan
 * tertinggi. Satu angka tunggal akan terbaca sebagai kepastian yang tidak
 * dimiliki siapa pun, dan nilai aset yang dihitung darinya ikut terlihat
 * pasti padahal bukan.
 *
 * ── Yang sengaja TIDAK dilakukan ────────────────────────────────────────────
 *
 * Baris yang belum berharga tidak memakai harga baris tetangganya dan tidak
 * dihitung nol. Ia dihitung terpisah, dan jumlah ekornya selalu disebut di
 * layar — supaya angka aset tidak pernah terlihat utuh sementara separuh
 * kawanan sebenarnya belum dinilai.
 */

const angkaAtauKosong = (v) => (v === null || v === undefined ? "" : String(v));

export default function HargaKuraPage() {
  const qc = useQueryClient();
  const [draf, setDraf] = useState({});
  const [menyimpan, setMenyimpan] = useState(false);

  const { data: kura = [], isLoading: muatKura } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", BATAS_AMBIL),
  });
  const { data: harga = [], isLoading: muatHarga } = useQuery({
    queryKey: ["harga-kura"],
    queryFn: () => base44.entities.HargaKura.list("-created_date", BATAS_AMBIL),
  });

  const aset = useMemo(() => nilaiAsetKura({ kura, harga }), [kura, harga]);
  const hariIni = useMemo(() => new Date(), []);
  /* Baris yang kembar hanya karena asalnya belum ditentukan — pekerjaan
     yang bisa mengecil sebelum dimulai. */
  const kembar = useMemo(() => barisKembarAsal(aset.baris), [aset.baris]);

  const nilaiDraf = (b, kolom) => {
    const d = draf[b.kunci];
    if (d && kolom in d) return d[kolom];
    return angkaAtauKosong(kolom === "min" ? b.hargaMin : b.hargaMaks);
  };

  const ubah = (kunci, kolom, nilai) =>
    setDraf((p) => ({ ...p, [kunci]: { ...(p[kunci] || {}), [kolom]: nilai } }));

  /* Baris yang benar-benar berubah — bukan semua yang pernah disentuh. */
  const berubah = useMemo(() => {
    return aset.baris.filter((b) => {
      const d = draf[b.kunci];
      if (!d) return false;
      const minBaru = "min" in d ? d.min : angkaAtauKosong(b.hargaMin);
      const maksBaru = "maks" in d ? d.maks : angkaAtauKosong(b.hargaMaks);
      return minBaru !== angkaAtauKosong(b.hargaMin) || maksBaru !== angkaAtauKosong(b.hargaMaks);
    });
  }, [aset.baris, draf]);

  const simpan = async () => {
    if (berubah.length === 0) return;
    setMenyimpan(true);
    const hariIniISO = new Date().toISOString().slice(0, 10);
    try {
      for (const b of berubah) {
        const d = draf[b.kunci] || {};
        const bacaAngka = (v) => {
          const t = String(v ?? "").trim();
          if (t === "") return null;
          const n = Number(t);
          return Number.isFinite(n) && n >= 0 ? n : null;
        };
        const min = bacaAngka("min" in d ? d.min : b.hargaMin);
        const maksMentah = bacaAngka("maks" in d ? d.maks : b.hargaMaks);
        /* Tertinggi tidak boleh di bawah terendah: kalau diisi terbalik,
           yang dimaksud hampir pasti kebalikannya, bukan rentang negatif. */
        const maks = min != null && maksMentah != null && maksMentah < min ? min : maksMentah;

        const isi = {
          kunci: b.kunci,
          species: b.species, morph: b.morph, pita_min: b.pitaMin,
          gender: b.gender, proven: b.proven, asal_genetik: b.asal,
          harga_min: min, harga_maks: maks,
          diperbarui: hariIniISO,
        };
        const adaBaris = (harga || []).find((h) => h.kunci === b.kunci);
        if (adaBaris) await base44.entities.HargaKura.update(adaBaris.id, isi);
        else await base44.entities.HargaKura.create(isi);
      }
      toast.success(`${berubah.length} baris harga disimpan`);
      setDraf({});
      qc.invalidateQueries({ queryKey: ["harga-kura"] });
    } catch (e) {
      toast.error(e?.message ? `Gagal menyimpan: ${e.message}` : "Gagal menyimpan harga.");
    } finally {
      setMenyimpan(false);
    }
  };

  const memuat = muatKura || muatHarga;

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Harga Estimasi Kura"
        subtitle="Perkiraan harga jual per kelompok — dipakai menghitung nilai aset"
      />

      {memuat ? (
        <p className="text-sm text-muted-foreground px-1">Memuat…</p>
      ) : (
        <>
          {/* ── Ringkasan ─────────────────────────────────────────── */}
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground">Estimasi nilai kura</p>
              <p className="text-lg font-bold text-foreground tabular-nums leading-tight mt-0.5">
                {aset.ekorTernilai === 0 ? "—" : (
                  aset.min === aset.maks ? rupiah(aset.min) : <>{rupiah(aset.min)} <span className="text-muted-foreground font-normal">–</span> {rupiah(aset.maks)}</>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">dari {aset.ekorTernilai} ekor yang sudah ada harganya</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground">Kawanan ternilai</p>
              <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">{aset.persenTernilai}%</p>
              <div className="h-2 rounded-full bg-muted mt-1.5 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${aset.persenTernilai}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground">Baris harga</p>
              <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                {aset.baris.length - aset.barisKosong.length}
                <span className="text-xs font-normal text-muted-foreground"> / {aset.baris.length} terisi</span>
              </p>
            </div>
          </div>

          {/*
            Pekerjaan yang bisa mengecil disebut SEBELUM daftarnya, bukan
            sesudah — gunanya hilang kalau baru terbaca setelah separuh
            baris diisi.
          */}
          {kembar.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold text-foreground">
                {kembar.length} baris di bawah kembar — bedanya cuma asal CB/WC
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Kura yang asalnya belum ditentukan membentuk barisnya sendiri, berdampingan dengan baris
                yang isinya sama persis. Menentukan asalnya dulu membuat {kembar.length} baris ini menyatu,
                jadi harganya cukup diisi sekali.
              </p>
              <Link to="/isi-asal-kura" className="text-[11px] text-primary hover:underline mt-1.5 inline-block">
                Tentukan asal kura dulu &rarr;
              </Link>
            </div>
          )}

          {/*
            Yang belum terhitung disebut di muka. Nilai aset yang tampil tegas
            sementara sepertiga kawanan tidak ikut dihargai adalah angka yang
            lebih menyesatkan daripada tidak ada angka sama sekali.
          */}
          {(aset.ekorBelum > 0 || aset.tanpaUkuran > 0) && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Yang belum ikut dihitung</span>
              </p>
              <ul className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-1 leading-relaxed list-disc pl-4 space-y-0.5">
                {aset.ekorBelum > 0 && (
                  <li><b>{aset.ekorBelum} ekor</b> kelompoknya belum diberi harga — ada di daftar bawah, baris tanpa angka.</li>
                )}
                {aset.tanpaUkuran > 0 && (
                  <li>
                    <b>{aset.tanpaUkuran} ekor</b> belum ada panjang cangkangnya, jadi belum punya pita.
                    Ukur dulu; tanpa ukuran, kura tidak bisa masuk kelompok mana pun.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* ── Bilah simpan ──────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-2 flex-wrap sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
            <p className="text-xs text-muted-foreground">
              {berubah.length === 0
                ? "Isi dari atas — baris teratas paling banyak ekornya."
                : `${berubah.length} baris diubah, belum disimpan.`}
            </p>
            <Button size="sm" className="gap-1.5" disabled={berubah.length === 0 || menyimpan} onClick={simpan}>
              <Save className="w-4 h-4" /> {menyimpan ? "Menyimpan…" : "Simpan semua"}
            </Button>
          </div>

          {/* ── Daftar baris ──────────────────────────────────────── */}
          {aset.baris.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ruler className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Belum ada kura yang bisa dikelompokkan</p>
              <p className="text-xs mt-1">Panjang cangkang perlu terisi dulu.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {aset.baris.map((b) => {
                const basi = b.terisi && hargaBasi(b.diperbarui, hariIni);
                return (
                  <div key={b.kunci} className={`rounded-xl border p-3 ${b.terisi ? "border-border bg-card" : "border-dashed border-border bg-card/50"}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {judulKura(LABEL_SPESIES, b.species)} · {judulKura(LABEL_MORPH, b.morph)} · {b.pitaLabel}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {judulKura(LABEL_KELAMIN, b.gender)}
                          {b.proven && <> · <span className="font-semibold text-accent">proven</span></>}
                          {b.asal ? <> · {judulKura(LABEL_ASAL, b.asal)}</> : <> · <span className="text-amber-700 dark:text-amber-400">asal belum ditentukan</span></>}
                        </p>
                      </div>
                      <p className="text-[11px] tabular-nums text-muted-foreground flex-shrink-0">{b.ekor} ekor</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground">Terendah</label>
                        <Input
                          type="number" inputMode="numeric" min="0" placeholder="Rp"
                          className="mt-0.5 h-9"
                          value={nilaiDraf(b, "min")}
                          onChange={(e) => ubah(b.kunci, "min", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground">Tertinggi</label>
                        <Input
                          type="number" inputMode="numeric" min="0" placeholder="Rp"
                          className="mt-0.5 h-9"
                          value={nilaiDraf(b, "maks")}
                          onChange={(e) => ubah(b.kunci, "maks", e.target.value)}
                        />
                      </div>
                    </div>

                    {b.terisi && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 tabular-nums flex items-center gap-1.5 flex-wrap">
                        <TrendingUp className="w-3 h-3 flex-shrink-0" />
                        {b.ekor} × {rupiah(b.hargaMin)}
                        {b.hargaMaks !== b.hargaMin && <>–{rupiah(b.hargaMaks)}</>}
                        {" = "}
                        <span className="font-semibold text-foreground">
                          {rupiah(b.hargaMin * b.ekor)}
                          {b.hargaMaks !== b.hargaMin && <>–{rupiah(b.hargaMaks * b.ekor)}</>}
                        </span>
                        {/* Harga lama yang terlihat pasti lebih berbahaya daripada kosong. */}
                        {basi && (
                          <span className="text-amber-700 dark:text-amber-400 font-semibold">
                            · belum disentuh sejak {b.diperbarui}, lebih dari {HARI_HARGA_BASI} hari
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
