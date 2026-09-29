import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import KartuAngka from "@/components/ui/kartu-angka";
import {
  Egg, AlertTriangle, HelpCircle, Home, ChevronLeft, ChevronRight,
  Calendar, Heart, CheckCircle2, Search,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  produksiBetina, ringkasKandang, ringkasProduksi, umurTermudaBertelur,
  kepastianAyahClutch,
} from "@/lib/produksiBetina";

/**
 * Halaman ini DULU bernama isi "Breeding Planner": kalender, ranking pasangan
 * terbaik, dan peringatan "betina belum kawin".
 *
 * Pemiliknya sendiri yang menyebutkan masalahnya, 29 September 2026: "di setiap
 * kandang sudah otomatis dipasangkan, fungsi dari breeding planner saya masih
 * belum mengerti kenapa penting." Itu pengamatan yang benar. Yang menentukan
 * siapa kawin dengan siapa bukan sebuah rencana, melainkan siapa tinggal di
 * kandang mana — jadi halaman yang menyuruh memilih pasangan memang tidak punya
 * pekerjaan.
 *
 * Tiga hal yang ditemukan saat memeriksanya:
 *
 *   1. Peringatan "belum kawin" membaca `Breeding.mating_date`, yang KOSONG di
 *      seluruh sepuluh catatan. Akibatnya setiap betina aktif lolos saringan
 *      dan halaman ini membuka dengan 89 baris peringatan kuning — semuanya
 *      palsu, setiap hari.
 *   2. "Ranking Pasangan Terbaik" memeringkat nama ayah sebagai fakta. Tiga
 *      dari sepuluh catatan menyebut A35, padahal A35 tinggal di kandang N
 *      bersama sepuluh jantan lain. Satu catatan menyebut pasangan yang bahkan
 *      tidak sekandang.
 *   3. Dari 89 betina dewasa aktif, hanya DELAPAN punya catatan bertelur.
 *
 * Nomor tiga itulah pertanyaan produksinya, dan tidak ada satu layar pun yang
 * menanyakannya. Jadi isi halaman ini diganti: yang tinggal adalah kalender
 * (bagian yang memang berguna), dan sisanya menjawab dua hal yang benar-benar
 * bisa ditindaklanjuti — betina mana yang tidak berproduksi, dan kandang mana
 * yang membuat keturunannya tidak bisa ditelusuri.
 *
 * Alamatnya tidak diubah supaya tautan dan menu yang ada tetap bekerja.
 */

const BULAN_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function tglSingkat(s) {
  try { return format(parseISO(s), "d MMM yyyy", { locale: idLocale }); } catch { return s; }
}

/** Lencana kepastian ayah — satu bentuk, dipakai di dua tempat. */
function LencanaAyah({ ayah }) {
  if (ayah.jumlah === 0) {
    // "Jantannya belum cukup umur" dan "tidak ada jantan" menuntut tindakan
    // yang berbeda: yang satu perlu jantan dipindahkan ke sini, yang satu
    // cuma perlu waktu. Keduanya tidak boleh berbunyi sama.
    return ayah.hanyaMuda ? (
      <span
        title={`Di kandang ini: ${ayah.muda.join(", ")} — belum cukup umur`}
        className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/12 text-amber-700 dark:text-amber-400"
      >
        jantan belum cukup umur
      </span>
    ) : (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">tidak ada jantan</span>
    );
  }
  if (ayah.pasti) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/12 text-accent inline-flex items-center gap-0.5">
        <CheckCircle2 className="w-2.5 h-2.5" /> ayah {ayah.ayah}
      </span>
    );
  }
  return (
    <span
      title={`Kandidat: ${ayah.kandidat.join(", ")}`}
      className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/12 text-amber-700 dark:text-amber-400 inline-flex items-center gap-0.5"
    >
      <HelpCircle className="w-2.5 h-2.5" /> 1 dari {ayah.jumlah} jantan
    </span>
  );
}

