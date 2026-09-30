/**
 * temuanCategorize — kategorisasi & deteksi pola berulang untuk temuan AI Vision.
 * Hanya membaca teks temuan yang sudah ada — tidak memanggil AI.
 *
 * ── Kenapa ada `tidakAdaTemuan` dan penjaga penyangkalan ───────────
 *
 * Prompt AI meminta: "Catat temuan penting untuk owner — kosongkan jika
 * tidak ada." Modelnya tidak mengosongkannya. Ia menulis kalimat yang
 * BERBUNYI "tidak ada temuan".
 *
 * Diukur atas 156 temuan nyata di DailyChecklist pada 30-09-2026:
 *
 *     63 dari 156 (40%) berbunyi "tidak ada temuan"
 *     — semuanya tetap tampil sebagai kartu temuan di layar pemilik.
 *
 * Dan pencocokan kata kunci di bawah membaca kata tanpa melihat kata
 * "tidak" di depannya. Dari 63 kalimat "tidak ada temuan" itu, 11 diberi
 * kategori MASALAH SUNGGUHAN — lima di antaranya masuk 🐢 Kesehatan Kura,
 * kategori paling merah dan paling atas:
 *
 *     "tidak terlihat ada luka atau lendir"       -> 🐢 Kesehatan Kura
 *     "tidak ada yang terlihat lemas"             -> 🐢 Kesehatan Kura
 *     "tidak ada kendala kesehatan tanaman"       -> 🌿 Tanaman & Kolam
 *
 * Penyangkalannya yang dibaca sebagai masalahnya. Kalimat yang berkata
 * "tidak ada luka" diarsipkan sebagai temuan luka.
 *
 * Akibatnya bukan sekadar berisik. Layar Temuan dari Foto ada supaya
 * pemilik bisa melihat apa yang perlu ditangani; ketika 40% kartunya
 * berbunyi "semuanya baik" dan sebagiannya lagi berwarna merah karena
 * salah baca, temuan sungguhan — "posisi kura masih di luar area
 * rendaman, prosedur memandikan belum selesai" — tenggelam di antaranya.
 */

export const CATEGORIES = {
  kesehatan_kura: {
    label: "🐢 Kesehatan Kura",
    icon: "🐢",
    color: "bg-red-50 border-red-200",
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    priority: 1,
  },
  kondisi_kandang: {
    label: "🏠 Kondisi Kandang",
    icon: "🏠",
    color: "bg-amber-50 border-amber-200",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    priority: 2,
  },
  tanaman_kolam: {
    label: "🌿 Tanaman & Kolam",
    icon: "🌿",
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-700 border-green-200",
    priority: 3,
  },
  sarana: {
    label: "🔧 Sarana",
    icon: "🔧",
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    priority: 4,
  },
  kualitas_foto: {
    label: "📸 Kualitas Foto",
    icon: "📸",
    color: "bg-muted border-border",
    badgeColor: "bg-muted text-muted-foreground border-border",
    priority: 5,
  },
};

const KEYWORDS = {
  kesehatan_kura: [
    "menjauh", "lesu", "kurus", "luka", "berlendir", "terbalik",
    "piramida", "kotoran cair", "sakit", "tidak aktif", "malas",
    "bengkak", "berair", "nafas", "napas", "hidung", "lemas",
    "anoreksia", "tidak makan", "dehidrasi", "berdarah", "tungau",
    "kutu", "cangkang", "mata bengkak", "baby terbalik", "busuk",
    "kura lesu", "kura kurus", "infeksi", "jamur",
  ],
  kondisi_kandang: [
    "becek", "tempat minum", "kosong", "keruh", "sisa pakan",
    "menumpuk", "shelter", "rusak", "kotor", "kandang",
    "lantai basah", "basah",
  ],
  tanaman_kolam: [
    "azolla", "menguning", "air keruh", "tanaman", "layu", "hama",
    "kaktus", "batang", "kolam", "enceng gondok", "ganggang",
    "terlalu habis",
  ],
  sarana: [
    "alat rusak", "selang", "bocor", "kran", "pagar", "pintu",
    "atap", "selang bocor", "kran bocor",
  ],
  kualitas_foto: [
    "foto", "dekat", "buram", "gelap", "jelas", "jauh", "fokus",
    "angle", "sudut", "kualitas", "resolusi", "terlalu dekat",
    "kurang jelas", "tidak jelas",
  ],
};

/*
 * Kata yang membatalkan kata kunci sesudahnya di dalam anak kalimat yang
 * sama. "tak" sengaja TIDAK dimasukkan sebagai kata utuh terpisah karena
 * ia juga awalan kata lain; "tidak" sudah menangkap hampir semuanya.
 */
