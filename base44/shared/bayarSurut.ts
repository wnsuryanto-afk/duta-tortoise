/**
 * bayarSurut.ts — keputusan "berapa poin untuk catatan Inisiatif ini", murni.
 *
 * Dipisahkan dari fungsi yang menulisnya (base44/functions/bayarInisiatifSurut)
 * karena ini perhitungan UANG yang hanya dijalankan sekali. Sekali jalan berarti
 * tidak ada kesempatan kedua untuk memperhatikan bahwa angkanya keliru: slip
 * sudah dicetak, orang sudah dibayar, dan yang tersisa hanya menelusuri ke
 * belakang. Jadi keputusannya ditulis sebagai fungsi tanpa jaringan, dan
 * penjaga scripts/cek-ronda.mjs mengujinya dengan kasus-kasus yang benar-benar
 * ada di data peternakan ini.
 *
 * Latar belakangnya ada di kepala entry.ts fungsi itu: sampai 12 Juli 2026
 * setiap Inisiatif masuk bernilai 5 poin lewat `log.poin_earned || 5`; pada
 * 28 Juli `||` diganti `??` dan nilainya menjadi nol. 210 catatan, dua orang,
 * tiga bulan.
 */
import { kunciTugas, normalJudul } from "./kunciTugas.ts";

/** Satu keputusan untuk satu catatan Inisiatif. */
export interface Keputusan {
  id: string;
  judul: string;
  poin: number;
  alasan: string;
  sebab: "dibayar" | "sudah-dibayar" | "kuota-habis" | "kuota-terpotong";
}

/**
 * Hitung pembayaran surut untuk SATU orang pada SATU hari.
 *
 * @param logs        catatan Inisiatif yang belum dinilai, urut waktu
 * @param baris       completed_tasks checklist hari itu (boleh kosong)
 * @param maks        batas poin Inisiatif per orang per hari
 * @param terpakai    poin Inisiatif yang sudah disetujui pada hari itu
 * @param poinSatuan  tarif per catatan
 */
export function rencanaHari(
  { logs = [], baris = [], maks = 30, terpakai = 0, poinSatuan = 5 }: {
    logs?: Array<Record<string, unknown>>;
    baris?: Array<Record<string, unknown>>;
    maks?: number;
    terpakai?: number;
    poinSatuan?: number;
  },
) {
  const keputusan: Keputusan[] = [];
  const perJudul = new Map<string, number>();
  let sisa = Math.max(0, maks - Math.max(0, terpakai));

  for (const log of logs) {
    const judulAsli = String(log.item_label ?? "");
    const judul = normalJudul(judulAsli);
    const kunciBaris = kunciTugas(judulAsli, log.enclosure_name as string);

    /*
      Sudah dibayar lewat baris LAIN berjudul sama?

      Ujinya exact, bukan kemiripan: baris dengan judul yang sama persis
      (sesudah dinormalkan), kunci yang BERBEDA (jadi bukan baris Inisiatif
      ini sendiri), dan poin di atas nol. Itulah tanda pekerjaan yang sama
      sudah berpoin — contohnya "Siram tanaman", yang juga tugas SOP harian
      bernilai 5 poin dan tercatat 8 kali sebagai Inisiatif.

      Kemiripan judul sengaja TIDAK dipakai di sini. Untuk uang, "mirip" bukan
      bukti; yang jadi bukti adalah baris lain yang benar-benar berpoin.
    */
    const sudahDibayar = baris.some((t) =>
      normalJudul(t.task_title as string) === judul &&
      kunciTugas(t.task_title as string, t.notes as string) !== kunciBaris &&
      (Number(t.points) || 0) > 0
    );

    if (sudahDibayar) {
      keputusan.push({
        id: String(log.id ?? ""),
        judul: judulAsli,
        poin: 0,
        sebab: "sudah-dibayar",
        alasan: "Pekerjaan dengan judul sama sudah berpoin di checklist hari itu — tidak dibayar dua kali.",
      });
      continue;
    }

    if (sisa <= 0) {
      keputusan.push({
        id: String(log.id ?? ""),
        judul: judulAsli,
        poin: 0,
        sebab: "kuota-habis",
        alasan: `Batas ${maks} poin Inisiatif per hari sudah terpakai.`,
      });
      continue;
    }

    const poin = Math.min(poinSatuan, sisa);
    const terpotong = poin < poinSatuan;
    sisa -= poin;
    perJudul.set(kunciBaris, (perJudul.get(kunciBaris) || 0) + poin);
    keputusan.push({
      id: String(log.id ?? ""),
      judul: judulAsli,
      poin,
      sebab: terpotong ? "kuota-terpotong" : "dibayar",
      alasan: terpotong ? `Sisa kuota hari itu ${poin} poin dari batas ${maks}.` : "",
    });
  }

  return { keputusan, perJudul, sisaKuota: sisa };
}

/**
 * Pasang poin yang sudah diputuskan ke baris checklist.
 *
 * Yang dipasang JUMLAH per judul, bukan poin satu catatan: satu judul yang
 * dicatat dua kali sehari hanya punya SATU baris di checklist, karena
 * `onMaintenanceDone` menyatukan baris berjudul sama. Menulis poin satu
 * catatan saja berarti catatan kedua hilang pembayarannya.
 */
export function pasangKeBaris(
  baris: Array<Record<string, unknown>> = [],
  perJudul: Map<string, number> = new Map(),
) {
  let hasil = (baris || []).slice();
  let selisih = 0;
  let berubah = 0;
  let tanpaBaris = 0;

  for (const [kunci, poin] of perJudul) {
    const idx = hasil.findIndex((t) => kunciTugas(t.task_title as string, t.notes as string) === kunci);
    if (idx === -1) { tanpaBaris++; continue; }
    const lama = Number(hasil[idx].points) || 0;
    if (lama === poin) continue;
    hasil = hasil.slice();
    hasil[idx] = { ...hasil[idx], points: poin };
    selisih += poin - lama;
    berubah++;
  }

  const total = hasil.reduce((jumlah, t) => jumlah + (Number(t.points) || 0), 0);
  return { baris: hasil, selisih, berubah, tanpaBaris, total };
}
