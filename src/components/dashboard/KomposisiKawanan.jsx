import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Shell, ChevronRight } from "lucide-react";
import InfoHint from "@/components/ui/info-hint";
import { diPeternakan } from "@/lib/populasiKura";
import { cariKandang } from "@/lib/kandang";
import { sedangSakit } from "@/lib/statusKura";
import { cn } from "@/lib/utils";

/**
 * KomposisiKawanan — seluruh kawanan dalam satu gambar.
 *
 * Populasi sebelumnya hanya muncul sebagai tiga angka telanjang ("98 Aktif,
 * 3 Sakit, 6 Breeding") di sebuah kartu selebar layar. Angka itu tidak
 * menjawab pertanyaan yang sebenarnya dipakai memutuskan: berapa besar
 * porsinya, kandang mana yang penuh, dan di mana kura sakit berkumpul.
 *
 * Warna TIDAK pernah menjadi satu-satunya pembeda. Setiap potongan punya
 * labelnya sendiri di legenda dengan angkanya, dan baris kandang menyebutkan
 * isinya sebagai teks — bagian berwarna hanya menguatkan, bukan menggantikan.
 */

const KELOMPOK = [
  { kunci: "sakit",     label: "Sakit",     kelas: "bg-destructive",        teks: "text-destructive" },
  { kunci: "karantina", label: "Karantina", kelas: "bg-[hsl(var(--seri-keluar))]", teks: "text-[hsl(var(--seri-keluar))]" },
  { kunci: "breeding",  label: "Breeding",  kelas: "bg-[hsl(var(--seri-masuk))]",  teks: "text-[hsl(var(--seri-masuk))]" },
  { kunci: "baby",      label: "Baby",      kelas: "bg-accent",             teks: "text-accent" },
  { kunci: "dewasa",    label: "Dewasa",    kelas: "bg-primary",            teks: "text-primary" },
];

function kelompokkan(kura) {
  if (sedangSakit(kura)) return "sakit";
  if (kura.status === "karantina") return "karantina";
  if (kura.status === "breeding") return "breeding";
  if (kura.age_category === "baby") return "baby";
  return "dewasa";
}

export default function KomposisiKawanan({ tortoises = [], enclosures = [] }) {
  const { total, hitung, kandang } = useMemo(() => {
    const ada = tortoises.filter(diPeternakan);
    const h = Object.fromEntries(KELOMPOK.map((k) => [k.kunci, 0]));
    ada.forEach((t) => { h[kelompokkan(t)] += 1; });

    const perKandang = enclosures.map((e) => {
      const isi = ada.filter((t) => cariKandang(t, enclosures).kandang?.id === e.id);
      return {
        id: e.id, nama: e.name, isi: isi.length,
        kapasitas: e.max_capacity || 0,
        sakit: isi.filter(sedangSakit).length,
      };
    }).filter((k) => k.isi > 0 || k.kapasitas > 0)
      .sort((a, b) => {
        const ra = a.kapasitas ? a.isi / a.kapasitas : 0;
        const rb = b.kapasitas ? b.isi / b.kapasitas : 0;
        return rb - ra;
      });

    return { total: ada.length, hitung: h, kandang: perKandang };
  }, [tortoises, enclosures]);

  if (total === 0) return null;
  const terpakai = KELOMPOK.filter((k) => hitung[k.kunci] > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
          <Shell className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-[15px] leading-tight flex items-center gap-1">
            Kawanan hari ini
            <InfoHint title="Yang dihitung" variant="info" size={13}>
              Seluruh kura yang masih ada di peternakan — termasuk yang sakit,
              breeding, dan karantina. Yang sudah mati, terjual, atau diarsipkan
              tidak ikut.
            </InfoHint>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            <span className="tabular font-semibold text-foreground">{total}</span> ekor di{" "}
            <span className="tabular">{kandang.length}</span> kandang
          </p>
        </div>
        <Link to="/tortoise" className="text-xs text-primary hover:underline flex items-center gap-0.5 flex-shrink-0">
          Daftar Kura <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Satu batang bertumpuk: porsi tiap kelompok terlihat sekaligus,
          bukan lima angka yang harus dibandingkan sendiri di kepala. Celah 2px
          antar potongan supaya batasnya tegas tanpa mengandalkan warna. */}
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-muted">
        {terpakai.map((k) => (
          <div
            key={k.kunci}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", k.kelas)}
            style={{ width: `${(hitung[k.kunci] / total) * 100}%` }}
            title={`${k.label}: ${hitung[k.kunci]} ekor`}
          />
        ))}
      </div>

      {/* Legenda selalu ada dan selalu membawa angkanya — identitas kelompok
          tidak pernah bergantung pada warna saja. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {terpakai.map((k) => (
          <span key={k.kunci} className="inline-flex items-center gap-1.5 text-xs">
            <span className={cn("w-2.5 h-2.5 rounded-sm flex-shrink-0", k.kelas)} />
            <span className="text-muted-foreground">{k.label}</span>
            <span className="tabular font-semibold text-foreground">{hitung[k.kunci]}</span>
            <span className="text-muted-foreground/70 tabular">
              {Math.round((hitung[k.kunci] / total) * 100)}%
            </span>
          </span>
        ))}
      </div>

      {/* Isi kandang, terpenuh lebih dulu — inilah yang dipakai memutuskan ke
          mana kura berikutnya dipindahkan. */}
      {kandang.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Isi kandang
          </p>
          {kandang.slice(0, 6).map((k) => {
            const rasio = k.kapasitas ? k.isi / k.kapasitas : 0;
            const penuh = k.kapasitas > 0 && k.isi >= k.kapasitas;
            const hampir = !penuh && rasio >= 0.8;
            return (
              <div key={k.id} className="flex items-center gap-2.5">
                <span className="text-xs w-16 flex-shrink-0 truncate text-muted-foreground">{k.nama}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all",
                      penuh ? "bg-destructive" : hampir ? "bg-[hsl(var(--seri-keluar))]" : "bg-primary")}
                    style={{ width: `${Math.min(100, rasio * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] tabular text-muted-foreground w-14 text-right flex-shrink-0">
                  {k.isi}{k.kapasitas ? `/${k.kapasitas}` : ""}
                </span>
                {/* Keadaan disebut dengan KATA, bukan hanya warna batangnya. */}
                <span className={cn("text-[10px] w-14 flex-shrink-0",
                  penuh ? "text-destructive font-semibold" : hampir ? "text-[hsl(var(--seri-keluar))]" : "text-transparent")}>
                  {penuh ? "penuh" : hampir ? "hampir" : "·"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
