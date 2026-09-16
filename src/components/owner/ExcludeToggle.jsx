import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * ExcludeToggle — keluarkan satu baris dari laporan tanpa menghapusnya.
 *
 * Ini cara koreksi baku di aplikasi ini: baris yang salah TIDAK dihapus,
 * hanya ditandai supaya angkanya tidak ikut dihitung. Barisnya tetap bisa
 * dilihat, alasannya tetap ada, dan bisa dikembalikan kapan saja lewat
 * widget Data Dikecualikan.
 *
 * 16 tabel mendukung penandaan ini, tapi tombolnya baru terpasang di
 * sebagian layar. Di layar yang belum, satu-satunya cara mengoreksi baris
 * yang salah adalah lewat pemilik aplikasi — yang berarti dalam praktiknya
 * baris itu tidak pernah dikoreksi.
 *
 * Props:
 *   record       — object entity dengan field id + excluded_from_reports
 *   entityName   — string, e.g. "FinanceTransaction", "Sale", "MeasurementHistory"
 *   queryKey     — array, untuk invalidate setelah update
 *   onToggled?   — callback opsional setelah berhasil toggle
 *   ringkas?     — true untuk bentuk ikon-saja (daftar yang padat)
 *
 * Gerbang role dipegang pemanggil.
 */
export default function ExcludeToggle({ record, entityName, queryKey, onToggled, ringkas = false }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const isExcluded = record?.excluded_from_reports === true;

  const handleToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    const newVal = !isExcluded;
    await base44.entities[entityName].update(record.id, { excluded_from_reports: newVal });
    if (queryKey) qc.invalidateQueries({ queryKey });
    if (onToggled) onToggled(newVal);
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
      {/*
        * Dulu lencananya berbunyi "TEST". Itu benar hanya untuk satu asal-usul
        * pengecualian — data uji coba. Penjualan yang dibatalkan, timbangan
        * yang salah ketik, dan pesanan hantu dari salah baca AI juga memakai
        * penanda yang sama, dan tak satu pun dari itu "test".
        */}
      {isExcluded && !ringkas && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-muted-foreground font-semibold border border-border">
          🚫 Dikecualikan
        </span>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={handleToggle}
        title={isExcluded ? "Klik untuk masukkan kembali ke laporan" : "Klik untuk keluarkan dari laporan"}
        className={`text-[10px] px-2 py-1 rounded-full font-medium border transition-all whitespace-nowrap ${
          isExcluded
            ? "bg-muted text-muted-foreground border-border hover:bg-gray-200"
            : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
        } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {loading ? "..." : isExcluded ? (ringkas ? "🚫" : "🚫 Tidak Masuk Laporan") : (ringkas ? "📊" : "📊 Masuk Laporan")}
      </button>
    </div>
  );
}