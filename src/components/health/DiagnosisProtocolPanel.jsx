import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Stethoscope, Pill, Heart, BookOpen,
} from "lucide-react";
import { getCareIcon, getRouteIcon, getSeverityConfig } from "@/lib/careIconUtils";

/**
 * DiagnosisProtocolPanel — READ-ONLY panel yang menampilkan protokol
 * penanganan (gejala, perawatan, obat & dosis, catatan penting) berdasarkan
 * diagnosis yang dipilih. Muncul di form Health Record dan di detail/list.
 *
 * Props:
 *  - diagnoses: string[] (kode diagnosis)
 *  - protocols: optional pre-fetched DiagnosisProtocol[] (kalau sudah ada di parent)
 */
export default function DiagnosisProtocolPanel({ diagnoses, protocols: prefetched }) {
  const { data: fetched = [] } = useQuery({
    queryKey: ["diagnosis-protocols"],
    queryFn: () => base44.entities.DiagnosisProtocol.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
    enabled: !prefetched,
  });

  const protocols = prefetched || fetched;
  const selected = diagnoses || [];

  if (!selected.length) return null;

  const matched = selected.map((d) => ({
    diagnosis: d,
    protocol: protocols.find((p) => p.diagnosis_code === d || p.diagnosis_name === d) || null,
  }));

  const hasAnyMatch = matched.some((m) => m.protocol);

  if (!hasAnyMatch) {
    return (
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border">
        ℹ️ Belum ada protokol penanganan untuk diagnosis ini.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {matched.map(({ diagnosis, protocol }, i) =>
        protocol ? (
          <ProtocolCard key={i} protocol={protocol} />
        ) : (
          <div
            key={i}
            className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border"
          >
            ℹ️ Belum ada protokol penanganan untuk: {diagnosis}
          </div>
        )
      )}
    </div>
  );
}

function ProtocolCard({ protocol }) {
  const imgUrl = protocol.images?.[0]?.url || protocol.image_url;
  const sevConfig = getSeverityConfig(protocol.severity_default);

  return (
    <Card className="p-0 overflow-hidden border-l-4 border-l-[#1B4332] bg-[#F0F7F2]/40">
      {/* ── FOTO PENYAKIT BESAR ── */}
      <div className="w-full" style={{ height: "160px" }}>
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={protocol.diagnosis_name}
            className="w-full h-full object-cover"
            style={{ borderRadius: "12px" }}
          />
        ) : (
          <div
            className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1"
            style={{ borderRadius: "12px" }}
          >
            <span className="text-3xl">📷</span>
            <p className="text-[11px] text-muted-foreground">Belum ada foto — minta owner lengkapi</p>
          </div>
        )}
      </div>

      {/* ── HEADER: NAMA PENYAKIT + SEVERITY BADGE ── */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base text-[#1B4332] leading-tight">{protocol.diagnosis_name}</p>
            {protocol.diagnosis_name_en && (
              <p className="text-[11px] text-muted-foreground italic mt-0.5">{protocol.diagnosis_name_en}</p>
            )}
          </div>
          {protocol.severity_default && (
            <span
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border flex-shrink-0 ${sevConfig.bg} ${sevConfig.text} ${sevConfig.border}`}
            >
              {sevConfig.emoji} {sevConfig.label}
            </span>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        {/* ── GEJALA UTAMA ── */}
        {protocol.gejala_utama?.length > 0 && (
          <Section title="Gejala Utama" icon={Stethoscope}>
            <ul className="space-y-0.5">
              {protocol.gejala_utama.map((g, i) => (
                <li key={i} className="text-xs flex gap-1.5">
                  <span className="text-[#1B4332]">•</span> {g}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── PERAWATAN PENDUKUNG — KARTU BERNOMOR + IKON ── */}
        {protocol.perawatan_pendukung?.length > 0 && (
          <Section title="Perawatan Pendukung" icon={Heart}>
            <div className="space-y-1.5">
              {protocol.perawatan_pendukung.map((p, i) => {
                const icon = getCareIcon(p);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 bg-white/70 rounded-lg px-2.5 py-2 border border-border"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-lg flex-shrink-0 leading-tight">{icon}</span>
                    <p className="text-xs leading-relaxed pt-0.5">{p}</p>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── OBAT & DOSIS — KARTU DENGAN IKON RUTE ── */}
        {protocol.treatment_items?.length > 0 && (
          <Section title="Obat & Dosis" icon={Pill}>
            <div className="space-y-1.5">
              {protocol.treatment_items.map((item, i) => {
                const routeIcon = getRouteIcon(item.rute);
                return (
                  <div key={i} className="bg-white/70 rounded-lg px-2.5 py-2 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg flex-shrink-0">{routeIcon}</span>
                      <span className="font-semibold text-sm text-[#1B4332]">{item.obat_name}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm ml-7">
                      {(item.dosis_mg_per_kg != null || item.dosis_ml_per_kg != null) && (
                        <span className="text-muted-foreground font-medium">
                          💊 {item.dosis_mg_per_kg != null ? `${item.dosis_mg_per_kg} mg/kg` : `${item.dosis_ml_per_kg} ml/kg`}
                        </span>
                      )}
                      {item.frekuensi && (
                        <span className="text-muted-foreground font-medium">⏰ {item.frekuensi}</span>
                      )}
                      {item.durasi_hari != null && (
                        <span className="text-muted-foreground font-medium">📅 {item.durasi_hari} hari</span>
                      )}
                    </div>
                    {item.rute && (
                      <p className="text-[10px] text-muted-foreground ml-7 mt-0.5">Rute: {item.rute}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── CATATAN PENTING ── */}
        {protocol.catatan_penting && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 mb-1.5 mt-1">
            <p className="text-[11px] font-bold text-[#E76F00] flex items-center gap-1 mb-0.5">
              <AlertTriangle className="w-3 h-3" /> Catatan Penting
            </p>
            <p className="text-xs text-orange-800">{protocol.catatan_penting}</p>
          </div>
        )}

        {/* ── KAPAN KE DOKTER HEWAN ── */}
        {protocol.kapan_ke_drh && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mb-2 mt-1">
            <p className="text-[11px] font-bold text-red-700 flex items-center gap-1 mb-0.5">
              <Stethoscope className="w-3 h-3" /> Kapan ke Dokter Hewan
            </p>
            <p className="text-xs text-red-800">{protocol.kapan_ke_drh}</p>
          </div>
        )}

        {/* ── LIHAT PANDUAN LENGKAP ── */}
        <Link
          to={`/panduan-penyakit/${protocol.id}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-[#1B4332] hover:underline font-medium"
        >
          <BookOpen className="w-3 h-3" /> Lihat Panduan Lengkap
        </Link>
      </div>
    </Card>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="mb-2.5">
      <p className="text-[11px] font-bold text-[#1B4332] flex items-center gap-1 mb-1.5">
        <Icon className="w-3 h-3" /> {title}
      </p>
      {children}
    </div>
  );
}