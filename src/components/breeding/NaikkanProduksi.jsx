/**
 * NaikkanProduksi — tab ketiga halaman Produksi Indukan.
 *
 * Tiga bagian, urut menurut seberapa cepat bisa ditindaklanjuti:
 *
 *   1. HITUNG MUNDUR — betina produktif, jendela terdekat di atas.
 *   2. KANDANG — rekam jejak tiap kandang dan usulan susunan jantannya.
 *      Satu pemindahan jantan menyentuh belasan betina sekaligus.
 *   3. ANTREAN — betina yang belum tercatat bertelur, terurut menurut
 *      seberapa bisa diubah dan seberapa lama dibiarkan.
 *
 * ── Kenapa versi ini jauh lebih sedikit tulisannya ─────────────────────────
 *
 * Versi pertama dipotret di lebar telepon: 8.367 huruf, 190 baris, enam layar
 * penuh untuk satu tab. Tiap baris hitung mundur memakan empat baris teks dan
 * menyebutkan hal yang sama sampai tiga kali — lencana "berhenti bertelur",
 * kalimat "Berhenti — 207 hari sejak terakhir", angka besar "207 hr", lalu
 * sekali lagi di ringkasan bawah. Bagian kandang menulis "betina pernah
 * bertelur" enam belas kali berturut-turut.
 *
 * Aturan yang dipakai sekarang: SATU FAKTA DITULIS SEKALI, di tempat yang
 * paling mudah dipindai.
 *
 *   · angka yang paling perlu dilihat jadi angka paling besar — sisa hari,
 *     bukan tanggalnya. Tanggal menjawab "kapan"; sisa hari menjawab
 *     "apakah ini urusan saya hari ini", dan itu pertanyaan yang lebih dulu;
 *   · yang berulang tiap baris diangkat jadi judul kolom (bagian kandang
 *     sekarang tabel, bukan enam belas kartu);
 *   · kalimat yang sama untuk semua baris ditulis sekali di kaki bagiannya.
 *     "Mungkin bertelur tanpa tercatat" berlaku untuk ketujuh puluh betina;
 *     mencetaknya tujuh puluh kali tidak membuatnya lebih benar. Ia tetap
 *     melekat pada tiap baris di `diagnosaInduk.js` — penjaga memeriksanya di
 *     sana — tetapi digambar sekali.
 *
 * Penjelasan panjang tentang cara menghitung pindah ke tooltip dan ke laporan.
 * Yang tinggal di layar: nama, angka, dan satu petunjuk pendek.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, CalendarClock, Egg, Mars, TrendingUp } from "lucide-react";
import {
  antreanPerbaikan,
  bulanAdaptasiTercepat,
  BULAN_ADAPTASI_BAWAAN,
  clutchPerJantan,
  rekamKandang,
  umurJantanPerNama,
  usulanJantan,
} from "@/lib/diagnosaInduk";
import { jarakKebun, kalimatSumber, siklusBetina, urutkanSiklus } from "@/lib/siklusBertelur";

/** Tag pendek sumber jarak. Kalimat lengkapnya pindah ke tooltip. */
const TAG_SUMBER = {
  sendiri: "jarak sendiri",
  "sendiri-sekali": "jarak sendiri (1×)",
  kebun: "median kebun",
  bawaan: "angka bawaan",
};

const NADA_BARIS = {
  jendela: "border-emerald-500/40 bg-emerald-500/10",
  telat: "border-amber-500/40 bg-amber-500/10",
  menunggu: "border-border bg-card",
  berhenti: "border-red-500/40 bg-red-500/10",
};

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function tglSingkat(s) {
  if (!s) return "—";
  const [y, m, d] = String(s).slice(0, 10).split("-");
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y.slice(2)}`;
}

/** Tanggal tanpa tahun — dipakai di jendela, yang kedua ujungnya sudah jelas tahunnya. */
function tglPendek(s) {
  if (!s) return "—";
  const [, m, d] = String(s).slice(0, 10).split("-");
  return `${Number(d)} ${BULAN[Number(m) - 1]}`;
}

/** Angka besar di kanan: yang menjawab "apakah ini urusan saya hari ini". */
function AngkaMundur({ s }) {
  if (s.status === "berhenti") {
    return (
      <div className="text-right leading-none">
        <span className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">{s.hariDiam}</span>
        <span className="text-[10px] text-red-600/80 dark:text-red-400/80"> hr diam</span>
      </div>
    );
  }
  const lewat = s.sisaHari < 0;
  return (
    <div className="text-right leading-none">
      <span className={`text-lg font-bold tabular-nums ${s.status === "jendela" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
        {Math.abs(s.sisaHari)}
      </span>
      <span className="text-[10px] text-muted-foreground"> hr {lewat ? "lewat" : "lagi"}</span>
    </div>
  );
}

