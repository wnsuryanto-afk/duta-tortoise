import { kemiripan, AMBANG_MIRIP } from "@/lib/miripTugas";
import { hitungPemberian } from "@/lib/poinInisiatif";

/**
 * kelompokInisiatif.js — menilai PEKERJAAN, bukan 303 catatan satu per satu.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * Pada 12 Okt 2026 antrean Inisiatif menunggu dinilai berisi 303 catatan, dan
 * pemiliknya bertanya apakah bisa dicentang sekaligus mengikuti usul AI.
 *
 * Ditarik datanya dulu, dan angkanya mengubah pertanyaannya: 303 catatan itu
 * hanya 79 judul berbeda, dari DUA orang, sepanjang 94 hari. Lima judul
 * teratas menutupi 204 dari 303:
 *
 *     Cari rumput                   83×
 *     Pakan adabra                  40×   ← pekerjaan yang sama,
 *     Kasik pakan adabra            22×   ← ditulis dua cara
 *     Bersihkan tempat cuci rumput  30×
 *     Bersihkan tempat tamu         29×
 *
 * Jadi ini bukan 303 penilaian yang berbeda-beda. Ini pekerjaan rutin yang
 * sama, berulang. Menilainya per catatan berarti mengambil keputusan yang
 * SAMA delapan puluh tiga kali; menilainya per pekerjaan berarti satu
 * keputusan menyelesaikan delapan puluh tiga catatan.
 *
 * ── Kenapa bukan "AI mencentang semuanya" ───────────────────────────────────
 *
 * Yang diminta adalah berhenti mengetuk 303 kali, dan itu sah. Tetapi usul AI
 * dipanggil SATU KALI PER CATATAN dan dibatasi 60 panggilan per sesi
 * (components/sop/UsulPoinAI.jsx), jadi "centang semua ikut AI" apa adanya
 * berarti 60 catatan dapat usulan dan 243 diam-diam tidak — persis jenis
 * kegagalan senyap yang paling mahal.
 *
 * Mengelompokkan lebih dulu membuat usul AI cukup diminta sekali per
 * PEKERJAAN. Tujuh puluh kelompok, bukan 303 panggilan; dan untuk menutup dua
 * pertiga antrean cukup empat.
 *
 * Keputusannya tetap di tangan orang: penilai melihat daftarnya, angkanya,
 * dan totalnya, lalu menekan sekali. Satu ketukan untuk banyak catatan —
 * bukan nol ketukan. Alasan pembedaan itu ditulis panjang di
 * lib/usulPoinInisiatif.js dan masih berlaku.
 */

/** Judul yang kosong tetap dikelompokkan, dengan nama yang jujur. */
const TANPA_JUDUL = "(tanpa judul)";

function judulBersih(log) {
  return String(log?.item_label || "").trim() || TANPA_JUDUL;
}

/**
 * Kelompokkan catatan Inisiatif menurut PEKERJAANNYA.
 *
 * Kemiripannya memakai `kemiripan()` dan ambang yang sama dengan penjaga
 * "sudah ada di checklist harian" — bukan ambang baru. Alasan ambang 0,6
 * ditulis di lib/miripTugas.js, berikut empat kecocokan salah yang membuatnya
 * dinaikkan ke sana. Diuji pada 79 judul sungguhan: ia menyatukan
 * "Pakan adabra" dengan "Kasik pakan adabra" (62 catatan) dan
 * "Bersihkan aquarium dan kasibo" dengan "Bersihkan aquarium" serta
 * "Bersihkan kasibo", tanpa menyatukan pekerjaan yang berbeda.
 *
 * Judul anggotanya SELALU dibawa keluar, supaya yang menilai melihat persis
 * pekerjaan apa saja yang sedang ia beri satu harga.
 *
 * @returns array kelompok, terbanyak dulu.
 */
