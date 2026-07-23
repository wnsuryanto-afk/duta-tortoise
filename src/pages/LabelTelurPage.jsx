import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Egg, RefreshCw } from "lucide-react";
import { format, addDays } from "date-fns";
import { id } from "date-fns/locale";

function Barcode({ value, width = 200, height = 48 }) {
  if (!value) return null;
  const bars = [];
  let x = 0;
  const seed = [3,1,2,3,1,2,1,3,2,1,1,3,2,2,1,2,3,1,2,2,2,1,3,1,4,1,1,3,4,2];
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    const w = seed[c % seed.length] + 1;
    if (i % 2 === 0) bars.push({ x, w });
    x += w * 3 + 1;
  }
  bars.push({ x: 0, w: 1 });
  bars.push({ x: x + 4, w: 1 });
  const totalW = x + 8 || 1;
  const scale = width / totalW;
  return (
    <svg width={width} height={height}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x * scale} y={0} width={Math.max(b.w * scale - 0.5, 1)} height={height - 12} fill="#000" />
      ))}
      <text x={width / 2} y={height} textAnchor="middle" fontSize="7" fill="#555" fontFamily="monospace">
        {value}
      </text>
    </svg>
  );
}

function generateKode(jantanCode, betinaCode, tgl) {
  if (!jantanCode || !betinaCode || !tgl) return "";
  const d = new Date(tgl);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `K-${dd}${mm}${yy}-${jantanCode}-${betinaCode}`;
}

function hatchEstimate(tgl) {
  if (!tgl) return "-";
  return format(addDays(new Date(tgl), 90), "dd MMMM yyyy", { locale: id });
}

