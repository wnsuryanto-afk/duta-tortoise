import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Copy, Phone, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const DISEASE_GUIDES = {
  "Infeksi Saluran Pernapasan": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Isolasi dari kura lain", "Naikkan suhu kandang 30-32°C", "Nebulisasi NaCl 0.9% 2x/hari", "Enrofloxacin 7-14 hari (konsultasi dosis ke drh)", "Rendam air hangat 20 menit/hari"],
    symptoms: "Nafas berbunyi, mulut terbuka, lendir hidung/mulut, letargi",
    cause: "Bakteri (Mycoplasma, dll), suhu terlalu rendah, stres",
    note: "Segera ke dokter jika tidak membaik dalam 3 hari",
    stocks: ["Enrofloxacin", "NaCl 0.9%", "Vitamin C", "Nebulizer"],
  },
  "Runny Nose Syndrome (RNS)": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Isolasi SEGERA (sangat menular)", "Basking 38-40°C", "Rendam hangat tiap hari", "Antibiotik minimal 6 minggu", "Cek semua kura di kandang yang sama"],
    symptoms: "Cairan bening dari hidung terus-menerus, nafas berbunyi",
    cause: "Herpesvirus atau Mycoplasma, sangat menular",
    note: "⚠️ Sangat menular! Isolasi ketat.",
    stocks: ["Enrofloxacin", "Marbofloxacin", "Vitamin C"],
  },
  "Pneumonia": {
    emergency: true, borderColor: "border-red-500",
    steps: ["SEGERA KE DOKTER HEWAN", "Jaga suhu 30-32°C", "Nebulisasi 3x/hari", "Antibiotik injeksi (oleh drh)", "Jangan rendam saat kondisi kritis"],
    symptoms: "Nafas sangat berat, kepala terangkat ke atas, mulut terbuka, tidak mau makan",
    cause: "Bakteri, biasanya komplikasi dari infeksi saluran napas",
    note: "⚠️ DARURAT — Segera ke Dokter Hewan",
    stocks: ["Enrofloxacin injeksi", "NaCl 0.9%", "Nebulizer", "Syringe"],
  },
  "Shell Rot (Busuk Cangkang)": {
    emergency: false, borderColor: "border-orange-400",
    steps: ["Bersihkan area busuk dengan Betadine/Chlorhexidine", "Kikis jaringan busuk dengan cotton bud steril", "Oleskan silver sulfadiazine", "Keringkan 1-2 jam sebelum masuk kandang", "Kandang KERING, ulangi setiap hari"],
    symptoms: "Cangkang berlubang, bau busuk, warna kehitaman/kehijauan di scute",
    cause: "Bakteri/jamur, kandang terlalu lembab, luka yang tidak ditangani",
    note: "Jika sudah dalam, konsultasi drh untuk infeksi sistemik",
    stocks: ["Betadine", "Chlorhexidine", "Silver sulfadiazine", "Cotton bud", "Kasa steril"],
  },
  "Pyramiding": {
    emergency: false, borderColor: "border-green-400",
    steps: ["Tidak bisa dibalikkan setelah terjadi", "Diet rendah protein", "Pastikan UVB adekuat", "Kelembaban kandang cukup", "Suplemen kalsium & Vitamin D3"],
    symptoms: "Scute cangkang tumbuh meninggi seperti piramid",
    cause: "Diet tidak seimbang, kekurangan UVB, kelembaban rendah (kontroversial)",
    note: "Pencegahan lebih efektif dari pengobatan",
    stocks: ["Kalsium karbonat", "Vitamin D3", "Lampu UVB"],
  },
  "Retak/Patah Cangkang": {
    emergency: true, borderColor: "border-red-500",
    steps: ["Jika retak besar/ada pendarahan: SEGERA KE DRH", "Bersihkan luka dengan Chlorhexidine", "Tutup dengan epoxy resin reptil (retak kecil)", "Isolasi di kandang bersih", "Pantau setiap hari"],
    symptoms: "Cangkang retak, pecah, atau berlubang akibat benturan/predator",
    cause: "Jatuh, gigitan predator, kecelakaan",
    note: "⚠️ DARURAT jika ada pendarahan atau organ terekspos",
    stocks: ["Chlorhexidine", "Epoxy resin reptil", "Kasa steril"],
  },
  "Metabolic Bone Disease (MBD)": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Suplemen kalsium 3x/seminggu (tabur di pakan)", "Sinar matahari langsung 30 menit/hari", "Lampu UVB 10-12 jam/hari", "Kurangi pakan tinggi oksalat (bayam, bit)"],
    symptoms: "Cangkang lunak, bengkak di kaki, sulit berjalan, pertumbuhan lambat",
    cause: "Kekurangan kalsium, Vitamin D3, atau UVB",
    note: "Konsultasi drh untuk kasus berat",
    stocks: ["Kalsium karbonat", "Vitamin D3", "Lampu UVB"],
  },
  "Hipovitaminosis A": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Vitamin A injeksi atau oral (konsultasi drh)", "Perbaiki diet dengan sayuran berwarna (wortel, labu)", "Tetes mata NaCl steril jika ada bengkak"],
    symptoms: "Kelopak mata bengkak, sulit membuka mata, kulit mengelupas",
    cause: "Kekurangan Vitamin A dalam diet",
    note: "Overdosis Vitamin A berbahaya, ikuti dosis drh",
    stocks: ["Vitamin A", "NaCl 0.9%"],
  },
  "Gout (Asam Urat Tinggi)": {
    emergency: false, borderColor: "border-orange-400",
    steps: ["Rendam hangat 2x/hari minimal 30 menit", "Hentikan pakan tinggi protein (kacang-kacangan)", "Tingkatkan hidrasi", "Allopurinol (hanya oleh drh)"],
    symptoms: "Bengkak di sendi/kaki, kristal putih di jaringan, letargi",
    cause: "Diet tinggi protein, dehidrasi kronis",
    note: "Konsultasi drh untuk obat-obatan",
    stocks: ["Allopurinol (via drh)", "Baskom rendam"],
  },
  "Batu Kandung Kemih": {
    emergency: true, borderColor: "border-red-500",
    steps: ["SEGERA KE DOKTER HEWAN", "Rendam 2x/hari untuk hidrasi", "Tingkatkan asupan air", "Operasi jika diperlukan"],
    symptoms: "Tidak bisa buang air, perut membesar, kaki belakang menendang-nendang",
    cause: "Dehidrasi kronis, diet tidak seimbang",
    note: "⚠️ DARURAT — Segera ke Dokter Hewan",
    stocks: ["Konsultasi drh"],
  },
  "Sembelit (Konstipasi)": {
    emergency: false, borderColor: "border-green-400",
    steps: ["Rendam hangat 2x/hari 30-45 menit", "Naikkan suhu kandang 28-30°C", "Teteskan minyak zaitun di pakan", "Pijat lembut perut dari belakang ke depan", "Jika tidak BAB 7+ hari: ke drh"],
    symptoms: "Tidak BAB, perut keras, tidak nafsu makan",
    cause: "Suhu terlalu rendah, dehidrasi, pakan kurang serat",
    note: "Pantau lebih dari 7 hari jika tidak membaik",
    stocks: ["Minyak zaitun", "Hay/rumput kering"],
  },
  "Diare": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Rendam untuk mencegah dehidrasi", "Hentikan pemberian buah", "Berikan hay/rumput kering", "Fecal test untuk cek parasit", "Probiotik reptil (opsional)"],
    symptoms: "Feses encer, berbau busuk, berlendir",
    cause: "Perubahan diet mendadak, parasit, infeksi bakteri",
    note: "Fecal test untuk cek parasit jika berlanjut",
    stocks: ["Metronidazole (via drh)", "Fenbendazole (via drh)", "Probiotik reptil"],
  },
  "Anorexia (Tidak Mau Makan)": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Cek suhu kandang (harus 28-32°C)", "Variasikan jenis pakan", "Pastikan UVB berfungsi", "Rendam hangat untuk stimulasi nafsu makan", "Jika 2+ minggu: konsultasi drh"],
    symptoms: "Tidak mau makan >1 minggu",
    cause: "Suhu tidak tepat, stres, sakit tersembunyi, musim kawin",
    note: "Normal bagi kura yang akan hibernasi atau musim kawin",
    stocks: ["Vitamin B kompleks"],
  },
  "Cacingan/Parasit Internal": {
    emergency: false, borderColor: "border-orange-400",
    steps: ["Fecal test untuk identifikasi parasit", "Fenbendazole 50mg/kg selama 3 hari (oleh drh)", "Ulangi 2 minggu kemudian", "Bersihkan dan desinfeksi kandang"],
    symptoms: "Penurunan berat badan, feses berbau busuk, cacing terlihat di feses",
    cause: "Kontaminasi lingkungan, kontak dengan kura baru",
    note: "Karantina kura baru sebelum digabung",
    stocks: ["Fenbendazole (via drh)", "Probiotik reptil"],
  },
  "Protozoa": {
    emergency: false, borderColor: "border-orange-400",
    steps: ["Fecal test untuk konfirmasi", "Metronidazole sesuai dosis drh", "Karantina", "Bersihkan kandang dan peralatan"],
    symptoms: "Diare kronis, penurunan berat, letargi",
    cause: "Kontaminasi lingkungan, pakan kotor",
    note: "Konsultasi drh untuk diagnosis tepat",
    stocks: ["Metronidazole (via drh)"],
  },
  "Tungau/Kutu": {
    emergency: false, borderColor: "border-orange-400",
    steps: ["Rendam 30 menit dalam air hangat bersih", "Ivermectin (hanya oleh drh)", "Sterilkan seluruh kandang dengan air panas", "Ganti substrat", "Ulangi pengobatan 2 minggu kemudian"],
    symptoms: "Bintik kecil bergerak di cangkang, kulit, atau mata",
    cause: "Kontak dengan kura terinfeksi, substrat kotor",
    note: "Periksa semua kura di kandang yang sama",
    stocks: ["Ivermectin (via drh)"],
  },
  "Luka/Gigitan": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Bersihkan dengan NaCl 0.9% atau Chlorhexidine", "Oleskan Betadine tipis-tipis", "Isolasi dari kura lain", "Pantau setiap hari untuk tanda infeksi"],
    symptoms: "Luka terbuka, pendarahan, jaringan rusak",
    cause: "Gigitan sesama kura, predator, benda tajam",
    note: "Ke drh jika luka dalam atau menunjukkan tanda infeksi",
    stocks: ["NaCl 0.9%", "Chlorhexidine", "Betadine", "Kasa steril"],
  },
  "Abses": {
    emergency: false, borderColor: "border-orange-400",
    steps: ["Jangan pecahkan sendiri", "Konsultasi drh untuk insisi dan drainase", "Antibiotik sistemik sesuai resep drh", "Rawat luka pasca insisi dengan Chlorhexidine"],
    symptoms: "Benjolan keras berisi nanah, bengkak lokal",
    cause: "Infeksi bakteri dari luka atau gigitan",
    note: "Harus ditangani oleh drh",
    stocks: ["Chlorhexidine", "Antibiotik (via drh)"],
  },
  "Infeksi Jamur Kulit": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Jaga kandang tetap kering", "Oleskan antijamur topikal (Clotrimazole)", "Mandikan kura 2-3x seminggu, keringkan sempurna", "Kurangi kelembaban kandang"],
    symptoms: "Bercak putih atau abu-abu di kulit, kulit mengelupas",
    cause: "Kandang terlalu lembab, ventilasi buruk",
    note: "Jamur tumbuh di lingkungan lembab",
    stocks: ["Clotrimazole krim"],
  },
  "Infeksi Jamur pada Cangkang": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Bersihkan cangkang dengan Chlorhexidine", "Oleskan antijamur (Clotrimazole/Miconazole)", "Keringkan cangkang 1-2 jam/hari di bawah lampu", "Jaga kandang tetap kering"],
    symptoms: "Bercak putih/abu-abu di cangkang, tidak seperti tanah",
    cause: "Kelembaban berlebihan, ventilasi buruk",
    note: "Bedakan dari Shell Rot dengan warna dan tekstur",
    stocks: ["Chlorhexidine", "Clotrimazole/Miconazole krim"],
  },
  "Infeksi Mata": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Bersihkan dengan NaCl steril", "Tetes mata Ciprofloxacin (resep drh)", "Suplemen Vitamin A", "Pastikan kandang bersih dari debu/substrat halus"],
    symptoms: "Mata bengkak, berlendir, tertutup, kemerahan",
    cause: "Kekurangan Vitamin A, infeksi bakteri, trauma",
    note: "Sering terkait kekurangan Vitamin A",
    stocks: ["NaCl 0.9%", "Vitamin A"],
  },
  "Stomatitis (Mouth Rot)": {
    emergency: true, borderColor: "border-red-500",
    steps: ["SEGERA KE DOKTER HEWAN", "Bersihkan mulut dengan Chlorhexidine encer", "Antibiotik sistemik (oleh drh)", "Syringe feeding jika tidak mau makan"],
    symptoms: "Mulut berlendir/bernanah, bau busuk, gusi merah, sulit makan",
    cause: "Infeksi bakteri, sering dari luka di mulut",
    note: "⚠️ DARURAT — Segera ke Dokter Hewan",
    stocks: ["Chlorhexidine", "Syringe", "Vitamin C"],
  },
  "Abses Telinga": {
    emergency: false, borderColor: "border-orange-400",
    steps: ["Konsultasi drh untuk drainase", "Antibiotik sistemik sesuai resep", "Rawat luka pasca operasi"],
    symptoms: "Benjolan di belakang kepala, bengkak di area timpanum",
    cause: "Infeksi bakteri, sering dari infeksi saluran napas",
    note: "Harus ditangani oleh drh",
    stocks: ["Antibiotik (via drh)"],
  },
  "Prolaps": {
    emergency: true, borderColor: "border-red-500",
    steps: ["SEGERA KE DOKTER HEWAN", "Basahi jaringan yang keluar dengan NaCl atau madu encer", "Jangan paksa masuk kembali", "Letakkan di kontainer bersih", "Pergi ke drh dalam 1-2 jam"],
    symptoms: "Jaringan internal keluar dari kloaka",
    cause: "Sembelit parah, distosia, infeksi",
    note: "⚠️ DARURAT — Segera ke Dokter Hewan",
    stocks: ["NaCl 0.9%", "Madu murni", "Kasa basah"],
  },
  "Prolaps Penis (jantan)": {
    emergency: true, borderColor: "border-red-500",
    steps: ["SEGERA KE DOKTER HEWAN", "Basahi dengan NaCl atau madu encer untuk mencegah kering", "Jangan paksa masuk kembali"],
    symptoms: "Penis tidak bisa masuk kembali ke kloaka",
    cause: "Distensi berlebihan, infeksi, trauma",
    note: "⚠️ DARURAT — Segera ke Dokter Hewan",
    stocks: ["NaCl 0.9%", "Madu murni"],
  },
  "Egg Binding/Dystocia (betina)": {
    emergency: true, borderColor: "border-red-500",
    steps: ["SEGERA KE DOKTER HEWAN", "Siapkan box bertelur dengan pasir lembab", "Jangan beri obat tanpa resep drh", "Oxytocin hanya oleh drh"],
    symptoms: "Betina menggali tapi tidak bertelur, lesu, tidak nafsu makan",
    cause: "Telur terlalu besar, kondisi box bertelur tidak sesuai",
    note: "⚠️ DARURAT — Segera ke Dokter Hewan",
    stocks: ["Box bertelur besar dengan pasir lembab"],
  },
  "Edema": {
    emergency: false, borderColor: "border-orange-400",
    steps: ["Konsultasi drh untuk diagnosis penyebab", "Kurangi garam dalam diet", "Cek fungsi ginjal (drh)", "Diuretik jika diresepkan drh"],
    symptoms: "Pembengkakan pada kaki, leher, atau seluruh tubuh",
    cause: "Gagal ginjal, infeksi, masalah jantung",
    note: "Konsultasi drh untuk diagnosis penyebab",
    stocks: ["Konsultasi drh"],
  },
  "Dehidrasi": {
    emergency: false, borderColor: "border-yellow-400",
    steps: ["Rendam 30-45 menit 2x/hari", "Sediakan air minum segar setiap hari", "Berikan pakan berair sementara (selada, timun)", "Elektrolit reptil jika dehidrasi berat"],
    symptoms: "Mata cekung, kulit kendur, urine pekat/putih",
    cause: "Air tidak tersedia, suhu terlalu tinggi, penyakit lain",
    note: "Jika sangat parah: cairan infus oleh drh",
    stocks: ["Elektrolit reptil", "Baskom rendam"],
  },
  "Heat Stroke": {
    emergency: true, borderColor: "border-red-500",
    steps: ["Pindahkan ke tempat teduh dan sejuk SEGERA", "Rendam dalam air hangat (bukan dingin)", "Kipasi perlahan", "SEGERA KE DRH jika tidak responsif dalam 30 menit"],
    symptoms: "Mulut terbuka terus, tidak responsif, kaki melar",
    cause: "Paparan panas berlebihan, kurang air minum",
    note: "⚠️ DARURAT jika tidak responsif",
    stocks: ["Baskom rendam", "Termometer kandang"],
  },
  "Stres": {
    emergency: false, borderColor: "border-green-400",
    steps: ["Identifikasi dan hilangkan sumber stres", "Kurangi penanganan berlebihan", "Pastikan kandang cukup besar dan punya area sembunyi", "Beri waktu adaptasi jika baru datang"],
    symptoms: "Tidak mau makan, selalu bersembunyi, menarik masuk ke cangkang",
    cause: "Penanganan berlebihan, kandang terlalu kecil, kura baru",
    note: "Biasanya membaik sendiri jika sumber stres dihilangkan",
    stocks: [],
  },
  "Checkup Rutin": {
    emergency: false, borderColor: "border-green-400",
    steps: ["Timbang berat badan", "Periksa mata, mulut, dan hidung", "Periksa cangkang", "Catat kondisi umum dan nafsu makan", "Update catatan kesehatan"],
    symptoms: "—",
    cause: "Pemeriksaan rutin berkala",
    note: "Checkup rutin disarankan setiap 1-3 bulan",
    stocks: ["Timbangan digital"],
  },
};

