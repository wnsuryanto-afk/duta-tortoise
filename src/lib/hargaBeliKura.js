import { hanyaDiPeternakan } from "@/lib/populasiKura";
import { lahirDiFarm } from "@/lib/hppKura";

/**
 * hargaBeliKura.js — kura mana yang masih berutang harga belinya.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * Diminta pemiliknya 18 Okt 2026: "kalau kita membeli bukan dari anakan
 * sendiri, saat memasukkan data perlu mencantumkan harga beli supaya bisa
 * menentukan HPP saat nanti dijual." Kolomnya sudah ada dan pemeriksa
 * kelengkapannya sudah menandai, tetapi satu-satunya tempat MENGISI-nya
 * masih dialog kura satu per satu.
 *
 * 19 Okt 2026: 44 kura dari 123 yang dibeli belum ada harga belinya, dan
 * itu angka yang menentukan satu hal lain — selisih nilai aset terhadap
 * modal di beranda hanya bisa dihitung dari 91 ekor yang punya kedua
 * angkanya, bukan 135. Mengisi ke-44 itu bukan kerapian; ia yang membuat
 * angka selisih di beranda berhenti setengah.
 *
 * ── Aturannya SATU, bukan dua yang mirip ────────────────────────────────────
 *
 * "Dibeli" di sini memakai `lahirDiFarm` dari lib/hppKura.js — fungsi yang
 * sama yang dipakai pemeriksa kelengkapan DAN perhitungan HPP. Kalau ketiganya
 * berpisah, ada kura yang diminta harganya di satu layar tetapi dianggap
 * hasil sendiri oleh layar yang menghitung modalnya, dan selisih itu tidak
 * akan terlihat sampai ada yang menjual kura tersebut.
 *
 * ── Nol adalah jawaban yang SAH ─────────────────────────────────────────────
 *
 * Hadiah, warisan, dan kura yang harga belinya tidak bisa lagi ditelusuri
 * memang bermodal nol. Memeriksanya dengan `!!` akan menandainya belum
 * lengkap selamanya, dan kolom yang tidak pernah bisa selesai diisi adalah
 * kolom yang berhenti diisi.
 */

/** Harga beli sudah TERCATAT. Nol termasuk; kosong dan teks kosong tidak. */
export function adaHargaBeli(kura) {
  const p = kura?.purchase_price;
  if (p === null || p === undefined || p === "") return false;
  return Number.isFinite(Number(p));
}

/** Kura di peternakan yang DIBELI — penyebut kelengkapannya. */
export function kuraDibeli(tortoises = []) {
  return hanyaDiPeternakan(tortoises).filter((k) => !lahirDiFarm(k));
}

/** Kura dibeli yang harga belinya belum tercatat. */
export function kuraTanpaHargaBeli(tortoises = []) {
  return kuraDibeli(tortoises).filter((k) => !adaHargaBeli(k));
}

/**
 * Dikelompokkan menurut `source`, terbanyak lebih dulu.
 *
 * Kura datang berombongan dan satu rombongan umumnya seharga: 22 ekor
 * bersumber "beli lokal" di kawanan ini, dan 13 lagi yang sumbernya tidak
 * pernah dicatat. Mengelompokkannya membuat satu angka menutup belasan ekor
 * sekaligus — dan tetap bisa diubah per ekor bila ternyata tidak seragam.
 */
export function perSumberHargaBeli(tortoises = []) {
  const peta = new Map();
  for (const k of kuraTanpaHargaBeli(tortoises)) {
    const s = k.source || "tidak_diketahui";
    if (!peta.has(s)) peta.set(s, []);
    peta.get(s).push(k);
  }
  return [...peta.entries()]
    .map(([sumber, isi]) => ({
      sumber,
      isi: isi.sort((a, b) => String(a.code || a.name || "").localeCompare(String(b.code || b.name || ""))),
    }))
    .sort((a, b) => b.isi.length - a.isi.length || a.sumber.localeCompare(b.sumber));
}

/** Kelengkapan harga beli, untuk bilah persentase. */
export function kelengkapanHargaBeli(tortoises = []) {
  const dibeli = kuraDibeli(tortoises);
  const kosong = dibeli.filter((k) => !adaHargaBeli(k)).length;
  const ada = dibeli.length - kosong;
  return {
    ada, kosong, dari: dibeli.length,
    persen: dibeli.length > 0 ? Math.round((ada / dibeli.length) * 100) : 100,
  };
}