export default function NaikkanProduksi({ baris = [], breedings = [], tortoises = [], umurMinimal = null, hariIni }) {
  const [semua, setSemua] = useState(false);
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
    () => [...rekam.values()].sort((a, b) => (a.persen ?? 1) - (b.persen ?? 1) || b.betina - a.betina),
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

  const siap = siklus.filter((r) => r.siklus.status === "jendela" || r.siklus.status === "telat");
  const berhenti = siklus.filter((r) => r.siklus.status === "berhenti");

  return (
    <div className="space-y-5">
      {/* ── 1. Hitung mundur ───────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-0.5">
          <h2 className="font-semibold text-sm flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-primary" /> Hitung mundur bertelur
          </h2>
          {siap.length > 0 && (
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              {siap.length} siapkan sarang
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mb-2.5">
          {kebun.jumlah > 0
            ? `Dari ${kebun.jumlah} jarak terukur di kebun ini — median ${kebun.median} hari. Perkiraan, bukan janji.`
            : "Belum ada jarak terukur; perkiraan memakai angka bawaan."}
        </p>

        {siklus.length === 0 ? (
          <p className="text-sm text-muted-foreground py-5 text-center">Belum ada catatan bertelur.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {siklus.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${NADA_BARIS[r.siklus.status] || "border-border bg-card"}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight truncate">
                    {r.nama} <span className="font-normal text-[11px] text-muted-foreground">{r.kandang}</span>
                  </p>
                  {/*
                    Satu baris keterangan, bukan tiga. Kalimat panjangnya di
                    tooltip. TIDAK `truncate`: yang terpotong duluan justru tag
                    sumbernya — "median ke…" — dan tag itulah yang menjawab
                    seberapa boleh dipercaya angkanya.
                  */}
                  <p className="text-[11px] text-muted-foreground leading-tight" title={kalimatSumber(r.siklus)}>
                    {r.siklus.jumlahClutch}× · {tglSingkat(r.siklus.terakhir)} ·{" "}
                    {TAG_SUMBER[r.siklus.sumberJarak] || ""}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <AngkaMundur s={r.siklus} />
                  {r.siklus.status !== "berhenti" && (
                    <p className="text-[10px] text-muted-foreground text-right tabular-nums leading-tight mt-0.5">
                      {tglPendek(r.siklus.jendelaAwal)}–{tglPendek(r.siklus.jendelaAkhir)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {berhenti.length > 0 && (
          <p className="text-[11px] text-red-700 dark:text-red-400 mt-2">
            {berhenti.map((r) => r.nama).join(", ")} pernah berproduksi lalu berhenti — yang berubah bukan kemampuannya.
          </p>
        )}
      </Card>

      {/* ── 2. Kandang ─────────────────────────────────────────────────── */}
      <Card className="p-4">
        <h2 className="font-semibold text-sm flex items-center gap-1.5 mb-0.5">
          <TrendingUp className="w-4 h-4 text-primary" /> Rekam jejak kandang
        </h2>
        <p className="text-[11px] text-muted-foreground mb-2.5">
          Satu pemindahan jantan menyentuh belasan betina sekaligus.
        </p>

        {/*
          Tabel, bukan enam belas kartu. Yang berulang tiap baris — "betina
          pernah bertelur" — naik jadi judul kolom dan ditulis sekali.
        */}
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="font-medium py-1 px-1">Kandang</th>
                <th className="font-medium py-1 px-1 text-right whitespace-nowrap">Bertelur</th>
                <th className="font-medium py-1 px-1">Jantan dewasa</th>
              </tr>
            </thead>
            <tbody>
              {kandangUrut.map((k) => (
                <tr key={k.kandang} className={`border-t border-border ${k.nolProduksi ? "bg-amber-500/8" : ""}`}>
                  <td className="py-1 px-1 font-semibold text-xs whitespace-nowrap">{k.kandang}</td>
                  <td className="py-1 px-1 text-right tabular-nums whitespace-nowrap">
                    <span className={k.produktif === 0 ? "text-muted-foreground" : "font-semibold"}>
                      {k.produktif}/{k.betina}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-muted-foreground break-words">
                    {k.jumlahJantan === 0
                      ? (k.jantanMuda || []).length
                        ? `— ${k.jantanMuda.join(", ")} belum cukup umur`
                        : "— tidak ada"
                      : k.jantan.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(pindah.berlebih.length > 0 || pindah.kurang.length > 0) && (
          <div className="mt-3.5">
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
              <Mars className="w-3.5 h-3.5 text-primary" /> Usulan susunan jantan
            </p>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="font-medium py-1 px-1">Kandang</th>
                    <th className="font-medium py-1 px-1">Pertahankan</th>
                    <th className="font-medium py-1 px-1">Pindahkan</th>
                  </tr>
                </thead>
                <tbody>
                  {pindah.kurang.map((k) => (
                    <tr key={k.kandang} className="border-t border-border bg-amber-500/8">
                      <td className="py-1 px-1 font-semibold text-xs whitespace-nowrap">{k.kandang}</td>
                      <td className="py-1 px-1 text-amber-700 dark:text-amber-400" colSpan={2}>
                        butuh 1 jantan dewasa — {k.alasan} ({k.betina} betina)
                      </td>
                    </tr>
                  ))}
                  {pindah.berlebih.map((b) => (
                    <tr key={b.kandang} className="border-t border-border">
                      <td className="py-1 px-1 font-semibold text-xs whitespace-nowrap">{b.kandang}</td>
                      <td className="py-1 px-1 whitespace-nowrap">
                        <b>{b.pertahankan}</b>
                        <span className="text-muted-foreground"> ({b.clutchPertahankan})</span>
                      </td>
                      <td className="py-1 px-1 text-muted-foreground break-words">{b.pindahkan.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Angka dalam kurung = clutch tercatat untuk jantan itu.
            </p>

            {/*
              Bagian yang paling mudah disembunyikan dan paling perlu dikatakan.

              Versi pertama membungkusnya dalam <p className="flex ..."> bersama
              <b> di tengah kalimat. Flex menjadikan tiap potongan teks SATU
              ITEM, jadi kalimatnya tergambar sebagai kolom-kolom sempit yang
              bertumpuk — "Sesudah / semua / kandang / tanpa / jantan" ke bawah.
              Ikonnya sekarang di luar, teksnya utuh di dalam satu <span>.
            */}
            {pindah.tanpaTujuan > 0 && (
              <div className="flex items-start gap-1.5 mt-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  <b>{pindah.tanpaTujuan} jantan</b> tetap tanpa tujuan sesudah semua kandang terisi. Satu jantan per
                  kandang tidak bisa dicapai dengan memindah saja — kandangnya bertambah, atau jantannya berkurang.
                </span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── 3. Antrean perbaikan ───────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-0.5">
          <h2 className="font-semibold text-sm flex items-center gap-1.5">
            <Egg className="w-4 h-4 text-primary" /> Antrean perbaikan
          </h2>
          <span className="text-[11px] text-muted-foreground">{antrean.length} betina</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2.5">
          Yang paling bisa diubah dan paling lama dibiarkan di atas. Batas &quot;baru datang&quot; {bulanAdaptasi} bulan,
          dihitung dari kebun ini sendiri.
        </p>

        {antrean.length === 0 ? (
          <p className="text-sm text-muted-foreground py-5 text-center">Tidak ada yang mengantre.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {(semua ? antrean : antrean.slice(0, 10)).map((r) => {
              /*
                "mungkin-tidak-tercatat" berlaku untuk SETIAP baris, jadi ia
                ditulis sekali di kaki bagian ini, bukan tujuh puluh kali di
                sini. Ia tetap ada pada datanya — lihat kepala berkas.
              */
              const petunjuk = [
                ...r.diagnosa.sebab.map((s) => ({ ...s, pasti: true })),
                ...r.diagnosa.usulan.filter((u) => u.kode !== "mungkin-tidak-tercatat"),
              ];
              return (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight truncate">
                      {r.nama}{" "}
                      <span className="font-normal text-[11px] text-muted-foreground">
                        {r.kandang} · {r.umur === null ? "?" : `${Math.floor(r.umur)} th`}
                        {r.diagnosa.lamaBulan !== null && ` · ${r.diagnosa.lamaBulan} bln di sini`}
                      </span>
                    </p>
                    <p className="text-[11px] leading-tight flex flex-wrap gap-x-1.5 gap-y-0.5">
                      {petunjuk.map((p) => (
                        <span
                          key={p.kode}
                          title={p.teks}
                          className={p.pasti ? "text-red-700 dark:text-red-400 font-medium" : "text-muted-foreground"}
                        >
                          {RINGKAS[p.kode] || p.kode}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              );
            })}
            {antrean.length > 10 && (
              <button type="button" onClick={() => setSemua((v) => !v)} className="text-xs text-primary hover:underline py-1.5 text-left">
                {semua ? "Tampilkan 10 teratas" : `Tampilkan semua ${antrean.length} →`}
              </button>
            )}
          </div>
        )}

        <div className="mt-2.5 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            Semuanya mungkin bertelur tanpa tercatat — histori kawin kebun ini nol catatan.{" "}
            <Link to="/breeding" className="text-primary hover:underline inline-flex items-center gap-0.5">
              Catat di Breeding &amp; Telur <ArrowRight className="w-3 h-3" />
            </Link>
          </span>
        </div>
      </Card>
    </div>
  );
}

/**
 * Petunjuk pendek yang tergambar di baris. Kalimat lengkapnya tetap ada di
 * `diagnosaInduk.js` dan muncul sebagai tooltip — sehingga alasannya tidak
 * hilang, hanya tidak lagi memenuhi layar.
 */
const RINGKAS = {
  "jantan-belum-cukup-umur": "jantan belum cukup umur",
  "tanpa-jantan": "tanpa jantan dewasa",
  sakit: "sedang sakit",
  "baru-datang": "baru datang",
  "jantan-berdesakan": "jantan berdesakan",
  "kandang-nol": "kandang belum pernah menghasilkan",
  "proven-tanpa-catatan": "ditandai proven, 0 catatan",
};