function LabelCetak({ jantan, betina, tglBertelur, jumlahTelur, inkubator, kode }) {
  const tglStr = tglBertelur
    ? format(new Date(tglBertelur), "dd MMMM yyyy", { locale: id })
    : "-";

  return (
    <div
      id="label-print-area"
      style={{
        width: "377px",
        minHeight: "218px",
        border: "2px solid #166534",
        borderRadius: "10px",
        fontFamily: "Arial, sans-serif",
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 2px 14px rgba(0,0,0,0.13)",
      }}
    >
      {/* Header */}
      <div style={{ background: "#166534", color: "#fff", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>🐢 DUTA TORTOISE</div>
          <div style={{ fontSize: "9px", opacity: 0.7 }}>Label Kotak Telur Inkubasi</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "9px", opacity: 0.85 }}>{tglStr}</div>
          <div style={{ fontSize: "9px", fontWeight: "bold", background: "#fff", color: "#166534", borderRadius: "4px", padding: "1px 7px", marginTop: "3px" }}>
            {kode || "—"}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", padding: "10px 12px", gap: "10px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
            <div style={{ flex: 1, background: "#EFF6FF", borderRadius: "7px", padding: "5px 8px", border: "1px solid #BFDBFE" }}>
              <div style={{ fontSize: "8px", color: "#1D4ED8", fontWeight: "bold" }}>♂ JANTAN</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1E3A8A", lineHeight: 1.1 }}>{jantan?.code || "—"}</div>
              <div style={{ fontSize: "8px", color: "#64748b" }}>Kandang {jantan?.enclosure || "—"}</div>
            </div>
            <div style={{ flex: 1, background: "#FFF1F2", borderRadius: "7px", padding: "5px 8px", border: "1px solid #FECDD3" }}>
              <div style={{ fontSize: "8px", color: "#BE123C", fontWeight: "bold" }}>♀ BETINA</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#881337", lineHeight: 1.1 }}>{betina?.code || "—"}</div>
              <div style={{ fontSize: "8px", color: "#64748b" }}>Kandang {betina?.enclosure || "—"}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            {[
              ["🥚 Jumlah Telur", jumlahTelur ? `${jumlahTelur} butir` : "—"],
              ["📦 Inkubator", inkubator || "—"],
              ["📅 Tanggal Bertelur", tglStr],
              ["🐣 Perkiraan Menetas", hatchEstimate(tglBertelur)],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "#F8FAFC", borderRadius: "5px", padding: "4px 6px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "7px", color: "#94A3B8", marginBottom: "1px" }}>{label}</div>
                <div style={{ fontSize: "9px", fontWeight: "bold", color: "#1E293B" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "96px", gap: "4px" }}>
          <Barcode value={kode || "DUTATORTO"} width={88} height={58} />
          <div style={{ background: "#166534", color: "#fff", borderRadius: "5px", padding: "2px 8px", fontSize: "8px", fontWeight: "bold" }}>
            F2 · Captive-bred
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LabelTelurPage() {
  const [jantanId, setJantanId] = useState("");
  const [betinaId, setBetinaId] = useState("");
  const [tglBertelur, setTglBertelur] = useState(new Date().toISOString().split("T")[0]);
  const [jumlahTelur, setJumlahTelur] = useState("");
  const [inkubator, setInkubator] = useState("Inkubator 1");

  const { data: tortoises = [], isLoading } = useQuery({
    queryKey: ["tortoises-label"],
    queryFn: () => base44.entities.Tortoise.list({ status: "aktif" }),
  });

  const { data: incubators = [] } = useQuery({
    queryKey: ["incubators"],
    queryFn: () => base44.entities.Incubator.list({ is_active: true }),
  });

  const jantanList = tortoises.filter(t => t.gender === "jantan");
  const betinaList = tortoises.filter(t => t.gender === "betina");
  const jantan = jantanList.find(t => t.id === jantanId);
  const betina = betinaList.find(t => t.id === betinaId);
  const kode = generateKode(jantan?.code, betina?.code, tglBertelur);
  const ready = jantanId && betinaId && tglBertelur;

  const inkubatorOptions = incubators.length > 0
    ? incubators.map(i => i.name)
    : ["Inkubator 1", "Inkubator 2", "Inkubator 3", "Inkubator 4"];

  const handlePrint = () => {
    const el = document.getElementById("label-print-area");
    if (!el) return;
    const w = window.open("", "_blank", "width=520,height=420");
    w.document.write(`<!DOCTYPE html><html><head><title>Label Telur - ${kode}</title>
      <style>body{margin:8mm;background:white;}@media print{body{margin:3mm;}@page{size:105mm 62mm;margin:0;}}</style>
      </head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="min-h-screen bg-green-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-green-800 text-white rounded-xl p-4 mb-5 flex items-center gap-3">
          <Egg className="w-6 h-6" />
          <div>
            <h1 className="text-lg font-bold">Label Kotak Telur</h1>
            <p className="text-green-200 text-xs">Cetak label inkubasi dengan barcode — ukuran 10×6 cm</p>
          </div>
        </div>

        <div className="flex gap-5 flex-wrap">
          {/* Form */}
          <Card className="flex-none w-72">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-800">📋 Isi Data Kopling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Memuat data kura...
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs text-blue-700 font-semibold">♂ Pilih Jantan</Label>
                    <Select value={jantanId} onValueChange={setJantanId}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="-- Pilih Jantan --" /></SelectTrigger>
                      <SelectContent>
                        {jantanList.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.code} ({t.enclosure})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-rose-700 font-semibold">♀ Pilih Betina</Label>
                    <Select value={betinaId} onValueChange={setBetinaId}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="-- Pilih Betina --" /></SelectTrigger>
                      <SelectContent>
                        {betinaList.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.code} ({t.enclosure})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">📅 Tanggal Bertelur</Label>
                    <Input type="date" value={tglBertelur} onChange={e => setTglBertelur(e.target.value)} className="mt-1 text-sm" />
                  </div>

                  <div>
                    <Label className="text-xs">🥚 Jumlah Telur</Label>
                    <Input type="number" min={1} max={30} placeholder="Contoh: 8" value={jumlahTelur}
                      onChange={e => setJumlahTelur(e.target.value)} className="mt-1 text-sm" />
                  </div>

                  <div>
                    <Label className="text-xs">📦 Inkubator</Label>
                    <Select value={inkubator} onValueChange={setInkubator}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {inkubatorOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {kode && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                      <div className="text-xs text-gray-500">Kode Kopling:</div>
                      <div className="font-bold text-green-800 text-sm">{kode}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Est. menetas: {hatchEstimate(tglBertelur)}</div>
                    </div>
                  )}

                  <Button onClick={handlePrint} disabled={!ready} className="w-full bg-green-800 hover:bg-green-700">
                    <Printer className="w-4 h-4 mr-2" /> Print Label
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="flex-1 min-w-80">
            <div className="text-xs font-semibold text-green-800 mb-3">👁️ Preview Label (10×6 cm)</div>
            <LabelCetak jantan={jantan} betina={betina} tglBertelur={tglBertelur}
              jumlahTelur={jumlahTelur} inkubator={inkubator} kode={kode} />
            {!ready && <p className="text-xs text-gray-400 mt-3">← Pilih jantan, betina, dan tanggal untuk melihat preview.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
