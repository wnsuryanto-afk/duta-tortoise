/**
 * NaikkanProduksi — tab ketiga halaman Produksi Indukan.
 *
 * Dua tab yang sudah ada menjawab "siapa yang berproduksi" dan "siapa yang
 * terbaik". Tab ini menjawab pertanyaan yang pemilik ajukan sesudah melihat
 * angka 72: "bagaimana supaya lambat laun semua kura bisa produktif", dan
 * "bulan depan yang mana yang akan bertelur lagi".
 *
 * Tiga bagian, urut menurut seberapa cepat bisa ditindaklanjuti:
 *
 *   1. HITUNG MUNDUR — betina produktif, yang jendela bertelurnya paling dekat
 *      di atas. Ini pekerjaan minggu ini: sarang disiapkan, kandangnya
 *      ditengok.
 *   2. KANDANG — rekam jejak tiap kandang berdampingan dengan susunan
 *      jantannya, dan usulan pemindahan. Satu pemindahan jantan menyentuh
 *      belasan betina sekaligus; satu betina hanya menyentuh dirinya.
 *   3. ANTREAN PERBAIKAN — betina yang belum pernah tercatat bertelur, terurut
 *      menurut seberapa bisa diubah dan seberapa lama dibiarkan.
 *
 * Yang sengaja TIDAK dilakukan di sini: menjanjikan tanggal. Setiap perkiraan
 * membawa jendela dan sumber angkanya, karena seluruh perkiraan kebun ini
 * berdiri di atas lima jarak antar-clutch yang terukur. Lima bukan statistik.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, CalendarClock, Egg, Home, Info, Mars, TrendingUp } from "lucide-react";
import {
  antreanPerbaikan,
  bulanAdaptasiTercepat,
  BULAN_ADAPTASI_BAWAAN,
  clutchPerJantan,
  rekamKandang,
  umurJantanPerNama,
  usulanJantan,
} from "@/lib/diagnosaInduk";
import {
  jarakKebun,
  kalimatSiklus,
  kalimatSumber,
  siklusBetina,
  urutkanSiklus,
} from "@/lib/siklusBertelur";
import { kisiWadah } from "@/lib/kisiWadah";

const NADA_SIKLUS = {
  jendela: "border-emerald-500/40 bg-emerald-500/10",
  telat: "border-amber-500/40 bg-amber-500/10",
  menunggu: "border-border bg-card",
  berhenti: "border-red-500/40 bg-red-500/10",
};

const LABEL_SIKLUS = {
  jendela: "siapkan sarang",
  telat: "lewat perkiraan",
  menunggu: "menunggu",
  berhenti: "berhenti bertelur",
};

function tglSingkat(s) {
  if (!s) return "—";
  const [y, m, d] = String(s).slice(0, 10).split("-");
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${Number(d)} ${bulan[Number(m) - 1]} ${y}`;
}

export default function NaikkanProduksi({ baris = [], breedings = [], tortoises = [], umurMinimal = null, hariIni }) {
  const [semuaAntrean, setSemuaAntrean] = useState(false);
  const hari = useMemo(
    () => (hariIni instanceof Date ? hariIni : new Date(hariIni || Date.now())).toISOString().slice(0, 10),
    [hariIni],
  );

  const kebun = useMemo(() => jarakKebun(breedings), [breedings]);
  const bulanAdaptasi = useMemo(
    () => bulanAdaptasiTercepat(tortoises, breedings) ?? BULAN_ADAPTASI_BAWAAN,
    [tortoises, breedings],
  );

  const siklus = useMemo(
    () =>
      urutkanSiklus(
        (baris || [])
          .filter((r) => (r.clutch || 0) > 0)
          .map((r) => ({ ...r, siklus: siklusBetina(r.tanggalClutch, { hariIni: hari, jarakKebun: kebun.median }) })),
      ),
    [baris, hari, kebun.median],
  );

  const rekam = useMemo(() => rekamKandang(baris), [baris]);
  const kandangUrut = useMemo(
    () =>
      [...rekam.values()].sort(
        (a, b) => (a.persen ?? 1) - (b.persen ?? 1) || b.betina - a.betina,
      ),
    [rekam],
  );
  const pindah = useMemo(
    () =>
      usulanJantan(rekam, {
        clutchJantan: clutchPerJantan(breedings),
        umurJantan: umurJantanPerNama(tortoises, hari),
      }),
    [rekam, breedings, tortoises, hari],
  );

  const antrean = useMemo(
    () => antreanPerbaikan(baris, { bulanAdaptasi, hariIni: hari, umurMinimal }),
    [baris, bulanAdaptasi, hari, umurMinimal],
  );

  const jendelaDekat = siklus.filter((r) => r.siklus.status === "jendela").length;
  const berhenti = siklus.filter((r) => r.siklus.status === "berhenti");

  return (
    <div className="space-y-5">
      {/* ── 1. Hitung mundur ───────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-start gap-2 mb-1">
          <CalendarClock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <h2 className="font-semibold text-sm">Hitung mundur bertelur</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {kebun.jumlah > 0 ? (
            <>
              Kebun ini punya <b>{kebun.jumlah} jarak antar-clutch</b> yang benar-benar terukur:{" "}
              {kebun.jarak.join(", ")} hari — median <b>{kebun.median} hari</b>. Perkiraan di bawah
              berdiri di atas itu, jadi selalu berupa rentang, bukan tanggal.
            </>
          ) : (
            <>
              Belum ada satu pun betina yang bertelur dua kali, jadi belum ada jarak yang bisa
              diukur. Perkiraan di bawah memakai angka bawaan dan harus dibaca begitu.
            </>
          )}
        </p>

        {siklus.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Belum ada betina dengan catatan bertelur.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {siklus.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border px-3 py-2 ${NADA_SIKLUS[r.siklus.status] || "border-border bg-card"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{r.nama}</span>
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                        <Home className="w-3 h-3" /> {r.kandang || "—"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/60 border border-border">
                        {LABEL_SIKLUS[r.siklus.status]}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                      {kalimatSiklus(r.siklus)}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5 break-words">
                      {r.siklus.jumlahClutch} clutch · terakhir {tglSingkat(r.siklus.terakhir)} ·{" "}
                      {kalimatSumber(r.siklus)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {r.siklus.status === "berhenti" ? (
                      <p className="text-base font-bold tabular-nums leading-none text-red-600 dark:text-red-400">
                        {r.siklus.hariDiam}
                        <span className="text-[10px] font-normal"> hr</span>
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold tabular-nums leading-tight">
                          {tglSingkat(r.siklus.jendelaAwal)}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          s/d {tglSingkat(r.siklus.jendelaAkhir)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {jendelaDekat > 0 && (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2.5">
            {jendelaDekat} betina sedang di dalam jendela bertelurnya — itu pekerjaan minggu ini.
          </p>
        )}
        {berhenti.length > 0 && (
          <p className="text-[11px] text-red-700 dark:text-red-400 mt-1">
            {berhenti.length} indukan terbukti berhenti bertelur ({berhenti.map((r) => r.nama).join(", ")}).
            Keduanya pernah berproduksi, jadi yang berubah bukan kemampuannya.
          </p>
        )}
      </Card>

      {/* ── 2. Kandang ─────────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-start gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <h2 className="font-semibold text-sm">Rekam jejak kandang</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Satu pemindahan jantan menyentuh belasan betina sekaligus; satu betina hanya menyentuh
          dirinya. Karena itu bagian ini di atas antrean per ekor.
        </p>

        <div className="grid gap-1.5" style={{ gridTemplateColumns: kisiWadah(260) }}>
          {kandangUrut.map((k) => (
            <div
              key={k.kandang}
              className={`rounded-xl border px-3 py-2 ${
                k.nolProduksi ? "border-amber-500/30 bg-amber-500/8" : "border-border bg-card"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-semibold">{k.kandang}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {k.produktif}/{k.betina} betina pernah bertelur
                  {k.persen !== null && ` · ${Math.round(k.persen * 100)}%`}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                {k.jumlahJantan === 0
                  ? (k.jantanMuda || []).length
                    ? `jantan belum cukup umur: ${k.jantanMuda.join(", ")}`
                    : "tidak ada jantan dewasa"
                  : `${k.jumlahJantan} jantan: ${k.jantan.join(", ")}`}
                {k.clutch > 0 && ` · ${k.clutch} clutch`}
              </p>
            </div>
          ))}
        </div>

        {/* Usulan pemindahan */}
        {(pindah.berlebih.length > 0 || pindah.kurang.length > 0) && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-start gap-2 mb-2">
              <Mars className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs font-semibold">Usulan susunan jantan</p>
            </div>
            {pindah.kurang.map((k) => (
              <p key={k.kandang} className="text-[11px] text-muted-foreground mb-1 break-words">
                <b>{k.kandang}</b> — {k.betina} betina, {k.alasan}. Satu jantan dewasa perlu
                dipindahkan ke sini sebelum kandang ini bisa menghasilkan apa pun.
              </p>
            ))}
            {pindah.berlebih.map((b) => (
              <p key={b.kandang} className="text-[11px] text-muted-foreground mb-1 break-words">
                <b>{b.kandang}</b> — {b.betina} betina, {b.produktif} pernah bertelur.
                Pertahankan <b>{b.pertahankan}</b>
                {b.clutchPertahankan > 0 ? ` (${b.clutchPertahankan} clutch tercatat)` : " (belum ada clutch tercatat)"},
                pindahkan {b.pindahkan.join(", ")}.
              </p>
            ))}
            {/*
              Bagian yang paling mudah disembunyikan dan paling perlu dikatakan:
              usulannya tidak bisa dijalankan sampai habis hanya dengan memindah.
            */}
            {pindah.tanpaTujuan > 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Sesudah semua kandang tanpa jantan terisi, masih ada{" "}
                <b>{pindah.tanpaTujuan} jantan</b> yang tidak punya tujuan. Susunan satu jantan per
                kandang tidak bisa dicapai dengan memindah-mindahkan saja — entah kandangnya
                bertambah, entah jantannya berkurang. Itu keputusan Anda, bukan hitungan.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* ── 3. Antrean perbaikan ───────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-start gap-2 mb-1">
          <Egg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <h2 className="font-semibold text-sm">Antrean perbaikan — {antrean.length} betina</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Terurut menurut seberapa bisa diubah, lalu seberapa lama dipelihara tanpa hasil. Batas
          &quot;baru datang&quot; dihitung dari kebun ini sendiri: yang tercepat bertelur{" "}
          <b>{bulanAdaptasi} bulan</b> sesudah tiba.
        </p>

        {antrean.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Tidak ada betina cukup umur yang belum tercatat bertelur.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(semuaAntrean ? antrean : antrean.slice(0, 10)).map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{r.nama}</span>
                  <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                    <Home className="w-3 h-3" /> {r.kandang || "—"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {r.umur === null ? "umur tidak diketahui" : `${Math.floor(r.umur)} th`}
                    {r.diagnosa.lamaBulan !== null
                      ? ` · dipelihara ${r.diagnosa.lamaBulan} bln`
                      : " · tanggal beli tidak tercatat"}
                  </span>
                </div>
                {r.diagnosa.sebab.map((s) => (
                  <p
                    key={s.kode}
                    className="text-[11px] text-red-700 dark:text-red-400 mt-1 break-words flex items-start gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {s.teks}
                  </p>
                ))}
                {r.diagnosa.usulan.map((u) => (
                  <p
                    key={u.kode}
                    className="text-[11px] text-muted-foreground mt-1 break-words flex items-start gap-1.5"
                  >
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60" />
                    {u.teks}
                  </p>
                ))}
              </div>
            ))}
            {antrean.length > 10 && (
              <button
                type="button"
                onClick={() => setSemuaAntrean((v) => !v)}
                className="text-xs text-primary hover:underline py-2"
              >
                {semuaAntrean ? "Tampilkan 10 teratas saja" : `Tampilkan semua ${antrean.length} betina →`}
              </button>
            )}
          </div>
        )}

        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground break-words">
            Satu hal yang tidak bisa dijawab layar ini: apakah mereka tidak bertelur, atau bertelur
            tanpa ada yang mencatat. Histori kawin kebun ini nol catatan, dan tidak ada pemeriksaan
            sarang yang tercatat. Selama itu kosong, kedua keadaan terlihat sama persis di sini.
          </p>
          <Link to="/breeding" className="text-xs text-primary hover:underline font-medium mt-1 inline-flex items-center gap-1">
            Buka Breeding &amp; Telur untuk mencatat <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
