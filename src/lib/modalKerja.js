import { hanyaDiPeternakan } from "@/lib/populasiKura";
import { kunciHarga } from "@/lib/hargaEstimasi";

/**
 * modalKerja.js — berapa yang SUDAH dikeluarkan untuk aset yang dipegang.
 *
 * ── Apa yang dijawabnya ─────────────────────────────────────────────────────
 *
 * Pemiliknya (18 Okt 2026) meminta kolom "modal kerja" di beranda, dan
 * menyebut isinya sendiri: "kura-kura, alat, kandang, dan vitamin".
 *
 * Tiga dari empat sudah punya tempat di data. Yang keempat tidak:
 * `Enclosure` tidak punya satu pun kolom biaya, jadi modal kandang disimpan
 * sebagai SATU angka di CompanySettings — pilihan pemiliknya, karena ia
 * memegangnya sebagai satu nilai dan memecahnya ke 20 kandang berarti 20
 * isian untuk angka yang sama.
 *
 * ── Kenapa kelengkapannya ikut dikembalikan ─────────────────────────────────
 *
 * Modal kerja hari ini dihitung dari data yang 67% lengkap: 44 kura tanpa
 * harga beli, 54 barang bergudang tanpa harga, dan kandang yang belum diisi.
 * Satu angka rupiah tanpa keterangan itu akan terbaca sebagai seluruh modal
 * peternakan, padahal ia sebagian. Jadi tiap bagian membawa pasangan
 * "berapa yang punya angka / berapa seluruhnya", dan layarnya menyebutkannya.
 *
 * ── Yang TIDAK dihitung di sini ─────────────────────────────────────────────
 *
 * Pakan. Ia habis dimakan, bukan aset yang dipegang — memasukkannya ke modal
 * kerja membuat angkanya naik-turun tiap kali rumput dipotong. Nilai stok
 * pakan tetap ada kartunya sendiri di beranda.
 */

const angka = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Barang gudang yang masih ada stoknya — hanya itu yang jadi modal. */
function barangBerstok(items = []) {
  return (items || []).filter((i) => i && angka(i.current_stock) > 0);
}

/**
 * Modal kerja dan kelengkapannya.
 *
 * @param {object[]} kura        daftar Tortoise
 * @param {object[]} warehouse   daftar WarehouseItem
 * @param {number|null} modalKandang  CompanySettings.modal_kandang_total
 */
export function modalKerja({ kura = [], warehouse = [], modalKandang = null } = {}) {
  const hidup = hanyaDiPeternakan(kura);

  /* Kura: harga beli yang TERCATAT. Yang kosong tidak dianggap nol — ia
     dihitung terpisah, karena nol berarti "gratis" dan kosong berarti
     "belum diketahui", dan keduanya mengubah angka modal dengan cara yang
     berlawanan. */
  let nilaiKura = 0, kuraBerharga = 0;
  for (const k of hidup) {
    const p = k?.purchase_price;
    if (p === null || p === undefined || p === "") continue;
    const n = Number(p);
    if (!Number.isFinite(n)) continue;
    nilaiKura += n;
    kuraBerharga += 1;
  }

  const stok = barangBerstok(warehouse);
  let nilaiBarang = 0, barangBerharga = 0;
  for (const b of stok) {
    const h = angka(b.purchase_price);
    nilaiBarang += angka(b.current_stock) * h;
    if (h > 0) barangBerharga += 1;
  }

  const adaKandang = modalKandang !== null && modalKandang !== undefined && modalKandang !== "";
  const nilaiKandang = adaKandang ? angka(modalKandang) : 0;

  const bagian = [
    { kunci: "kura",    label: "Kura",            nilai: nilaiKura,    ada: kuraBerharga,   dari: hidup.length },
    { kunci: "barang",  label: "Alat & vitamin",  nilai: nilaiBarang,  ada: barangBerharga, dari: stok.length },
    { kunci: "kandang", label: "Kandang",         nilai: nilaiKandang, ada: adaKandang ? 1 : 0, dari: 1 },
  ];

  const total = bagian.reduce((s, b) => s + b.nilai, 0);
  const adaSemua = bagian.reduce((s, b) => s + b.ada, 0);
  const dariSemua = bagian.reduce((s, b) => s + b.dari, 0);

  return {
    total,
    bagian: bagian.map((b) => ({ ...b, persen: total > 0 ? (b.nilai / total) * 100 : 0 })),
    /* Kelengkapan dihitung per BARIS yang punya angka, bukan per rupiah:
       rupiah tidak bisa mengukur apa yang belum diisi. */
    lengkapAda: adaSemua,
    lengkapDari: dariSemua,
    persenLengkap: dariSemua > 0 ? Math.round((adaSemua / dariSemua) * 100) : 0,
    kandangBelumDiisi: !adaKandang,
  };
}

