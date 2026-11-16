/**
 * kodeClutch.js — SATU kode yang membedakan satu kotak telur dari kotak lain.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 16 Nov 2026 pemiliknya menulis: "Semakin banyaknya telur, saya semakin
 * bingung pada saat labeling... karena ada beberapa induk yang bertelur
 * beberapa kali, saya pada saat menata khawatir tertukar."
 *
 * Dihitung dari data hari itu, 18 kotak sedang dierami:
 *
 *   A35 × A47    3 kotak   bertelur 6 Sep, 7 Okt, 11 Nov
 *   A40 × C23    3 kotak   bertelur 9 Sep, 2 Okt, 1 Nov
 *   A36 × A31    2 kotak   4 Sep, 1 Okt
 *   A35 × A46    2 kotak   4 Sep, 4 Okt
 *   A43 × B108   2 kotak   30 Sep, 23 Okt
 *
 * DUA BELAS dari 18 kotak memakai nama pasangan yang juga dipakai kotak
 * lain. Dan tulisan paling besar di labelnya justru nama pasangan itu —
 * satu-satunya keterangan yang TIDAK membedakan. Yang membedakannya,
 * tanggal bertelur, dicetak paling kecil di baris paling bawah.
 *
 * Kekhawatirannya bukan perasaan. Labelnya sendiri yang menyebabkannya.
 *
 * ── Bentuk kodenya ───────────────────────────────────────────────────
 *
 *   A47-3        betina A47, clutch KETIGA-nya
 *
 * Dipilih pemiliknya sendiri dari empat usulan: "betina + urutan telur +
 * tanggal bertelur". Betina, bukan pasangan, karena seluruh penilaian
 * indukan di aplikasi ini mengatribusikan telur lewat betinanya — dan
 * karena lebih pendek untuk ditulis spidol di kotak. Nama pejantan tetap
 * tercetak di label, hanya tidak lagi jadi yang terbesar.
 *
 * Tanggal bertelur ikut dicetak di sebelahnya, bukan masuk ke dalam kode.
 * Dengan begitu kodenya tetap pendek untuk disebut ("A47 tiga"), sementara
 * tanggalnya tetap ada sebagai pembeda kedua bila nomornya pernah bergeser.
 *
 * ── Kenapa nomornya DISIMPAN, bukan dihitung tiap kali ───────────────
 *
 * Nomor ini dicetak di kertas yang menempel di kotak selama tiga bulan.
 * Nomor yang dihitung ulang tiap kali layar dibuka akan berubah kalau ada
 * clutch LAMA yang baru dicatat belakangan — dan kertas yang sudah
 * menempel tidak ikut berubah. Maka nomornya ditetapkan sekali, saat
 * clutch-nya dicatat, dan disimpan di kolom `clutch_number`.
 *
 * Kolom itu sudah ada di skema sejak lama dan tidak pernah diisi: 18 dari
 * 18 clutch aktif bernilai null pada 16 Nov 2026. Berkas ini yang
 * mengisinya.
 *
 * Untuk catatan lama yang nomornya belum pernah ditetapkan, nomor
 * diturunkan dari urutan tanggal bertelur betina itu — jawaban yang sama
 * dengan yang akan ditetapkan, jadi mengisi kolomnya belakangan tidak
 * mengubah apa pun yang sudah tercetak.
 */

/** Nama betina, dirapikan. Ada kura yang namanya tersimpan dengan spasi di belakang. */
function namaBetina(breeding) {
  return String(breeding?.female_name || "").trim();
}

/** "YYYY-MM-DD" → angka untuk diurutkan; yang tak terbaca di belakang. */
function kunciTanggal(nilai) {
  const m = String(nilai ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return Number.POSITIVE_INFINITY;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Nomor clutch tiap catatan, sebagai Map id → nomor.
 *
 * `clutch_number` yang SUDAH tersimpan selalu menang. Yang belum punya
 * diturunkan dari urutan tanggal bertelur di antara clutch betina yang sama,
 * menghitung juga yang sudah tersimpan supaya tidak ada nomor kembar.
 *
 * Dihitung dari SELURUH catatan betina itu, bukan hanya yang sedang
 * dierami: "clutch ketiga A47" berarti ketiga sepanjang catatan, dan nomor
 * yang berubah arti begitu clutch pertamanya selesai bukan nomor.
 *
 * @param {Array} breedings seluruh catatan Breeding yang dimiliki layar
 * @returns {Map<string, number>}
 */
export function nomorClutchPerId(breedings = []) {
  const perBetina = new Map();
  for (const b of breedings || []) {
    if (!b?.id) continue;
    const nama = namaBetina(b);
    if (!nama) continue;
    if (!perBetina.has(nama)) perBetina.set(nama, []);
    perBetina.get(nama).push(b);
  }

  const hasil = new Map();
  for (const [, daftar] of perBetina) {
    const urut = [...daftar].sort((a, z) => {
      const d = kunciTanggal(a.egg_laying_date) - kunciTanggal(z.egg_laying_date);
      return d !== 0 ? d : String(a.id).localeCompare(String(z.id));
    });
    const terpakai = new Set(
      urut.map((b) => Number(b.clutch_number)).filter((n) => Number.isFinite(n) && n > 0),
    );
    let berikut = 1;
    for (const b of urut) {
      const tersimpan = Number(b.clutch_number);
      if (Number.isFinite(tersimpan) && tersimpan > 0) {
        hasil.set(b.id, tersimpan);
        continue;
      }
      while (terpakai.has(berikut)) berikut += 1;
      terpakai.add(berikut);
      hasil.set(b.id, berikut);
    }
  }
  return hasil;
}

/**
 * Nomor yang HARUS diberikan kepada clutch baru betina ini.
 *
 * Dipakai formulir saat menyimpan, supaya nomornya ditetapkan sekali dan
 * tidak pernah bergeser sesudahnya.
 */
export function nomorBerikutnya(breedings = [], female) {
  const nama = String(female || "").trim();
  if (!nama) return 1;
  let maks = 0;
  for (const b of breedings || []) {
    if (namaBetina(b) !== nama) continue;
    const n = Number(b.clutch_number);
    if (Number.isFinite(n) && n > maks) maks = n;
  }
  // Catatan lama yang belum bernomor ikut dihitung lewat jumlahnya, supaya
  // clutch baru tidak memakai nomor yang nanti diturunkan untuk yang lama.
  const jumlah = (breedings || []).filter((b) => namaBetina(b) === nama).length;
  return Math.max(maks, jumlah) + 1;
}

/**
 * Kode yang dicetak di label: "A47-3".
 *
 * Mengembalikan nama betina saja bila nomornya tidak diketahui — lebih baik
 * kurang satu keterangan daripada kode yang terlihat pasti tetapi salah.
 */
export function kodeClutch(breeding, nomor = null) {
  const nama = namaBetina(breeding);
  if (!nama) return "—";
  const n = Number(nomor ?? breeding?.clutch_number);
  return Number.isFinite(n) && n > 0 ? `${nama}-${n}` : nama;
}