export const DIAGNOSIS_CATEGORIES = {
  "Saluran Pernapasan": ["Infeksi Saluran Pernapasan", "Runny Nose Syndrome (RNS)", "Pneumonia"],
  "Cangkang": ["Shell Rot (Busuk Cangkang)", "Pyramiding", "Retak/Patah Cangkang", "Infeksi Jamur pada Cangkang"],
  "Tulang & Metabolisme": ["Metabolic Bone Disease (MBD)", "Hipovitaminosis A", "Gout (Asam Urat Tinggi)", "Batu Kandung Kemih"],
  "Pencernaan": ["Sembelit (Konstipasi)", "Diare", "Anorexia (Tidak Mau Makan)", "Cacingan/Parasit Internal", "Protozoa"],
  "Kulit & Luar": ["Tungau/Kutu", "Luka/Gigitan", "Abses", "Infeksi Jamur Kulit"],
  "Mata & Mulut": ["Infeksi Mata", "Stomatitis (Mouth Rot)", "Abses Telinga"],
  "Organ": ["Prolaps", "Prolaps Penis (jantan)", "Egg Binding/Dystocia (betina)", "Edema"],
  "Umum": ["Dehidrasi", "Heat Stroke", "Stres", "Checkup Rutin"],
};

const EMERGENCY_DISEASES = ["Pneumonia", "Stomatitis (Mouth Rot)", "Prolaps", "Prolaps Penis (jantan)", "Egg Binding/Dystocia (betina)", "Batu Kandung Kemih", "Retak/Patah Cangkang", "Heat Stroke"];

