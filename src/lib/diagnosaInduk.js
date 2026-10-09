/**
 * diagnosaInduk.js — kenapa betina ini belum bertelur, dan apa yang bisa diubah.
 *
 * ── Angka yang memulai berkas ini ──────────────────────────────────────────
 *
 * 9 Oktober 2026: 82 betina cukup umur, 10 pernah bertelur, 72 belum. Pemilik
 * bertanya yang benar — bukan "siapa saja yang 72", melainkan "mana yang perlu
 * diperbaiki supaya jumlahnya naik".
 *
 * Yang dilihat saat menjawab itu bukan betinanya satu per satu, melainkan
 * KANDANGNYA. Di kebun ini yang menentukan siapa kawin dengan siapa adalah
 * siapa tinggal di mana, dan produksinya mengelompok tajam menurut kandang:
 *
 *   kandang      betina  pernah bertelur   jantan dewasa
 *   W3                3       3  (100%)    A36
 *   E5 / W2 / W1      3       1   (33%)    satu jantan, masing-masing
 *   N                14       3   (21%)    tujuh jantan
 *   Bonsai 1               9       0   (0%)     B6, A23, B9
 *   Bonsai 2               9       0   (0%)     A27, B8, B39
 *   Bonsai 3               6       0   (0%)     A30, B11, A33
 *   Bonsai 4               6       0   (0%)     B40, B5, C3
 *   E1                6       0   (0%)     (tidak ada — Yuwono 3,4 th)
 *
 * Tiga puluh betina — sepertiga seluruh indukan — tinggal di empat kandang
 * Bonsai yang masing-masing berisi TIGA jantan, dan keempat kandang itu
 * bersama-sama menghasilkan NOL clutch. Sementara kandang dengan tepat satu
 * jantan menghasilkan 6 dari 27 betinanya.
 *
 * ── Apa yang boleh dan tidak boleh dikatakan berkas ini ────────────────────
 *
 * Yang di atas KORELASI, bukan sebab yang terbukti. Betina Bonsai hampir
 * seluruhnya batch impor 26 Desember 2024, dan batch itu memang baru 21 bulan
 * di sini; kandangnya dan asalnya bercampur, tidak bisa dipisahkan oleh data
 * yang ada. Jadi berkas ini menyebut dua hal terpisah:
 *
 *   SEBAB   — hanya yang benar-benar pasti. "Tidak ada jantan dewasa di
 *             kandang ini" adalah fakta: betina di situ tidak bisa dibuahi,
 *             titik.
 *   USULAN  — selebihnya, ditandai sebagai usulan dan selalu dengan angka
 *             yang mendasarinya, supaya pemilik menilai sendiri.
 *
 * Dan satu kemungkinan yang tidak boleh hilang dari layar: mungkin saja mereka
 * BERTELUR TANPA TERCATAT. Histori kawin kebun ini nol catatan. Selama tidak
 * ada yang memeriksa sarang dan mencatatnya, "belum bertelur" dan "belum
 * ketahuan bertelur" adalah kalimat yang sama.
 */
import { umurTahun } from "@/lib/produksiBetina";

/** Betina sebanyak ini di satu kandang sudah cukup untuk menilai kandangnya. */
export const MIN_BETINA_NILAI_KANDANG = 3;

/** Bulan tersingkat dari datang sampai bertelur, bila data kebun belum bisa menghitungnya. */
export const BULAN_ADAPTASI_BAWAAN = 10;

const HARI_MS = 86400000;

