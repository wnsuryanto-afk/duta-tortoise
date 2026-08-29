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
import { idKuraDenganKasusTerbuka, sedangSakitLengkap } from "@/lib/kesehatanKura";

/**
 * Ambil seluruh kura yang sedang sakit menurut kedua penandanya.
 * @returns {Promise<Array>} data kura utuh, tanpa duplikat, terurut nama.
 */
export async function ambilKuraSakit(batas = 200) {
  // Sumber ketiga yang dulu terlewat: kura yang penandanya sudah bersih tetapi
  // kasus sakitnya di rekam kesehatan belum ditutup. Justru kura seperti inilah
  // yang paling perlu muncul — selama ia tidak terdaftar di sini, tidak ada
  // layar mana pun yang bisa menutup kasusnya, dan lencana merahnya menetap.
  const [semuaKura, catatan] = await Promise.all([
    base44.entities.Tortoise.list("name", 2000),
    base44.entities.HealthRecord.list("-date", 500),
  ]);

  const idTerbuka = idKuraDenganKasusTerbuka(catatan);

  // Kura yang sudah mati, terjual, atau diarsipkan tidak dirawat lagi walau
  // penandanya tertinggal menyala — memunculkannya di daftar perawatan harian
  // hanya menambah tugas untuk kura yang tidak ada.
  return (semuaKura || [])
    .filter(
      (t) =>
        sedangSakitLengkap(t, idTerbuka) &&
        !t.is_archived &&
        t.status !== "mati" &&
        t.status !== "terjual",
    )
    .slice(0, batas)
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
