/**
 * careIconUtils — Ikon otomatis berdasarkan kata kunci.
 * Dipakai bersama oleh DiagnosisProtocolPanel & CareTaskSuggestionPanel.
 */

// Ikon otomatis berdasarkan kata kunci di teks perawatan_pendukung
export function getCareIcon(text = "") {
  const t = text.toLowerCase();
  if (t.includes("rendam")) return "🛁";
  if (t.includes("jemur") || t.includes("matahari") || t.includes("uv")) return "☀️";
  if (t.includes("suhu") || t.includes("hangat") || t.includes("°c")) return "🌡️";
  if (t.includes("pakan") || t.includes("rumput") || t.includes("makan") || t.includes("diet")) return "🥬";
  if (t.includes("air minum") || t.includes("hidrasi") || t.includes("minum")) return "💧";
  if (t.includes("isolasi") || t.includes("pisah")) return "🚧";
  if (t.includes("bersih") || t.includes("kandang") || t.includes("substrat")) return "🧹";
  if (t.includes("periksa") || t.includes("cek") || t.includes("pantau")) return "🔍";
  return "✅";
}

// Ikon rute pemberian obat
export function getRouteIcon(rute = "") {
  const r = (rute || "").toLowerCase();
  if (r.includes("oral")) return "💊";
  if (r.includes("im") || r.includes("sc") || r.includes("injeksi")) return "💉";
  if (r.includes("topikal")) return "🧴";
  if (r.includes("mata")) return "👁️";
  return "💊";
}

// Konfigurasi warna + emoji untuk badge severity
export function getSeverityConfig(severity) {
  const map = {
    ringan: { label: "Ringan", bg: "bg-green-100", text: "text-green-700", border: "border-green-300", emoji: "🟢" },
    sedang: { label: "Sedang", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", emoji: "🟡" },
    berat:  { label: "Berat",  bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", emoji: "🟠" },
    kritis: { label: "Kritis", bg: "bg-red-100", text: "text-red-700", border: "border-red-300", emoji: "🔴" },
  };
  return map[severity] || map.ringan;
}