import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Stethoscope, Pill, Heart, BookOpen, ImageOff,
} from "lucide-react";

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

  return (
    <Card className="p-3 border-l-4 border-l-[#1B4332] bg-[#F0F7F2]/40">
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={protocol.diagnosis_name}
            className="w-14 h-14 rounded-lg object-cover border flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <ImageOff className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[#1B4332]">{protocol.diagnosis_name}</p>
          {protocol.diagnosis_name_en && (
            <p className="text-[11px] text-muted-foreground italic">{protocol.diagnosis_name_en}</p>
          )}
          {protocol.severity_default && (
            <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-[#E76F00] font-medium">
              {protocol.severity_default}
            </span>
          )}
        </div>
      </div>

      {/* Gejala Utama */}
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

      {/* Perawatan Pendukung */}
      {protocol.perawatan_pendukung?.length > 0 && (
        <Section title="Perawatan Pendukung" icon={Heart}>
          <ul className="space-y-0.5">
            {protocol.perawatan_pendukung.map((p, i) => (
              <li key={i} className="text-xs flex gap-1.5">
                <span className="text-[#1B4332]">•</span> {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Obat & Dosis */}
      {protocol.treatment_items?.length > 0 && (
        <Section title="Obat & Dosis" icon={Pill}>
          <div className="space-y-1">
            {protocol.treatment_items.map((item, i) => (
              <div key={i} className="text-xs bg-white/60 rounded-lg px-2 py-1.5 border border-border">
                <span className="font-semibold text-[#1B4332]">{item.obat_name}</span>
                {item.dosis_mg_per_kg != null && (
                  <span className="text-muted-foreground"> — {item.dosis_mg_per_kg} mg/kg</span>
                )}
                {item.dosis_ml_per_kg != null && (
                  <span className="text-muted-foreground"> — {item.dosis_ml_per_kg} ml/kg</span>
                )}
                {item.rute && <span className="text-muted-foreground"> — {item.rute}</span>}
                {item.frekuensi && <span className="text-muted-foreground"> — {item.frekuensi}</span>}
                {item.durasi_hari != null && (
                  <span className="text-muted-foreground"> — {item.durasi_hari} hari</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Catatan Penting */}
      {protocol.catatan_penting && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 mb-1.5">
          <p className="text-[11px] font-bold text-[#E76F00] flex items-center gap-1 mb-0.5">
            <AlertTriangle className="w-3 h-3" /> Catatan Penting
          </p>
          <p className="text-xs text-orange-800">{protocol.catatan_penting}</p>
        </div>
      )}

      {/* Kapan ke Dokter Hewan */}
      {protocol.kapan_ke_drh && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mb-2">
          <p className="text-[11px] font-bold text-red-700 flex items-center gap-1 mb-0.5">
            <Stethoscope className="w-3 h-3" /> Kapan ke Dokter Hewan
          </p>
          <p className="text-xs text-red-800">{protocol.kapan_ke_drh}</p>
        </div>
      )}

      {/* Lihat Panduan Lengkap */}
      <Link
        to={`/panduan-penyakit/${protocol.id}`}
        target="_blank"
        className="inline-flex items-center gap-1 text-xs text-[#1B4332] hover:underline font-medium"
      >
        <BookOpen className="w-3 h-3" /> Lihat Panduan Lengkap
      </Link>
    </Card>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="mb-2">
      <p className="text-[11px] font-bold text-[#1B4332] flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3" /> {title}
      </p>
      {children}
    </div>
  );
}