/**
 * Lencana untuk satu CATATAN BERTELUR — sengaja berbeda dari LencanaAyah.
 *
 * LencanaAyah menjawab "siapa ayah anak betina ini nanti", dan untuk itu
 * susunan kandang HARI INI adalah jawaban yang benar. Sebuah clutch yang sudah
 * lewat berbeda: ia terjadi di masa lalu, dan kura bisa sudah pindah sejak
 * saat itu. Menuliskan "ayah C2" pada clutch Maret hanya karena C2 satu-satunya
 * jantan di kandang induknya HARI INI adalah klaim yang persis sama beraninya
 * dengan yang sedang diperbaiki halaman ini.
 *
 * EnclosureHistory memang ada, tetapi catatan pemindahannya baru dimulai
 * 27 September 2026 — tidak menjangkau satu pun dari sepuluh clutch yang ada.
 * Jadi yang dilakukan di sini hanya MEMBANDINGKAN nama yang tercatat dengan
 * susunan sekarang, dan mengatakan apa adanya kalau keduanya tidak cocok.
 * Tidak ada ayah pengganti yang diusulkan.
 */
function LencanaClutch({ k }) {
  const dasar = "text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5";
  if (!k.tercatat || k.jumlah === 0) {
    return <span className={`${dasar} bg-muted text-muted-foreground`}>tidak bisa dibandingkan</span>;
  }
  if (k.asing) {
    return (
      <span className={`${dasar} bg-amber-500/12 text-amber-700 dark:text-amber-400`}>
        <AlertTriangle className="w-2.5 h-2.5" /> tidak cocok dengan kandang sekarang
      </span>
    );
  }
  if (!k.pasti) {
    return (
      <span title={`Kandidat: ${k.kandidat.join(", ")}`} className={`${dasar} bg-amber-500/12 text-amber-700 dark:text-amber-400`}>
        <HelpCircle className="w-2.5 h-2.5" /> 1 dari {k.jumlah} jantan
      </span>
    );
  }
  return (
    <span className={`${dasar} bg-accent/12 text-accent`}>
      <CheckCircle2 className="w-2.5 h-2.5" /> cocok dengan kandang sekarang
    </span>
  );
}

