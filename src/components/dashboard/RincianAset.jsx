import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Layers, Scale, TriangleAlert, ChevronRight } from "lucide-react";
import { komposisiNilai, kelompokTeratas } from "@/lib/hargaEstimasi";
import { selisihSebanding } from "@/lib/modalKerja";
import { LABEL_SPESIES, LABEL_MORPH, LABEL_KELAMIN, LABEL_ASAL, judulKura } from "@/lib/labelKura";
import { rupiahSingkat } from "@/lib/rupiah";

/**
 * RincianAset — di mana nilai peternakan sebenarnya berada.
 *
 * ── Kenapa kartu ini ada ────────────────────────────────────────────────────
 *
 * Pemiliknya, 18 Okt 2026: "apakah estimasi aset yang ada saat ini bisa
 * ditampilkan? Mungkin bisa dibuat lebih detail di dashboard."
 *
 * Kartu "Estimasi Total Aset" di atasnya sudah menyebut satu rentang —
 * Rp 1,27–1,63 miliar. Angka itu benar dan hampir tidak bisa ditindaklanjuti:
 * ia sama saja apakah nilainya tersebar rata di 135 ekor atau menumpuk di
 * tiga ekor. Yang bisa ditindaklanjuti adalah susunannya. Dan susunan
 * kawanan ini ternyata berat ke satu arah: TIGA Aldabra memegang 14,6% dari
 * seluruh nilai, sementara 130 Sulcata memegang 84,8%. Satu Aldabra setara
 * dengan dua puluh Sulcata dewasa.
 *
 * ── Angka yang paling penting di kartu ini adalah yang TIDAK ditampilkan ───
 *
 * Selisih nilai terhadap modal adalah hal pertama yang ingin dilihat siapa
 * pun di layar ini, dan cara termudah menghitungnya salah:
 *
 *     seluruh nilai aset − seluruh modal kura = Rp 636 jt – 991 jt
 *
 * Itu membandingkan nilai 135 ekor dengan biaya 91 — empat puluh empat kura
 * belum ada harga belinya. Yang sebanding, hanya dari kura yang punya kedua
 * angkanya, adalah Rp 197 jt – 385 jt. Angka yang mudah itu TIGA KALI lebih
 * besar daripada yang benar, dan ia salah ke arah yang tidak akan pernah
 * dipertanyakan siapa pun.
 *
 * Jadi yang ditampilkan di sini adalah yang sebanding, selalu bersama jumlah
 * ekornya, dan ke-44 ekor yang tidak ikut disebut berikut jalurnya.
 *
 * ── Kenapa warnanya begitu ──────────────────────────────────────────────────
 *
 * Mengikuti TortoiseMorphSummary, yang sudah memakai warna Tailwind -500
 * berpasangan dengan chip terang/gelap untuk komposisi populasi. Beranda ini
 * sudah punya satu bahasa warna untuk "bagian dari keseluruhan"; menambahkan
 * bahasa kedua di kartu sebelahnya hanya membuat keduanya lebih sulit dibaca.
 */

/* Warna per spesies — Sulcata memakai warna tema karena ia selalu yang
   terbesar, dan sisanya mengikuti urutan yang sama seperti kartu morph. */
const WARNA_SPESIES = {
  sulcata: "bg-primary/55",
  aldabra: "bg-orange-500",
  leopard: "bg-yellow-500",
  red_foot: "bg-rose-500",
  indian_star: "bg-blue-500",
  hermann: "bg-teal-500",
  greek: "bg-purple-500",
  russian: "bg-pink-500",
};
const WARNA_CADANGAN = ["bg-blue-500", "bg-purple-500", "bg-teal-500", "bg-pink-500"];

const warnaSpesies = (kunci, urutan) =>
  WARNA_SPESIES[kunci] || WARNA_CADANGAN[urutan % WARNA_CADANGAN.length];

/** "Rp 1,3 M – Rp 1,6 M", atau satu angka saja bila keduanya sama. */
function rentang(min, maks) {
  const a = rupiahSingkat(min);
  const b = rupiahSingkat(maks);
  return a === b ? a : `${a} – ${b}`;
}

/** Nama baca sebuah kelompok harga, seperti di layar Harga Estimasi Kura. */
function namaKelompok(b) {
  const bagian = [
    judulKura(LABEL_SPESIES, b.species),
    judulKura(LABEL_MORPH, b.morph),
    b.pitaLabel,
    judulKura(LABEL_KELAMIN, b.gender),
  ];
  if (b.proven) bagian.push("proven");
  if (b.asal) bagian.push(judulKura(LABEL_ASAL, b.asal));
  return bagian.join(" · ");
}

