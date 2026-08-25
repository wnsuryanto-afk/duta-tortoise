/**
 * Pembungkus kartu widget di layar Guided. Kecil dan tanpa state —
 * dipisahkan agar setiap widget bisa memakainya tanpa mengimpor berkas
 * layar utama yang besar.
 */

/** Kartu widget. Berubah hijau saat seluruh isinya sudah selesai. */
export default function Widget({ children, done = false, className = "" }) {
  return (
    <div
      className={`rounded-2xl border-2 transition-all ${
        done ? "border-green-300 bg-green-50" : "border-gray-100 bg-white"
      } shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
