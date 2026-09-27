import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { SEBAB_POTONG, periksaAlasanPotong } from "@/lib/persetujuanPoin";

/**
 * AlasanPotongPoin — muncul hanya ketika poin yang akan disetujui lebih kecil
 * dari yang diklaim.
 *
 * Sebelum ini, memotong 196 dari 206 poin lewat tombol "Setujui" tidak
 * meminta apa pun. Yang diminta alasan hanyalah "Tolak" — padahal bagi yang
 * menerima, dipotong 196 poin dan ditolak seluruhnya hampir sama saja.
 *
 * Bentuknya sengaja dua bagian: sebab baku yang bisa dihitung, dan kalimat
 * yang dibaca orangnya. Sebab baku saja tidak cukup ("Kualitas kurang" tidak
 * memberi tahu apa yang kurang); kalimat saja tidak bisa dihitung, sehingga
 * pola seperti "fotonya selalu ditolak" tidak akan pernah terlihat.
 */
export default function AlasanPotongPoin({
  checklist,
  akanDisetujui,
  kode,
  teks,
  onKode,
  onTeks,
  judul = "Poin dipotong — tulis alasannya",
}) {
  const klaim = Number(checklist?.total_points_claimed || 0);
  const setuju = Number(akanDisetujui || 0);
  const selisih = klaim - setuju;
  const { sah, kurang } = periksaAlasanPotong({ checklist, akanDisetujui, kode, teks });

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">{judul}</p>
          <p className="text-xs text-amber-800 mt-0.5">
            {klaim} diklaim, {setuju} disetujui —{" "}
            <strong>{selisih} poin hangus</strong>. Alasannya akan terbaca oleh yang
            bersangkutan di checklist hari itu.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SEBAB_POTONG.map((s) => (
          <button
            key={s.kode}
            type="button"
            onClick={() => onKode(s.kode)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              kode === s.kode
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Textarea
        value={teks || ""}
        onChange={(e) => onTeks(e.target.value)}
        rows={2}
        placeholder="Mis. foto kandang W3 tidak terlihat, yang terfoto hanya pintunya"
        className="resize-none bg-white text-sm"
      />

      <p className={`text-xs ${sah ? "text-green-700" : "text-amber-800"}`}>
        {sah ? "Alasan sudah cukup — tombol Setujui terbuka." : kurang}
      </p>
    </div>
  );
}
