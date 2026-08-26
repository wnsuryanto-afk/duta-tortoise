/**
 * daftarKuraSakit — satu pengambilan data untuk semua daftar "kura sakit".
 *
 * Layar keeper dan panel tutup kasus di Rekam Kesehatan menampilkan daftar yang
 * sama dan menyusunnya dengan kode yang nyaris identik. Keduanya mengambilnya
 * dengan cara yang sama pula:
 *
 *     Tortoise.filter({ is_currently_sick: true })
 *
 * Penyaringan itu hanya membaca SATU dari dua penanda sakit. Kura yang
 * statusnya "sakit" tapi centangnya belum menyala — dan itu terjadi setiap kali
 * status diubah lewat dropdown di formulir kura — tidak pernah muncul di kedua
 * daftar ini. Kura yang benar-benar sakit tidak masuk daftar perawatan harian
 * siapa pun, dan tidak ada layar yang bisa menutup kasusnya.
 *
 * Di sini keduanya diambil dan digabung. Dua penyaringan di server lebih hemat
 * daripada menarik seluruh kura ke browser, dan tetap menangkap kedua sisinya.
 */
import { base44 } from "@/api/base44Client";
import { sedangSakit } from "@/lib/statusKura";

/**
 * Ambil seluruh kura yang sedang sakit menurut kedua penandanya.
 * @returns {Promise<Array>} data kura utuh, tanpa duplikat, terurut nama.
 */
export async function ambilKuraSakit(batas = 200) {
  const [lewatCentang, lewatStatus] = await Promise.all([
    base44.entities.Tortoise.filter({ is_currently_sick: true }, "name", batas),
    base44.entities.Tortoise.filter({ status: "sakit" }, "name", batas),
  ]);

  const perId = new Map();
  [...(lewatCentang || []), ...(lewatStatus || [])].forEach((t) => {
    if (t?.id && !perId.has(t.id)) perId.set(t.id, t);
  });

  // Kura yang sudah mati, terjual, atau diarsipkan tidak dirawat lagi walau
  // penandanya tertinggal menyala — memunculkannya di daftar perawatan harian
  // hanya menambah tugas untuk kura yang tidak ada.
  return [...perId.values()]
    .filter((t) => sedangSakit(t) && !t.is_archived && t.status !== "mati" && t.status !== "terjual")
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

/**
 * Daftar kura sakit lengkap dengan keterangan dari catatan sakit terakhirnya.
 *
 * `previous_status` sengaja ikut dibawa: tanpa itu, `perubahanSembuh` tidak tahu
 * status asal kuranya dan mengembalikan semua yang sembuh sebagai "aktif" —
 * kura baby kehilangan klasifikasinya untuk selamanya.
 */
export async function ambilKuraSakitBerketerangan(batas = 200) {
  const sakit = await ambilKuraSakit(batas);
  if (sakit.length === 0) return [];

  const hrs = await base44.entities.HealthRecord.list("-date", 300);
  return sakit.map((t) => {
    const last = hrs.find((h) => h.tortoise_id === t.id && h.type === "sakit");
    return {
      id: t.id,
      tortoise_id: t.id,
      tortoise_name: t.name,
      enclosure: t.enclosure,
      enclosure_id: t.enclosure_id,
      status: t.status,
      previous_status: t.previous_status,
      is_currently_sick: t.is_currently_sick,
      severity: last?.severity,
      since: last?.date,
      diagnosis_notes: last?.diagnosis_notes,
      treatment: last?.treatment,
      description: last?.description,
    };
  });
}
