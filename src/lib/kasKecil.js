/**
 * kasKecil.js — SATU cara menentukan saldo kas kecil yang berlaku.
 *
 * Saldo tidak disimpan di satu tempat. Setiap baris buku kas menyimpan
 * `balance_after`, yaitu saldo SETELAH baris itu. Saldo yang berlaku karena itu
 * adalah `balance_after` milik baris TERAKHIR — dan "terakhir" harus ditentukan
 * dengan aturan yang sama persis di semua tempat.
 *
 * Sebelum berkas ini ada, tiga layar menjawabnya dengan dua cara berbeda:
 *
 *   - Halaman Kas Kecil mengurutkan sendiri: entry_date menurun, lalu
 *     created_date menurun. Ini yang benar.
 *   - Widget Kas Kecil dan Ringkasan Pagi mengambil `ledger[0]` apa adanya,
 *     yaitu baris pertama dari `list("-entry_date", 200)`.
 *
 * Bedanya nyata karena `entry_date` berformat TANGGAL saja, tanpa jam. Dua
 * transaksi di hari yang sama punya entry_date yang identik, dan urutan di
 * antara keduanya ditentukan sekehendak basis data. Pada hari mana pun yang
 * punya lebih dari satu transaksi — hal biasa untuk kas kecil — widget bisa
 * menampilkan saldo TENGAH HARI sementara halaman Kas Kecil menampilkan saldo
 * akhir. Dua angka berbeda untuk satu kas, pada saat yang sama.
 *
 * Aturan di bawah ini disalin dari fungsi recalculatePettyCashBalance, yang
 * menghitung ulang seluruh `balance_after`. Kalau layar memakai urutan yang
 * berbeda dari yang dipakai saat menghitung, angkanya tidak akan pernah cocok.
 */

/**
 * Kunci urut sebuah baris buku kas.
 *
 * `entry_date` dipakai bila terisi dan masuk akal; bila tidak, `created_date`
 * yang dipakai. Baris tanpa tanggal sama sekali tidak boleh dianggap paling
 * baru hanya karena tanggalnya kosong.
 */
export function kunciUrut(baris) {
  const tanggal = baris?.entry_date;
  if (tanggal && tanggal !== "null" && tanggal !== "undefined") {
    const d = new Date(tanggal);
    if (!Number.isNaN(d.getTime())) return tanggal;
  }
  return baris?.created_date || "";
}

/**
 * Bandingkan dua baris secara kronologis (yang lebih lama lebih dulu).
 * `created_date` jadi pemutus saat tanggalnya sama — tanpa itu, dua transaksi
 * di hari yang sama tidak punya urutan yang pasti.
 */
