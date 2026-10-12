import { useMemo, useState } from "react";
import { Layers, Loader2, Sparkles, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { opsiPoin, maksHarian, poinTerpakaiHari } from "@/lib/poinInisiatif";
import { kelompokkanInisiatif, rencanaPemberian } from "@/lib/kelompokInisiatif";
import { simpanPenilaianInisiatif } from "@/lib/simpanPenilaianInisiatif";
import { mintaUsul } from "@/components/sop/UsulPoinAI";
import { TOMBOL_PANJANG } from "@/lib/tombolPanjang";

/**
 * NilaiInisiatifSekaligus — menilai PEKERJAAN, bukan 303 catatan satu per satu.
 *
 * ── Kenapa panel ini ada ────────────────────────────────────────────────────
 *
 * 12 Okt 2026, antrean Inisiatif berisi 303 catatan dan pemiliknya bertanya
 * apakah bisa dicentang sekaligus mengikuti usul AI. Ditarik datanya: 303
 * catatan itu hanya 70 kelompok pekerjaan, dari dua orang, dan EMPAT kelompok
 * teratas menutupi 205 di antaranya. Jadi yang dihadapi bukan 303 penilaian
 * berbeda melainkan satu penilaian yang diulang delapan puluh tiga kali.
 *
 * ── Kenapa bukan "AI mencentang semuanya" ───────────────────────────────────
 *
 * Usul AI dipanggil satu kali per CATATAN dan dibatasi 60 per sesi. "Centang
 * semua ikut AI" apa adanya berarti 60 catatan dapat usulan dan 243 diam-diam
 * tidak. Dikelompokkan lebih dulu, usulnya cukup diminta sekali per pekerjaan
 * — dan untuk menutup dua pertiga antrean cukup empat permintaan.
 *
 * Keputusannya tetap di tangan orang: angkanya terlihat, totalnya terlihat,
 * dan tombolnya ditekan sekali. Satu ketukan untuk banyak catatan — bukan nol
 * ketukan. Alasan pembedaan itu ditulis panjang di lib/usulPoinInisiatif.js.
 *
 * ── Yang ditunjukkan sebelum menyimpan ──────────────────────────────────────
 *
 * Batas harian berlaku per orang per tanggal, dan catatan-catatan ini menumpuk
 * di hari yang sama. Jadi yang diminta dan yang BENAR-BENAR keluar sering
 * berbeda — pada percobaan 4 kelompok teratas @15 poin: 3.075 diminta, 2.670
 * keluar. Keduanya ditampilkan sebelum apa pun tersimpan, karena memotong
 * diam-diam adalah kesalahan yang sama dengan memotong poin tanpa alasan.
 */

const BATAS_TAMPIL = 8;

export default function NilaiInisiatifSekaligus({ logs = [], logsSemua = [], settings, user, onSelesai }) {
  const [pilihan, setPilihan] = useState({});
  const [semua, setSemua] = useState(false);
  const [usul, setUsul] = useState({});
  const [sibukUsul, setSibukUsul] = useState(null);
  const [jalan, setJalan] = useState(null);
  const berhenti = useMemo(() => ({ minta: false }), []);

  const opsi = opsiPoin(settings);
  const maks = maksHarian(settings);
  const kelompok = useMemo(() => kelompokkanInisiatif(logs), [logs]);

  /*
    Kuota pratinjau dihitung terhadap catatan yang SUDAH dinilai pada
    hari-hari itu, bukan terhadap daftar kosong.

    `logs` hanya memuat yang menunggu; hari yang kuotanya sudah separuh
    terpakai akan terbaca masih penuh, dan totalnya menjanjikan lebih banyak
    poin daripada yang benar-benar keluar. Penyimpannya sendiri mengambil
    data segar per orang-tanggal, jadi angka yang TERSIMPAN tetap benar —
    yang salah hanya janjinya, dan janji yang meleset soal uang adalah
    kesalahan tersendiri.
  */
  const rencana = useMemo(
    () => rencanaPemberian({ kelompok, pilihan, logsLain: logsSemua, settings }),
    [kelompok, pilihan, logsSemua, settings],
  );

  if (kelompok.length === 0) return null;

  const tampil = semua ? kelompok : kelompok.slice(0, BATAS_TAMPIL);
  const sisaKelompok = kelompok.length - tampil.length;

  const mintaUsulKelompok = async (k) => {
    setSibukUsul(k.kunci);
    try {
      const contoh = k.contoh || k.logs[0];
      const u = await mintaUsul(contoh, {
        opsi,
        maks,
        terpakaiHari: poinTerpakaiHari(logs, contoh.done_by_email, contoh.period_key),
      });
      setUsul((p) => ({ ...p, [k.kunci]: u }));
      setPilihan((p) => ({ ...p, [k.kunci]: u.poin }));
    } catch (e) {
      toast.error(e?.message || "Usulan AI gagal");
    } finally {
      setSibukUsul(null);
    }
  };

  /*
    Disimpan per ORANG+TANGGAL, bukan per catatan.

    Dua alasan. Kuotanya memang dihitung per orang per tanggal, jadi catatan
    pada hari yang sama harus saling melihat: tanpa itu dua catatan sehari
    masing-masing melihat kuota penuh. Dan `poinJudulHari` di jalur simpan
    menjumlahkan judul yang sama pada hari yang sama — yang juga butuh daftar
    hari itu, bukan satu catatan.
  */
  const simpanSemua = async () => {
    if (rencana.jumlahCatatan === 0) return;
    berhenti.minta = false;
    setJalan({ selesai: 0, total: rencana.jumlahCatatan, poin: 0, gagal: 0 });

    const perHari = new Map();
    for (const b of rencana.baris) {
      const kh = `${b.log.done_by_email}|${b.log.period_key}`;
      if (!perHari.has(kh)) perHari.set(kh, []);
      perHari.get(kh).push(b);
    }

    let selesai = 0;
    let poinTotal = 0;
    let gagal = 0;

    for (const [kh, baris] of perHari) {
      if (berhenti.minta) break;
      const [email, tanggal] = kh.split("|");

      let kuota = [];
      try {
        kuota = await base44.entities.MaintenanceLog.filter({ done_by_email: email, period_key: tanggal });
      } catch {
        // Gagal mengambil yang segar bukan alasan menggagalkan; daftar di
        // layar tetap lebih baik daripada tidak menilai sama sekali.
        kuota = logs.filter((l) => l.done_by_email === email && l.period_key === tanggal);
      }

      for (const b of baris) {
        if (berhenti.minta) break;
        try {
          const { diberikan } = await simpanPenilaianInisiatif({
            log: b.log, poin: b.diminta, user, settings, logsKuota: kuota,
          });
          /*
            Hasilnya dimasukkan kembali ke daftar hari itu sebelum catatan
            berikutnya diproses. Tanpa langkah ini catatan kedua pada hari
            yang sama melihat kuota seolah belum terpakai, dan keduanya
            bersama-sama melewati batas harian.
          */
          kuota = kuota.map((l) =>
            l.id === b.log.id
              ? { ...l, approval_status: diberikan > 0 ? "approved" : "rejected", poin_earned: diberikan }
              : l,
          );
          poinTotal += diberikan;
        } catch {
          gagal++;
        }
        selesai++;
        setJalan({ selesai, total: rencana.jumlahCatatan, poin: poinTotal, gagal });
      }
    }

    setJalan(null);
    setPilihan({});
    if (gagal > 0) toast.warning(`${selesai - gagal} catatan dinilai (${poinTotal} poin), ${gagal} gagal`);
    else toast.success(`${selesai} catatan dinilai — ${poinTotal} poin`);
    onSelesai?.();
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 mb-4">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-sm font-semibold text-foreground">Nilai per pekerjaan</p>
      </div>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
        {logs.length} catatan ini sebenarnya {kelompok.length} pekerjaan yang sama, berulang.
        Satu angka di sini menilai semua catatan pekerjaan itu sekaligus.
      </p>

      <div className="mt-3 space-y-2">
        {tampil.map((k) => (
          <div key={k.kunci} className="rounded-lg border border-border bg-card p-2.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{k.wakil}</span>
              <span className="text-[11px] font-bold text-primary tabular-nums">{k.jumlah} catatan</span>
            </div>
            {/* Judul anggotanya ditulis apa adanya: yang menilai berhak tahu
                persis pekerjaan apa saja yang sedang ia beri satu harga. */}
            {k.judul.length > 1 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                termasuk: {k.judul.filter((j) => j !== k.wakil).join(" · ")}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
              {k.orang.join(", ")} · {k.dari} s/d {k.sampai}
            </p>

            {usul[k.kunci] && (
              <p className="text-[10px] text-accent mt-1 leading-tight">
                Usul AI {usul[k.kunci].poin} poin ({usul[k.kunci].keyakinan || "—"}): {usul[k.kunci].alasan}
              </p>
            )}

            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {opsi.map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={pilihan[k.kunci] === n ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs tabular-nums"
                  onClick={() => setPilihan((p) => ({ ...p, [k.kunci]: n }))}
                >
                  {n}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1"
                disabled={sibukUsul === k.kunci}
                onClick={() => mintaUsulKelompok(k)}
              >
                {sibukUsul === k.kunci
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Sparkles className="w-3 h-3" />}
                Usul AI
              </Button>
              {pilihan[k.kunci] !== undefined && (
                <button
                  type="button"
                  className="text-[10px] text-muted-foreground underline"
                  onClick={() => setPilihan((p) => { const n = { ...p }; delete n[k.kunci]; return n; })}
                >
                  batal
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {sisaKelompok > 0 && (
        <button type="button" className="text-xs text-primary underline mt-2" onClick={() => setSemua(true)}>
          Tampilkan {sisaKelompok} pekerjaan lain
        </button>
      )}

      {rencana.jumlahCatatan > 0 && (
        <div className="mt-3 rounded-lg bg-card border border-border p-2.5">
          <p className="text-xs text-foreground">
            <span className="font-bold tabular-nums">{rencana.jumlahCatatan}</span> catatan ·{" "}
            <span className="font-bold tabular-nums">{rencana.totalDiberikan}</span> poin
          </p>
          {/* Yang diminta dan yang keluar sering berbeda, karena batas harian
              berlaku per orang per tanggal dan catatan ini menumpuk di hari
              yang sama. Selisihnya dikatakan, bukan dipotong diam-diam. */}
          {rencana.totalDiberikan < rencana.totalDiminta && (
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 leading-tight">
              Diminta {rencana.totalDiminta} poin; {rencana.jumlahTerpotong} catatan kena batas{" "}
              {maks} poin/hari, jadi yang keluar {rencana.totalDiberikan}.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Button
          size="sm"
          className={`gap-1.5 ${TOMBOL_PANJANG}`}
          disabled={rencana.jumlahCatatan === 0 || !!jalan}
          onClick={simpanSemua}
        >
          {jalan ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {jalan
            ? `Menyimpan ${jalan.selesai}/${jalan.total} — ${jalan.poin} poin`
            : `Simpan ${rencana.jumlahCatatan} penilaian`}
        </Button>
        {jalan && (
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => { berhenti.minta = true; }}>
            <StopCircle className="w-4 h-4" /> Berhenti
          </Button>
        )}
      </div>

      {/* Berhenti di tengah jalan aman: tiap catatan disimpan sendiri-sendiri,
          jadi yang sudah tersimpan tetap tersimpan dan sisanya tetap menunggu. */}
      <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
        Tiap catatan disimpan sendiri-sendiri — berhenti di tengah jalan tidak membatalkan yang sudah tersimpan.
      </p>
    </div>
  );
}