function bulanAntara(dariTanggal, sampaiTanggal) {
  if (!dariTanggal || !sampaiTanggal) return null;
  const a = new Date(`${String(dariTanggal).slice(0, 10)}T12:00:00Z`);
  const b = new Date(`${String(sampaiTanggal).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.floor((b - a) / HARI_MS / 30.44);
}

/**
 * Berapa bulan tersingkat, MENURUT CATATAN KEBUN INI, dari seekor betina
 * datang sampai ia bertelur pertama kali.
 *
 * Pola yang sama dengan `umurTermudaBertelur`: batasnya tidak diambil dari
 * buku, ia dihitung dari kebun ini sendiri dan memperbaiki diri tiap ada
 * catatan baru. Tanpa itu, menagih betina yang baru tiga bulan datang hanya
 * akan membuat daftarnya diabaikan.
 */
export function bulanAdaptasiTercepat(tortoises = [], breedings = []) {
  const perId = new Map();
  for (const t of tortoises || []) if (t?.id) perId.set(t.id, t);
  let tercepat = null;
  for (const b of breedings || []) {
    const induk = perId.get(b?.female_id);
    if (!induk?.purchase_date || !b?.egg_laying_date) continue;
    const bulan = bulanAntara(induk.purchase_date, b.egg_laying_date);
    if (bulan === null || bulan < 0) continue;
    if (tercepat === null || bulan < tercepat) tercepat = bulan;
  }
  return tercepat;
}

/**
 * Rekam jejak tiap kandang: berapa betinanya, berapa yang pernah bertelur.
 *
 * Dihitung dari baris `produksiBetina`, bukan dari kura mentah, supaya
 * "cukup umur" di sini berarti persis sama dengan yang dipakai layarnya.
 */
export function rekamKandang(baris = []) {
  const peta = new Map();
  for (const r of baris || []) {
    const nama = r?.kandang || "(tanpa kandang)";
    if (!peta.has(nama)) {
      peta.set(nama, {
        kandang: nama,
        betina: 0,
        produktif: 0,
        clutch: 0,
        jantan: r?.ayah?.kandidat || [],
        jantanMuda: r?.ayah?.muda || [],
      });
    }
    const k = peta.get(nama);
    k.betina += 1;
    if ((r.clutch || 0) > 0) k.produktif += 1;
    k.clutch += r.clutch || 0;
  }
  for (const k of peta.values()) {
    k.jumlahJantan = k.jantan.length;
    k.persen = k.betina > 0 ? k.produktif / k.betina : null;
    // "Cukup untuk dinilai" dipisahkan dari "nol": kandang berisi satu betina
    // yang belum bertelur bukan bukti apa-apa tentang kandangnya.
    k.bisaDinilai = k.betina >= MIN_BETINA_NILAI_KANDANG;
    k.nolProduksi = k.bisaDinilai && k.produktif === 0;
  }
  return peta;
}

/**
 * Sebab dan usulan untuk SATU betina yang belum pernah tercatat bertelur.
 *
 * `sebab` hanya diisi hal yang pasti; selebihnya masuk `usulan`. Keduanya
 * dipisah supaya layarnya bisa menampilkannya dengan nada yang berbeda —
 * dan supaya tidak ada tebakan yang terbaca sebagai temuan.
 */
export function diagnosaBetina(r, { kandang, bulanAdaptasi = BULAN_ADAPTASI_BAWAAN, hariIni } = {}) {
  const sebab = [];
  const usulan = [];
  const k = kandang || {};
  const hari = String(hariIni || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const lamaBulan = bulanAntara(r?.purchaseDate, hari);
  const ayah = r?.ayah || {};

  // ── Yang pasti ───────────────────────────────────────────────────────────
  if (ayah.hanyaMuda) {
    sebab.push({
      kode: "jantan-belum-cukup-umur",
      teks: `Jantan di kandang ini (${(ayah.muda || []).join(", ")}) belum cukup umur. Betina di sini belum bisa dibuahi.`,
    });
  } else if ((ayah.jumlah || 0) === 0) {
    sebab.push({
      kode: "tanpa-jantan",
      teks: "Tidak ada jantan dewasa di kandang ini. Betina di sini tidak bisa dibuahi.",
    });
  }
  if (r?.sakit) {
    sebab.push({ kode: "sakit", teks: "Sedang sakit atau dikarantina." });
  }
  if (r?.proven) {
    /*
      Ditandai `is_proven` tetapi nol catatan bertelur di sini. Dua bacaan,
      dan keduanya menuntut tindakan: ia memang pernah berproduksi sebelum
      tiba di kebun ini — berarti ia MAMPU, dan yang berubah keadaannya di
      sini — atau tandanya keliru dan perlu dibersihkan. Betina seperti ini
      kandidat terkuat untuk dicoba dipindahkan ke kandang yang terbukti.
    */
    usulan.push({
      kode: "proven-tanpa-catatan",
      teks: "Ditandai pernah berproduksi, tetapi nol catatan bertelur di sini. Entah ia memang mampu dan keadaannya di sini yang menahan, entah tandanya keliru.",
    });
  }

  // ── Yang baru usulan ─────────────────────────────────────────────────────
  if (lamaBulan !== null && lamaBulan < bulanAdaptasi) {
    usulan.push({
      kode: "baru-datang",
      teks: `Baru ${lamaBulan} bulan di sini. Yang tercepat di kebun ini bertelur ${bulanAdaptasi} bulan sesudah datang, jadi belum tentu ada yang salah.`,
    });
  }
  if ((ayah.jumlah || 0) > 1 && k.nolProduksi) {
    usulan.push({
      kode: "jantan-berdesakan",
      teks: `${ayah.jumlah} jantan di satu kandang (${(ayah.kandidat || []).join(", ")}), dan kandang ini belum pernah menghasilkan satu clutch pun dari ${k.betina} betinanya.`,
    });
  }
  if (k.nolProduksi && (ayah.jumlah || 0) <= 1) {
    usulan.push({
      kode: "kandang-nol",
      teks: `Kandang ini belum pernah menghasilkan clutch dari ${k.betina} betinanya. Jantannya${ayah.ayah ? ` (${ayah.ayah})` : ""} perlu diperiksa, atau dicoba diganti.`,
    });
  }

  /*
    Kemungkinan yang harus selalu disebut terakhir dan tidak pernah dihapus:
    nol catatan bukan nol telur. Histori kawin kebun ini kosong, dan tidak ada
    satu pun pemeriksaan sarang yang tercatat.
  */
  usulan.push({
    kode: "mungkin-tidak-tercatat",
    teks: "Atau bertelur tanpa tercatat — selama sarangnya tidak diperiksa dan dicatat, keduanya terlihat sama di layar ini.",
  });

  /*
    Prioritas. Yang di atas bukan yang paling parah, melainkan yang paling
    BISA DIUBAH dan paling lama dibiarkan: sebab yang pasti lebih dulu, lalu
    lamanya dipelihara tanpa hasil. Betina yang 94 bulan di sini tanpa satu
    pun telur adalah pertanyaan yang lebih tua daripada yang baru 21 bulan.
  */
  const bobotSebab = sebab.some((s) => s.kode === "jantan-belum-cukup-umur" || s.kode === "tanpa-jantan") ? 1000 : 0;
  const bobotBerdesakan = usulan.some((u) => u.kode === "jantan-berdesakan") ? 300 : 0;
  const bobotKandangNol = usulan.some((u) => u.kode === "kandang-nol") ? 150 : 0;
  const bobotBaru = usulan.some((u) => u.kode === "baru-datang") ? -400 : 0;
  const bobotProven = usulan.some((u) => u.kode === "proven-tanpa-catatan") ? 250 : 0;
  const bobotLama = Math.min(300, lamaBulan === null ? 0 : lamaBulan);

  return {
    sebab,
    usulan,
    lamaBulan,
    prioritas: bobotSebab + bobotBerdesakan + bobotKandangNol + bobotProven + bobotBaru + bobotLama,
  };
}

/**
 * Usulan pemindahan jantan.
 *
 * Satu kandang satu jantan adalah satu-satunya susunan yang membuat ayah anak
 * bisa ditelusuri, dan di kebun ini juga satu-satunya susunan yang pernah
 * menghasilkan. Fungsi ini menghitung berapa jantan yang BERLEBIH dan berapa
 * kandang yang KEKURANGAN — lalu menyebutkan terus terang bila sisanya tidak
 * punya tempat tujuan.
 *
 * Itu bagian yang paling mudah disembunyikan dan paling perlu dikatakan: 31
 * jantan untuk 16 kandang tidak bisa dibereskan dengan memindah-mindahkan
 * saja. Entah kandangnya bertambah, entah jantannya berkurang.
 *
 * Jantan yang DIPERTAHANKAN dipilih dengan urutan: yang terbukti menurunkan
 * clutch di kebun ini, lalu yang bertanda `is_proven`, lalu yang paling tua.
 * Umur dipakai terakhir karena ia yang paling lemah sebagai bukti.
 */
export function usulanJantan(rekam, { clutchJantan = new Map(), umurJantan = new Map() } = {}) {
  const kandang = [...(rekam?.values?.() || [])];
  const berlebih = [];
  const kurang = [];

  for (const k of kandang) {
    if (k.jumlahJantan > 1) {
      const urut = [...k.jantan].sort((a, b) => {
        const ca = clutchJantan.get(a) || 0;
        const cb = clutchJantan.get(b) || 0;
        if (ca !== cb) return cb - ca;
        return (umurJantan.get(b) || 0) - (umurJantan.get(a) || 0);
      });
      berlebih.push({
        kandang: k.kandang,
        betina: k.betina,
        produktif: k.produktif,
        pertahankan: urut[0],
        clutchPertahankan: clutchJantan.get(urut[0]) || 0,
        pindahkan: urut.slice(1),
      });
    }
    if (k.jumlahJantan === 0 && k.betina > 0) {
      kurang.push({
        kandang: k.kandang,
        betina: k.betina,
        jantanMuda: k.jantanMuda,
        // Dibedakan: jantannya ada tapi belum cukup umur vs tidak ada sama sekali.
        // Yang pertama cuma perlu waktu, yang kedua perlu tindakan.
        alasan: (k.jantanMuda || []).length ? "jantannya belum cukup umur" : "tidak ada jantan sama sekali",
      });
    }
  }

  const jumlahBerlebih = berlebih.reduce((s, b) => s + b.pindahkan.length, 0);
  const jumlahKurang = kurang.length;
  return {
    berlebih: berlebih.sort((a, b) => b.betina - a.betina),
    kurang: kurang.sort((a, b) => b.betina - a.betina),
    jumlahBerlebih,
    jumlahKurang,
    // Berapa jantan yang, sesudah semua kandang kosong terisi, masih belum
    // punya tujuan. Nol berarti usulannya bisa dijalankan apa adanya.
    tanpaTujuan: Math.max(0, jumlahBerlebih - jumlahKurang),
  };
}

/**
 * Antrean perbaikan: betina belum bertelur, terurut yang paling perlu diurus.
 *
 * @param {Array}  baris  keluaran produksiBetina, sudah ditambah purchaseDate & sakit
 */
export function antreanPerbaikan(baris = [], { bulanAdaptasi = BULAN_ADAPTASI_BAWAAN, hariIni, umurMinimal = null } = {}) {
  const rekam = rekamKandang(baris);
  return (baris || [])
    .filter((r) => (r?.clutch || 0) === 0)
    .filter((r) => umurMinimal === null || (r?.umur ?? 0) >= umurMinimal)
    .map((r) => ({ ...r, diagnosa: diagnosaBetina(r, { kandang: rekam.get(r.kandang), bulanAdaptasi, hariIni }) }))
    .sort((a, b) => (b.diagnosa.prioritas - a.diagnosa.prioritas) || (b.umur ?? 0) - (a.umur ?? 0));
}

/** Umur jantan per nama, untuk memilih siapa yang dipertahankan. */
export function umurJantanPerNama(tortoises = [], hariIni) {
  const peta = new Map();
  for (const t of tortoises || []) {
    if (t?.gender !== "jantan" || !t?.name) continue;
    peta.set(t.name, umurTahun(t.birth_date, hariIni ? new Date(hariIni) : new Date()) ?? 0);
  }
  return peta;
}

/**
 * Berapa clutch yang tercatat untuk tiap jantan.
 *
 * HITUNGAN, bukan ada/tidak. Versi pertama mengembalikan Set: setiap jantan
 * yang pernah punya satu clutch setara dengan yang punya empat, dan yang
 * memutuskan lalu UMUR. Di kandang N hari ini keduanya kebetulan menunjuk
 * orang yang sama — A35 paling tua DAN paling banyak clutch-nya — jadi
 * hasilnya tidak berubah; yang berubah dasarnya. Begitu ada jantan muda yang
 * produktif bersama jantan tua yang tidak, aturan lama memindahkan yang
 * produktif keluar. Jumlah clutch bukti langsung; umur hanya kemungkinan.
 */
export function clutchPerJantan(breedings = []) {
  const peta = new Map();
  for (const b of breedings || []) {
    if (!b?.male_name || !b?.egg_laying_date) continue;
    peta.set(b.male_name, (peta.get(b.male_name) || 0) + 1);
  }
  return peta;
}
