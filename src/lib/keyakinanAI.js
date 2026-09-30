/**
 * keyakinanAI.js — SATU cara membaca `ai_confidence`.
 *
 * ── Cacatnya ────────────────────────────────────────────────────────
 *
 * Prompt yang meminta angka keyakinan ke AI (lib/photoVerification.js)
 * TIDAK pernah menyebut skalanya, dan skema responsnya hanya
 * `{ type: "number" }`. Jadi modelnya menjawab dengan skala yang ia pilih
 * sendiri, berganti-ganti dari hari ke hari.
 *
 * Dihitung dari 199 baris DailyChecklist pada 30-09-2026:
 *
 *     164 nilai <= 1   (0.3 · 0.4 · 0.5 · 0.6 · 0.7 · 0.75 · 0.8 · 0.85 · 0.9 · 0.95 · 1)
 *       6 nilai  > 1   (10 · 95 · 100)
 *
 * Sementara SELURUH sisi baca menganggapnya persen 0–100 — dan keterangan
 * kolomnya di DailyChecklist.jsonc juga berbunyi "Tingkat keyakinan AI
 * (0-100)".
 *
 * ── Akibatnya, semuanya sunyi ───────────────────────────────────────
 *
 * Tidak ada yang error. Angkanya cuma jadi masuk akal terbalik:
 *
 *   · `keyakinan >= 60` untuk menampilkan apresiasi & saran ke kiper
 *     tidak pernah benar untuk 0.95 → 330 pesan tertulis tidak pernah
 *     tampil, meski halamannya dibuka.
 *   · `ai_confidence < 70` yang menandai "perlu diperiksa" SELALU benar
 *     untuk 0.95 → setiap tugas tampak meragukan bagi penyetuju.
 *   · label "keyakinan {ai_confidence}%" menampilkan "0.95%" untuk
 *     keyakinan 95%.
 *
 * ── Kenapa dinormalkan saat DIBACA, bukan datanya diperbaiki ───────
 *
 * Data historis tidak diubah. 164 baris lama berisi pecahan dan akan
 * tetap begitu; fungsi ini yang membuatnya terbaca benar. Sisi tulis juga
 * diperbaiki (promptnya kini menyebut "bilangan bulat 0-100" dan nilainya
 * dinormalkan sebelum disimpan), jadi baris baru akan konsisten — tapi
 * fungsi ini tetap diperlukan selamanya untuk yang lama.
 *
 * ── Satu titik yang memang tidak bisa dipastikan ────────────────────
 *
 * Nilai tepat `1` ambigu: bisa berarti 1% atau 100%. Dibaca sebagai 100%,
 * karena ia muncul berdampingan dengan 0.95 dan 0.9 di data yang sama —
 * modelnya sedang memakai skala pecahan saat itu. Ini pilihan yang
 * disengaja, bukan kelalaian.
 */

/**
 * Kembalikan keyakinan sebagai persen 0–100, apa pun skala tersimpannya.
 * `null` bila tidak ada angkanya sama sekali (foto belum dianalisis).
 */
export function persenKeyakinan(nilai) {
  // `== null` menangkap null DAN undefined sekaligus, dan tidak menangkap 0.
  // `!nilai` akan salah di sini: keyakinan 0 adalah angka yang sah.
  if (nilai == null) return null;
  const n = Number(nilai);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  // <= 1 dibaca sebagai pecahan. Lihat catatan soal nilai 1 di atas.
  if (n <= 1) return n * 100;
  return Math.min(n, 100);
}

/**
 * Apakah keyakinannya cukup untuk menampilkan apresiasi/saran ke kiper?
 *
 * Tanpa angka sama sekali → dianggap layak tampil. Itu perilaku yang sudah
 * ada sebelumnya (`keyakinan == null || ...`) dan disengaja: teks yang
 * sudah ditulis tidak disembunyikan hanya karena angkanya tidak tercatat.
 */
export function layakTampil(nilai, batas = 60) {
  const p = persenKeyakinan(nilai);
  return p == null || p >= batas;
}
