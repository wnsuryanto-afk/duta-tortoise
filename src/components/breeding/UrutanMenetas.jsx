import { Egg, AlertTriangle, ArrowDown, ShieldAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { urutanPerInkubator, ringkasUrutan } from "@/lib/urutanMenetas";
import HitungMundurMenetas from "@/components/breeding/HitungMundurMenetas";

/**
 * UrutanMenetas — "mana yang menetas lebih dulu", disusun per inkubator.
 *
 * ── Permintaannya ────────────────────────────────────────────────────
 *
 * 13 Nov 2026: "Pada saat di inkubator tidak ada urutan mana yang menetas
 * sehingga seringkali ada yang miss menetas duluan tapi tanpa terpantau."
 *
 * Tab Inkubator sebelum ini menampilkan satu kartu per inkubator berisi
 * SETELAN dan ISI-nya — suhu target, kapasitas, jumlah butir. Semuanya
 * benar, dan tidak satu pun menjawab pertanyaan yang dibawa orang ke depan
 * lemari itu: yang mana berikutnya.
 *
 * ── Kenapa daftar, bukan denah ───────────────────────────────────────
 *
 * Denah inkubator akan terasa lebih tepat — gambar rak, kotak di posisinya.
 * Ia juga akan salah lebih sering: posisinya harus dijaga agar cocok dengan
 * kenyataan, dan satu tray yang digeser tanpa dicatat membuat seluruh
 * gambarnya berbohong dengan meyakinkan.
 *
 * Daftar berurut hanya menjanjikan satu hal — urutan — dan janji itu
 * dijamin oleh aritmetika, bukan oleh kerajinan mencatat: jendela menetas
 * setiap clutch sama lebarnya (+80/+105 hari dari bertelur), jadi urutan
 * bertelur SELALU sama dengan urutan menetas. Lihat lib/urutanMenetas.js.
 *
 * ── Kenapa tray yang kosong ditulis semencolok itu ───────────────────
 *
 * Nomor tray adalah satu-satunya hal yang menghubungkan bayi yang menetas
 * dengan induknya. Tanpa itu, bayi yang keluar pada hari yang sama dari
 * dua clutch berbeda tidak bisa lagi dipisahkan — dan silsilah yang hilang
 * tidak bisa dipulihkan belakangan.
 *
 * Pada data 13 Nov 2026 sembilan clutch yang menetas paling dulu tidak
 * punya tray sama sekali, yang pertama sepuluh hari lagi. Ini bukan
 * peringatan yang boleh halus.
 */

const NAMA_BULAN = "d MMM yyyy";

function tgl(teks) {
  if (!teks) return null;
  try {
    return format(parseISO(String(teks).slice(0, 10)), NAMA_BULAN, { locale: idLocale });
  } catch {
    return null;
  }
}

/** Lingkaran nomor urut. Nomor 1 dibedakan karena itu yang dicari orang. */
function Nomor({ n }) {
  const pertama = n === 1;
  return (
    <div
      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-black tabular-nums ${
        pertama
          ? "bg-green-600 text-white text-base ring-2 ring-green-300 dark:ring-green-800"
          : "bg-muted text-muted-foreground text-sm"
      }`}
      aria-label={`Urutan menetas ke-${n}`}
    >
      {n}
    </div>
  );
}

/** Lencana tray — atau peringatan bahwa traynya belum diisi. */
function Tray({ daftar }) {
  if (daftar.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        Tray belum diisi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-green-300 bg-green-50 px-1.5 py-0.5 text-[11px] font-bold text-green-800 tabular-nums dark:border-green-800 dark:bg-green-950/50 dark:text-green-300">
      Tray {daftar.join(", ")}
    </span>
  );
}

function Baris({ b, onPilih }) {
  const mulai = tgl(b.mulai);
  const sampai = tgl(b.sampai);
  const c = b.clutch;
  const retak = String(c.tray_retak || "").trim();

  return (
    <li>
      <button
        type="button"
        onClick={onPilih ? () => onPilih(c) : undefined}
        disabled={!onPilih}
        className={`w-full text-left rounded-xl border p-2.5 flex items-start gap-2.5 transition-colors ${
          b.urutan === 1
            ? "border-green-400 bg-green-50/70 dark:border-green-800 dark:bg-green-950/30"
            : "border-border bg-card"
        } ${onPilih ? "hover:bg-muted/60" : ""}`}
      >
        <Nomor n={b.urutan} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold text-sm truncate">
              {c.male_name || "—"} <span className="text-muted-foreground font-normal">×</span> {c.female_name || "—"}
            </span>
            <Tray daftar={b.tray} />
          </div>

          {/*
            Tanggal dan jumlah butir dipisah ke DUA baris, bukan satu yang
            dibiarkan membungkus sendiri. Di lebar HP, satu baris gabungan
            memutus dirinya di tempat yang paling tidak masuk akal — "23"
            di baris ini, "butir" di baris berikutnya — karena kotak hitung
            mundur di kanan mengambil lebar tetap.
          */}
          <div className="mt-1 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{mulai || "—"}</span>
            {sampai && <span className="tabular-nums"> s/d {sampai}</span>}
          </div>
          <div className="text-[11px] text-muted-foreground tabular-nums">
            {c.egg_count || 0} butir
          </div>

          {retak && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
              <ShieldAlert className="w-3 h-3 flex-shrink-0" />
              Telur retak di {retak}
            </div>
          )}
        </div>

        <HitungMundurMenetas breeding={c} />
      </button>
    </li>
  );
}

export default function UrutanMenetas({ breedings = [], incubators = [], onPilihClutch = null }) {
  const kelompok = urutanPerInkubator(breedings, incubators);
  const ringkas = ringkasUrutan(breedings);

  if (ringkas.total === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2">
        <Egg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="font-bold text-base leading-tight">Urutan menetas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dari yang paling dekat menetas. Urutan bertelur selalu sama dengan urutan menetas,
            karena jendelanya sama lebar untuk semua clutch.
          </p>
        </div>
      </div>

      {ringkas.tanpaTray > 0 && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                {ringkas.tanpaTray} dari {ringkas.total} clutch belum punya nomor tray
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-snug">
                Nomor tray adalah satu-satunya yang menghubungkan bayi yang menetas dengan induknya.
                Tanpa itu, dua clutch yang menetas di hari yang sama tidak bisa lagi dipisahkan —
                dan silsilahnya tidak bisa dipulihkan belakangan.
                {ringkas.berikutnya && tgl(ringkas.berikutnya.mulai) && (
                  <> Yang paling dekat menetas <b>{tgl(ringkas.berikutnya.mulai)}</b>.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {kelompok.map((k) => (
        <div key={k.kunci} className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">{k.nama}</h4>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {k.baris.length} clutch
            </span>
            <ArrowDown className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] text-muted-foreground">menetas lebih dulu di atas</span>
          </div>

          {k.namaBasi && (
            <p className="text-[11px] text-muted-foreground">
              Sebagian clutch di sini masih tersimpan dengan nama lama &ldquo;{k.namaBasi}&rdquo;.
            </p>
          )}

          <ul className="space-y-2">
            {k.baris.map((b) => (
              <Baris key={b.id} b={b} onPilih={onPilihClutch} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