export function bandingkanBaris(a, b) {
  const ka = kunciUrut(a);
  const kb = kunciUrut(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  const ca = a?.created_date || "";
  const cb = b?.created_date || "";
  if (ca !== cb) return ca < cb ? -1 : 1;
  return String(a?.id || "") < String(b?.id || "") ? -1 : 1;
}

/** Buku kas terurut dari yang paling baru ke yang paling lama. */
export function urutTerbaruDulu(ledger = []) {
  return [...ledger].sort((a, b) => bandingkanBaris(b, a));
}

/**
 * Saldo kas kecil yang berlaku sekarang.
 *
 * @param {Array} ledger baris-baris PettyCashLedger
 * @returns {number} dibulatkan ke rupiah penuh, 0 bila buku kas masih kosong
 */
export function saldoTerkini(ledger = []) {
  if (!ledger.length) return 0;
  const terbaru = ledger.reduce((a, b) => (bandingkanBaris(a, b) > 0 ? a : b));
  return Math.round(terbaru?.balance_after || 0);
}

/**
 * Pencairan yang TIDAK pernah masuk buku kas.
 *
 * ── Kenapa ini bisa terjadi ───────────────────────────────────────────
 *
 * Ada DUA entitas untuk hal yang sama, dan hanya satu yang tersambung ke
 * buku kas:
 *
 *   PettyCashTopUpRequest → fungsi processTopUpRequest → MEMBUAT baris
 *                           top_up di PettyCashLedger. Benar.
 *
 *   PettyCashRequest      → tombol "Cairkan" di halaman Kas Kecil → hanya
 *                           mengubah status menjadi "dicairkan". Buku kas
 *                           tidak pernah tahu.
 *
 * Yang membuat lubang ini tak terlihat: otomasi onPettyCashRequestUpdate
 * mengirim notifikasi "Dana Rp 200.000 Sudah Dicairkan" ke pemohon. Jadi
 * semua orang DIBERI TAHU uangnya sudah cair, dan tidak ada yang curiga pada
 * saldonya. 29 Okt 2026 Rp 200.000 cair dengan bukti transfer, dan saldo kas
 * kecil berjalan terus menuju minus sampai pemiliknya sendiri yang bertanya.
 *
 * ── Kenapa pencocokannya tidak cukup lewat linked_request_id ──────────────
 *
 * Dua pencairan yang lama memang masuk buku kas, tetapi tanpa tautan:
 *
 *   25 Jul 2026  Rp 300.000  diketik tangan lewat TopUpForm ("Kas kecil kura")
 *   24 Sep 2026  Rp 200.000  pemohon mengajukan DUA KALI pada hari yang sama —
 *                            sekali sebagai TopUpRequest (02:52) dan sekali
 *                            sebagai PettyCashRequest (02:54), bukti transfer
 *                            yang sama. Baris buku kasnya tertaut ke yang
 *                            pertama; yang kedua tidak tertaut ke apa pun.
 *
 * Kalau yang dicocokkan hanya tautannya, keduanya akan dilaporkan "belum
 * masuk" — dan orang yang menekan tombol perbaikan akan memasukkan Rp 500.000
 * yang sudah ada. Peringatan yang membuat uang berlipat lebih buruk daripada
 * tidak ada peringatan.
 *
 * Jadi sebuah top_up juga dianggap melunasi sebuah pencairan bila TANGGAL dan
 * NOMINALNYA sama. Satu baris top_up hanya boleh dipakai sekali.
 *
 * Murni — tidak menyentuh jaringan — supaya bisa diuji dan dipakai di layar.
 *
 * @param {object[]} requests PettyCashRequest apa adanya
 * @param {object[]} ledger   PettyCashLedger apa adanya
 * @returns {object[]} request berstatus "dicairkan" yang uangnya tidak ada di
 *                     buku kas, terurut dari yang paling lama
 */
export function pencairanBelumMasuk(requests = [], ledger = []) {
  const topUp = (ledger || []).filter((b) => b?.entry_type === "top_up");
  const terpakai = new Set();

  /*
   * Tautan eksplisit lebih dulu — itu yang pasti, dan tidak boleh kalah oleh
   * kecocokan tanggal+nominal milik request lain.
   *
   * Tetapi HANYA tautan ke request yang sedang direkonsiliasi di sini yang
   * dikunci. Baris 24 Sep tertaut ke sebuah PettyCashTopUpRequest — entitas
   * lain, id lain — padahal uangnya sama dengan PettyCashRequest hari itu.
   * Kalau baris itu ikut dikunci, pencairan 24 Sep terlapor "belum masuk" dan
   * Rp 200.000 yang sudah ada akan dimasukkan kedua kali.
   */
  const idRequest = new Set((requests || []).map((r) => r?.id).filter(Boolean));
  const tertaut = new Map();
  for (const b of topUp) {
    if (b.linked_request_id && idRequest.has(b.linked_request_id)) {
      tertaut.set(b.linked_request_id, b);
      terpakai.add(b.id);
    }
  }

  const cair = (requests || [])
    .filter((r) => r?.status === "dicairkan")
    .sort((a, b) => String(a?.disbursement_date || a?.request_date || "")
      .localeCompare(String(b?.disbursement_date || b?.request_date || "")));

  const belum = [];
  for (const r of cair) {
    if (tertaut.has(r.id)) continue;
    const tanggal = r.disbursement_date || r.request_date;
    const nominal = Math.round(r.amount_requested || 0);
    const cocok = topUp.find((b) =>
      !terpakai.has(b.id) &&
      b.entry_date === tanggal &&
      Math.round(b.amount || 0) === nominal);
    if (cocok) { terpakai.add(cocok.id); continue; }
    belum.push(r);
  }
  return belum;
}

/** Total rupiah pencairan yang belum masuk buku kas. */
export function totalBelumMasuk(requests = [], ledger = []) {
  return pencairanBelumMasuk(requests, ledger)
    .reduce((s, r) => s + Math.round(r?.amount_requested || 0), 0);
}

/**
 * Status PettyCashRequest, sebagaimana yang BENAR-BENAR tersimpan.
 *
 * ── Kenapa daftar ini perlu ada ──────────────────────────────────────
 *
 * Skema entitasnya menyebut enum berbahasa Inggris — pending, approved,
 * rejected, disbursed — sementara setiap baris kode yang MENULIS status
 * menulis bahasa Indonesia, dan itulah yang ada di basis data. Base44 tidak
 * menolak nilai di luar enum, jadi perbedaan itu tidak pernah menimbulkan
 * error.
 *
 * Akibatnya ada dua tempat yang membandingkan ke nilai yang tidak pernah
 * ada:
 *
 *   LabaRugiEnhanced   p.status === "disbursed" → baris keterangan
 *                      "Kas kecil dicairkan: Rp …" di bawah ringkasan laba
 *                      rugi tidak pernah muncul sekali pun, bulan mana pun.
 *
 *   useCostPerTortoise p.status === "disbursed" → rincian `petty_cash` pada
 *                      biaya per ekor selalu Rp 0.
 *
 * Keduanya ditulis dengan membaca SKEMA, bukan datanya. Keduanya hijau,
 * tidak pernah melempar, dan tidak pernah benar.
 *
 * Satu daftar, dipakai bersama, dan penjaga cek-pencairan.mjs menolak
 * perbandingan status ke nilai di luar daftar ini.
 */
export const STATUS_REQUEST = {
  DIAJUKAN: "diajukan",
  DISETUJUI: "disetujui",
  DICAIRKAN: "dicairkan",
  DITOLAK: "ditolak",
};

/** Semua nilai status yang sah, untuk penjaga dan penyaringan. */
export const STATUS_REQUEST_SAH = Object.values(STATUS_REQUEST);
