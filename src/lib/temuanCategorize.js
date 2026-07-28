/**
 * temuanCategorize — kategorisasi & deteksi pola berulang untuk temuan AI Vision.
 * Hanya membaca teks temuan yang sudah ada — tidak memanggil AI.
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
    color: "bg-gray-50 border-gray-200",
    badgeColor: "bg-gray-100 text-gray-500 border-gray-200",
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

/**
 * Kategorisasi temuan berdasarkan keyword matching.
 * Prioritas: kesehatan → kandang → tanaman → sarana → kualitas_foto.
 */
export function categorizeFinding(text) {
  const lower = (text || "").toLowerCase();
  if (!lower.trim()) return "kualitas_foto";

  for (const cat of ["kesehatan_kura", "kondisi_kandang", "tanaman_kolam", "sarana", "kualitas_foto"]) {
    for (const kw of KEYWORDS[cat]) {
      if (lower.includes(kw)) return cat;
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