export default function BreedingPlannerPage() {
  const hariIni = new Date();
  const [bulan, setBulan] = useState(hariIni.getMonth());
  const [tahun, setTahun] = useState(hariIni.getFullYear());
  const [cari, setCari] = useState("");
  const [saring, setSaring] = useState("belum");
  const [semua, setSemua] = useState(false);

  const { data: breedings = [] } = useQuery({ queryKey: ["breedings-planner"], queryFn: () => base44.entities.Breeding.list() });
  const { data: tortoises = [] } = useQuery({ queryKey: ["tortoises-planner"], queryFn: () => base44.entities.Tortoise.list() });
  const { data: enclosures = [] } = useQuery({ queryKey: ["enclosures-planner"], queryFn: () => base44.entities.Enclosure.list() });
  // Histori kawin punya entitasnya sendiri, tombol "Catat Kawin", dan daftar
  // pasangan di halaman Breeding & Telur — dan nol catatan. Halaman ini dulu
  // sama sekali tidak membacanya; sekarang ia menagihnya.
  const { data: perkawinan = [] } = useQuery({ queryKey: ["perkawinan-planner"], queryFn: () => base44.entities.Perkawinan.list("-mating_date", 500) });

  const baris = useMemo(
    () => produksiBetina(tortoises, breedings, enclosures, { hariIni }),
    [tortoises, breedings, enclosures, hariIni],
  );
  const umurMinimal = useMemo(() => umurTermudaBertelur(tortoises, breedings), [tortoises, breedings]);
  const ringkas = useMemo(() => ringkasProduksi(baris, { umurMinimal }), [baris, umurMinimal]);
  const kandang = useMemo(() => ringkasKandang(tortoises, enclosures), [tortoises, enclosures]);
  const kandangRagu = kandang.filter((k) => k.jumlahJantan > 1);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return baris.filter((r) => {
      if (q && !r.nama.toLowerCase().includes(q) && !r.kandang.toLowerCase().includes(q)) return false;
      if (saring === "belum") return r.clutch === 0 && (umurMinimal === null || (r.umur ?? 0) >= umurMinimal);
      if (saring === "produktif") return r.clutch > 0;
      if (saring === "muda") return umurMinimal !== null && (r.umur ?? 0) < umurMinimal;
      return true;
    });
  }, [baris, cari, saring, umurMinimal]);

  // ── Kalender: bagian lama yang dipertahankan ──────────────────────────────
  const acara = useMemo(() => {
    const peta = {};
    const tambah = (tgl, ev) => {
      if (!tgl) return;
      const k = String(tgl).substring(0, 10);
      (peta[k] ||= []).push(ev);
    };
    breedings.forEach((b) => {
      const pasangan = `${b.male_name} × ${b.female_name}`;
      tambah(b.mating_date, { label: `💕 ${pasangan}`, color: "bg-pink-400" });
      tambah(b.egg_laying_date, { label: `🥚 ${b.female_name}`, color: "bg-amber-400" });
      tambah(b.estimated_hatch_date, { label: `🐣 ${b.female_name}`, color: "bg-orange-300" });
      tambah(b.hatch_date, { label: `🐢 ${b.female_name}`, color: "bg-green-500" });
    });
    perkawinan.forEach((p) => tambah(p.mating_date, { label: `💕 ${p.male_name} × ${p.female_name}`, color: "bg-pink-400" }));
    return peta;
  }, [breedings, perkawinan]);

  const awal = startOfMonth(new Date(tahun, bulan, 1));
  const hariBulan = eachDayOfInterval({ start: awal, end: endOfMonth(awal) });
  const pad = getDay(awal);
  const daftarTahun = [hariIni.getFullYear() - 1, hariIni.getFullYear(), hariIni.getFullYear() + 1];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Produksi Indukan"
        subtitle="Betina mana yang berproduksi, dan kandang mana yang membuat keturunannya bisa ditelusuri"
        icon={Egg}
        description={
          umurMinimal === null
            ? "Belum ada catatan bertelur yang bisa dihitung umurnya, jadi batas umur dewasa belum bisa ditentukan dari data kebun ini."
            : `Batas umur dewasa dihitung dari catatan kebun ini sendiri: yang termuda pernah bertelur pada umur ${umurMinimal.toFixed(1)} tahun. Batas ini memperbaiki dirinya sendiri setiap ada catatan baru.`
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KartuAngka
          label="Betina cukup umur"
          nilai={ringkas.cukupUmur}
          sub={`${ringkas.belumCukupUmur} belum cukup umur`}
          ikon={Heart}
          nada="netral"
        />
        <KartuAngka
          label="Bertelur tahun ini"
          nilai={ringkas.bertelurTahunIni}
          sub={`dari ${ringkas.cukupUmur} yang cukup umur`}
          ikon={Egg}
          nada={ringkas.bertelurTahunIni > 0 ? "baik" : "awas"}
        />
        <KartuAngka
          label="Belum ada catatan bertelur"
          nilai={ringkas.belumPernah}
          sub="tidak bertelur, atau tidak tercatat"
          ikon={AlertTriangle}
          nada={ringkas.belumPernah > 0 ? "bahaya" : "baik"}
          onKlik={() => setSaring("belum")}
        />
        <KartuAngka
          label="Ayah tidak bisa dipastikan"
          nilai={ringkas.ayahTidakPasti}
          sub={`${kandangRagu.length} kandang berisi >1 jantan`}
          ikon={HelpCircle}
          nada={ringkas.ayahTidakPasti > 0 ? "awas" : "baik"}
        />
      </div>

      {/* Penagih: histori kawin sudah punya alat, belum punya isi */}
      {perkawinan.length === 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 mb-5">
          <div className="flex items-start gap-2.5">
            <Heart className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">Histori kawin belum pernah diisi</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pencatat kawin sudah ada — tombol <b>Catat Kawin</b> dan daftar pasangan di
                halaman Breeding &amp; Telur — tetapi isinya nol catatan, dan seluruh
                {" "}{breedings.length} catatan bertelur juga tidak menyimpan tanggal kawin.
                Selama itu kosong, tidak ada satu pun angka di aplikasi ini yang bisa
                menjawab &quot;sudah berapa lama betina ini tidak kawin&quot;.
              </p>
              <Link to="/breeding" className="text-xs text-primary hover:underline font-medium mt-1 inline-block">
                Buka Breeding &amp; Telur untuk mencatat →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Produksi per betina ─────────────────────────────────────────── */}
      <Card className="p-4 mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 className="font-semibold text-sm">Produksi per betina</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={cari}
                onChange={(e) => { setCari(e.target.value); setSemua(false); }}
                placeholder="Cari nama / kandang"
                className="h-8 w-44 text-xs rounded-lg border border-border bg-background pl-8 pr-2 outline-none focus:border-primary"
              />
            </div>
            <Select value={saring} onValueChange={(v) => { setSaring(v); setSemua(false); }}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="belum">Belum ada catatan</SelectItem>
                <SelectItem value="produktif">Pernah bertelur</SelectItem>
                <SelectItem value="muda">Belum cukup umur</SelectItem>
                <SelectItem value="semua">Semua betina</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {tampil.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Tidak ada yang cocok.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Dipotong 12 baris: dengan 74 betina tanpa catatan, daftar penuh
                mendorong bagian "susunan kandang" sejauh dua layar penuh ke
                bawah dan praktis tidak pernah terlihat. */}
            {(semua ? tampil : tampil.slice(0, 12)).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{r.nama}</span>
                    <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Home className="w-3 h-3" /> {r.kandang || "—"}
                    </span>
                    <LencanaAyah ayah={r.ayah} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                    {[
                      r.umur === null ? "umur tidak diketahui" : `${Math.floor(r.umur)} th`,
                      r.clutch === 0
                        ? "belum ada catatan bertelur"
                        : `terakhir ${tglSingkat(r.terakhirBertelur)} · ${r.hariDiam} hari lalu`,
                      r.clutch > 0 ? `${r.clutch} clutch · ${r.totalTelur} telur` : null,
                      r.hatchRate !== null ? `${Math.round(r.hatchRate * 100)}% menetas` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {/* Untuk yang belum pernah tercatat, "0" tebal diulang puluhan
                    kali hanya menarik mata ke ketiadaan. Tanda hubung redup
                    menyampaikan hal yang sama tanpa berteriak. */}
                <div className="flex-shrink-0 text-right">
                  {r.clutchTahunIni > 0 ? (
                    <>
                      <p className="text-base font-bold tabular-nums leading-none text-accent">{r.clutchTahunIni}</p>
                      <p className="text-[10px] text-muted-foreground">clutch {hariIni.getFullYear()}</p>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">—</span>
                  )}
                </div>
              </div>
            ))}
            {tampil.length > 12 && (
              <button
                type="button"
                onClick={() => setSemua((v) => !v)}
                className="text-xs text-primary hover:underline py-2"
              >
                {semua ? "Tampilkan 12 teratas saja" : `Tampilkan semua ${tampil.length} betina →`}
              </button>
            )}
          </div>
        )}
      </Card>

      {/* ── Susunan jantan per kandang ──────────────────────────────────── */}
      <Card className="p-4 mb-5">
        <h2 className="font-semibold text-sm mb-1">Susunan jantan per kandang</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Di sistem kandang, inilah satu-satunya keputusan perkawinan yang benar-benar
          diambil manusia. Kandang dengan satu jantan membuat setiap keturunannya bisa
          ditelusuri; kandang dengan lebih dari satu tidak.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {kandang.map((k) => (
            <div
              key={k.kandang}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                k.terlacak ? "border-border bg-card" : "border-amber-500/30 bg-amber-500/8"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{k.kandang}</p>
                <p className="text-[11px] text-muted-foreground break-words">
                  {k.jumlahJantan} jantan
                  {k.jumlahJantanMuda > 0 ? ` (+${k.jumlahJantanMuda} belum cukup umur)` : ""}
                  {" · "}{k.jumlahBetina} betina
                  {k.terlacak
                    ? ` · ayah selalu ${k.ayah}`
                    : k.hanyaMuda
                      ? ` · ${k.jantanMuda.join(", ")} belum cukup umur — belum ada yang bisa jadi ayah`
                      : k.jumlahJantan === 0
                        ? " · tidak ada jantan"
                        : ""}
                </p>
              </div>
              {!k.terlacak && (k.jumlahJantan > 1 || k.hanyaMuda) && (
                <span
                  title={[...k.jantan, ...k.jantanMuda].join(", ")}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex-shrink-0"
                >
                  {k.hanyaMuda ? "belum berproduksi" : "tidak terlacak"}
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Catatan bertelur yang ayahnya tebakan ───────────────────────── */}
      {breedings.length > 0 && (
        <Card className="p-4 mb-5">
          <h2 className="font-semibold text-sm mb-1">Catatan bertelur &amp; kepastian ayahnya</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Nama jantan pada catatan bertelur dibaca apa adanya, lalu dibandingkan dengan
            siapa yang ada di kandang induknya <b>sekarang</b>. Riwayat pemindahan baru
            tercatat sejak 27 September 2026, jadi susunan pada saat bertelur tidak bisa
            direkonstruksi — halaman ini tidak menebak ayah pengganti, hanya mengatakan
            kapan namanya tidak bisa diperiksa.
          </p>
          <div className="flex flex-col gap-1.5">
            {[...breedings]
              .filter((b) => b.egg_laying_date)
              .sort((a, b) => String(b.egg_laying_date).localeCompare(String(a.egg_laying_date)))
              .map((b) => {
                const k = kepastianAyahClutch(b, tortoises, enclosures);
                return (
                  <div key={b.id || `${b.female_name}-${b.egg_laying_date}`} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{b.female_name}</span>
                        <span className="text-[11px] text-muted-foreground">{tglSingkat(b.egg_laying_date)}</span>
                        <LencanaClutch k={k} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                        tercatat sebagai ayah: <b>{b.male_name || "—"}</b>
                        {k.asing && ` · ${b.male_name} tidak ada di kandang ${k.kandang} — kandangnya berubah, atau catatannya keliru`}
                        {!k.pasti && !k.asing && k.jumlah > 1 && ` · kandang ${k.kandang} berisi ${k.jumlah} jantan`}
                        {` · ${b.egg_count || 0} telur`}
                        {b.hatched_count !== null && b.hatched_count !== undefined ? ` · ${b.hatched_count} menetas` : ""}
                      </p>
                    </div>
                    <Link to={`/breeding/${b.id}`} className="text-xs text-primary hover:underline flex-shrink-0">
                      Buka
                    </Link>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* ── Kalender: bagian lama yang dipertahankan ────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => {
            if (bulan === 0) { setBulan(11); setTahun((y) => y - 1); } else setBulan((m) => m - 1);
          }}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={String(bulan)} onValueChange={(v) => setBulan(Number(v))}>
              <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{BULAN_ID.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
              <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{daftarTahun.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            if (bulan === 11) { setBulan(0); setTahun((y) => y + 1); } else setBulan((m) => m + 1);
          }}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array(pad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
          {hariBulan.map((hari) => {
            const kunci = format(hari, "yyyy-MM-dd");
            const evs = acara[kunci] || [];
            const ini = format(hariIni, "yyyy-MM-dd") === kunci;
            return (
              <div key={kunci} className={`min-h-[60px] p-1 rounded-lg border text-xs min-w-0 ${ini ? "border-primary bg-primary/5" : "border-transparent hover:border-muted-foreground/20"}`}>
                <div className={`font-semibold mb-1 ${ini ? "text-primary" : "text-foreground"}`}>{format(hari, "d")}</div>
                <div className="space-y-0.5">
                  {evs.slice(0, 2).map((ev, i) => (
                    <div key={i} className={`${ev.color} text-white rounded px-1 py-0.5 truncate text-[10px]`}>{ev.label}</div>
                  ))}
                  {evs.length > 2 && <div className="text-muted-foreground text-[10px]">+{evs.length - 2} lagi</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {[{ c: "bg-pink-400", l: "Kawin" }, { c: "bg-amber-400", l: "Bertelur" }, { c: "bg-orange-300", l: "Est. menetas" }, { c: "bg-green-500", l: "Menetas" }].map((x) => (
            <div key={x.l} className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${x.c}`} />{x.l}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}
