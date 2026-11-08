import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { BATAS_KELAMIN_CM } from "@/lib/kelaminKura";

/**
 * PanelKelaminDini — kura yang jenis kelaminnya tercatat sebelum ukurannya
 * memungkinkan.
 *
 * ── Kenapa ini bukan "data belum lengkap" ───────────────────────────────────
 *
 * Halaman tempatnya berdiri mendaftar data yang KURANG. Yang ini kebalikannya:
 * datanya terlalu banyak. Sebuah jawaban tersimpan di tempat yang pada saat
 * itu belum punya jawaban.
 *
 * Sulcata baru bisa dikelamini pada ±30 cm. Sampai 8 Nov 2026 aplikasi ini
 * memakai 20 cm — dan bukan hanya memperbolehkan, tetapi MENAGIH: saringan
 * "Data Belum Lengkap" menandai setiap kura di atas 20 cm yang kelaminnya
 * masih kosong. Dua dari enam kura ber-kelamin di bawah 30 cm berukuran
 * 20,5 cm dan 20,7 cm, persis di atas garis itu. Mereka diisi karena ditagih.
 *
 * ── Kenapa tidak dihapus otomatis ───────────────────────────────────────────
 *
 * Sebagian mungkin memang sudah diperiksa dokter, dan jenis kelamin menyambung
 * ke catatan perkawinan dan silsilah. Menghapus yang benar demi membersihkan
 * yang salah menukar satu kekeliruan dengan kekeliruan yang lebih sulit
 * ditemukan. Yang ditawarkan panel ini hanya daftarnya — orangnya yang
 * memutuskan.
 *
 * ── Kenapa ini layak ditampilkan sama sekali ────────────────────────────────
 *
 * Kolom itu memilih penerima obat. TreatmentPage menyusun daftar "Boost
 * Kalsium Betina (Musim Bertelur)" langsung dari `gender === "betina"`.
 * Selama satu kura 15 cm tercatat betina, ia ada di daftar itu.
 */
export default function PanelKelaminDini({ kura = [] }) {
  if (!kura.length) return null;

  return (
    <Card className="p-4 border-amber-300 bg-amber-50">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-amber-900 break-words">
            {kura.length} kura dikelamini sebelum ±{BATAS_KELAMIN_CM} cm
          </p>
          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
            Jenis kelaminnya tercatat saat cangkangnya masih di bawah ukuran yang bisa
            dibaca. Pastikan ulang — kolom ini yang dipakai memilih penerima vitamin
            dan kalsium khusus betina.
          </p>
          <div className="mt-3 space-y-2">
            {kura.map((t) => (
              <div key={t.id || t.code} className="flex items-start justify-between gap-2 flex-wrap bg-white/70 rounded-lg p-2.5 border border-amber-200">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground break-words">
                    {t.name || t.code} <span className="font-normal text-muted-foreground">· {t.gender === "jantan" ? "♂ jantan" : "♀ betina"}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground break-words">
                    {t.shell_length_cm ? `cangkang ${t.shell_length_cm} cm` : "cangkang belum diukur"}
                    {t.species && t.species !== "sulcata" ? ` · ${String(t.species).replace(/_/g, " ")}` : ""}
                  </p>
                </div>
                <Link
                  to={`/tortoise?edit=${t.id}`}
                  className="text-xs text-primary hover:underline flex-shrink-0 mt-0.5"
                >
                  Buka
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