export function kelompokkanInisiatif(logs = []) {
  const kel = [];
  for (const log of logs || []) {
    const j = judulBersih(log);
    const k = kel.find((k) => kemiripan(k.wakil, j) >= AMBANG_MIRIP);
    if (k) {
      k.logs.push(log);
      if (!k.judul.includes(j)) k.judul.push(j);
    } else {
      kel.push({ wakil: j, judul: [j], logs: [log] });
    }
  }

  return kel
    .map((k) => {
      const tanggal = k.logs.map((l) => String(l.period_key || "")).filter(Boolean).sort();
      return {
        /* Kunci dari judul wakilnya: stabil selama daftarnya sama, dan tidak
           ikut berubah saat satu catatan dinilai lalu hilang dari antrean. */
        kunci: k.wakil,
        wakil: k.wakil,
        judul: k.judul,
        logs: k.logs,
        jumlah: k.logs.length,
        orang: [...new Set(k.logs.map((l) => l.done_by).filter(Boolean))],
        dari: tanggal[0] || "",
        sampai: tanggal[tanggal.length - 1] || "",
        /* Foto mana pun milik kelompok ini — dipakai usul AI sebagai contoh
           pekerjaannya. Yang terbaru dipilih supaya paling mewakili keadaan
           sekarang. */
        contoh: [...k.logs].sort((a, b) =>
          String(b.period_key || "").localeCompare(String(a.period_key || "")),
        )[0],
      };
    })
    .sort((a, b) => b.jumlah - a.jumlah || a.wakil.localeCompare(b.wakil));
}

/**
 * Rencana pemberian untuk sekumpulan kelompok yang sudah diberi angka.
 *
 * ── Jebakan yang diselesaikannya ────────────────────────────────────────────
 *
 * Batas harian Inisiatif berlaku per ORANG per TANGGAL. Menghitung tiap
 * catatan terhadap potret kuota yang sama berarti dua catatan pada hari yang
 * sama masing-masing melihat kuota PENUH, lalu bersama-sama melewatinya —
 * dan 303 catatan ini memang menumpuk: 23 Juni 2026 saja memuat "Cari rumput"
 * dua kali untuk orang yang sama.
 *
 * Jadi rencana ini menjumlahkan sambil berjalan: setiap baris yang sudah
 * direncanakan ikut menambah "terpakai" bagi baris berikutnya pada orang dan
 * tanggal yang sama.
 *
 * Murni dan tidak menyentuh jaringan, supaya totalnya bisa ditunjukkan SEBELUM
 * apa pun tersimpan — penilai melihat berapa poin yang akan benar-benar
 * keluar, bukan berapa yang ia minta.
 *
 * @param p.pilihan  { [kunci kelompok]: poin }
 * @param p.logsLain catatan Inisiatif lain yang SUDAH dinilai (untuk kuota)
 */
export function rencanaPemberian({ kelompok = [], pilihan = {}, logsLain = [], settings } = {}) {
  const baris = [];
  /* Tambahan kuota yang sudah "dipakai" rencana ini, per orang+tanggal. */
  const dipakai = new Map();
  const kunciHari = (email, tgl) => `${email}|${tgl}`;

  for (const k of kelompok) {
    const diminta = pilihan[k.kunci];
    if (diminta === undefined || diminta === null) continue;

    /* Urut menurut tanggal supaya hasilnya tidak bergantung pada urutan
       daftar: dua catatan sehari harus selalu memotong yang sama. */
    const urut = [...k.logs].sort((a, b) =>
      String(a.period_key || "").localeCompare(String(b.period_key || "")) ||
      String(a.id || "").localeCompare(String(b.id || "")),
    );

    for (const log of urut) {
      const kh = kunciHari(log.done_by_email, log.period_key);
      const sudah = dipakai.get(kh) || 0;

      /* Catatan tiruan dipakai untuk menitipkan poin yang sudah direncanakan
         hari itu kepada hitungPemberian, yang hanya tahu membaca daftar log.
         Dengan begitu aturan kuotanya tetap SATU — yang di poinInisiatif.js —
         dan tidak ada salinan kedua yang bisa berselisih. */
      const titipan = sudah > 0
        ? [{
            is_extra: true,
            approval_status: "approved",
            done_by_email: log.done_by_email,
            period_key: log.period_key,
            poin_earned: sudah,
          }]
        : [];

      const h = hitungPemberian({
        diminta,
        logs: [...logsLain, ...titipan],
        email: log.done_by_email,
        tanggal: log.period_key,
        settings,
        kecualikanId: log.id,
      });

      dipakai.set(kh, sudah + h.diberikan);
      baris.push({
        log,
        kelompok: k.kunci,
        diminta: h.diminta,
        diberikan: h.diberikan,
        terpotong: h.terpotong,
        pesan: h.pesan,
      });
    }
  }

  return {
    baris,
    jumlahCatatan: baris.length,
    totalDiminta: baris.reduce((t, b) => t + b.diminta, 0),
    totalDiberikan: baris.reduce((t, b) => t + b.diberikan, 0),
    jumlahTerpotong: baris.filter((b) => b.terpotong).length,
  };
}
