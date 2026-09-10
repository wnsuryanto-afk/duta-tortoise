import { Shell, Mars, Venus, CircleHelp } from "lucide-react";
import InfoHint from "@/components/ui/info-hint";
import Illustration from "@/components/common/Illustration";
import { cn } from "@/lib/utils";

/**
 * TortoiseMorphSummary — komposisi populasi menurut jenis (morph).
 *
 * Selain jumlah per morph, kartu ini menampilkan perbandingan jantan–betina
 * di tiap baris. Rasio itu yang menentukan kapasitas breeding, jadi menaruhnya
 * berdampingan dengan jumlah membuat ketimpangan langsung kelihatan tanpa
 * perlu membuka halaman lain.
 */
/*
 * ── DUA CACAT YANG DIPERBAIKI DI SINI (10-09-2026) ───────────────────
 *
 * 1. Daftar ini dulu memuat `over_scute` dan `less_scute` sebagai MORPH.
 *    Keduanya sifat KARAPAS, bukan morph (genetika warna) — dan keyakinan
 *    itulah yang melahirkan 11 kura tercatat `morph: "over_scute"`, nilai
 *    yang bahkan tidak ada di formulir input maupun penyaring Daftar Kura.
 *    Kesebelasnya sudah dipindahkan ke shell_type; dua baris ini dihapus
 *    supaya gagasannya tidak dilahirkan ulang.
 *
 * 2. Barisnya dulu: MORPHS[t.morph] ? t.morph : "normal".
 *    Artinya morph APA PUN di luar enam nama di daftar ini dihitung
 *    sebagai Normal. Formulir input menawarkan 21 morph; kartu ini hanya
 *    mengenali enam. Begitu ada satu kura dicatat hypo, piebald, mix, atau
 *    unknown, angka Normal di dasbor pemilik membesar tanpa tanda apa pun
 *    — keterangan di kartunya sendiri hanya menjanjikan "kura TANPA data
 *    morph dihitung Normal", bukan ini.
 *    Sekarang hanya morph KOSONG yang jatuh ke Normal; morph yang dikenal
 *    tapi tak berwarna khusus tampil dengan namanya sendiri.
 */
const MORPHS = {
  normal:     { label: "Normal",     bar: "bg-primary/55",          chip: "bg-muted text-muted-foreground" },
  het_albino: { label: "Het Albino", bar: "bg-orange-500", chip: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  ivory:      { label: "Ivory",      bar: "bg-yellow-500", chip: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  albino:     { label: "Albino",     bar: "bg-pink-500",   chip: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300" },
};

/** Warna cadangan untuk morph yang belum punya warna khusus. */
const WARNA_LAIN = [
  { bar: "bg-blue-500",   chip: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { bar: "bg-purple-500", chip: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  { bar: "bg-teal-500",   chip: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
  { bar: "bg-rose-500",   chip: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
];

/** "het_caramel_albino" → "Het Caramel Albino" */
function labelMorph(kunci) {
  return String(kunci || "")
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "Normal";
}

function gayaMorph(kunci, urutan) {
  if (MORPHS[kunci]) return MORPHS[kunci];
  const w = WARNA_LAIN[urutan % WARNA_LAIN.length];
  return { label: labelMorph(kunci), bar: w.bar, chip: w.chip };
}

export default function TortoiseMorphSummary({ tortoises = [] }) {
  const morphCount = {};
  let jantanTotal = 0, betinaTotal = 0, belumTotal = 0;

  tortoises.forEach((t) => {
    // Hanya morph yang benar-benar KOSONG yang dihitung Normal — sesuai
    // yang dijanjikan keterangan di kartu ini. Morph yang terisi tetap
    // tampil apa adanya, walau belum punya warna khusus.
    const m = t.morph || "normal";
    if (!morphCount[m]) morphCount[m] = { total: 0, jantan: 0, betina: 0, belum: 0 };
    morphCount[m].total++;
    if (t.gender === "jantan") { morphCount[m].jantan++; jantanTotal++; }
    else if (t.gender === "betina") { morphCount[m].betina++; betinaTotal++; }
    else { morphCount[m].belum++; belumTotal++; }
  });

  const total = tortoises.length;
  // Daftar baris diturunkan dari morph yang BENAR-BENAR ada di populasi,
  // bukan dari daftar warna di atas. Sebelumnya morph yang tidak tercantum
  // di daftar warna tidak pernah bisa muncul sebagai barisnya sendiri.
  const entries = Object.keys(morphCount)
    .map((k) => ({ key: k, ...morphCount[k] }))
    .sort((a, b) => b.total - a.total);

  const pct = (n) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="surface-raised p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/12 text-primary flex-shrink-0">
          <Shell className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading font-semibold text-[15px] leading-tight flex items-center gap-1">
            Jenis Kura-kura
            <InfoHint title="Morph" variant="info" size={13}>
              Morph adalah variasi genetik/corak kura-kura. Kura tanpa data morph
              dihitung sebagai <b>Normal</b>.
            </InfoHint>
          </h2>
          <p className="text-[11px] text-muted-foreground">Komposisi populasi</p>
        </div>
        <span className="ml-auto text-right">
          <span className="block stat-value text-lg text-primary">{total}</span>
          <span className="block text-[10px] text-muted-foreground">ekor total</span>
        </span>
      </div>

      {/* Ringkasan jenis kelamin — satu bilah bertumpuk, bukan tiga angka terpisah */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
            <div className="bg-blue-500 transition-all duration-700" style={{ width: `${pct(jantanTotal)}%` }} />
            <div className="bg-pink-500 transition-all duration-700" style={{ width: `${pct(betinaTotal)}%` }} />
            <div className="bg-muted-foreground/30 transition-all duration-700" style={{ width: `${pct(belumTotal)}%` }} />
          </div>
          <div className="flex items-center gap-3 mt-2 text-[11px] flex-wrap">
            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
              <Mars className="w-3 h-3" /> {jantanTotal} jantan
            </span>
            <span className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-400 font-semibold">
              <Venus className="w-3 h-3" /> {betinaTotal} betina
            </span>
            {belumTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CircleHelp className="w-3 h-3" /> {belumTotal} belum diketahui
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2.5 flex-1">
        {entries.map((e, i) => {
          const m = gayaMorph(e.key, i);
          return (
            <div key={e.key} className="group">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("badge-pill text-[10px] px-2", m.chip)}>{m.label}</span>
                <span className="ml-auto text-xs font-bold tabular">{e.total}</span>
                <span className="text-[10px] text-muted-foreground tabular w-9 text-right">
                  {Math.round(pct(e.total))}%
                </span>
              </div>
              <div className="bar-track" title={`${m.label}: ${e.total} ekor`}>
                <div className={cn("bar-fill", m.bar)} style={{ width: `${pct(e.total)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                ♂ {e.jantan} · ♀ {e.betina}
                {e.belum > 0 && ` · ${e.belum} belum diketahui`}
              </p>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Illustration name="tortoise" size="sm" className="animate-float" />
            <p className="text-sm text-muted-foreground mt-2">Belum ada data kura-kura</p>
          </div>
        )}
      </div>
    </div>
  );
}