/**
 * Estimasi total aset: nilai pasar kura + modal barang + modal kandang.
 *
 * Barang dan kandang dipakai pada NILAI MODALNYA, bukan nilai jualnya.
 * Cangkul bekas dan kandang terpakai tidak laku seharga belinya, dan tidak
 * ada yang mencatat berapa laku — memakai harga beli adalah perkiraan yang
 * terlalu tinggi, tetapi ia perkiraan yang bisa ditunjuk asalnya. Layarnya
 * mengatakan ini apa adanya alih-alih menyembunyikannya.
 */
export function totalAset({ asetKura, modal }) {
  const tetap = (modal?.bagian || [])
    .filter((b) => b.kunci !== "kura")
    .reduce((s, b) => s + b.nilai, 0);
  return {
    min: angka(asetKura?.min) + tetap,
    maks: angka(asetKura?.maks) + tetap,
    tetap,
    adaRentang: angka(asetKura?.ekorTernilai) > 0,
  };
}

/**
 * Selisih nilai yang BISA dibandingkan — hanya kura yang punya DUA angka.
 *
 * ── Kenapa bukan sekadar aset dikurangi modal ───────────────────────────────
 *
 * Pada 18 Okt 2026 estimasi nilai mencakup 135 ekor (seluruh kawanan sudah
 * berharga), sementara modal kura hanya tercatat untuk 91 — empat puluh empat
 * ekor belum ada harga belinya. Mengurangkan keduanya memberi selisih
 * Rp 636–991 juta, dan angka itu salah ke satu arah: ia menghitung nilai
 * empat puluh empat ekor tanpa menghitung biayanya.
 *
 * Kesalahan semacam ini tidak pernah terlihat sebagai kesalahan. Ia hanya
 * terbaca sebagai kabar baik.
 *
 * Jadi yang dibandingkan di sini hanya kura yang punya KEDUANYA: harga beli
 * yang tercatat DAN kelompok harga yang sudah diisi. Berapa ekor yang ikut
 * selalu dikembalikan bersama angkanya, supaya layarnya bisa menyebut atas
 * dasar berapa ekor selisih itu dihitung.
 */
export function selisihSebanding({ kura = [], harga = [] } = {}) {
  const pasar = new Map();
  for (const h of harga || []) {
    const k = String(h?.kunci || "");
    if (k) pasar.set(k, h);
  }

  let modal = 0, nilaiMin = 0, nilaiMaks = 0, ekor = 0;

  for (const k of hanyaDiPeternakan(kura)) {
    const beli = k?.purchase_price;
    if (beli === null || beli === undefined || beli === "") continue;
    const hargaBeli = Number(beli);
    if (!Number.isFinite(hargaBeli)) continue;

    const kunci = kunciHarga(k);
    if (!kunci) continue;
    const baris = pasar.get(kunci);
    const min = Number(baris?.harga_min);
    if (!Number.isFinite(min) || min < 0) continue;
    const maks = Number(baris?.harga_maks);

    modal += hargaBeli;
    nilaiMin += min;
    nilaiMaks += Number.isFinite(maks) && maks >= min ? maks : min;
    ekor += 1;
  }

  return {
    ekor,
    modal,
    nilaiMin,
    nilaiMaks,
    selisihMin: nilaiMin - modal,
    selisihMaks: nilaiMaks - modal,
  };
}
