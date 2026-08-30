import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clipboard, FlaskConical, CheckSquare } from "lucide-react";

const SEVERITY_COLOR = {
  ringan: "bg-green-100 text-green-700",
  sedang: "bg-yellow-100 text-yellow-700",
  berat: "bg-orange-100 text-orange-700",
  kritis: "bg-red-100 text-red-700",
};

function hitungDosis(item, beratKg) {
  if (item.dosis_ml_per_kg != null) {
    const val = (item.dosis_ml_per_kg * beratKg).toFixed(2);
    return `${val} ml`;
  }
  if (item.dosis_mg_per_kg != null) {
    const val = (item.dosis_mg_per_kg * beratKg).toFixed(1);
    return `${val} mg`;
  }
  return "Sesuai kebutuhan";
}

function buatRingkasan(protocols, beratKg) {
  const lines = [];
  for (const p of protocols) {
    lines.push(`[${p.diagnosis_name}]`);
    for (const item of p.treatment_items || []) {
      const dosis = hitungDosis(item, beratKg);
      lines.push(`- ${item.obat_name}: ${dosis} ${item.rute || ""}, ${item.frekuensi || ""} selama ${item.durasi_hari || "-"} hari`);
    }
    if (p.perawatan_pendukung?.length) {
      lines.push("Perawatan: " + p.perawatan_pendukung.join(", "));
    }
  }
  return lines.join("\n");
}

export default function DosisKalkulator({ selectedDiagnoses, tortoiseId, tortoises, onSalinTreatment }) {
  const [beratManual, setBeratManual] = useState("");

  const { data: allProtocols = [], isLoading } = useQuery({
    queryKey: ["diagnosis-protocols"],
    queryFn: () => base44.entities.DiagnosisProtocol.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  if (!selectedDiagnoses || selectedDiagnoses.length === 0) return null;

  // Cari berat kura dari entity Tortoise
  const tortoise = tortoises?.find(t => t.id === tortoiseId);
  const beratGram = tortoise?.weight_grams;
  const beratKg = beratGram ? beratGram / 1000 : (beratManual ? parseFloat(beratManual) : null);
  const needsManualBerat = !beratGram;

  // Cocokkan diagnosis dengan protokol
  const matchedProtocols = selectedDiagnoses.map(diag => {
    const protocol = allProtocols.find(p => p.diagnosis_code === diag);
    return { diag, protocol };
  });

  const hasAnyProtocol = matchedProtocols.some(m => m.protocol);
  if (!hasAnyProtocol && !isLoading) return null;

  const validProtocols = matchedProtocols.filter(m => m.protocol).map(m => m.protocol);

  const handleSalin = () => {
    if (!beratKg) return;
    const ringkasan = buatRingkasan(validProtocols, beratKg);
    onSalinTreatment(ringkasan);
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-blue-600" />
        <p className="text-sm font-bold text-blue-800">Protokol Pengobatan Otomatis</p>
      </div>

      {/* Input berat manual jika tidak ada di data */}
      {needsManualBerat && (
        <div className="flex items-center gap-3 bg-card rounded-lg border border-blue-200 p-3">
          <Label className="text-sm text-blue-800 whitespace-nowrap">Berat kura (kg):</Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            value={beratManual}
            onChange={e => setBeratManual(e.target.value)}
            placeholder="misal: 0.250"
            className="w-32 h-8 text-sm"
          />
          <p className="text-xs text-blue-600">Berat belum tersimpan di data kura</p>
        </div>
      )}
      {beratKg && (
        <p className="text-xs text-blue-700 font-medium">
          Berat: <span className="font-bold">{beratKg.toFixed(3)} kg</span>
          {beratGram && <span className="text-blue-500 ml-1">({beratGram}g dari data)</span>}
        </p>
      )}

      {isLoading && <p className="text-xs text-blue-600 animate-pulse">Memuat protokol...</p>}

      {/* Panel per diagnosis */}
      <div className="space-y-4">
        {matchedProtocols.map(({ diag, protocol }) => (
          <div key={diag} className="bg-card rounded-xl border border-blue-100 overflow-hidden">
            {/* Header diagnosis */}
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-100">
              <p className="text-sm font-semibold text-blue-900 flex-1">
                {protocol ? protocol.diagnosis_name : diag}
              </p>
              {protocol?.severity_default && (
                <Badge className={`text-xs ${SEVERITY_COLOR[protocol.severity_default]}`}>
                  {protocol.severity_default}
                </Badge>
              )}
            </div>

            {!protocol ? (
              <p className="text-xs text-muted-foreground px-3 py-2 italic">Belum ada protokol untuk diagnosis ini</p>
            ) : (
              <div className="p-3 space-y-3">
                {/* Tabel obat */}
                {protocol.treatment_items?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500">
                          <th className="text-left px-2 py-1.5 font-medium">Nama Obat</th>
                          <th className="text-left px-2 py-1.5 font-medium">Dosis Aktual</th>
                          <th className="text-left px-2 py-1.5 font-medium">Rute</th>
                          <th className="text-left px-2 py-1.5 font-medium">Frekuensi</th>
                          <th className="text-left px-2 py-1.5 font-medium">Durasi</th>
                          <th className="text-left px-2 py-1.5 font-medium">Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {protocol.treatment_items.map((item, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-2 py-2 font-medium text-slate-800">{item.obat_name}</td>
                            <td className="px-2 py-2">
                              {beratKg ? (
                                <span className="font-bold text-blue-700">{hitungDosis(item, beratKg)}</span>
                              ) : (
                                <span className="text-slate-400 italic">Isi berat dulu</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-slate-600">{item.rute || "-"}</td>
                            <td className="px-2 py-2 text-slate-600">{item.frekuensi || "-"}</td>
                            <td className="px-2 py-2 text-slate-600">{item.durasi_hari ? `${item.durasi_hari} hari` : "-"}</td>
                            <td className="px-2 py-2 text-slate-500 text-xs">{item.catatan_dosis || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Tidak ada item obat di protokol ini</p>
                )}

                {/* Catatan penting */}
                {protocol.catatan_penting && (
                  <div className="flex gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800">{protocol.catatan_penting}</p>
                  </div>
                )}

                {/* Perawatan pendukung */}
                {protocol.perawatan_pendukung?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-600">Perawatan Pendukung:</p>
                    <ul className="space-y-0.5">
                      {protocol.perawatan_pendukung.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                          <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Kapan ke drh */}
                {protocol.kapan_ke_drh && (
                  <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-700">⚠️ Kapan Harus ke Dokter Hewan:</p>
                      <p className="text-xs text-red-700 mt-0.5">{protocol.kapan_ke_drh}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tombol salin */}
      {validProtocols.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!beratKg}
          onClick={handleSalin}
          className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100 w-full"
        >
          <Clipboard className="w-3.5 h-3.5" />
          {beratKg ? "Salin ke Field Treatment" : "Isi berat terlebih dahulu"}
        </Button>
      )}
    </div>
  );
}