/**
 * ukuranLabel.js — SATU aturan "label sebesar ini isinya ditata bagaimana".
 *
 * ── Dua hal yang salah sebelum berkas ini ada ───────────────────────────────
 *
 * 1. **Pilihan ukuran hanya ada di satu layar.** Modal label Stok Pakan
 *    menawarkan tiga ukuran. Modal label Gudang — yang dipakai halaman
 *    Gudang dan tab Stok — tidak menawarkan apa pun: lebar 400 dan tinggi 240
 *    ditulis mati di dalam kode, dan kalimat petunjuknya menyebut "atur ukuran
 *    50×30mm" sebagai satu-satunya pilihan.
 *
 * 2. **Empat puluh persen label gudang kosong.** Isinya berakhir di piksel
 *    ke-144 dari 240: QR dipatok 108px, dan setiap baris teks memakai jarak
 *    tetap dari atas (`padY + 52`, `padY + 72`, `padY + 92`). Angka-angka itu
 *    kebetulan cocok untuk satu ukuran saja, dan menyisakan ruang menganga
 *    di bawahnya.
 *
 * Akar keduanya sama, dan lebih dalam dari sekadar kurang pilihan: **tata
 * letaknya diputuskan dari ID ukuran, bukan dari ukurannya.** Penggambar yang
 * lama penuh dengan `size.id === "30x15" ? 32 : 52`. Dengan bentuk seperti itu
 * menambah ukuran baru tidak menghasilkan tata letak baru — ukuran itu hanya
 * jatuh ke cabang `else` dan digambar memakai angka milik ukuran lain.
 *
 * Berkas ini menghitung semuanya dari milimeternya. Tidak ada satu pun
 * percabangan per ID di sini, jadi menambah ukuran di daftar bawah cukup untuk
 * membuatnya tertata benar.
 */

/**
 * Printer label termal di peternakan ini adalah Xprinter, dan 203 DPI adalah
 * resolusi yang dipakai hampir semua modelnya.
 *
 * Angka ini menentukan KETAJAMAN, bukan ukuran cetaknya: yang menentukan
 * ukuran adalah ukuran kertas yang diatur di aplikasi printernya. Kalau
 * modelnya ternyata 300 DPI, labelnya tetap keluar 50 × 30 mm — hanya saja
 * gambarnya diperbesar sedikit oleh aplikasinya dan hurufnya jadi kurang tajam.
 * Kalau itu terjadi, cukup ubah angka di bawah ini; seluruh tata letak ikut.
 */
export const DPI = 203;
export const PX_PER_MM = DPI / 25.4;

export function keP(mm) {
  return Math.round(mm * PX_PER_MM);
}

function batas(nilai, min, maks) {
  return Math.max(min, Math.min(maks, nilai));
}

/**
 * Ukuran stiker yang bisa dipilih.
 *
 * `untuk` bukan hiasan: yang memilih adalah orang yang sedang memegang
 * barangnya, dan "40 × 30 mm" tidak memberi tahu apa pun tentang apakah
 * ukuran itu muat di botol yang ada di tangannya.
 *
 * Urut dari kecil ke besar supaya sejajar dengan cara orang memilih —
 * melihat barangnya dulu, baru mencari ukuran yang sepadan.
 *
 * ── Kenapa cuma dua ────────────────────────────────────────────────────────
 *
 * Karena cuma dua gulungan itu yang ada di peternakan. Menawarkan ukuran yang
 * gulungannya tidak dipunyai bukan kemurahan hati: ia cuma jebakan salah cetak
 * — label yang sudah terlanjur keluar di gulungan yang salah tidak bisa
 * dikembalikan jadi stiker kosong.
 *
 * Menambahnya nanti cukup satu baris di sini. `rencanaLabel` tidak punya satu
 * pun percabangan per ID; ia menghitung dari milimeternya, jadi ukuran apa pun
 * yang ditambahkan langsung tertata benar tanpa menyentuh penggambarnya.
 */
