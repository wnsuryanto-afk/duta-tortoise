import { pitaUkuran, labelPita } from "@/lib/pitaUkuran";
import { hanyaDiPeternakan } from "@/lib/populasiKura";

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
 * ── Siapa yang jadi aset ────────────────────────────────────────────────────
 *
 * Yang dihitung adalah kura yang MASIH DI PETERNAKAN, dan definisinya diambil
 * dari lib/populasiKura.js — bukan ditulis ulang di sini. Berkas itu ada
 * justru karena pertanyaan "berapa kura yang ada" pernah dijawab berbeda di
 * lima tempat. Salinan keenam yang hari ini kebetulan sama persis akan
 * berpisah pada perubahan skema berikutnya, dan selisihnya hanya terlihat
 * kalau ada yang membandingkan dua angka di beranda baris demi baris.
 *
 * ── Yang TIDAK dilakukan di sini ────────────────────────────────────────────
 *
 * Tidak ada tebakan. Kura yang kelompoknya belum berharga tidak dinilai nol
 * dan tidak dinilai dengan harga kelompok terdekat — ia dihitung terpisah
 * sebagai "belum ternilai", dan jumlahnya selalu ikut dilaporkan. Nilai aset
 * yang terlihat utuh padahal separuh kawanannya tidak dihargai adalah angka
 * yang lebih berbahaya daripada tidak ada angka sama sekali.
 */


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

  for (const k of hanyaDiPeternakan(kura)) {
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

/**
 * Baris ber-asal "?" yang KEMBAR dengan baris lain — bedanya cuma asalnya.
 *
 * ── Kenapa ini perlu ditunjukkan ────────────────────────────────────────────
 *
 * Ditemukan 18 Okt 2026 saat pustaka ini dijalankan terhadap kawanan yang
 * sebenarnya untuk pertama kali. 36 kura belum punya asal_genetik, dan
 * karena "belum diketahui" adalah kelompok tersendiri (memang harus —
 * kosong bukan cb), mereka membentuk barisnya sendiri. Delapan di antaranya
 * berdampingan dengan baris yang isinya sama persis kecuali asalnya:
 *
 *     55–60 cm jantan · asal?  4 ekor
 *     55–60 cm jantan · WC     4 ekor
 *
 * Yang mengisi harus memberi harga pada keduanya, untuk hal yang sama.
 * Begitu ke-36 kura itu ditentukan asalnya, pasangan ini menyatu sendiri
 * dan 45 baris turun jadi 37.
 *
 * Jadi yang benar bukan menggabungkan paksa — itu akan menghargai kura yang
 * asalnya belum diketahui sebagai WC tanpa ada yang memutuskannya. Yang
 * benar adalah MENGATAKANNYA, supaya yang mengisi tahu pekerjaan ini bisa
 * mengecil dulu sebelum dimulai.
 */
export function barisKembarAsal(baris = []) {
  const tanpaAsal = (b) => [b.species, b.morph, b.pitaMin, b.gender, b.proven].join("|");
  const sudahBerasal = new Set((baris || []).filter((b) => b.asal).map(tanpaAsal));
  return (baris || []).filter((b) => !b.asal && sudahBerasal.has(tanpaAsal(b)));
}

/** Umur sebuah harga dalam hari — dasar peringatan "harga ini sudah lama". */
export const HARI_HARGA_BASI = 180;

export function hargaBasi(diperbarui, hariIni = new Date()) {
  const t = Date.parse(`${teks(diperbarui)}T00:00:00Z`);
  if (!Number.isFinite(t)) return false;
  const selisih = Math.round((hariIni.getTime() - t) / 86400000);
  return selisih > HARI_HARGA_BASI;
}

/**
 * Nilai aset dipecah per kelompok — "siapa yang memegang nilainya".
 *
 * ── Kenapa ini diminta ──────────────────────────────────────────────────────
 *
 * Pemiliknya (18 Okt 2026): "apakah estimasi aset yang ada saat ini bisa
 * ditampilkan? Mungkin bisa dibuat lebih detail di dashboard."
 *
 * Satu rentang Rp 1,27–1,63 miliar tidak bisa ditindaklanjuti. Yang bisa
 * adalah mengetahui bahwa 3 ekor Aldabra memegang 15,9% dari nilai itu
 * sementara 130 Sulcata memegang 83,4% — karena kedua angka itu menuntun ke
 * keputusan yang berbeda tentang kandang mana yang paling perlu dijaga.
 *
 * ── Persentase dihitung dari BATAS BAWAH ────────────────────────────────────
 *
 * Bukan dari rata-rata atau batas atas. Batas bawah adalah satu-satunya
 * angka dalam rentang ini yang tidak bergantung pada seberapa berani yang
 * mengisi harganya: kelompok yang rentangnya lebar akan tampak lebih besar
 * porsinya kalau diukur dari batas atas, padahal yang berubah cuma
 * ketidakpastiannya.
 *
 * Baris yang BELUM berharga tidak ikut — ia tidak punya nilai untuk
 * dibagikan, dan memasukkannya sebagai nol akan membuat porsi kelompok lain
 * terlihat lebih besar daripada yang sebenarnya diketahui.
 */
export function komposisiNilai(baris = [], ambil = (b) => b.species) {
  const per = new Map();
  for (const b of baris || []) {
    if (!b?.terisi) continue;
    const k = teks(ambil(b)) || "lainnya";
    if (!per.has(k)) per.set(k, { kunci: k, min: 0, maks: 0, ekor: 0 });
    const e = per.get(k);
    e.min += b.hargaMin * b.ekor;
    e.maks += (b.hargaMaks ?? b.hargaMin) * b.ekor;
    e.ekor += b.ekor;
  }
  const totalMin = [...per.values()].reduce((s, e) => s + e.min, 0);
  return [...per.values()]
    .map((e) => ({ ...e, persen: totalMin > 0 ? (e.min / totalMin) * 100 : 0 }))
    .sort((a, b) => b.min - a.min || a.kunci.localeCompare(b.kunci));
}

/**
 * Kelompok harga yang memegang nilai terbesar, teratas lebih dulu.
 *
 * Diurutkan dari NILAI, bukan dari jumlah ekor seperti `barisHarga` —
 * keduanya pertanyaan yang berbeda. Layar isian mengurutkan dari ekor karena
 * mengisi dari situ memberi cakupan tercepat; beranda mengurutkan dari nilai
 * karena yang ditanyakan di sana adalah di mana uangnya.
 */
export function kelompokTeratas(baris = [], batas = 5) {
  return (baris || [])
    .filter((b) => b.terisi)
    .map((b) => ({ ...b, nilaiMin: b.hargaMin * b.ekor, nilaiMaks: (b.hargaMaks ?? b.hargaMin) * b.ekor }))
    .sort((a, b) => b.nilaiMin - a.nilaiMin || a.kunci.localeCompare(b.kunci))
    .slice(0, Math.max(0, batas));
}