/**
 * ── DUA JAWABAN YANG SAH UNTUK SATU BARIS ───────────────────────────────────
 *
 * Pemiliknya, 19 Okt 2026, tentang tiga belas kura yang sumbernya tercatat
 * "tidak diketahui" (8BESAR, 8KECIL, F23, F25, F27, F28, F29, HF1, HF6, H3,
 * RD, A38, A41): "campur — saya tentukan satu per satu".
 *
 * Jadi tiap baris isian punya dua jawaban: harga belinya, ATAU pernyataan
 * bahwa kura itu hasil tetasan sendiri.
 *
 * ── Kenapa "hasil sendiri" WAJIB membawa tanggal menetas ────────────────────
 *
 * Mengubah `source` menjadi hasil_sendiri menghapus tagihan harga belinya —
 * dan itu bagian yang terlihat. Yang tidak terlihat: `bulanDiFarm` di
 * lib/hppKura.js memilih tanggal mulainya DARI `source` yang sama.
 *
 *     lahirDiFarm(kura) ? kura.birth_date : (kura.purchase_date || kura.created_date)
 *
 * Kura yang ditandai hasil sendiri tetapi birth_date-nya kosong mendapat
 * `bulanDiFarm = 0`, dan HPP-nya kehilangan seluruh biaya pemeliharaan.
 * Angkanya tidak error, tidak kosong, dan tidak ditandai apa pun — ia hanya
 * terlalu kecil. Satu tombol yang memperbaiki satu angka sambil merusak angka
 * lain tanpa mengatakannya bukan kemudahan, jadi tanggalnya diminta di tempat
 * yang sama, dan baris tanpa tanggal TIDAK dianggap siap disimpan.
 */

export const JENIS_HARGA = "harga";
export const JENIS_SENDIRI = "sendiri";

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Angka rupiah dari isian teks. `null` bila kosong atau bukan angka wajar. */
export function bacaAngkaRupiah(v) {
  const t = String(v ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Tanggal menetas yang bisa dipakai menghitung umur di peternakan.
 *
 * Tanggal di MASA DEPAN ditolak: `bulanDiFarm` akan mengembalikan angka
 * negatif, dan biaya per bulan yang dibagi bulan negatif menghasilkan HPP
 * bertanda minus — satu salah ketik tahun sudah cukup.
 */
export function tanggalMenetasSah(nilai, hariIni = new Date()) {
  const t = String(nilai ?? "").trim();
  if (!POLA_TANGGAL.test(t)) return false;
  const ms = Date.parse(`${t}T00:00:00Z`);
  if (!Number.isFinite(ms)) return false;
  return ms <= hariIni.getTime();
}

/**
 * Apa yang akan dikirim untuk satu baris isian, dan apakah ia siap dikirim.
 *
 * Satu fungsi memutuskan keduanya, karena tombol Simpan dan muatan yang
 * dikirim harus setuju. Dua aturan terpisah — satu menghitung "berapa yang
 * terisi", satu menyusun muatannya — adalah bentuk paling sunyi dari
 * penyimpanan yang mengaku berhasil tanpa mengubah apa pun.
 *
 * `asal_genetik` ikut diisi "cb" HANYA bila masih kosong: hasil tetasan
 * sendiri memang captive bred menurut definisi, dan aturan yang sama sudah
 * dipakai mengklasifikasi 99 kura pada 18 Okt. Yang sudah ditentukan
 * pemiliknya tidak ditimpa.
 */
export function muatanIsian(isi, kura, hariIni = new Date()) {
  if (isi?.jenis === JENIS_SENDIRI) {
    if (!tanggalMenetasSah(isi?.lahir, hariIni)) {
      return { jenis: JENIS_SENDIRI, siap: false, sebab: "tanggal menetas belum diisi", muatan: null };
    }
    const muatan = { source: "hasil_sendiri", birth_date: String(isi.lahir).trim() };
    if (!String(kura?.asal_genetik || "").trim()) muatan.asal_genetik = "cb";
    return { jenis: JENIS_SENDIRI, siap: true, sebab: "", muatan };
  }
  const n = bacaAngkaRupiah(isi?.harga);
  if (n === null) return { jenis: JENIS_HARGA, siap: false, sebab: "harga belum diisi", muatan: null };
  return { jenis: JENIS_HARGA, siap: true, sebab: "", muatan: { purchase_price: n } };
}
