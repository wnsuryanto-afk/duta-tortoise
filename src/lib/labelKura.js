/**
 * labelKura.js — nama yang DIBACA orang untuk kode yang disimpan data.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * 18 Okt 2026, saat beranda pemilik perlu menyebut spesies pada rincian aset,
 * peta `red_foot → "Red Foot"` sudah ada di TUJUH tempat terpisah:
 * SaleWizard, KuraDiamTab, TortoiseTerjualTab, HargaKuraPage, TortoiseForm,
 * TortoiseCard, TortoisePassport. Satu di antaranya sudah berbeda — daftar
 * di TortoiseTerjualTab kehilangan hermann, greek, dan indian_star, jadi
 * kura Hermann yang terjual tampil sebagai "hermann" apa adanya di satu
 * layar dan "Hermann" di layar sebelahnya.
 *
 * Menambahkan salinan kedelapan untuk beranda akan membuat keadaan itu lebih
 * buruk dengan cara yang sama persis: tidak terlihat sampai ada yang
 * membandingkan dua layar.
 *
 * Yang dipindahkan ke sini hanya peta nama MURNI. TortoiseForm menyimpan
 * daftar pilihan beserta nilainya, TortoiseCard menyimpan warna lencana, dan
 * TortoisePassport memakai nama panjang ("Sulcata (African Spurred)") —
 * ketiganya bukan peta nama, dan memaksanya ke sini akan menukar satu
 * duplikasi dengan satu fungsi serba bisa yang lebih sulit dibaca.
 */

export const LABEL_SPESIES = {
  sulcata: "Sulcata", red_foot: "Red Foot", leopard: "Leopard", aldabra: "Aldabra",
  russian: "Russian", hermann: "Hermann", greek: "Greek", indian_star: "Indian Star",
  lainnya: "Lainnya",
};

export const LABEL_MORPH = {
  normal: "Normal", albino: "Albino", ivory: "Ivory", hypo: "Hypo",
  het_albino: "Het Albino", het_caramel_albino: "Het Caramel Albino",
  het_hypo: "Het Hypo", het_ivory: "Het Ivory", double_het: "Double Het",
  caramel_albino: "Caramel Albino", piebald: "Piebald", mix: "Mix",
  unknown: "Tidak diketahui",
};

export const LABEL_KELAMIN = {
  jantan: "Jantan", betina: "Betina", belum_diketahui: "Belum diketahui",
};

export const LABEL_ASAL = { cb: "CB", wc: "WC", ltc: "LTC" };

/**
 * Nama baca untuk sebuah kode.
 *
 * Kode yang tidak dikenal dikembalikan APA ADANYA, bukan diganti "—" atau
 * "Lainnya": kalau data memuat spesies yang belum ada di peta ini, yang
 * menolong pembacanya adalah melihat kodenya, bukan melihatnya disamarkan.
 * Yang kosong betulan baru jadi "—".
 */
export const judulKura = (peta, kode) => peta[kode] || kode || "—";
