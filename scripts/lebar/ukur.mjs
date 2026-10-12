/**
 * ukur.mjs — satu pengukur "tulisan ini terpotong", dipakai dua penjaga.
 *
 * Fungsi di bawah DIKIRIM sebagai teks ke dalam peramban (page.evaluate),
 * jadi ia tidak boleh menyentuh apa pun di luar dirinya sendiri. Sudah
 * diperiksa: satu-satunya kata "temuan" di dalamnya ada di komentar.
 *
 * ── Kenapa dipindahkan ke sini ──────────────────────────────────────────
 *
 * cek-lebar memakainya pada layar 360px; cek-lipat memakainya pada 280px,
 * yaitu layar luar HP lipat saat terlipat — lebar yang cek-lebar tidak bisa
 * jangkau karena bingkainya dipatok 360.
 *
 * Menyalinnya ke penjaga kedua akan melahirkan sepasang kembar yang
 * pelan-pelan berselisih, dan repo ini punya penjaga sendiri (cek-kembar)
 * yang melarang itu. Lagi pula pengecualiannya halus — sr-only yang 1×1
 * piksel, induk yang bisa digulung, elemen yang isinya cuma elemen lain —
 * dan setiap salinan adalah satu tempat lagi untuk melupakan salah satunya.
 */

export /** Diukur di dalam halaman. Dikirim sebagai teks, jadi mandiri. */
function ukur(lebarLayar) {
  const bingkai = document.getElementById("bingkai");
  // Bingkai yang HILANG bukan bingkai yang bersih. Dulu keduanya
  // mengembalikan daftar kosong, dan 110 kasus lulus tanpa pernah digambar.
  if (!bingkai) return [{ jenis: "bingkai hilang", lebih: 0, teks: "" }];

  // Dialog digambar Radix ke dalam document.body lewat portal, DI LUAR
  // bingkai. Mengukur bingkai saja berarti setiap dialog lolos tanpa pernah
  // dilihat — kasus yang isinya cuma dialog akan terbaca sebagai halaman
  // kosong, dan penjaga ini melaporkannya hijau justru karena tidak ada yang
  // terukur. Akar portalnya karena itu ikut diukur.
  const akar = [bingkai, ...document.querySelectorAll('[role="dialog"]')];

  const keluar = [];
  const bisaGulung = (g) =>
    ["auto", "scroll"].includes(g.overflowX) || ["auto", "scroll"].includes(g.overflow);

  // Set, bukan `Array.includes`: dedup lewat `includes` di dalam lingkaran
  // elemen adalah O(n²), dan pada halaman beberapa ribu elemen — dikali 125
  // kasus, dua pengukuran, dan lima lebar wadah — ia membuat penjaga ini
  // berjalan bermenit-menit tanpa alasan.
  const terlihat = new Set();
  for (const a of akar) for (const el of a.querySelectorAll("*")) terlihat.add(el);

  for (const el of terlihat) {
    const r = el.getBoundingClientRect();
    // Kotak setipis satu piksel bukan tulisan yang terlihat. Bentuk yang
    // dipakai di mana-mana adalah `sr-only` — 1 × 1 piksel, `overflow:hidden`,
    // isinya hanya untuk pembaca layar. Tulisannya MEMANG meluap kotaknya,
    // sesuai rancangan, dan melaporkannya sebagai "terpotong" membuat penjaga
    // ini menuduh setiap dialog Radix. Diukur dari ukurannya, bukan dari nama
    // kelasnya, supaya cara menyembunyikan yang lain ikut tertangani.
    if (r.width <= 1 || r.height <= 1) continue;
    if (el.ownerSVGElement || el.tagName === "svg") continue;      // (3)
    const teks = (el.textContent || "").trim();
    if (!teks) continue;                                            // (2)

    const g = getComputedStyle(el);
    if (g.position === "fixed" || bisaGulung(g)) continue;

    let naik = el.parentElement, adaJalan = false;                  // (1)
    while (naik && naik !== document.body) {
      const gg = getComputedStyle(naik);
      if (bisaGulung(gg) && naik.scrollWidth > naik.clientWidth + 1) { adaJalan = true; break; }
      naik = naik.parentElement;
    }
    if (adaJalan) continue;

    // Elemen yang isinya cuma elemen lain bukan temuan tersendiri:
    // yang dicari yang tulisannya sendiri terpotong.
    const punyaTeksSendiri = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim(),
    );
    if (!punyaTeksSendiri) continue;

    // Kelas elemen dan kelas induknya ikut dibawa. Tanpa itu temuan hanya
    // menyebut tulisannya, dan yang memperbaikinya harus menebak elemen mana
    // di antara belasan yang berbunyi sama di satu halaman.
    const kelas = typeof el.className === "string" ? el.className.slice(0, 70) : "";
    const induk = typeof el.parentElement?.className === "string"
      ? el.parentElement.className.slice(0, 70) : "";
    const lebih = el.scrollWidth - el.clientWidth;
    if (lebih > 1 && el.clientWidth > 0) {
      keluar.push({ jenis: "terpotong", lebih, teks: teks.slice(0, 50), kelas, induk });
    } else if (r.right > lebarLayar + 1) {
      keluar.push({ jenis: "lewat tepi", lebih: Math.round(r.right - lebarLayar), teks: teks.slice(0, 50), kelas, induk });
    }
  }
  return keluar;
}
