/**
 * PanduanPakanPage — referensi pakan, bukan layar kerja.
 *
 * Diukur 9 Okt 2026 di lebar telepon: 3.382 huruf, 3,5 layar penuh. Tetapi
 * halaman ini BERBEDA dari halaman panjang lainnya: tulisannya bukan
 * penjelasan yang menumpuk di sekitar angka, tulisannya ADALAH isinya. Daftar
 * rumput yang boleh diberikan tidak bisa dipendekkan tanpa menghapus
 * jawabannya.
 *
 * Jadi yang diperbaiki bukan panjangnya, melainkan CARA MENCAPAINYA: lima
 * bagian sekarang bisa ditutup, dan halaman terbuka sebagai daftar isi lima
 * baris. Orang yang bertanya "boleh tidak kasih kangkung" membuka satu bagian,
 * bukan menggulung tiga setengah layar.
 *
 * SATU BAGIAN TETAP TERBUKA: "MAKANAN DILARANG". Di bagian lain, tidak melihat
 * isinya berarti harus membuka satu ketukan lagi; di bagian itu, tidak melihat
 * isinya berarti kura memakan sesuatu yang membahayakannya. Keduanya tidak
 * setara, jadi tidak diperlakukan sama.
 */
import { useState } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { AlertTriangle, ChevronDown, Leaf } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { kisiWadah } from "@/lib/kisiWadah";

const CARDS = [
  {
    id: 1,
    emoji: "🌿",
    title: "Makanan Utama",
    subtitle: "Wajib Setiap Hari",
    color: "border-green-700 bg-green-50",
    headerColor: "bg-green-700 text-white",
    tagColor: "bg-green-100 text-green-800 border-green-300",
    items: [
      "Rumput Timothy / Orchard Grass — sumber serat utama",
      "Jerami / Hay — penting untuk pencernaan",
      "Rumput lapangan — biarkan merumput langsung",
      "Dandelion bunga & daun — kaya kalsium",
      "Daun kembang sepatu / Hibiscus — sangat disukai",
      "Daun murbei / Mulberry — bergizi tinggi",
      "Clover / semanggi — aman diberikan",
      "Kaktus opuntia tanpa duri — sumber air & serat",
      "Selada romaine / endive / chicory — pilih yang berwarna hijau tua",
    ],
    info: "Sulcata adalah herbivora murni. Diet tinggi serat dan rendah protein mencegah pyramiding.",
    risk: "⚠️ Kekurangan serat → gangguan pencernaan, pyramiding, penurunan nafsu makan.",
  },
  {
    id: 2,
    emoji: "🥦",
    title: "Sayuran Tambahan",
    subtitle: "2–3x Seminggu",
    color: "border-blue-500 bg-blue-50",
    headerColor: "bg-blue-600 text-white",
    tagColor: "bg-blue-100 text-blue-800 border-blue-300",
    items: [
      "Collard greens / Kale — tinggi kalsium",
      "Sawi hijau — sesekali saja",
      "Wortel & daun wortel — tidak berlebihan",
      "Kol / Kubis — dalam jumlah kecil",
      "Labu / Pumpkin & squash — treat sesekali",
      "Fumak / selada lokal — aman untuk rutin",
      "Pelet kura-kura Mazuri / ZooMed — rendam air dulu sebelum diberikan",
    ],
    info: "Sayuran ini dapat diberikan sebagai variasi, namun tidak boleh menggantikan rumput/hay sebagai pakan utama.",
    risk: "⚠️ Bayam / swiss chard mengandung oksalat tinggi yang mengikat kalsium → risiko MBD jika berlebihan.",
  },
  {
    id: 3,
    emoji: "💊",
    title: "Suplemen Wajib",
    subtitle: "Rutin & Teratur",
    color: "border-amber-500 bg-amber-50",
    headerColor: "bg-amber-500 text-white",
    tagColor: "bg-amber-100 text-amber-800 border-amber-300",
    items: [
      "Kalsium karbonat tanpa fosfor — taburkan ke pakan 2–3x/minggu",
      "Multivitamin reptil Repashy — 1x/minggu untuk dewasa",
      "Kalsium harian — wajib untuk betina breeding & anakan (tukik)",
      "Cuttlebone / tulang sotong — taruh langsung di dalam kandang",
      "Jemur matahari pagi minimal 1 jam — membantu penyerapan Vitamin D3",
    ],
    info: "Suplemen sangat penting terutama untuk anakan dan betina yang sedang breeding.",
    risk: "⚠️ Tanpa suplemen → tempurung lunak, kaki bengkok, kematian anakan, egg binding pada betina.",
  },
  {
    id: 4,
    emoji: "🚫",
    title: "MAKANAN DILARANG",
    subtitle: "Jangan Diberikan Sama Sekali",
    // Tetap terbuka: lihat alasannya di kepala berkas.
    selaluBuka: true,
    color: "border-red-600 bg-red-50",
    headerColor: "bg-red-600 text-white",
    tagColor: "bg-red-100 text-red-800 border-red-300",
    items: [
      "❌ Semua jenis buah-buahan (kandungan gula sangat tinggi)",
      "❌ Bayam / Spinach (oksalat mengikat kalsium)",
      "❌ Swiss chard / Bit hijau",
      "❌ Brokoli / Bok choy daun (goitrogen mengganggu tiroid)",
      "❌ Selada iceberg (nol nutrisi, hanya air)",
      "❌ Jagung / Kentang manis",
      "❌ Makanan anjing atau protein hewani (menyebabkan pyramiding parah)",
      "❌ Roti / pasta / kacang-kacangan",
      "❌ Mentimun berlebihan (diuretik berlebih)",
      "❌ Omega-3 / suplemen manusia (lemak hewani berbahaya untuk reptil)",
    ],
    info: "Sulcata tidak dapat mencerna makanan tinggi gula, protein hewani, atau lemak. Ini dapat menyebabkan kerusakan organ permanen.",
    risk: "⚠️ Risiko: parasit usus, batu kandung kemih, pyramiding, kerusakan hati, kematian.",
  },
  {
    id: 5,
    emoji: "📅",
    title: "Jadwal & Porsi",
    subtitle: "Panduan Pemberian Pakan",
    color: "border-purple-500 bg-purple-50",
    headerColor: "bg-purple-600 text-white",
    tagColor: "bg-purple-100 text-purple-800 border-purple-300",
    items: [
      "Dewasa >5 tahun: minimal 3x/minggu, idealnya setiap hari merumput bebas",
      "Remaja 1–5 tahun: setiap hari dengan porsi kecil-sedang",
      "Anakan <1 tahun: setiap hari, 1–2 sendok makan per pemberian",
      "Air bersih: SELALU tersedia 24 jam, ganti setiap hari",
      "Berendam air hangat: 10–15 menit/minggu setinggi dagu",
      "Waktu makan terbaik: pagi setelah dijemur 30 menit terlebih dahulu",
      "Taburkan kalsium SETIAP kali pemberian makan",
      "Variasi: campurkan 2–3 jenis tanaman berbeda setiap kali makan",
    ],
    info: "Konsistensi jadwal makan sangat penting untuk kesehatan sistem pencernaan sulcata.",
    risk: null,
  },
];

