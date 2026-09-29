import { namaKandang } from "@/lib/kandang";

/**
 * produksiBetina.js — pertanyaan yang sebenarnya perlu dijawab kebun ini.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Halaman "Breeding Planner" dibangun di sekitar satu gagasan: pemilik memilih
 * PASANGAN mana yang dikawinkan, lalu aplikasi memberi peringkat pasangan
 * terbaik dan mengingatkan betina yang belum dikawinkan.
 *
 * Gagasan itu tidak cocok dengan cara kebun ini bekerja, dan pemiliknya sendiri
 * yang menyebutkannya lebih dulu: "di setiap kandang sudah otomatis
 * dipasangkan". Memang begitu. Yang menentukan siapa kawin dengan siapa bukan
 * sebuah rencana, melainkan SIAPA TINGGAL DI KANDANG MANA. Selama kandangnya
 * tidak diubah, tidak ada yang perlu direncanakan — jadi wajar kalau halaman
 * perencana terasa tidak ada gunanya.
 *
 * Diperiksa pada data 29 September 2026:
 *
 *   120 kura dewasa aktif — 31 jantan, 89 betina, tersebar di 16 kandang
 *   10 dari 16 kandang berisi TEPAT SATU jantan  -> ayah anaknya pasti
 *    6 dari 16 kandang berisi LEBIH dari satu    -> ayah anaknya tidak pasti
 *   kandang N sendirian menampung 11 jantan dan 17 betina
 *
 * Akibatnya, untuk 47 dari 89 betina, menuliskan nama seekor jantan sebagai
 * ayah adalah tebakan. Dari 10 catatan Breeding yang ada, tiga menyebut A35
 * sebagai ayah padahal A35 tinggal di kandang N bersama sepuluh jantan lain.
 * "Ranking Pasangan Terbaik" memeringkat tebakan itu sebagai fakta.
 *
 * ── Pertanyaan yang benar ──────────────────────────────────────────────────
 *
 * Bukan "pasangkan siapa dengan siapa", melainkan dua hal ini:
 *
 *   1. BETINA MANA YANG TIDAK BERPRODUKSI. Dari 89 betina dewasa aktif, hanya
 *      DELAPAN yang punya catatan bertelur. Delapan puluh satu sisanya tidak
 *      punya satu pun. Entah mereka memang tidak bertelur — dan itu masalah
 *      produksi yang besar — atau bertelur tanpa pernah dicatat, dan itu
 *      masalah pencatatan. Daftar per betina yang membedakan keduanya adalah
 *      alat produksi yang sebenarnya.
 *
 *   2. SUSUNAN JANTAN PER KANDANG. Di sistem kandang, inilah satu-satunya
 *      keputusan perkawinan yang benar-benar diambil manusia. Memindahkan
 *      jantan mengubah siapa yang kawin dengan siapa DAN mengubah apakah
 *      keturunannya bisa ditelusuri.
 *
 * ── Batas umur diambil dari catatan kebun ini sendiri ──────────────────────
 *
 * Menagih betina berumur dua tahun karena "belum bertelur" hanya akan membuat
 * daftarnya diabaikan. Tapi batas umur dewasa kawin tidak diambil dari buku:
 * ia dihitung dari umur termuda yang PERNAH bertelur di kebun ini. Pada data
 * hari ini A48 bertelur pada umur sekitar 6 tahun 5 bulan — jadi itulah
 * batasnya, dan batas itu memperbaiki dirinya sendiri setiap ada catatan baru.
 */

/** Umur dalam tahun (pecahan) pada tanggal tertentu; null bila tidak diketahui. */
export function umurTahun(birthDate, pada = new Date()) {
  if (!birthDate) return null;
  const lahir = new Date(birthDate);
  const acuan = pada instanceof Date ? pada : new Date(pada);
  if (Number.isNaN(lahir.getTime()) || Number.isNaN(acuan.getTime())) return null;
  return (acuan - lahir) / (365.25 * 24 * 3600 * 1000);
}

/** Betina yang layak dinilai produksinya: hidup, betina, bukan baby/juvenile. */
export function betinaDewasa(tortoises = []) {
  return (tortoises || []).filter(
    (t) =>
      t?.gender === "betina" &&
      t?.status === "aktif" &&
      t?.age_category !== "baby" &&
      t?.age_category !== "juvenile",
  );
}

/**
 * Umur termuda yang pernah bertelur MENURUT CATATAN KEBUN INI.
 *
 * Bukan angka dari buku. Kalau belum ada satu pun catatan yang bisa dihitung
 * umurnya, kembalikan null — dan pemanggilnya harus mengatakan "belum bisa
 * ditentukan", bukan diam-diam memakai tebakan.
 */
