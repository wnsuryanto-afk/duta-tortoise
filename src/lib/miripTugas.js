/**
 * miripTugas.js — apakah pekerjaan yang dicatat sebagai Inisiatif sebenarnya
 * sudah ada di checklist harian?
 *
 * ── Kenapa ini perlu ────────────────────────────────────────────────────────
 *
 * "Siram tanaman" adalah tugas SOP HARIAN, bernilai 5 poin. Tetapi di antara
 * 300 catatan Inisiatif ada 8 catatan berjudul "Siram tanaman" — dan karena
 * Inisiatif masuk dengan `poin_earned: 0`, pekerjaan yang semestinya bernilai
 * 5 poin tercatat bernilai NOL. Pada hari-hari itu tugas SOP-nya sendiri tidak
 * tercentang. Jadi bukan dibayar dua kali: dibayar nol kali.
 *
 * Penyebabnya bukan kecurangan dan bukan kelalaian — dua tombol yang sama-sama
 * berarti "saya sudah mengerjakannya", dan yang satu kebetulan bernilai nol.
 * Kiper tidak punya cara tahu bahwa pekerjaan yang baru ia catat sudah ada di
 * daftar checklist-nya, karena judulnya di sana berbunyi lain.
 *
 * ── Kenapa pencocokannya longgar, tapi ambangnya ketat ──────────────────────
 *
 * Judul yang ditulis kiper ditulis cepat, dengan ejaan sehari-hari: "Kasik
 * pakan adabra", "Rapikan tanamanangrek", "Nambal tempat minum yg bocor w1w2
 * e5". Mencocokkan teks persis tidak akan menemukan apa pun.
 *
 * Tetapi menebak terlalu jauh lebih buruk daripada tidak menebak: peringatan
 * yang salah akan diabaikan — termasuk ketika ia benar.
 *
 * Versi pertama penjaga ini mengukur dari sisi yang LEBIH PENDEK, dan diuji
 * dengan sepuluh judul SOP. Diuji dengan ketiga puluh tujuh judul yang
 * sebenarnya, empat dari sembilan kecocokannya salah:
 *
 *   "Bersihkan tempat cuci rumput" → "Bersihkan rumput di pagar"   (30 catatan!)
 *   "Bersihkan kandang pagi"       → "Kebersihan jalan area kandang"
 *   "Pangkas pohon buah juwet"     → "Pupuk pohon buah"
 *   "Cabut rumput liar"            → "Potong bunga sepatu & rumput liar"
 *
 * Sebabnya: judul Inisiatif biasanya cuma dua kata penting, dan kata seperti
 * "bersih", "kandang", "rumput", "pohon" muncul di belasan tugas SOP — jadi
 * dua kata yang sama-sama umum sudah cukup untuk disebut mirip.
 *
 * Yang dipakai sekarang mengukur dari GABUNGAN kedua sisi (Jaccard): kata di
 * judul Inisiatif yang TIDAK ada di tugas SOP ikut menurunkan skornya. "tempat
 * cuci" dan "juwet" dan "cabut" adalah pekerjaan yang berbeda, dan sekarang
 * terbaca begitu. Pada data nyata yang tersisa tiga judul — "Siram tanaman",
 * "Bersihkan kandang bonsai", "Bersihkan kandang pagi" — dan ketiganya benar.
 *
 * Hasilnya USULAN untuk dilihat manusia, bukan penghalang. Kiper tetap bisa
 * menyimpan, penilai tetap bisa memberi poin penuh — yang berubah hanya bahwa
 * keduanya tahu.
 */

/** Kata yang tidak membedakan pekerjaan satu dari yang lain. */
const KATA_BUANG = new Set([
  "di", "ke", "dan", "atau", "yang", "untuk", "pada", "dari", "dengan", "ada",
  "semua", "seluruh", "tiap", "setiap", "sekali", "kali", "per",
  "pagi", "siang", "sore", "malam", "harian", "mingguan", "bulanan", "musiman",
  "hari", "minggu", "bulan", "tahun", "jam",
  "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu",
  "sudah", "saja", "lagi", "juga", "bisa", "akan", "sebelum", "sesudah",
  "rotasi", "otomatis", "bergilir", "ganjil", "genap", "lain", "lainnya",
]);