export default function PanduanPakanPage() {
  const { role } = useCurrentUser();
  const isEditable = ["owner", "admin"].includes(role);
  const [buka, setBuka] = useState(() => new Set(CARDS.filter((c) => c.selaluBuka).map((c) => c.id)));
  const alihkan = (id) =>
    setBuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(id)) baru.delete(id); else baru.add(id);
      return baru;
    });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Panduan Pakan Sulcata"
        subtitle="Referensi nutrisi dan pemberian makan untuk kura-kura sulcata"
        icon={Leaf}
        actions={
          isEditable && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">
              ✏️ Mode Edit (Owner/Admin)
            </span>
          )
        }
      />

      {/* Cards Grid */}
      {/*
        `md:grid-cols-2` membaca lebar LAYAR, bukan lebar wadahnya. Di dalam
        kolom 320px pada layar 1280px ia tetap membuat dua kolom selebar
        ~150px, dan judul sependek "Jadwal & Porsi" pun terpotong. kisiWadah
        membaca ruang yang benar-benar ada.
      */}
      <div className="grid gap-5" style={{ gridTemplateColumns: kisiWadah(300) }}>
        {CARDS.map(card => {
          const terbuka = buka.has(card.id);
          return (
          <div
            key={card.id}
            className={`rounded-2xl border-2 overflow-hidden shadow-sm ${card.color} ${terbuka ? "" : "self-start"}`}
          >
            {/* Kepala bagian — sekaligus tombol buka/tutup */}
            <button
              type="button"
              onClick={() => alihkan(card.id)}
              aria-expanded={terbuka}
              className={`w-full px-5 py-3 text-left whitespace-normal ${card.headerColor}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{card.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-base leading-tight">{card.title}</h2>
                  <p className="text-xs opacity-80 mt-0.5">
                    {card.subtitle} · {card.items.length} butir
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${terbuka ? "rotate-180" : ""}`} />
              </div>
            </button>

            {/* Isi bagian */}
            {terbuka && (
            <div className="px-5 py-4 space-y-3">
              <ul className="space-y-1.5">
                {card.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {!item.startsWith("❌") && (
                      <span className="mt-0.5 text-xs">•</span>
                    )}
                    <span className={item.startsWith("❌") ? "font-medium text-red-700" : "text-foreground"}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Info box */}
              {card.info && (
                <div className={`text-xs px-3 py-2 rounded-lg border ${card.tagColor} mt-2`}>
                  💡 {card.info}
                </div>
              )}

              {/* Risk box */}
              {card.risk && (
                <div className="text-xs px-3 py-2 rounded-lg border bg-orange-50 border-orange-200 text-orange-800">
                  {card.risk}
                </div>
              )}
            </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-orange-50 border-2 border-orange-300">
        <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-orange-800 text-sm">⚠️ INGAT: Jika ragu dengan suatu makanan, JANGAN berikan dulu.</p>
          <p className="text-sm text-orange-700 mt-1">
            Konsultasikan dengan Manajer atau Owner sebelum mencoba pakan baru. Kesalahan pakan bisa berdampak serius pada kesehatan sulcata dalam jangka panjang.
          </p>
        </div>
      </div>
    </div>
  );
}