export const UKURAN_LABEL = [
  { id: "30x15", mmW: 30, mmH: 15, label: "30 × 15 mm", untuk: "Ampul, botol kecil, sachet" },
  { id: "50x30", mmW: 50, mmH: 30, label: "50 × 30 mm", untuk: "Dus, jerigen, karung, alat" },
];

export const UKURAN_BAWAAN = "50x30";

export function cariUkuran(id) {
  return UKURAN_LABEL.find((u) => u.id === id) || UKURAN_LABEL.find((u) => u.id === UKURAN_BAWAAN);
}

/**
 * Rencana tata letak untuk satu ukuran.
 *
 * Semua angkanya diturunkan dari lebar dan tinggi dalam milimeter. Penggambar
 * tinggal mengikuti; ia tidak boleh punya pendapat sendiri tentang ukuran.
 *
 * Yang dikembalikan:
 *   stripH        tinggi strip kategori di atas
 *   qr            {ukuran, x, y} — QR sebesar mungkin yang muat
 *   teks          {x, y, w, h} — kolom teks di sebelah kanan QR
 *   font          ukuran huruf untuk nama / SKU / baris kecil
 *   muat          baris apa saja yang benar-benar muat
 *   jeda          jarak antar baris, dipakai untuk MENGISI sisa ruang
 *
 * `muat` dihitung, bukan ditetapkan per ukuran. Di label 30×15 mm tidak ada
 * gunanya memaksakan baris "Exp: ____" — yang tersisa hanya beberapa piksel
 * dan hasilnya tidak terbaca. Di label 60×40 mm justru sebaliknya: ruangnya
 * ada, jadi dipakai.
 */
