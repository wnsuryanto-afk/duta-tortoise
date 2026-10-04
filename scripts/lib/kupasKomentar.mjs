/**
 * kupasKomentar.mjs — buang komentar dari kode sumber, TANPA ikut membuang
 * kode yang kebetulan memuat tanda komentar di dalam teks.
 *
 * ── Kenapa berkas ini ada ─────────────────────────────────────────────────
 *
 * Lima penjaga membuang komentar dengan satu baris yang sama:
 *
 *     s.replace(/\/\*[\s\S]*?\*\//g, "")
 *
 * Baris itu tidak tahu apa-apa soal tanda kutip. Satu atribut yang ada di
 * hampir setiap formulir unggah foto —
 *
 *     <input type="file" accept="image/*" ... />
 *
 * — mengandung `/*`, dan pengupas itu menganggapnya awal komentar. Semua
 * kode sesudahnya ikut terhapus sampai ketemu `*​/` berikutnya, yang bisa
 * ratusan baris kemudian.
 *
 * Diukur 4 Okt 2026: 10 berkas, 19.045 karakter kode, hilang dari pandangan
 * kelima penjaga. Yang terparah:
 *
 *     9.528 karakter  src/pages/EditProfilePage.jsx
 *     3.880 karakter  src/components/breeding/HatchDialog.jsx
 *     1.320 karakter  src/lib/versiAplikasi.js
 *
 * Di HatchDialog, yang hilang persis mencakup payload `babyData` dan
 * pemanggilan `Tortoise.bulkCreate` — jadi cek-modeuji.mjs melaporkan
 * "semua pencatatan menghormati Mode Uji" tanpa pernah melihatnya.
 *
 * Penjaga yang hijau karena tidak bisa melihat kodenya lebih buruk daripada
 * tidak ada penjaga: ia memberi rasa aman yang tidak dibayar apa pun.
 *
 * ── Yang dikenali ────────────────────────────────────────────────────────
 *
 * Teks dalam kutip tunggal, ganda, dan backtick dilewati apa adanya
 * (termasuk `\"` yang di-escape). Literal regex juga dilewati — tanpa itu,
 * pola seperti `/https?:\/\//` akan terbaca sebagai komentar baris pada
 * `//` terakhirnya, dan sisa barisnya ikut hilang.
 *
 * Membedakan regex dari pembagian tidak bisa sempurna tanpa parser penuh.
 * Dipakai aturan yang lazim: sebuah `/` memulai regex hanya bila karakter
 * bukan-spasi sebelumnya adalah salah satu dari `( , = : [ ! & | ? { } ;`
 * atau tidak ada sama sekali. Setelah pengenal atau kurung tutup, `/` adalah
 * pembagian.
 */

const SEBELUM_REGEX = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);

/** Buang komentar `/* *​/` dan `//` dari kode, sisanya utuh. */
export function kupasKomentar(kode) {
  const a = String(kode ?? "");
  let keluar = "";
  let i = 0;
  let terakhir = ""; // karakter bukan-spasi terakhir yang DIKELUARKAN

  while (i < a.length) {
    const c = a[i];

    // Teks berkutip — disalin apa adanya.
    if (c === '"' || c === "'" || c === "`") {
      const kutip = c;
      keluar += c;
      i++;
      while (i < a.length) {
        if (a[i] === "\\") { keluar += a.slice(i, i + 2); i += 2; continue; }
        keluar += a[i];
        if (a[i] === kutip) { i++; break; }
        i++;
      }
      terakhir = kutip;
      continue;
    }

    if (c === "/" && a[i + 1] === "*") {
      const j = a.indexOf("*/", i + 2);
      const sampai = j === -1 ? a.length : j + 2;
      /*
       * Baris baru di dalam komentar DIPERTAHANKAN.
       *
       * Beberapa penjaga melaporkan `berkas:baris`, dan nomornya dihitung
       * dengan menghitung "\n" sampai posisi temuan di teks yang SUDAH
       * dikupas. Menelan baris komentar membuat nomornya meleset sejauh
       * panjang komentar — dan di aplikasi ini komentarnya panjang-panjang.
       *
       * Terbukti: sebelum ini cek-modeuji menunjuk HatchDialog.jsx:131
       * untuk pemanggilan yang sebenarnya ada di baris 265.
       */
      for (let k = i; k < sampai; k++) if (a[k] === "\n") keluar += "\n";
      i = sampai;
      continue;
    }

    if (c === "/" && a[i + 1] === "/") {
      const j = a.indexOf("\n", i);
      i = j === -1 ? a.length : j; // baris barunya ditahan: nomor baris harus tetap
      continue;
    }

    // Literal regex — disalin apa adanya supaya `\/\/` di dalamnya tidak
    // terbaca sebagai komentar baris.
    if (c === "/" && (terakhir === "" || SEBELUM_REGEX.has(terakhir))) {
      let j = i + 1;
      let dalamKurung = false;
      let selesai = false;
      while (j < a.length) {
        const d = a[j];
        if (d === "\\") { j += 2; continue; }
        if (d === "\n") break;            // regex tidak boleh melewati baris
        if (d === "[") dalamKurung = true;
        else if (d === "]") dalamKurung = false;
        else if (d === "/" && !dalamKurung) { selesai = true; j++; break; }
        j++;
      }
      if (selesai) {
        keluar += a.slice(i, j);
        i = j;
        terakhir = "/";
        continue;
      }
      // Bukan regex yang sah — perlakukan sebagai karakter biasa.
    }

    keluar += c;
    if (!/\s/.test(c)) terakhir = c;
    i++;
  }

  return keluar;
}
