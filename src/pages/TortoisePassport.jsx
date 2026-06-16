import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format, differenceInMonths, differenceInYears } from "date-fns";
import { id } from "date-fns/locale";
import { Shell, Share2, Download, Copy, CheckCircle, QrCode, ChevronLeft, ChevronRight } from "lucide-react";
import QRCode from "qrcode";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

function getAge(birthDate) {
  if (!birthDate) return "Tidak diketahui";
  const months = differenceInMonths(new Date(), new Date(birthDate));
  if (months < 12) return `${months} bulan`;
  const years = differenceInYears(new Date(), new Date(birthDate));
  const remMonths = months - years * 12;
  return remMonths > 0 ? `${years} tahun ${remMonths} bulan` : `${years} tahun`;
}

function WatermarkedPhoto({ src, alt, className }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      // Watermark diagonal
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.font = `bold ${Math.max(24, img.width / 12)}px sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.translate(img.width / 2, img.height / 2);
      ctx.rotate(-Math.PI / 5);
      ctx.textAlign = "center";
      for (let i = -2; i <= 2; i++) {
        ctx.fillText("DUTA TORTOISE", 0, i * (img.height / 4));
      }
      ctx.restore();
      setDataUrl(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => setDataUrl(src); // fallback
    img.src = src;
  }, [src]);

  if (!src) return null;
  return <img src={dataUrl || src} alt={alt} className={className} />;
}

function QRDisplay({ url }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  useEffect(() => {
    QRCode.toDataURL(url, { width: 180, margin: 2, color: { dark: "#1a3a0a", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [url]);
  return qrDataUrl ? <img src={qrDataUrl} alt="QR Code Passport" className="w-36 h-36 rounded-xl border-4 border-white shadow-lg" /> : null;
}

function PhotoCarousel({ photos }) {
  const [idx, setIdx] = useState(0);
  if (!photos || photos.length === 0) return (
    <div className="w-full aspect-square bg-green-900/30 flex items-center justify-center rounded-2xl">
      <Shell className="w-24 h-24 text-green-200/50" />
    </div>
  );
  return (
    <div className="relative">
      <WatermarkedPhoto
        src={photos[idx]?.url}
        alt="Tortoise"
        className="w-full aspect-square object-cover rounded-2xl"
      />
      {photos.length > 1 && (
        <>
          <button onClick={() => setIdx((idx - 1 + photos.length) % photos.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setIdx((idx + 1) % photos.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function TortoisePassport() {
  const params = new URLSearchParams(window.location.search);
  const tortoiseId = params.get("id");
  const [tortoise, setTortoise] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tortoiseId) { setError("ID kura tidak ditemukan"); setLoading(false); return; }
    Promise.all([
      base44.entities.Tortoise.filter({ id: tortoiseId }).then(r => r[0]),
      base44.entities.MeasurementHistory.filter({ tortoise_id: tortoiseId }, "-date", 12),
      base44.entities.HealthRecord.filter({ tortoise_id: tortoiseId }, "-date", 5),
      base44.entities.CompanySettings.filter({ setting_key: "main" }).then(r => r[0]),
    ]).then(([t, m, h, s]) => {
      if (!t) { setError("Data kura tidak ditemukan"); setLoading(false); return; }
      setTortoise(t);
      setMeasurements(m || []);
      setHealthRecords(h || []);
      setSettings(s || {});
      setLoading(false);
    }).catch(e => {
      setError("Gagal memuat data passport");
      setLoading(false);
    });
  }, [tortoiseId]);

  const passportUrl = window.location.href;
  const certNumber = tortoise ? `DT-${new Date().getFullYear()}-${(tortoise.code || tortoise.id?.slice(-6)).toUpperCase()}` : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(passportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWA = () => {
    const text = encodeURIComponent(`🐢 Lihat Passport Kura: ${tortoise?.name || ""}\n${passportUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-green-900">
      <div className="w-10 h-10 border-4 border-green-300 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-green-900 text-green-100">
      <div className="text-center">
        <Shell className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-xl font-bold">{error}</p>
        <p className="text-sm opacity-60 mt-2">Periksa kembali link yang Anda gunakan</p>
      </div>
    </div>
  );

  const photos = Array.isArray(tortoise.photos) && tortoise.photos.length > 0
    ? tortoise.photos
    : tortoise.photo_url ? [{ url: tortoise.photo_url }] : [];

  const growthData = [...measurements].reverse().map(m => ({
    date: m.date ? format(new Date(m.date), "MMM yy") : "",
    berat: m.weight_grams ? Math.round(m.weight_grams / 1000 * 10) / 10 : null,
    panjang: m.shell_length_cm || null,
  })).filter(d => d.berat || d.panjang);

  const lastHealth = healthRecords[0];
  const isSick = tortoise.status === "sakit" || tortoise.is_currently_sick;

  const speciesLabel = {
    sulcata: "Sulcata (African Spurred)", red_foot: "Red Foot", leopard: "Leopard",
    aldabra: "Aldabra", russian: "Russian", hermann: "Hermann",
    greek: "Greek", indian_star: "Indian Star", lainnya: "Lainnya",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 to-green-900 text-white">
      {/* ── HEADER ── */}
      <div className="bg-green-950/80 border-b border-green-700/40 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-700/40 border border-green-600/40 flex items-center justify-center">
              <Shell className="w-5 h-5 text-green-300" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">DUTA TORTOISE FARM</p>
              <p className="text-xs text-green-400">Tortoise Digital Passport</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700/40 text-xs font-medium hover:bg-green-700/60 transition-colors">
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Tersalin!" : "Salin Link"}
            </button>
            <button onClick={handleShareWA}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/60 text-xs font-medium hover:bg-green-600/80 transition-colors">
              <Share2 className="w-3.5 h-3.5" /> WA
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CARD ── */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Foto + Nama */}
        <div className="bg-green-800/40 rounded-3xl border border-green-700/30 overflow-hidden shadow-2xl">
          {/* Foto */}
          <div className="p-4">
            <PhotoCarousel photos={photos} />
          </div>
          {/* Nama & Status */}
          <div className="px-5 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{tortoise.name}</h1>
                <p className="text-green-300 text-sm mt-0.5">{tortoise.code || "—"}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${isSick ? "bg-red-500/80 text-white" : "bg-green-500/80 text-white"}`}>
                {isSick ? "🏥 Sakit" : "✓ Sehat"}
              </div>
            </div>

            {/* Grid info */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { label: "Spesies", value: speciesLabel[tortoise.species] || tortoise.species || "—" },
                { label: "Morph", value: (tortoise.morph || "normal").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) },
                { label: "Jenis Kelamin", value: tortoise.gender === "jantan" ? "♂ Jantan" : tortoise.gender === "betina" ? "♀ Betina" : "? Belum Diketahui" },
                { label: "Umur", value: getAge(tortoise.birth_date) },
                { label: "Berat", value: tortoise.weight_grams ? `${tortoise.weight_grams.toLocaleString("id-ID")} gram` : "—" },
                { label: "Panjang Cangkang", value: tortoise.shell_length_cm ? `${tortoise.shell_length_cm} cm` : "—" },
                { label: "Asal", value: tortoise.source === "hasil_sendiri" ? "🐣 CBB Duta Tortoise" : (tortoise.source || "—").replace(/_/g, " ").toUpperCase() },
                { label: "Status", value: (tortoise.status || "aktif").replace(/_/g, " ").toUpperCase() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-green-900/40 rounded-xl p-3">
                  <p className="text-[10px] text-green-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold mt-0.5 leading-snug">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── STATUS KESEHATAN ── */}
        <div className="bg-green-800/40 rounded-2xl border border-green-700/30 p-4">
          <h2 className="text-sm font-bold text-green-300 uppercase tracking-wide mb-3">Status Kesehatan</h2>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${isSick ? "bg-red-900/40 border border-red-700/40" : "bg-green-900/40 border border-green-700/40"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isSick ? "bg-red-500/30" : "bg-green-500/30"}`}>
              {isSick ? "🏥" : "✓"}
            </div>
            <div>
              <p className="font-semibold">{isSick ? "Dalam Perawatan" : "Kondisi Sehat"}</p>
              {lastHealth && (
                <p className="text-xs text-green-400">Terakhir cek: {lastHealth.date ? format(new Date(lastHealth.date), "d MMM yyyy", { locale: id }) : "—"}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── SILSILAH ── */}
        {(tortoise.parent_male || tortoise.parent_female) && (
          <div className="bg-green-800/40 rounded-2xl border border-green-700/30 p-4">
            <h2 className="text-sm font-bold text-green-300 uppercase tracking-wide mb-3">Silsilah (CBB)</h2>
            <div className="grid grid-cols-2 gap-3">
              {tortoise.parent_male && (
                <div className="bg-blue-900/30 rounded-xl p-3">
                  <p className="text-[10px] text-blue-300 uppercase tracking-wide">♂ Ayah</p>
                  <p className="font-semibold mt-0.5">{tortoise.parent_male}</p>
                </div>
              )}
              {tortoise.parent_female && (
                <div className="bg-pink-900/30 rounded-xl p-3">
                  <p className="text-[10px] text-pink-300 uppercase tracking-wide">♀ Ibu</p>
                  <p className="font-semibold mt-0.5">{tortoise.parent_female}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GRAFIK PERTUMBUHAN ── */}
        {growthData.length > 1 && (
          <div className="bg-green-800/40 rounded-2xl border border-green-700/30 p-4">
            <h2 className="text-sm font-bold text-green-300 uppercase tracking-wide mb-3">Grafik Pertumbuhan Berat (kg)</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={growthData}>
                <XAxis dataKey="date" tick={{ fill: "#86efac", fontSize: 10 }} />
                <YAxis tick={{ fill: "#86efac", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8 }}
                  labelStyle={{ color: "#86efac" }}
                  itemStyle={{ color: "#4ade80" }}
                />
                <Line type="monotone" dataKey="berat" stroke="#4ade80" strokeWidth={2} dot={{ r: 4, fill: "#4ade80" }} name="Berat (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── SERTIFIKAT & QR ── */}
        <div className="bg-gradient-to-br from-green-700/60 to-green-900/60 rounded-2xl border border-green-600/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs text-green-400 uppercase tracking-widest mb-1">Nomor Sertifikat</p>
              <p className="text-xl font-bold font-mono tracking-wider">{certNumber}</p>
              <p className="text-xs text-green-400 mt-2">Diterbitkan oleh Duta Tortoise Farm</p>
              <p className="text-xs text-green-500 mt-0.5">Scan QR untuk verifikasi keaslian</p>
            </div>
            <div className="flex-shrink-0">
              <QRDisplay url={passportUrl} />
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="text-center py-4 border-t border-green-700/30 space-y-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shell className="w-5 h-5 text-green-400" />
            <span className="font-bold text-green-300">DUTA TORTOISE FARM</span>
          </div>
          {settings?.company_address && <p className="text-xs text-green-500">{settings.company_address}{settings.company_city ? `, ${settings.company_city}` : ""}</p>}
          {settings?.company_phone && <p className="text-xs text-green-500">📱 {settings.company_phone}</p>}
          {settings?.company_email && <p className="text-xs text-green-500">✉️ {settings.company_email}</p>}
          <p className="text-[10px] text-green-700 mt-3">Passport ini dapat diverifikasi dengan memindai QR Code di atas.</p>
        </div>
      </div>
    </div>
  );
}