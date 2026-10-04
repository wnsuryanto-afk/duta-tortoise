import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, TrendingUp, Egg } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { ringkasProduksi, adaHasil, ringkasTelurDicek } from "@/lib/hasilInkubasi";
import { kepastianAyahClutch } from "@/lib/produksiBetina";
import { BOBOT, peringkat } from "@/lib/peringkatIndukan";
import KartuAngka from "@/components/ui/kartu-angka";
import { Egg as EggIcon, Percent, Baby, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const currentYear = new Date().getFullYear();

/** Tanggal pendek terbaca; teks apa adanya bila tidak terbaca. */
function tglSingkat(s) {
  try {
    return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

function HatchRateBadge({ rate }) {
  if (rate >= 80) return <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">{rate.toFixed(1)}%</span>;
  if (rate >= 60) return <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">{rate.toFixed(1)}%</span>;
  return <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">{rate.toFixed(1)}%</span>;
}

function ScoreBar({ score }) {
  const color = score >= 70 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{Math.round(score)}</span>
    </div>
  );
}

function PairDetailModal({ pair, history, onClose }) {
  if (!pair) return null;
  /*
    Disaring per SISI yang punya nama.

    Sebelumnya selalu disyaratkan kedua nama cocok. Di tab Induk Jantan
    `femaleName` berisi "—", dan di tab Induk Betina `maleName` berisi "—" —
    tanda hubung itu tidak pernah cocok dengan nama kura mana pun, jadi
    rinciannya selalu kosong: kartunya menyebut "3 clutch", dan dialog yang
    dibuka dari kartu itu berbunyi "Belum ada riwayat". Dua dari tiga tab
    berperilaku begitu sejak awal.
  */
  const cocokJantan = pair.maleName && pair.maleName !== "—";
  const cocokBetina = pair.femaleName && pair.femaleName !== "—";
  const clutches = history.filter(b =>
    (!cocokJantan || b.male_name === pair.maleName) &&
    (!cocokBetina || b.female_name === pair.femaleName)
  ).sort((a, b) => new Date(b.egg_laying_date) - new Date(a.egg_laying_date));

  return (
    <Dialog open={!!pair} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Egg className="w-5 h-5 text-primary" />
            {pair.maleName} × {pair.femaleName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Total Clutch", value: pair.totalClutch },
              { label: "Total Telur", value: pair.totalEggs },
              { label: "Total Menetas", value: pair.totalHatched },
            ].map(s => (
              <div key={s.label} className="bg-muted/50 rounded-xl p-3">
                <p className="text-xl font-bold text-primary">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Hatch Rate:</span>
            <HatchRateBadge rate={pair.hatchRate} />
            <span className="text-muted-foreground ml-auto">Skor:</span>
            <span className="font-bold text-primary">{Math.round(pair.score)}</span>
          </div>
          <div>
            <p className="font-semibold text-sm mb-2">Riwayat Clutch ({clutches.length})</p>
            {clutches.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada riwayat</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {clutches.map((c, i) => {
                  const hr = ringkasProduksi([c]).hatchRate;
                  return (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg text-xs">
                      <div>
                        <span className="font-medium">Clutch {clutches.length - i}</span>
                        <span className="text-muted-foreground ml-2">{c.egg_laying_date ? new Date(c.egg_laying_date).toLocaleDateString("id-ID") : "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{c.egg_count} telur</span>
                        {adaHasil(c) && <HatchRateBadge rate={hr} />}
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RankingList({ pairs, breedings }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-3">
      {pairs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada data cukup untuk ranking</p>
        </div>
      )}
      {pairs.map((p, i) => (
        <button
          type="button"
          key={`${p.maleName}-${p.femaleName}`}
          className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all cursor-pointer"
          onClick={() => setSelected(p)}
        >
          <div className="flex items-start gap-3">
            {/* Rank */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
              i === 0 ? "bg-amber-100 text-amber-700 border-2 border-amber-300" :
              i === 1 ? "bg-slate-100 text-slate-600 border-2 border-slate-300" :
              i === 2 ? "bg-orange-100 text-orange-700 border-2 border-orange-300" :
              "bg-muted text-muted-foreground border border-border"
            }`}>
              {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">{p.maleName} × {p.femaleName}</h3>
                {i < 3 && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
                    🏆 Top {i+1}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span>🥚 {p.totalEggs} telur</span>
                <span>🐢 {p.totalHatched} menetas</span>
                <span>📦 {p.totalClutch} clutch</span>
                <span>📅 {p.clutchesThisYear} clutch tahun ini</span>
                {p.terakhirBertelur && <span>🗓️ terakhir {tglSingkat(p.terakhirBertelur)}</span>}
                {p.clutchIndukSakit > 0 && (
                  <span className="text-amber-700 dark:text-amber-400">
                    ⚕️ {p.clutchIndukSakit} clutch saat induk sakit
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <HatchRateBadge rate={p.hatchRate} />
                <div className="flex-1">
                  <ScoreBar score={p.score} />
                </div>
              </div>
            </div>
          </div>
        </button>
      ))}

      <PairDetailModal pair={selected} history={breedings} onClose={() => setSelected(null)} />
    </div>
  );
}

/**
 * Peringkat indukan — dulu halaman `/breeder-ranking`.
 *
 * Disatukan sebagai tab di halaman Produksi Indukan pada 30 September 2026.
 * Keduanya menjawab pertanyaan yang sama dari sepuluh catatan yang sama —
 * "indukan mana yang berproduksi" — hanya dari sudut yang berbeda: Produksi
 * Indukan per BETINA, halaman ini per PASANGAN. Dua sudut dari satu
 * pertanyaan tidak butuh dua pintu di menu.
 *
 * Halaman ini sendiri sudah menyerap Laporan Breeding sehari sebelumnya.
 */
export default function PeringkatIndukan() {
  const { role } = useCurrentUser();
  const [yearFilter, setYearFilter] = useState("semua");

  // Peringkat pasangan bersandar sepenuhnya pada NAMA jantan di catatan
  // bertelur. Di kebun ini, enam dari enam belas kandang berisi lebih dari
  // satu jantan — kandang N sendirian menampung sebelas — jadi untuk clutch
  // dari kandang itu nama ayahnya tidak bisa diperiksa oleh siapa pun.
  // Halaman ini tidak berhenti memeringkat; ia berhenti diam soal itu.
  // Riwayat kesehatan dibaca untuk kolom "induk sakit" — satu-satunya hal
  // yang dulu hanya ada di halaman Laporan Breeding, yang kini menyatu ke
  // sini. Lihat komentar di atas berkas ini.
  const { data: healthRecords = [] } = useQuery({
    queryKey: ["breeding-ranking-health"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 1000),
    staleTime: 10 * 60 * 1000,
  });
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-ranking"],
    queryFn: () => base44.entities.Tortoise.list(),
  });
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures-ranking"],
    queryFn: () => base44.entities.Enclosure.list(),
  });
  const { data: breedings = [], isLoading } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-egg_laying_date", 500),
  });

  const yearOptions = useMemo(() => {
    const years = [...new Set(breedings.map(b => b.season_year).filter(Boolean))].sort((a,b)=>b-a);
    return years;
  }, [breedings]);

  const filtered = useMemo(() => {
    if (yearFilter === "semua") return breedings;
    return breedings.filter(b => String(b.season_year) === yearFilter || b.egg_laying_date?.startsWith(yearFilter));
  }, [breedings, yearFilter]);

  /*
    Ketiga tab memakai SATU perhitungan (lib/peringkatIndukan.js).

    Sebelumnya rumusnya disalin tiga kali, dan salinannya tidak sama: tab
    Jantan dan Betina menulis `clutchesThisYear: 0` sebagai angka mati, lalu
    kartunya menampilkannya tanpa syarat — "📅 0 clutch tahun ini" untuk
    semua betina, termasuk C23 yang bertelur tiga kali tahun ini. Dua angka
    lain, tanggal terakhir bertelur dan clutch saat induk sakit, tidak pernah
    dihitung di kedua tab itu sehingga barisnya tidak muncul sama sekali.
  */
  const opsiPeringkat = {
    tahunIni: currentYear,
    jumlahMusim: Math.max(1, yearOptions.length),
    healthRecords,
  };

  const allPairs = useMemo(
    () => peringkat(
      filtered,
      (b) => `${b.male_name}||${b.female_name}`,
      (b) => ({ maleName: b.male_name, femaleName: b.female_name }),
      opsiPeringkat,
    ),
    [filtered, yearOptions.length, healthRecords],
  );

  const malePairs = useMemo(
    () => peringkat(filtered, (b) => b.male_name, (b) => ({ maleName: b.male_name, femaleName: "—" }), opsiPeringkat),
    [filtered, yearOptions.length, healthRecords],
  );

  const femalePairs = useMemo(
    () => peringkat(filtered, (b) => b.female_name, (b) => ({ maleName: "—", femaleName: b.female_name }), opsiPeringkat),
    [filtered, yearOptions.length, healthRecords],
  );

  // Penjaga akses dibiarkan: tab ini ikut halaman Produksi Indukan, tetapi
  // kalau kelak dipakai di tempat lain penjaganya sudah ikut.
  if (!canAccess(role, "breeding")) return <AccessDenied />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Peringkat produktivitas per pasangan, per jantan, dan per betina.
        </p>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter Tahun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Waktu</SelectItem>
            {yearOptions.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ringkasan tahun — dibawa dari halaman Laporan Breeding saat keduanya
          disatukan. Grafik bulanannya TIDAK ikut disalin: bentuk yang sama
          sudah hidup sebagai BreedingStatsSection di tab "Statistik" halaman
          Breeding & Telur, dan menyalinnya berarti membuat salinan ketiga
          dari gambar yang sama. Tautannya ada di bawah. */}
      {(() => {
        const r = ringkasProduksi(filtered);
        /*
          Tingkat penetasan dihitung dari telur yang SUDAH ada hasilnya, sama
          seperti tab Statistik (lib/hasilInkubasi.ringkasTelurDicek).

          Sebelumnya kartu ini membagi seluruh telur yang pernah tercatat:
          49 / 280 = 17,5%. Dua ratus delapan butir di antaranya masih
          dierami hari ini — belum menetas BUKAN berarti gagal, dan
          menghitungnya sebagai gagal membuat seluruh kebun terbaca nyaris
          mandul.

          Angka yang benar 49 / 72 = 68,1%, dan itu pula yang ditampilkan tab
          Statistik di halaman Breeding. Dua layar dalam satu aplikasi
          menjawab 17,5% dan 68,1% untuk pertanyaan yang sama, dan yang
          dipakai memutuskan indukan mana dipertahankan adalah layar INI.
        */
        const { persen } = ringkasTelurDicek(filtered);
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KartuAngka label="Sesi bertelur" nilai={filtered.length} ikon={Baby} nada="netral" />
            <KartuAngka
              label="Total telur"
              nilai={r.totalTelur}
              sub={r.telurMasihDierami > 0 ? `${r.telurMasihDierami} masih dierami` : undefined}
              ikon={EggIcon}
              nada="netral"
            />
            <KartuAngka label="Berhasil menetas" nilai={r.totalMenetas} ikon={Baby} nada={r.totalMenetas > 0 ? "baik" : "netral"} />
            <KartuAngka
              label="Tingkat penetasan"
              nilai={r.telurAdaHasil > 0 ? `${persen.toFixed(1)}%` : "—"}
              sub={r.telurAdaHasil > 0 ? `dari ${r.telurAdaHasil} telur yang sudah ada hasilnya` : "belum ada clutch yang selesai"}
              ikon={Percent}
              nada="utama"
              ke="/breeding"
            />
          </div>
        );
      })()}

      {/* Formula info */}
      <div className="bg-muted/50 border border-border rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2">
        <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
        <span>
          {/* Angkanya dibaca dari rumusnya sendiri, bukan diketik ulang —
              keterangan yang ditulis tangan adalah keterangan yang kelak
              berbeda dari perhitungannya. */}
          <strong className="text-foreground">Formula Skor:</strong>{" "}
          Hatch Rate × {Math.round(BOBOT.hatchRate * 100)}% + Total Telur × {Math.round(BOBOT.telur * 100)}% + Clutch/Tahun × {Math.round(BOBOT.clutch * 100)}% · Skor maks 100
        </span>
      </div>

      {(() => {
        const ragu = breedings.filter(
          (b) => b.egg_laying_date && !kepastianAyahClutch(b, tortoises, enclosures).pasti,
        );
        if (ragu.length === 0) return null;
        return (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 mb-4">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">
                  {ragu.length} dari {breedings.filter((b) => b.egg_laying_date).length} catatan bertelur tidak bisa diperiksa ayahnya
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Peringkat di bawah memakai nama jantan yang tertulis di catatan. Untuk
                  clutch dari kandang yang berisi lebih dari satu jantan, nama itu tidak
                  bisa dipastikan siapa pun — jadi peringkat pasangan dan peringkat jantan
                  sebagian bersandar pada tebakan.
                </p>
                <Link to="/breeding-planner" className="text-xs text-primary hover:underline font-medium mt-1 inline-block">
                  Lihat kandang mana yang menyebabkannya — tab Produksi per betina →
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <Tabs defaultValue="pasangan">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pasangan">Pasangan Terbaik</TabsTrigger>
            <TabsTrigger value="jantan">Induk Jantan</TabsTrigger>
            <TabsTrigger value="betina">Induk Betina</TabsTrigger>
          </TabsList>
          <TabsContent value="pasangan" className="mt-4">
            <RankingList pairs={allPairs} breedings={breedings} />
          </TabsContent>
          <TabsContent value="jantan" className="mt-4">
            <RankingList pairs={malePairs} breedings={breedings} />
          </TabsContent>
          <TabsContent value="betina" className="mt-4">
            <RankingList pairs={femalePairs} breedings={breedings} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}