/* Awalan dan akhiran Indonesia yang paling sering memisahkan dua tulisan untuk
   pekerjaan yang sama: "bersihkan" / "pembersihan" / "kebersihan" → "bersih".
   Pemotongannya sengaja kasar; yang dicari kemiripan, bukan tata bahasa. */
const AWALAN = ["memper", "menge", "meng", "meny", "mem", "men", "pem", "pen", "peng", "per", "ber", "ter", "ke", "di", "me", "se"];
const AKHIRAN = ["kannya", "annya", "kan", "nya", "an", "i"];

/** Bentuk dasar yang kasar: cukup untuk menyamakan tulisan, bukan untuk kamus. */
export function akar(kata) {
  let k = String(kata || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (k.length <= 4) return k;
  for (const a of AKHIRAN) {
    if (k.length - a.length >= 4 && k.endsWith(a)) { k = k.slice(0, -a.length); break; }
  }
  for (const a of AWALAN) {
    if (k.length - a.length >= 4 && k.startsWith(a)) { k = k.slice(a.length); break; }
  }
  return k;
}

/**
 * Kata-kata penting dari satu judul, sudah dibersihkan.
 *
 * Bagian dalam tanda kurung dibuang: isinya keterangan jadwal dan cara
 * ("(Sen/Rab/Jum)", "(1 hari 1 kandang, BERGILIR)"), bukan pekerjaannya.
 */
export function kataKunci(judul) {
  const tanpaKurung = String(judul || "").replace(/\([^)]*\)/g, " ");
  const kata = tanpaKurung
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((k) => !KATA_BUANG.has(k))
    .filter((k) => !/^\d+$/.test(k))
    .map(akar)
    .filter((k) => k.length >= 3);
  return [...new Set(kata)];
}

/** Ambang kemiripan. Di bawah ini dianggap pekerjaan yang berbeda. */
export const AMBANG_MIRIP = 0.6;

/**
 * Seberapa mirip dua judul, 0..1, diukur dari GABUNGAN kata keduanya.
 *
 * Pembaginya gabungan, bukan sisi terpendek: kata yang hanya ada di salah satu
 * judul adalah bukti bahwa pekerjaannya BERBEDA, dan harus menurunkan skor.
 * "Bersihkan tempat cuci rumput" dan "Bersihkan rumput di pagar" berbagi dua
 * kata paling umum di peternakan ini dan berbeda pada tiga kata lainnya.
 */
export function kemiripan(judulA, judulB) {
  const a = kataKunci(judulA);
  const b = kataKunci(judulB);
  if (a.length === 0 || b.length === 0) return 0;
  const sama = a.filter((k) => b.includes(k)).length;
  const gabungan = new Set([...a, ...b]).size;
  return sama / gabungan;
}

/**
 * Tugas checklist yang paling mirip dengan judul Inisiatif ini, atau null.
 *
 * @param {string} judul judul yang ditulis kiper
 * @param {Array<{title?:string, task_title?:string, label?:string, points?:number, frequency?:string, id?:string}>} tugas
 *        daftar tugas checklist yang aktif
 * @returns {{judul:string, poin:number, frekuensi:string, id:string, skor:number}|null}
 */
export function tugasMirip(judul, tugas = []) {
  let terbaik = null;
  for (const t of tugas || []) {
    const nama = t?.title || t?.task_title || t?.label || "";
    if (!nama) continue;
    const skor = kemiripan(judul, nama);
    if (skor < AMBANG_MIRIP) continue;
    if (!terbaik || skor > terbaik.skor) {
      terbaik = {
        judul: nama,
        poin: Number(t?.points) || 0,
        frekuensi: t?.frequency || "",
        id: t?.id || "",
        skor,
      };
    }
  }
  return terbaik;
}

/** Kalimat peringatan untuk kiper. Kosong bila tidak ada yang mirip. */
export function pesanMirip(cocok) {
  if (!cocok) return "";
  const poin = cocok.poin > 0 ? ` (${cocok.poin} poin)` : "";
  const kapan = cocok.frekuensi ? ` ${cocok.frekuensi}` : "";
  return `Pekerjaan ini sepertinya sudah ada di checklist${kapan}: "${cocok.judul}"${poin}. ` +
    `Kalau memang tugas itu, centang di daftar tugas saja — di sana poinnya sudah ada. ` +
    `Inisiatif untuk pekerjaan DI LUAR checklist.`;
}