const PENYANGKALAN = /\b(tidak|tanpa|belum|bukan|nggak|ngga|gak)\b/;

/*
 * Kalimat yang menyatakan TIDAK ADA temuan. Dikumpulkan dari bunyi asli
 * yang benar-benar ditulis model di data peternakan ini, bukan dikarang:
 * "Tidak ada temuan penting", "Tidak ada temuan khusus", "Tidak ada
 * temuan negatif", "Tidak ada masalah", "tidak ditemukan adanya tanda",
 * "Tidak ada temuan yang mendesak".
 */
const TIDAK_ADA = new RegExp(
  [
    "tidak ada (temuan|kendala|masalah|indikasi|hal|tanda)",
    "tidak ditemukan",
    "tidak terlihat (ada|adanya)",
    "tidak ada yang (perlu|mendesak|mengkhawatirkan)",
    "semua(nya)? (terlihat|tampak|dalam kondisi) (baik|sehat|bagus|normal|aman)",
    "\\bnihil\\b",
  ].join("|"),
  "i",
);

/**
 * Apakah teks temuan ini sebenarnya berkata "tidak ada temuan"?
 *
 * Dipakai layar Temuan dari Foto untuk memisahkan kartu yang perlu
 * ditindaklanjuti dari laporan aman. Yang aman TIDAK dibuang diam-diam —
 * jumlahnya tetap ditampilkan, hanya tidak lagi berdiri sebagai kartu
 * setara temuan sungguhan.
 */
export function tidakAdaTemuan(text) {
  const t = (text || "").trim();
  if (!t) return true;
  return TIDAK_ADA.test(t);
}

/*
 * Pecah jadi anak kalimat, di titik/titik koma dan di kata sambung yang
 * MEMBALIK arah ("namun", "tetapi", "hanya saja", "walau").
 *
 * Sengaja TIDAK dipecah di koma. Penyangkalan dalam bahasa Indonesia
 * membawa ke seluruh daftar sesudahnya: "tidak terlihat ada luka, lendir,
 * atau bengkak" — kalau dipecah di koma, "lendir" dan "bengkak" berdiri
 * tanpa kata "tidak"-nya dan kalimat itu jadi terbaca sebagai temuan
 * lendir dan bengkak. Justru itu bentuk yang paling sering ditulis model.
 *
 * Yang tetap harus terpisah adalah pembalikan arah, karena di situlah
 * temuan sungguhan biasanya muncul: "Kura sehat, namun air rendaman
 * terlalu dangkal" — bagian kedua tidak boleh ikut dibatalkan.
 */
function anakKalimat(lower) {
  return lower.split(/[.;]|\bnamun\b|\btetapi\b|\bhanya saja\b|\bwalau\b|\bsayangnya\b/);
}

/**
 * Kategorisasi temuan berdasarkan keyword matching.
 * Prioritas: kesehatan → kandang → tanaman → sarana → kualitas_foto.
 *
 * Kata kunci di dalam anak kalimat yang disangkal TIDAK dihitung — lihat
 * catatan di kepala berkas ini.
 */
export function categorizeFinding(text) {
  const lower = (text || "").toLowerCase();
  if (!lower.trim()) return "kualitas_foto";

  const bagian = anakKalimat(lower).filter((b) => b.trim() && !PENYANGKALAN.test(b));

  for (const cat of ["kesehatan_kura", "kondisi_kandang", "tanaman_kolam", "sarana", "kualitas_foto"]) {
    for (const kw of KEYWORDS[cat]) {
      if (bagian.some((b) => b.includes(kw))) return cat;
    }
  }
  return "kualitas_foto";
}

/**
 * Ekstrak "tema" temuan untuk deteksi pola berulang.
 * Mengambil 4 kata signifikan pertama (lowercase, tanpa punctuation).
 */
export function getTheme(text) {
  const lower = (text || "").toLowerCase().replace(/[^\w\s]/g, " ").trim();
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 4).join(" ");
}

/**
 * Deteksi temuan berulang: tema yang muncul >= 3 kali dalam daftar.
 * Mengembalikan Set berisi finding_key yang termasuk pola berulang.
 */
export function detectRecurring(findings) {
  const themeGroups = {};
  findings.forEach(f => {
    const theme = getTheme(f.finding_text);
    if (!theme) return;
    if (!themeGroups[theme]) themeGroups[theme] = [];
    themeGroups[theme].push(f.finding_key);
  });

  const recurring = new Set();
  Object.values(themeGroups).forEach(keys => {
    if (keys.length >= 3) keys.forEach(k => recurring.add(k));
  });
  return recurring;
}