function GuidePanel({ disease }) {
  const [open, setOpen] = useState(true);
  const guide = DISEASE_GUIDES[disease];
  if (!guide) return null;
  const isEmergency = EMERGENCY_DISEASES.includes(disease);

  const copyGuide = () => {
    const text = `📋 Panduan: ${disease}\n\nGejala: ${guide.symptoms}\nPenyebab: ${guide.cause}\n\nLangkah Penanganan:\n${guide.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nCatatan: ${guide.note}`;
    navigator.clipboard.writeText(text);
    toast.success("Panduan disalin!");
  };

  return (
    <div className={`rounded-xl border-2 ${isEmergency ? "border-red-500 bg-red-50" : guide.borderColor} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-sm ${isEmergency ? "bg-red-100 text-red-800" : "bg-muted/50"}`}
      >
        <span>💊 Panduan: {disease}</span>
        <div className="flex items-center gap-2">
          {isEmergency && (
            <span className="flex items-center gap-1 text-xs text-red-700 font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> DARURAT
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 space-y-3 text-sm">
          {isEmergency && (
            <div className="p-2 bg-red-200 rounded-lg text-red-800 font-bold text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              ⚠️ DARURAT — Segera ke Dokter Hewan sekarang!
            </div>
          )}
          {guide.symptoms !== "—" && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Gejala Umum</p>
              <p>{guide.symptoms}</p>
            </div>
          )}
          <div>
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Penyebab</p>
            <p>{guide.cause}</p>
          </div>
          <div>
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Langkah Penanganan</p>
            <ol className="list-decimal list-inside space-y-1">
              {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
          {guide.note && (
            <div className={`text-xs p-2 rounded-lg border ${isEmergency ? "bg-red-100 border-red-300 text-red-700 font-semibold" : "bg-muted/50 text-muted-foreground"}`}>
              📝 {guide.note}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" onClick={copyGuide} className="gap-1.5 h-7 text-xs">
              <Copy className="w-3 h-3" /> Salin Panduan
            </Button>
            {isEmergency && (
              <Button type="button" size="sm" variant="destructive" className="gap-1.5 h-7 text-xs">
                <Phone className="w-3 h-3" /> Tandai Perlu Drh
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// DiagnosisPanel now accepts diagnosisProtocols (from DiagnosisProtocol entity) for SKU-based lookup
export default function DiagnosisPanel({ selectedDiagnoses, warehouseItems = [], feedStocks = [], diagnosisProtocols = [] }) {
  if (!selectedDiagnoses || selectedDiagnoses.length === 0) return null;

  // Collect stock items from DiagnosisProtocol (SKU-based) + fallback to DISEASE_GUIDES (name-based)
  // Returns array of { obat_name, obat_sku }
  const allStockItems = (() => {
    const seen = new Set();
    const result = [];

    // From DiagnosisProtocol (has SKU)
    for (const diag of selectedDiagnoses) {
      const protocol = diagnosisProtocols.find(p => p.diagnosis_code === diag);
      if (protocol?.treatment_items?.length) {
        for (const item of protocol.treatment_items) {
          const key = item.obat_sku || item.obat_name;
          if (!seen.has(key)) {
            seen.add(key);
            result.push({ obat_name: item.obat_name, obat_sku: item.obat_sku });
          }
        }
      } else {
        // Fallback: DISEASE_GUIDES (name only, no SKU)
        for (const stockName of (DISEASE_GUIDES[diag]?.stocks || [])) {
          if (!seen.has(stockName)) {
            seen.add(stockName);
            result.push({ obat_name: stockName, obat_sku: null });
          }
        }
      }
    }
    return result;
  })();

  const getStockStatus = ({ obat_name, obat_sku }) => {
    let item = null;
    if (obat_sku) {
      // Primary: lookup by SKU
      item = warehouseItems.find(i => i.sku === obat_sku);
    }
    if (!item) {
      // Fallback: lookup by name (fuzzy)
      const lower = obat_name.toLowerCase();
      item = warehouseItems.find(i => i.name?.toLowerCase().includes(lower) || lower.includes(i.name?.toLowerCase()))
          || feedStocks.find(i => i.name?.toLowerCase().includes(lower) || lower.includes(i.name?.toLowerCase()));
    }
    if (!item) return "unknown";
    if (item.current_stock <= 0) return "habis";
    if (item.current_stock < item.minimum_stock) return "hampir_habis";
    return "cukup";
  };

  const stockStatusConfig = {
    cukup:       { label: "✓ Cukup",        color: "text-green-700 bg-green-50 border-green-200" },
    hampir_habis:{ label: "⚠ Menipis",      color: "text-amber-700 bg-amber-50 border-amber-200" },
    habis:       { label: "✗ Habis",         color: "text-red-700 bg-red-50 border-red-200" },
    unknown:     { label: "? Tidak Didata",  color: "text-muted-foreground bg-muted border-border" },
  };

  const hasLowStock = allStockItems.some(s => ["habis", "hampir_habis"].includes(getStockStatus(s)));

  return (
    <div className="space-y-3">
      <div className="border-t pt-3">
        <p className="text-sm font-semibold text-primary mb-2">📋 Panduan Penanganan Otomatis</p>
        <div className="space-y-2">
          {selectedDiagnoses.map(d => <GuidePanel key={d} disease={d} />)}
        </div>
      </div>

      {allStockItems.length > 0 && (
        <div className="border rounded-xl p-3 bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">📦 Stok yang Dibutuhkan</p>
            {hasLowStock && (
              <Badge variant="destructive" className="text-xs">⚠️ Stok Menipis</Badge>
            )}
          </div>
          <div className="space-y-1">
            {allStockItems.map(stockItem => {
              const status = getStockStatus(stockItem);
              const cfg = stockStatusConfig[status];
              return (
                <div key={stockItem.obat_sku || stockItem.obat_name} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${cfg.color}`}>
                  <span>{stockItem.obat_name}</span>
                  <span className="font-semibold">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}