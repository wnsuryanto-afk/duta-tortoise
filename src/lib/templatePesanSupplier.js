/**
 * templatePesanSupplier — SATU definisi pesan pembuka ke calon pemasok.
 *
 * ── Kenapa jadi beberapa pilihan, bukan satu ──
 *
 * Versi pertama hanya punya satu pesan: perkenalan + "apakah masih tersedia".
 * Pesan itu benar untuk postingan yang baru, tapi salah untuk hampir semua
 * keadaan lain — menanyakan harga borongan, menanyakan ongkir ke peternakan,
 * atau menawarkan langganan rutin. Orang lalu mengetik ulang sendiri di
 * WhatsApp, dan tombolnya jadi tidak menghemat apa pun.
 *
 * ── Kenapa sapaannya tidak selalu memakai nama ──
 *
 * Nama yang terbaca dari postingan Facebook sering bukan nama orang,
 * melainkan nama grup atau lapak: "Pasar grosir sayur dan buah solo raya".
 * Menyapa "Halo Pasar grosir sayur dan buah solo raya" terbaca seperti robot
 * dan langsung memberi tahu penerimanya bahwa pesannya tidak ditulis manusia.
 *
 * Jadi nama hanya dipakai bila ia MASUK AKAL sebagai sapaan: pendek, dan
 * bukan nama tempat/lapak. Selain itu cukup "Halo".
 *
 * Teksnya boleh diubah langsung di WhatsApp sebelum dikirim — pesan ini
 * mengisi kolom ketik, bukan mengirim sendiri.
 */

/** Kata yang menandakan ini nama lapak/grup, bukan nama orang. */
const BUKAN_ORANG = /(pasar|grosir|toko|lapak|jual|beli|supplier|agen|group|grup|info|komunitas|raya|ud|cv|pt)\b/i;

/**
 * Sapaan yang wajar untuk sebuah lead.
 * @returns {string} "Halo Budi" atau "Halo" saja
 */
export function sapaan(nama) {
  const t = String(nama || "").trim();
  if (!t) return "Halo";
  if (t.length > 22) return "Halo";
  if (BUKAN_ORANG.test(t)) return "Halo";
  // Nama panjang dipangkas ke kata pertama: "Budi Nuryanto" → "Budi"
  return `Halo ${t.split(/\s+/)[0]}`;
}

const ASAL = "saya dari peternakan kura Duta Tortoise";

/**
 * Daftar template. `teks(lead)` mengembalikan pesan siap kirim.
 * Urutan di sini = urutan yang muncul di layar; yang paling sering dipakai
 * ditaruh paling atas.
 */
export const TEMPLATE_PESAN = [
  {
    id: "tersedia",
    label: "Tanya ketersediaan",
    ringkas: "Perkenalan + apakah barangnya masih ada",
    teks: (l) =>
      `${sapaan(l?.nama)}, ${ASAL}. Saya lihat postingan Anda` +
      `${l?.yang_dijual ? ` soal ${l.yang_dijual}` : ""}. ` +
      `Apakah masih tersedia?`,
  },
  {
    id: "harga",
    label: "Tanya harga & minimum",
    ringkas: "Harga per satuan dan minimum order",
    teks: (l) =>
      `${sapaan(l?.nama)}, ${ASAL}. Untuk` +
      `${l?.yang_dijual ? ` ${l.yang_dijual}` : " barang yang Anda posting"}, ` +
      `harganya berapa per kg/ikat ya? Dan minimum ordernya berapa?`,
  },
  {
    id: "rutin",
    label: "Tawarkan langganan rutin",
    ringkas: "Ambil rutin tiap minggu, minta harga langganan",
    teks: (l) =>
      `${sapaan(l?.nama)}, ${ASAL}. Kami butuh` +
      `${l?.yang_dijual ? ` ${l.yang_dijual}` : " pasokan sayur"} secara RUTIN tiap minggu. ` +
      `Kalau kami ambil terus-menerus, bisa dapat harga langganan?`,
  },
  {
    id: "ongkir",
    label: "Tanya ongkir & pengiriman",
    ringkas: "Bisa antar ke peternakan, dan ongkirnya",
    teks: (l) =>
      `${sapaan(l?.nama)}, ${ASAL}. Apakah bisa antar ke lokasi peternakan kami? ` +
      `Kalau bisa, ongkirnya berapa dan minimal berapa kg untuk sekali kirim?`,
  },
  {
    id: "stok",
    label: "Tanya stok hari ini",
    ringkas: "Untuk pemasok yang sudah pernah dihubungi",
    teks: (l) =>
      `${sapaan(l?.nama)}, ${ASAL}. Hari ini ada stok` +
      `${l?.yang_dijual ? ` ${l.yang_dijual}` : ""}? Kalau ada kami mau ambil.`,
  },
  {
    id: "foto",
    label: "Minta foto barang",
    ringkas: "Minta foto kondisi terbaru sebelum memesan",
    teks: (l) =>
      `${sapaan(l?.nama)}, ${ASAL}. Boleh minta foto` +
      `${l?.yang_dijual ? ` ${l.yang_dijual}` : " barangnya"} yang terbaru? ` +
      `Kami mau lihat kondisinya dulu sebelum pesan.`,
  },
];

/** Ambil teks satu template dengan aman; jatuh ke template pertama bila id tak dikenal. */
export function pesanDari(id, lead) {
  const t = TEMPLATE_PESAN.find((x) => x.id === id) || TEMPLATE_PESAN[0];
  return t.teks(lead || {});
}