export function umurTermudaBertelur(tortoises = [], breedings = []) {
  let termuda = null;
  for (const b of breedings || []) {
    if (!b?.egg_laying_date) continue;
    const induk = cocokkanBetina(b, tortoises);
    const u = umurTahun(induk?.birth_date, b.egg_laying_date);
    if (u === null || u <= 0) continue;
    if (termuda === null || u < termuda) termuda = u;
  }
  return termuda;
}

/**
 * Cocokkan satu catatan Breeding ke baris kura betinanya.
 *
 * ID dulu, nama belakangan. Nama berubah saat kura diganti namanya; id tidak.
 * Ini pola yang sudah berkali-kali menggigit aplikasi ini.
 */
export function cocokkanBetina(breeding, tortoises = []) {
  if (!breeding) return null;
  if (breeding.female_id) {
    const lewatId = (tortoises || []).find((t) => t.id === breeding.female_id);
    if (lewatId) return lewatId;
  }
  if (!breeding.female_name) return null;
  const nama = String(breeding.female_name).trim().toLowerCase();
  return (tortoises || []).find((t) => String(t?.name || "").trim().toLowerCase() === nama) || null;
}

/** Peta nama kandang -> daftar jantan dewasa aktif yang ada di dalamnya. */
export function jantanPerKandang(tortoises = [], enclosures = []) {
  const peta = new Map();
  for (const t of tortoises || []) {
    if (t?.gender !== "jantan" || t?.status !== "aktif") continue;
    if (t?.age_category === "baby" || t?.age_category === "juvenile") continue;
    const nama = namaKandang(t, enclosures) || "";
    if (!nama) continue;
    if (!peta.has(nama)) peta.set(nama, []);
    peta.get(nama).push(t);
  }
  return peta;
}

/**
 * Bisakah ayah anak dari betina di kandang ini dipastikan?
 *
 * Satu jantan  -> pasti, dan namanya disebut.
 * Lebih        -> TIDAK pasti. Yang dikembalikan daftar kandidatnya, bukan
 *                 satu nama, karena menyebut satu nama di sini persis
 *                 kesalahan yang membuat tiga catatan A35 terlihat seperti
 *                 fakta.
 * Tidak ada    -> tidak ada ayah di kandang itu sama sekali.
 */
export function kepastianAyah(namaKdg, petaJantan) {
  const daftar = petaJantan.get(namaKdg) || [];
  return {
    pasti: daftar.length === 1,
    jumlah: daftar.length,
    kandidat: daftar.map((t) => t.name),
    ayah: daftar.length === 1 ? daftar[0].name : null,
  };
}

/** Kepastian ayah untuk SATU catatan clutch, dilihat dari kandang induknya. */
export function kepastianAyahClutch(breeding, tortoises = [], enclosures = []) {
  const induk = cocokkanBetina(breeding, tortoises);
  if (!induk) return { pasti: false, jumlah: 0, kandidat: [], ayah: null, kandang: "", alasan: "induk tidak ditemukan" };
  const kdg = namaKandang(induk, enclosures) || "";
  const k = kepastianAyah(kdg, jantanPerKandang(tortoises, enclosures));
  // Nama yang tercatat tidak termasuk kandidat: kandangnya sudah berubah, atau
  // catatannya keliru. Dua-duanya berarti nama itu tidak boleh dibaca sebagai
  // fakta — tetapi keduanya juga bukan hal yang boleh diam-diam diperbaiki.
  const tercatat = breeding?.male_name || "";
  const asing = tercatat && k.jumlah > 0 && !k.kandidat.includes(tercatat);
  return { ...k, kandang: kdg, tercatat, asing };
}

/**
 * Satu baris per betina dewasa: berapa yang dihasilkannya, dan kapan terakhir.
 *
 * `hariDiam` dihitung dari bertelur TERAKHIR. Untuk yang belum pernah tercatat
 * nilainya null — bukan angka besar — supaya "belum pernah" dan "sudah lama"
 * tidak pernah tercampur jadi satu angka yang sama.
 */
