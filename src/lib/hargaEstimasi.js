import { pitaUkuran, labelPita } from "@/lib/pitaUkuran";

/**
 * hargaEstimasi.js — perkiraan harga jual seekor kura, dan nilai aset kawanan.
 *
 * ── Apa yang dijawabnya ─────────────────────────────────────────────────────
 *
 * Pemiliknya (18 Okt 2026) meminta kolom "estimasi total aset" di beranda,
 * dan untuk itu perlu perkiraan harga jual sekarang. Harga itu TIDAK diisi
 * per ekor — 135 baris yang harus disentuh satu per satu tiap kali pasar
 * bergerak tidak akan pernah terisi. Ia diisi per KELOMPOK, dan tiap kura
 * menemukan kelompoknya sendiri dari data yang sudah ada.
 *
 * ── Lima hal yang menentukan harga, menurut pemiliknya ──────────────────────
 *
 *   spesies · morph · pita ukuran · jantan/betina · proven · cb/wc
 *
 * Kelima-limanya disebut sendiri olehnya: "yang jantan dan betina harga
 * estimasinya juga berbeda, proven juga berbeda, kalau untuk indukan CB dan
 * WC juga berbeda harganya".
 *
 * Yang menolong: kombinasi itu TIDAK meledak. Kawanan 135 ekor hanya
 * menghasilkan 45 baris, karena kura menumpuk di sedikit ukuran — dan baris
 * hanya dibuat untuk kombinasi yang benar-benar dimiliki, bukan untuk seluruh
 * perkalian yang mungkin (yang akan berjumlah ribuan dan sebagian besar
 * kosong selamanya).
 *
 * ── Kenapa rentang, bukan satu angka ────────────────────────────────────────
 *
 * "Yang diperlukan adalah rentang." Harga pasar memang bukan satu angka, dan
 * satu angka tunggal akan terbaca sebagai kepastian yang tidak dimiliki
 * siapa pun. Jadi tiap baris memuat harga terendah dan tertinggi, dan nilai
 * aset kawanan ikut berupa rentang.
 *
 * ── Yang TIDAK dilakukan di sini ────────────────────────────────────────────
 *
 * Tidak ada tebakan. Kura yang kelompoknya belum berharga tidak dinilai nol
 * dan tidak dinilai dengan harga kelompok terdekat — ia dihitung terpisah
 * sebagai "belum ternilai", dan jumlahnya selalu ikut dilaporkan. Nilai aset
 * yang terlihat utuh padahal separuh kawanannya tidak dihargai adalah angka
 * yang lebih berbahaya daripada tidak ada angka sama sekali.
 */

/** Kura yang tidak lagi jadi aset: sudah dijual, mati, atau diarsipkan. */
const STATUS_BUKAN_ASET = ["mati", "terjual", "diarsipkan"];

/** Hanya kura yang masih dipelihara yang menjadi aset. */
export function kuraAset(daftar = []) {
  return (daftar || []).filter(
    (k) => k && !k.is_archived && !STATUS_BUKAN_ASET.includes(k.status),
  );
}

const teks = (v) => String(v ?? "").trim();

/**
 * Kunci kelompok harga untuk seekor kura.
 *
 * Bentuknya sengaja satu string, bukan objek: ia dipakai sebagai kunci Map,
 * disimpan di entity HargaKura, dan dibandingkan apa adanya. Dua tempat yang
 * menyusun kunci dengan aturan sedikit berbeda akan membuat baris harga yang
 * tidak pernah ketemu kuranya — jadi hanya ada SATU fungsi yang menyusunnya.
 *
 * `null` bila panjang cangkangnya tidak diketahui: tanpa ukuran, kura tidak
 * punya pita, dan memaksakannya ke pita mana pun adalah mengarang.
 */
export function kunciHarga(kura) {
  if (!kura) return null;
  const pita = pitaUkuran(kura.shell_length_cm);
  if (!pita) return null;
  return [
    teks(kura.species) || "sulcata",
    teks(kura.morph) || "normal",
    pita.min,
    teks(kura.gender) || "belum_diketahui",
    kura.is_proven ? "proven" : "-",
    teks(kura.asal_genetik) || "?",
  ].join("|");
}