export default function RincianAset({ kura = [], harga = [], asetKura, modal }) {
  const spesies = useMemo(() => komposisiNilai(asetKura?.baris || []), [asetKura]);
  const teratas = useMemo(() => kelompokTeratas(asetKura?.baris || [], 5), [asetKura]);
  const seb = useMemo(() => selisihSebanding({ kura, harga }), [kura, harga]);

  /* Dua sebab berbeda untuk keluar dari perbandingan, dan keduanya
     disebut terpisah: "belum ada harga belinya" dan "kelompok harganya
     belum diisi" menuntun ke dua layar isian yang berbeda. */
  const bagianKura = modal?.bagian?.find((b) => b.kunci === "kura");
  const ekorSeluruh = bagianKura?.dari || 0;
  const ekorBermodal = bagianKura?.ada || 0;
  const tanpaModal = Math.max(0, ekorSeluruh - ekorBermodal);
  const tanpaHarga = Math.max(0, ekorBermodal - seb.ekor);
  const diluar = tanpaModal + tanpaHarga;
  const puncak = teratas[0]?.nilaiMin || 0;

  if (!asetKura || (asetKura.ekorTernilai || 0) === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-sm font-bold text-foreground">Rincian Estimasi Aset</p>
      </div>

      {/* ── Susunan nilai per spesies ───────────────────────────────── */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
        Nilai menurut spesies
      </p>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-muted mb-2">
        {spesies.map((s, i) => (
          <div
            key={s.kunci}
            className={warnaSpesies(s.kunci, i)}
            style={{ width: `${s.persen}%` }}
            title={`${judulKura(LABEL_SPESIES, s.kunci)} ${s.persen.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {spesies.map((s, i) => (
          <div key={s.kunci} className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${warnaSpesies(s.kunci, i)}`} />
              <span className="text-xs text-foreground truncate">{judulKura(LABEL_SPESIES, s.kunci)}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">{s.ekor} ekor</span>
            </span>
            <span className="text-[11px] tabular-nums flex-shrink-0">
              <span className="text-foreground">{rentang(s.min, s.maks)}</span>
              <span className="text-muted-foreground"> · {s.persen.toFixed(1)}%</span>
            </span>
          </div>
        ))}
      </div>
      {/* Porsi diukur dari batas BAWAH, dan itu disebut — kelompok yang
          rentangnya lebar akan tampak lebih besar kalau diukur dari atas,
          padahal yang berbeda cuma ketidakpastiannya. */}
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
        Porsi dihitung dari batas bawah rentang — satu-satunya angka di sini yang tidak ikut berubah
        kalau harga atasnya diisi lebih berani.
      </p>

      {/* ── Selisih terhadap modal ──────────────────────────────────── */}
      <div className="border-t border-border mt-3 pt-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Scale className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Selisih terhadap modal · {seb.ekor} ekor
          </p>
        </div>
        {seb.ekor === 0 ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Belum ada kura yang punya harga beli DAN kelompok harga sekaligus, jadi selisihnya belum
            bisa dihitung dari dasar yang sebanding.
          </p>
        ) : (
          <>
            <p className="text-lg font-bold text-primary tabular-nums leading-tight">
              +{rentang(seb.selisihMin, seb.selisihMaks)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed tabular-nums">
              nilai {rentang(seb.nilaiMin, seb.nilaiMaks)} terhadap modal {rupiahSingkat(seb.modal)}
              {seb.modal > 0 && (
                <> — naik {Math.round((seb.selisihMin / seb.modal) * 100)}–{Math.round((seb.selisihMaks / seb.modal) * 100)}%</>
              )}
            </p>
            {/* Yang tidak ikut dibandingkan disebut jumlahnya, bukan
                dibiarkan tersembunyi di balik kata "selisih". */}
            {diluar > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed flex items-start gap-1.5">
                <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  <b className="text-foreground tabular-nums">{diluar} dari {ekorSeluruh} ekor</b> di luar
                  perbandingan ini
                  {tanpaModal > 0 && <> — {tanpaModal} belum ada harga belinya</>}
                  {tanpaHarga > 0 && <>{tanpaModal > 0 ? ", " : " — "}{tanpaHarga} kelompok harganya belum diisi</>}.
                  Mengurangkan seluruh nilai aset dari seluruh modal kura akan memberi angka jauh lebih besar,
                  tetapi angka itu menghitung nilai {asetKura.ekorTernilai} ekor terhadap biaya {ekorBermodal} ekor.
                </span>
              </p>
            )}
            {diluar > 0 && (
              <Link to="/incomplete-data" className="text-[11px] text-primary hover:underline mt-1 inline-flex items-center gap-0.5">
                Lengkapi harga beli <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </>
        )}
      </div>

      {/* ── Kelompok bernilai tertinggi ─────────────────────────────── */}
      <div className="border-t border-border mt-3 pt-3">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
          Kelompok bernilai tertinggi
        </p>
        <div className="space-y-2">
          {teratas.map((b) => (
            <div key={b.kunci}>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-foreground min-w-0 break-words">{namaKelompok(b)}</span>
                <span className="text-[11px] tabular-nums flex-shrink-0">
                  <span className="text-muted-foreground">{b.ekor} ekor · </span>
                  <span className="text-foreground">{rentang(b.nilaiMin, b.nilaiMaks)}</span>
                </span>
              </div>
              {/* Bilah relatif terhadap kelompok TERBESAR, bukan terhadap
                  seluruh aset: yang dibandingkan di daftar ini adalah
                  kelompok satu dengan kelompok lainnya. */}
              <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
                <div className="h-full bg-primary/55 rounded-full"
                  style={{ width: `${puncak > 0 ? (b.nilaiMin / puncak) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <Link to="/harga-kura" className="text-[11px] text-primary hover:underline mt-2 inline-flex items-center gap-0.5">
          Semua {asetKura.baris.length} kelompok harga <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