export function produksiBetina(tortoises = [], breedings = [], enclosures = [], { hariIni = new Date() } = {}) {
  const petaJantan = jantanPerKandang(tortoises, enclosures);
  const perInduk = new Map();
  for (const b of breedings || []) {
    const induk = cocokkanBetina(b, tortoises);
    if (!induk) continue;
    if (!perInduk.has(induk.id)) perInduk.set(induk.id, []);
    perInduk.get(induk.id).push(b);
  }

  const acuan = hariIni instanceof Date ? hariIni : new Date(hariIni);
  const tahunIni = acuan.getFullYear();

  return betinaDewasa(tortoises)
    .map((t) => {
      const clutch = (perInduk.get(t.id) || []).filter((b) => b.egg_laying_date);
      const tanggal = clutch.map((b) => b.egg_laying_date).sort();
      const terakhir = tanggal.length ? tanggal[tanggal.length - 1] : null;
      const totalTelur = clutch.reduce((s, b) => s + (Number(b.egg_count) || 0), 0);
      const totalMenetas = clutch.reduce((s, b) => s + (Number(b.hatched_count) || 0), 0);
      // Hatch rate hanya dihitung dari clutch yang SUDAH selesai menetas.
      // Memasukkan clutch yang masih dierami akan membaginya dengan telur yang
      // belum punya kesempatan menetas, dan angkanya selalu terlihat buruk.
      const selesai = clutch.filter((b) => b.hatch_date || b.status === "selesai");
      const telurSelesai = selesai.reduce((s, b) => s + (Number(b.egg_count) || 0), 0);
      const menetasSelesai = selesai.reduce((s, b) => s + (Number(b.hatched_count) || 0), 0);
      const kdg = namaKandang(t, enclosures) || "";
      return {
        id: t.id,
        nama: t.name,
        kandang: kdg,
        umur: umurTahun(t.birth_date, acuan),
        clutch: clutch.length,
        clutchTahunIni: clutch.filter((b) => String(b.egg_laying_date).startsWith(String(tahunIni))).length,
        terakhirBertelur: terakhir,
        hariDiam: terakhir ? Math.floor((acuan - new Date(terakhir)) / 86400000) : null,
        totalTelur,
        totalMenetas,
        hatchRate: telurSelesai > 0 ? menetasSelesai / telurSelesai : null,
        ayah: kepastianAyah(kdg, petaJantan),
      };
    })
    .sort((a, b) => {
      // Yang belum pernah tercatat di atas — itu pertanyaan terbesarnya.
      if ((a.clutch === 0) !== (b.clutch === 0)) return a.clutch === 0 ? -1 : 1;
      if (a.clutch === 0) return (b.umur ?? 0) - (a.umur ?? 0);
      return (b.hariDiam ?? 0) - (a.hariDiam ?? 0);
    });
}

/** Ringkasan per kandang: isi, dan apakah keturunannya bisa ditelusuri. */
export function ringkasKandang(tortoises = [], enclosures = []) {
  const peta = new Map();
  for (const t of tortoises || []) {
    if (t?.status !== "aktif") continue;
    if (t?.age_category === "baby" || t?.age_category === "juvenile") continue;
    if (t?.gender !== "jantan" && t?.gender !== "betina") continue;
    const nama = namaKandang(t, enclosures) || "(tanpa kandang)";
    if (!peta.has(nama)) peta.set(nama, { kandang: nama, jantan: [], betina: [] });
    peta.get(nama)[t.gender].push(t.name);
  }
  return [...peta.values()]
    .map((k) => ({
      ...k,
      jumlahJantan: k.jantan.length,
      jumlahBetina: k.betina.length,
      terlacak: k.jantan.length === 1,
      ayah: k.jantan.length === 1 ? k.jantan[0] : null,
    }))
    // Yang paling merusak ketelusuran di atas: banyak jantan, banyak betina.
    .sort((a, b) => (b.jumlahJantan - a.jumlahJantan) || (b.jumlahBetina - a.jumlahBetina));
}

/** Angka-angka yang muat di kepala halaman. */
export function ringkasProduksi(baris = [], { umurMinimal = null } = {}) {
  const cukupUmur = umurMinimal === null ? baris : baris.filter((r) => (r.umur ?? 0) >= umurMinimal);
  const belumPernah = cukupUmur.filter((r) => r.clutch === 0);
  return {
    betina: baris.length,
    cukupUmur: cukupUmur.length,
    belumCukupUmur: baris.length - cukupUmur.length,
    belumPernah: belumPernah.length,
    bertelurTahunIni: baris.filter((r) => r.clutchTahunIni > 0).length,
    ayahTidakPasti: baris.filter((r) => !r.ayah.pasti).length,
    totalTelur: baris.reduce((s, r) => s + r.totalTelur, 0),
    totalMenetas: baris.reduce((s, r) => s + r.totalMenetas, 0),
  };
}
