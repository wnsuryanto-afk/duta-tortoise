import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

/**
 * Pembersihan satu kali — 15-09-2026, atas keputusan pemilik.
 *
 * UserProfile menyimpan 29 baris untuk 10 orang. Sembilan belas di antaranya
 * bernama "[DUPLIKAT-HAPUS]": pembersihan lama yang mengganti NAMANYA tapi
 * tidak pernah menghapus barisnya. Dua lagi adalah profil kosong Ali dan Diana
 * yang dibuat 4 Juni, lebih baru daripada profil lengkap mereka sehingga
 * layar yang memilih "yang terbaru" mendapat profil tanpa nomor rekening.
 *
 * SEBELUM fungsi ini dijalankan, data yang hanya ada di baris nisan sudah
 * dipindahkan ke profil yang bertahan:
 *   Sholehuddin  HP 085704301731, NIK, BCA 2010538389, kontak darurat
 *   Ahmad Ali    BCA 2010844161
 *   Iwan         foto profil
 * Cadangan seluruh 21 baris disimpan di luar aplikasi sebelum dihapus.
 *
 * Daftar ID ditulis tetap di sini, bukan dicari lewat nama, supaya fungsi ini
 * tidak bisa menghapus apa pun selain 21 baris yang sudah diperiksa satu per
 * satu. Menjalankannya dua kali aman: yang sudah hilang dilaporkan sebagai
 * "tidak ditemukan", bukan error.
 */

const DIHAPUS = [
  // nisan — Sholehuddin & Angsolo
  "6a23a4b6b296af35675f17b3",
  "6a23a4b6b296af35675f17b4",
  "6a227635b2e83b0611779c50",
  "6a22743eb73bac0416cae8cc",
  // nisan — Iwan (15 baris dari percobaan awal Mei)
  "6a110d9a624a7e26bc0b7421",
  "6a10af7346f074264566e95a",
  "6a10af6f323e1a678974a1ef",
  "6a10af6a8d6a679cf8e05bee",
  "6a10aa32d6511da553a9f088",
  "6a10aa0501ef228c249dd758",
  "6a10a3c023865b014dde4753",
  "6a10a3bb78fb5892903bcf15",
  "6a10a3adc8081b5ec6b508d1",
  "6a10a3a7cbb3856de35888b3",
  "6a109241d8f3c929dd89137f",
  "6a10923c17a8a7b321ede512",
  "6a1088198466c7ef3a421f13",
  "6a108813f637fa08ed3ecdca",
  "6a0f39d679489799af4d7e96",
  // profil kosong 4 Juni — Ali & Diana
  "6a21bae834740f5270008a6f",
  "6a21bae834740f5270008a6e",
];

/** Profil yang HARUS tetap ada sesudahnya. Kalau salah satu hilang, ada yang keliru. */
const HARUS_SELAMAT = [
  "6a33d36198ba9d9926dd0e36", // Ahmad Ali
  "6a33d36198ba9d9926dd0e37", // Sholehuddin Sholeh
  "6a1bccfcfb500d47d9e21d3e", // Ali Santoso Mulyanata
  "6a12ef7b7b766df2ae6629e4", // Diana Susantio
  "6a11a8ed881978f97bcf2a56", // Iwan Suryanto
  "6a0ffc9c7e5398ca91e7f17a", // Vilka
  "6a0f44e842ed3f927a0e2489", // Deny
  "6aa0a5fff3a13a369ac3e222", // Hanif
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities.UserProfile;

    const dihapus: string[] = [];
    const tidakAda: string[] = [];
    const gagal: Array<{ id: string; alasan: string }> = [];

    for (const id of DIHAPUS) {
      try {
        await svc.delete(id);
        dihapus.push(id);
      } catch (e) {
        const pesan = String((e as Error)?.message || e);
        if (/not.?found|404/i.test(pesan)) tidakAda.push(id);
        else gagal.push({ id, alasan: pesan.slice(0, 200) });
      }
    }

    // Pemeriksaan sesudahnya: profil yang harus selamat memang masih ada.
    const sisa = await svc.list(null, 500);
    const idSisa = new Set((Array.isArray(sisa) ? sisa : []).map((p: any) => p.id));
    const hilangTakSengaja = HARUS_SELAMAT.filter((id) => !idSisa.has(id));

    return Response.json({
      success: gagal.length === 0 && hilangTakSengaja.length === 0,
      dihapus: dihapus.length,
      tidak_ditemukan: tidakAda.length,
      gagal,
      sisa_baris: idSisa.size,
      hilang_tak_sengaja: hilangTakSengaja,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
