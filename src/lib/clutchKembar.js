import { tanggalLokal } from "@/lib/safeDate";

/**
 * clutchKembar.js — satu pasangan, satu tanggal bertelur, satu catatan.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 8 Nov 2026 pemiliknya membuka Rencana Kawin dan melihat clutch yang sama
 * tercatat dua kali. Diperiksa di data, dan memang begitu — dua pasang, dan
 * polanya sama persis:
 *
 *   A27 × C9   8 Nov 2026  14 telur  08:43 hanifakbar1110
 *   A27 × C9   8 Nov 2026  14 telur  12:55 wnsuryanto
 *   A40 × C23  1 Nov 2026  21 telur  08:53 hanifakbar1110
 *   A40 × C23  1 Nov 2026  21 telur  09:37 wnsuryanto
 *
 * Penjaga mencatat lebih dulu, pemiliknya mencatat clutch yang sama beberapa
 * jam kemudian. Tidak ada satu pun layar yang memberi tahu bahwa catatannya
 * sudah ada — keduanya tersimpan, keduanya tampil, dan keduanya ikut dihitung.
 *
 * Ongkosnya bukan sekadar baris kembar: 35 telur terhitung dua kali di
 * ringkasan kebun, A27 terbaca "2 clutch / 28 telur" padahal satu clutch 14
 * telur, dan Ranking Indukan memakai angka itu untuk memutuskan indukan mana
 * yang produktif.
 *
 * ── Kenapa pasangan + tanggal ────────────────────────────────────────
 *
 * Seekor betina bertelur sekali per peristiwa bersarang. Dua catatan dengan
 * induk yang sama dan tanggal bertelur yang sama hampir pasti satu clutch
 * yang dicatat dua kali — dan itu yang terjadi dua kali di sini.
 *
 * "Hampir pasti", bukan "pasti": karena itu fungsi ini MENEMUKAN, bukan
 * menolak. Yang memutuskan tetap orangnya, dengan catatan yang sudah ada
 * terpampang di depan matanya.
 *
 * ── Kenapa ID, bukan nama ────────────────────────────────────────────
 *
 * Nama kura berubah saat kura diganti nama, dan dua kura bisa dinamai sama.
 * ID tidak. Nama hanya dipakai bila ID-nya memang belum ada — induk yang
 * belum terdaftar masih boleh dicatat, dan catatannya tetap perlu dijaga.
 */

/** Tanggal apa pun bentuknya → "YYYY-MM-DD", atau "" bila tidak terbaca. */
function hari(nilai) {
  if (!nilai) return "";
  const t = String(nilai).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  // tanggalLokal, bukan toISOString: `new Date("8 Nov 2026")` adalah tengah
  // malam SETEMPAT, dan toISOString pada tengah malam di Jakarta jatuh pada
  // tanggal sebelumnya — dua clutch kembar jadi tidak lagi berpasangan.
  return tanggalLokal(t);
}

const bersih = (s) => String(s ?? "").trim().toLowerCase();

/** Kunci induk: ID bila ada, nama bila belum terdaftar. */
function kunciInduk(id, nama) {
  const i = bersih(id);
  return i ? `id:${i}` : `nama:${bersih(nama)}`;
}

/**
 * Catatan clutch yang sudah ada untuk pasangan dan tanggal yang sama.
 *
 * @param {object} calon            clutch yang akan disimpan
 * @param {Array}  daftar           seluruh catatan Breeding yang sudah ada
 * @param {string} [abaikanId]      id yang sedang disunting — jangan dianggap kembarannya sendiri
 * @returns {object|null} catatan yang sudah ada, atau null bila memang baru
 */
export function clutchKembar(calon = {}, daftar = [], abaikanId = "") {
  const tanggal = hari(calon.egg_laying_date);
  // Tanpa tanggal bertelur tidak ada yang bisa dibandingkan; menebak di sini
  // berarti menuduh clutch yang sah sebagai kembaran.
  if (!tanggal) return null;

  const jantan = kunciInduk(calon.male_id, calon.male_name);
  const betina = kunciInduk(calon.female_id, calon.female_name);
  // Pasangan yang kedua induknya tidak diketahui bukan pasangan.
  if (jantan === "nama:" && betina === "nama:") return null;

  return (
    (daftar || []).find((b) => {
      if (!b || (abaikanId && b.id === abaikanId)) return false;
      if (hari(b.egg_laying_date) !== tanggal) return false;
      return (
        kunciInduk(b.male_id, b.male_name) === jantan &&
        kunciInduk(b.female_id, b.female_name) === betina
      );
    }) || null
  );
}

/**
 * Seluruh kelompok catatan kembar yang SUDAH terlanjur ada.
 *
 * Dipakai untuk menunjukkannya kepada orangnya — membereskan data lama bukan
 * urusan program ini: tiap salinan bisa membawa hal yang tidak ada di
 * salinan lain (foto sendiri-sendiri, catatan "Retak 3", tanda telur retak),
 * jadi yang menggabungkan harus orang yang tahu clutch-nya.
 *
 * @returns {Array<Array<object>>} tiap kelompok berisi ≥ 2 catatan, terbaru dulu.
 */
export function kelompokClutchKembar(daftar = []) {
  const peta = new Map();
  for (const b of daftar || []) {
    const tanggal = hari(b?.egg_laying_date);
    if (!tanggal) continue;
    const jantan = kunciInduk(b?.male_id, b?.male_name);
    const betina = kunciInduk(b?.female_id, b?.female_name);
    if (jantan === "nama:" && betina === "nama:") continue;
    const kunci = `${jantan}|${betina}|${tanggal}`;
    if (!peta.has(kunci)) peta.set(kunci, []);
    peta.get(kunci).push(b);
  }
  return [...peta.values()]
    .filter((g) => g.length > 1)
    .map((g) => [...g].sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || ""))));
}
