/**
 * perkawinan.js — aturan murni seputar catatan kura kawin.
 *
 * ── Kenapa entitas ini ada ─────────────────────────────────────────────────
 *
 * `Breeding` sudah punya field `mating_date` sejak awal, dan TIGA layar
 * menampilkannya: BreedingPlannerPage menggambar peristiwa "Kawin", kalender
 * penangkaran membacanya, EggHistoryPanel menuliskannya di riwayat tiap kura.
 *
 * Tidak ada satu pun yang mengisinya. `BreedingForm` tidak punya isiannya, dan
 * di data hidup field itu kosong di SELURUH baris. Tiga layar menunggu jawaban
 * yang tidak pernah dikirim siapa pun.
 *
 * Sebabnya ada di skemanya: `Breeding` mewajibkan `egg_laying_date`,
 * `egg_count` dan `incubator_name`. Artinya sebuah catatan hanya bisa dibuat
 * SESUDAH telurnya ada. Kiper yang melihat sepasang kura kawin pagi ini tidak
 * punya telur untuk dilaporkan, jadi tidak ada tempat untuk mencatatnya —
 * dan saat telurnya muncul dua minggu kemudian, tidak ada yang ingat pasangan
 * mana yang menurunkannya.
 *
 * Melonggarkan kewajiban di `Breeding` akan membuat seluruh alur telur bisa
 * disimpan setengah jadi. Maka pengamatan kawin berdiri sendiri di sini, dan
 * `Breeding.mating_date` diisi DARI sini saat clutch-nya dibuat.
 */

/** Kunci pasangan yang tidak bergantung urutan penulisan. */
export function kunciPasangan(jantanId, betinaId) {
  return `${String(jantanId || "")}|${String(betinaId || "")}`;
}

function bersih(daftar) {
  return (daftar || []).filter((p) => p && !p.is_archived && p.male_id && p.female_id);
}

/**
 * Ringkas catatan kawin jadi daftar PASANGAN.
 *
 * Inilah yang ditanyakan: "pasangan mana kura-kuranya". Satu baris per
 * pasangan, dengan tanggal terakhir dan berapa kali terlihat.
 *
 * Diurutkan dari yang paling baru, karena yang baru kawin itulah yang telurnya
 * sebentar lagi perlu ditunggu.
 */
export function ringkasPasangan(perkawinan = []) {
  const peta = new Map();
  for (const p of bersih(perkawinan)) {
    const k = kunciPasangan(p.male_id, p.female_id);
    const ada = peta.get(k);
    if (!ada) {
      peta.set(k, {
        kunci: k,
        male_id: p.male_id,
        female_id: p.female_id,
        male_name: p.male_name || "—",
        female_name: p.female_name || "—",
        terakhir: p.mating_date || "",
        jumlah: 1,
        kandang: p.enclosure || "",
      });
      continue;
    }
    ada.jumlah += 1;
    // Nama diambil dari catatan TERBARU: kura yang berganti nama harus tampil
    // dengan nama yang dikenali orang sekarang, bukan nama lamanya.
    if (String(p.mating_date || "") > String(ada.terakhir || "")) {
      ada.terakhir = p.mating_date || "";
      ada.male_name = p.male_name || ada.male_name;
      ada.female_name = p.female_name || ada.female_name;
      ada.kandang = p.enclosure || ada.kandang;
    }
  }
  return [...peta.values()].sort((a, b) =>
    String(b.terakhir || "").localeCompare(String(a.terakhir || "")),
  );
}

/**
 * Hari sejak kawin terakhir sebuah pasangan.
 *
 * Dipakai untuk menandai pasangan yang sudah lewat masa wajarnya bertelur
 * tanpa ada clutch tercatat — bukan untuk menyalahkan siapa pun, tetapi supaya
 * telur yang terlewat pencatatannya bisa ketahuan selagi masih bisa dicari.
 */
export function hariSejak(tanggal, hariIni = new Date()) {
  if (!tanggal) return null;
  const t = new Date(`${tanggal}T00:00:00`);
  if (Number.isNaN(t.getTime())) return null;
  const a = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate());
  return Math.floor((a - t) / 86400000);
}

/**
 * Apakah kedua kura ini boleh dicatat sebagai pasangan.
 *
 * Bukan soal sopan santun data: mencatat satu kura kawin dengan dirinya
 * sendiri, atau mencatat dua betina, akan mengotori daftar pasangan yang
 * justru dipakai untuk memutuskan penjodohan berikutnya.
 */
export function periksaPasangan(jantan, betina) {
  if (!jantan?.id || !betina?.id) return { boleh: false, sebab: "Pilih jantan dan betinanya." };
  if (jantan.id === betina.id) return { boleh: false, sebab: "Jantan dan betina tidak boleh kura yang sama." };
  if (jantan.gender && jantan.gender !== "jantan") {
    return { boleh: false, sebab: `${jantan.name || "Kura itu"} tercatat bukan jantan.` };
  }
  if (betina.gender && betina.gender !== "betina") {
    return { boleh: false, sebab: `${betina.name || "Kura itu"} tercatat bukan betina.` };
  }
  return { boleh: true, sebab: "" };
}

/**
 * Sudah ada catatan yang sama persis?
 *
 * Kiper mencatat dari lapangan, sering sambil berjalan, dan ketukan ganda itu
 * biasa. Tanpa penjagaan ini satu perkawinan bisa tercatat dua kali dan daftar
 * pasangan menghitungnya sebagai dua kejadian.
 */
export function sudahTercatat(perkawinan = [], jantanId, betinaId, tanggal) {
  const k = kunciPasangan(jantanId, betinaId);
  return bersih(perkawinan).some(
    (p) => kunciPasangan(p.male_id, p.female_id) === k && p.mating_date === tanggal,
  );
}