/** Pecah kunci kembali jadi bagiannya, untuk ditampilkan. */
export function bacaKunci(kunci) {
  const [species, morph, min, gender, proven, asal] = teks(kunci).split("|");
  return {
    species, morph, gender,
    pitaMin: Number(min),
    pitaLabel: labelPita(Number(min)),
    proven: proven === "proven",
    asal: asal === "?" ? "" : asal,
  };
}

/**
 * Baris harga yang DIBUTUHKAN kawanan ini, lengkap dengan harga yang sudah
 * diisi bila ada.
 *
 * Baris lahir dari kura, bukan dari daftar kemungkinan. Begitu ada kura baru
 * dengan morph atau ukuran yang belum ada barisnya, barisnya muncul sendiri
 * dengan harga kosong — dan karena ia kosong, ia ikut terhitung sebagai
 * "belum ternilai" alih-alih diam-diam memakai harga baris lain.
 *
 * Diurutkan dari yang paling banyak ekornya: mengisi dari atas memberi
 * cakupan tercepat, dan itulah urutan yang paling masuk akal untuk layar
 * isian.
 */
export function barisHarga({ kura = [], harga = [] } = {}) {
  const pasar = new Map();
  for (const h of harga || []) {
    if (h && teks(h.kunci)) pasar.set(teks(h.kunci), h);
  }

  const per = new Map();
  let tanpaUkuran = 0;

  for (const k of kuraAset(kura)) {
    const kunci = kunciHarga(k);
    if (!kunci) { tanpaUkuran += 1; continue; }
    if (!per.has(kunci)) {
      per.set(kunci, { kunci, ...bacaKunci(kunci), ekor: 0, kode: [], harga: pasar.get(kunci) || null });
    }
    const e = per.get(kunci);
    e.ekor += 1;
    e.kode.push(k.code || k.name || "");
  }

  const baris = [...per.values()]
    .map((b) => {
      const min = Number(b.harga?.harga_min);
      const maks = Number(b.harga?.harga_maks);
      const adaMin = Number.isFinite(min) && min >= 0;
      const adaMaks = Number.isFinite(maks) && maks >= 0;
      return {
        ...b,
        hargaMin: adaMin ? min : null,
        hargaMaks: adaMaks ? maks : adaMin ? min : null,
        terisi: adaMin,
        diperbarui: b.harga?.diperbarui || "",
      };
    })
    .sort((a, b) => b.ekor - a.ekor || a.kunci.localeCompare(b.kunci));

  return { baris, tanpaUkuran };
}

/**
 * Nilai aset kawanan, sebagai rentang.
 *
 * Yang dikembalikan sengaja memuat tiga angka sekaligus — terendah,
 * tertinggi, dan BERAPA EKOR yang ikut terhitung. Tanpa yang ketiga, rentang
 * Rp 1,2–1,6 miliar dari 40 ekor terlihat persis sama dengan rentang yang
 * sama dari 135 ekor, dan pembacanya tidak punya cara tahu bedanya.
 */
export function nilaiAsetKura({ kura = [], harga = [] } = {}) {
  const { baris, tanpaUkuran } = barisHarga({ kura, harga });

  let min = 0, maks = 0, ekorTernilai = 0, ekorBelum = 0;
  const barisKosong = [];

  for (const b of baris) {
    if (b.terisi) {
      min += b.hargaMin * b.ekor;
      maks += (b.hargaMaks ?? b.hargaMin) * b.ekor;
      ekorTernilai += b.ekor;
    } else {
      ekorBelum += b.ekor;
      barisKosong.push(b);
    }
  }

  const total = ekorTernilai + ekorBelum + tanpaUkuran;
  return {
    min, maks,
    ekorTernilai,
    ekorBelum,
    tanpaUkuran,
    totalEkor: total,
    persenTernilai: total > 0 ? Math.round((ekorTernilai / total) * 100) : 0,
    baris,
    barisKosong,
  };
}

/** Umur sebuah harga dalam hari — dasar peringatan "harga ini sudah lama". */
export const HARI_HARGA_BASI = 180;

export function hargaBasi(diperbarui, hariIni = new Date()) {
  const t = Date.parse(`${teks(diperbarui)}T00:00:00Z`);
  if (!Number.isFinite(t)) return false;
  const selisih = Math.round((hariIni.getTime() - t) / 86400000);
  return selisih > HARI_HARGA_BASI;
}
