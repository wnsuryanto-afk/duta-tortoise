/**
 * tugasMassal.js — menjalankan banyak penulisan entitas dengan aman.
 *
 * Pola `Promise.all(items.map(update))` tersebar di beberapa layar. Untuk 5
 * item pola itu tidak apa-apa; untuk 71 notifikasi ia menembakkan 71 permintaan
 * serentak, kena batas laju server (429), lalu gagal tanpa suara karena tidak
 * ada satu pun penanganan error. Dari sisi pengguna: tombol ditekan, tidak
 * terjadi apa-apa, angkanya tidak turun.
 *
 * Fungsi di sini membatasi jumlah permintaan serentak, mengulang yang kena
 * batas laju, dan yang terpenting: MENGEMBALIKAN daftar yang gagal supaya
 * pemanggil bisa memberi tahu pengguna, bukan menelannya.
 */

const KODE_ULANG = [429, 500, 502, 503, 504];

function bolehDiulang(e) {
  const kode = e?.status ?? e?.response?.status;
  if (KODE_ULANG.includes(kode)) return true;
  const pesan = String(e?.message || "");
  return KODE_ULANG.some((k) => pesan.includes(String(k)));
}

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Jalankan satu tugas dengan pengulangan berjenjang saat kena batas laju.
 * Jeda: 1s, 2s, 4s — cukup memberi ruang server tanpa membuat pengguna menunggu lama.
 */
export async function denganUlang(tugas, maksUlang = 3) {
  let terakhir;
  for (let i = 0; i < maksUlang; i++) {
    try {
      return await tugas();
    } catch (e) {
      terakhir = e;
      if (!bolehDiulang(e) || i === maksUlang - 1) throw e;
      await tidur(1000 * 2 ** i);
    }
  }
  throw terakhir;
}

/**
 * Jalankan `tugas` untuk setiap item, beberapa sekaligus tapi tidak semuanya.
 *
 * @param {Array} items
 * @param {(item:any, index:number)=>Promise<any>} tugas
 * @param {object} opsi
 * @param {number} [opsi.serentak=4] berapa permintaan berjalan bersamaan
 * @param {(sudah:number, total:number)=>void} [opsi.onKemajuan]
 * @param {()=>boolean} [opsi.batal] dipanggil tiap item; kembalikan true untuk berhenti
 *
 * @returns {Promise<{berhasil: number, gagal: Array<{item:any, pesan:string}>, dibatalkan: boolean}>}
 *   Tidak pernah melempar. Kegagalan sebagian adalah hasil yang sah dan harus
 *   dilaporkan ke pengguna, bukan membatalkan seluruh operasi yang sudah jalan.
 */
export async function jalankanMassal(items = [], tugas, opsi = {}) {
  const { serentak = 4, onKemajuan, batal } = opsi;

  let berhasil = 0;
  let selesai = 0;
  let dibatalkan = false;
  const gagal = [];
  const antre = [...items.entries()];

  const pekerja = async () => {
    for (;;) {
      if (dibatalkan) return;
      const berikut = antre.shift();
      if (!berikut) return;
      const [i, item] = berikut;

      if (batal?.()) { dibatalkan = true; return; }

      try {
        await denganUlang(() => tugas(item, i));
        berhasil++;
      } catch (e) {
        gagal.push({ item, pesan: e?.message || "gagal tanpa keterangan" });
      }
      selesai++;
      onKemajuan?.(selesai, items.length);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(serentak, items.length || 1) }, pekerja)
  );

  return { berhasil, gagal, dibatalkan };
}

/**
 * Rangkum hasil `jalankanMassal` jadi satu kalimat siap tampil.
 * Kegagalan selalu disebut jumlahnya dan satu contohnya — "sebagian gagal"
 * tanpa keterangan tidak menolong siapa pun memperbaikinya.
 */
export function ringkasHasil({ berhasil, gagal, dibatalkan }, satuan = "item") {
  if (dibatalkan) return { nada: "info", teks: `Dihentikan — ${berhasil} ${satuan} sudah diproses.` };
  if (gagal.length === 0) return { nada: "berhasil", teks: `${berhasil} ${satuan} selesai.` };
  if (berhasil === 0) return { nada: "gagal", teks: `Gagal semua — ${gagal[0].pesan}` };
  return {
    nada: "sebagian",
    teks: `${berhasil} selesai, ${gagal.length} gagal — ${gagal[0].pesan}`,
  };
}