export function rencanaLabel(mmW, mmH) {
  const w = keP(mmW);
  const h = keP(mmH);

  const pad = batas(Math.round(w * 0.025), 4, 10);
  const stripH = batas(Math.round(h * 0.13), 14, 34);

  const isiY = stripH + pad;
  const isiH = Math.max(0, h - isiY - pad);
  const isiW = Math.max(0, w - pad * 2);

  // QR sebesar mungkin: dibatasi tinggi isi, dan tidak boleh menelan lebih
  // dari 45% lebar supaya kolom teksnya masih berguna.
  const qrUkuran = Math.max(0, Math.min(isiH, Math.round(isiW * 0.45)));
  const jarakQr = batas(Math.round(w * 0.02), 4, 12);

  const teksX = pad + qrUkuran + jarakQr;
  const teksW = Math.max(0, w - teksX - pad);

  // Batas bawahnya adalah batas KETERBACAAN di kertas termal 203 DPI, bukan
  // angka yang dipilih supaya muat. Huruf 8px di sini ≈ 1 mm.
  const nNama = Math.round(h * 0.085);
  const nSku = Math.round(h * 0.06);
  const nKecil = Math.round(h * 0.05);
  const fNama = batas(nNama, 11, 22);
  const fSku = batas(nSku, 9, 15);
  const fKecil = batas(nKecil, 8, 13);

  // Bila ukuran huruf terpaksa DINAIKKAN ke batas bawah, labelnya memang
  // terlalu kecil untuk isi tambahan. Menjejalkannya tetap "muat" secara
  // hitungan, tetapi yang tercetak jadi tidak terbaca — dan label untuk
  // ampul justru dibuat supaya bisa dibaca sambil memegang ampulnya.
  const terlaluKecil = nKecil < 8 || nNama < 11;

  // Baris nama dirapatkan (1,25×) karena dua barisnya adalah SATU kalimat.
  // Jarak longgar dipakai hanya DI ANTARA bidang yang berbeda.
  const tNama = Math.round(fNama * 1.25);
  const tSku = Math.round(fSku * 1.4);
  const tKecil = Math.round(fKecil * 1.45);

  // Urutan di bawah ini adalah urutan KEPENTINGAN, dan itulah yang menentukan
  // apa yang dikorbankan lebih dulu saat labelnya mengecil: nama selalu ada,
  // SKU menyusul, baris kedua nama baru sesudahnya, lalu Exp, terakhir catatan.
  let sisa = isiH;
  let namaBaris = 1;
  sisa -= tNama;

  let sku = false;
  let exp = false;
  let catatan = false;

  if (sisa >= tSku) { sku = true; sisa -= tSku; }
  if (!terlaluKecil && sisa >= tNama) { namaBaris = 2; sisa -= tNama; }
  if (!terlaluKecil && sisa >= tKecil) { exp = true; sisa -= tKecil; }
  if (!terlaluKecil && sisa >= tKecil) { catatan = true; sisa -= tKecil; }

  // Sisa ruang dibagikan sebagai jarak antar BIDANG — nama, SKU, Exp, catatan.
  // Bukan antar baris: membagi rata ke semua baris membuat dua baris nama yang
  // sebenarnya satu kalimat terpisah sejauh jarak ke bidang lain, dan kalimatnya
  // jadi terbaca seperti dua hal yang tidak berhubungan.
  const jumlahBidang = 1 + (sku ? 1 : 0) + (exp ? 1 : 0) + (catatan ? 1 : 0);
  const jeda = jumlahBidang > 1
    ? batas(Math.floor(sisa / (jumlahBidang - 1)), 0, Math.round(fNama * 1.25))
    : 0;

  // Tinggi blok teks yang sesungguhnya, dipakai untuk menengahkannya terhadap
  // QR. Sisa yang tidak terpakai dibagi rata atas-bawah, bukan ditumpuk di
  // bawah sebagai pita kosong.
  const tinggiTeks =
    namaBaris * tNama +
    (sku ? tSku : 0) +
    (exp ? tKecil : 0) +
    (catatan ? tKecil : 0) +
    Math.max(0, jumlahBidang - 1) * jeda;

  return {
    w,
    h,
    pad,
    stripH,
    isi: { x: pad, y: isiY, w: isiW, h: isiH },
    qr: {
      ukuran: qrUkuran,
      x: pad,
      y: isiY + Math.max(0, Math.round((isiH - qrUkuran) / 2)),
    },
    teks: {
      x: teksX,
      y: isiY + Math.max(0, Math.round((isiH - tinggiTeks) / 2)),
      w: teksW,
      h: isiH,
    },
    tinggiTeks,
    font: { nama: fNama, sku: fSku, kecil: fKecil },
    tinggiBaris: { nama: tNama, sku: tSku, kecil: tKecil },
    muat: { namaBaris, sku, exp, catatan },
    terlaluKecil,
    jeda,
  };
}

/** Berapa persen area isi yang benar-benar dipakai QR atau teks. */
export function persenTerpakai(rencana) {
  const r = rencana;
  const isiTerpakai = Math.max(r.qr.ukuran, r.tinggiTeks);
  return Math.round((isiTerpakai / r.isi.h) * 100);
}

/**
 * Pita kosong terlebar, sebagai persen tinggi label.
 *
 * Inilah ukuran yang sesungguhnya dikeluhkan: label lama menyisakan 96 piksel
 * menganga di bawah kanvas setinggi 240 — empat puluh persen. Sejak isinya
 * ditengahkan, sisa ruang terbagi atas dan bawah, jadi yang perlu dijaga
 * adalah lebar salah satu pita itu, bukan jarak isi dari tepi atas.
 *
 * Dipakai pengujian supaya kekosongan itu tidak bisa kembali diam-diam saat
 * seseorang mengubah angka di berkas ini.
 */
export function pitaKosong(rencana) {
  const r = rencana;
  const isiTerpakai = Math.max(r.qr.ukuran, r.tinggiTeks);
  const sisa = Math.max(0, r.isi.h - isiTerpakai);
  return Math.round(((sisa / 2 + r.pad) / r.h) * 100);
}
