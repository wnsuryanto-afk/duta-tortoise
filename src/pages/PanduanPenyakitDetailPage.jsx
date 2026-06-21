import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Pencil, Package, BookOpen, Plus } from "lucide-react";
import { CATEGORY_CONFIG, SEVERITY_CONFIG } from "./PanduanPenyakitPage";
import DiagnosisProtocolForm from "@/components/health/DiagnosisProtocolForm";
import DiseaseImageUpload from "@/components/health/DiseaseImageUpload";

export default function PanduanPenyakitDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role } = useCurrentUser();
  const canEdit = ["owner", "admin"].includes(role);
  const [showForm, setShowForm] = useState(false);
  const [addingImage, setAddingImage] = useState(false);

  const isNew = id === "new";

  const { data: protocol, isLoading } = useQuery({
    queryKey: ["diagnosis-protocol", id],
    queryFn: async () => {
      if (isNew) return null;
      const res = await base44.entities.DiagnosisProtocol.filter({});
      return res.find(p => p.id === id) || null;
    },
    enabled: !isNew,
    staleTime: 5 * 60 * 1000,
  });

  const handleImageSaved = () => {
    qc.invalidateQueries({ queryKey: ["diagnosis-protocol", id] });
    qc.invalidateQueries({ queryKey: ["diagnosis-protocols-catalog"] });
    setAddingImage(false);
  };

  if (isNew) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/panduan-penyakit")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
        </Button>
        <DiagnosisProtocolForm
          open={true}
          editData={null}
          onClose={() => navigate("/panduan-penyakit")}
          onSaved={() => navigate("/panduan-penyakit")}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="font-medium">Penyakit tidak ditemukan</p>
        <Button variant="outline" onClick={() => navigate("/panduan-penyakit")} className="mt-3 gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>
      </div>
    );
  }

  const cat = CATEGORY_CONFIG[protocol.category] || CATEGORY_CONFIG.lainnya;
  const sev = SEVERITY_CONFIG[protocol.severity_default] || SEVERITY_CONFIG.ringan;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate("/panduan-penyakit")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Katalog
        </Button>
        {canEdit && (
          <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
            <Pencil className="w-4 h-4" /> Edit
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cat.color}`}>{cat.label}</span>
        {protocol.severity_default && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sev.color}`}>{sev.label}</span>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-heading font-bold">{protocol.diagnosis_name}</h1>
        {protocol.diagnosis_name_en && (
          <p className="text-muted-foreground italic text-sm mt-0.5">{protocol.diagnosis_name_en}</p>
        )}
      </div>

      {/* Image */}
      <Card className="overflow-hidden relative">
        {protocol.image_url ? (
          <div>
            <img src={protocol.image_url} alt={protocol.diagnosis_name} className="w-full max-h-80 object-cover" />
            {protocol.image_caption && (
              <p className="text-xs text-muted-foreground px-4 py-2 bg-muted/30 border-t">{protocol.image_caption}</p>
            )}
            {canEdit && !addingImage && (
              <div className="absolute top-2 right-2">
                <Button variant="secondary" size="sm" className="gap-1.5 shadow-md" onClick={() => setAddingImage(true)}>
                  <Plus className="w-3.5 h-3.5" /> Ganti Gambar
                </Button>
              </div>
            )}
            {canEdit && addingImage && (
              <div className="p-3 bg-background/95 backdrop-blur border-t space-y-2">
                <DiseaseImageUpload protocolId={id} onSaved={handleImageSaved} />
                <Button size="sm" variant="ghost" onClick={() => setAddingImage(false)}>Batal</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada gambar</p>
            {canEdit && !addingImage && (
              <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setAddingImage(true)}>
                <Plus className="w-4 h-4" /> Tambah Gambar
              </Button>
            )}
            {canEdit && addingImage && (
              <div className="mt-3 w-full space-y-2">
                <DiseaseImageUpload protocolId={id} onSaved={handleImageSaved} />
                <Button size="sm" variant="ghost" onClick={() => setAddingImage(false)}>Batal</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Gejala */}
      {protocol.gejala_utama?.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-base mb-3">🔍 Gejala Utama</h2>
          <ul className="space-y-1.5">
            {protocol.gejala_utama.map((g, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span> {g}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Treatment Items */}
      {protocol.treatment_items?.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-base mb-3">💊 Penanganan / Obat</h2>
          <div className="space-y-3">
            {protocol.treatment_items.map((item, i) => (
              <div key={i} className="border rounded-xl p-3 bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <p className="font-semibold text-sm">{item.obat_name}</p>
                  {item.obat_sku && (
                    <Link to="/stok-unified" className="text-xs text-primary hover:underline">SKU: {item.obat_sku}</Link>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                  {item.dosis_mg_per_kg && <span>💉 {item.dosis_mg_per_kg} mg/kg</span>}
                  {item.dosis_ml_per_kg && <span>💉 {item.dosis_ml_per_kg} ml/kg</span>}
                  {item.rute && <span>📍 {item.rute}</span>}
                  {item.frekuensi && <span>🔄 {item.frekuensi}</span>}
                  {item.durasi_hari && <span>📅 {item.durasi_hari} hari</span>}
                </div>
                {item.catatan_dosis && (
                  <p className="text-xs text-orange-600 mt-1.5 bg-orange-50 px-2 py-1 rounded">📝 {item.catatan_dosis}</p>
                )}
              </div>
            ))}
          </div>
          <Link to="/stok-unified">
            <Button variant="outline" size="sm" className="mt-3 gap-2">
              <Package className="w-4 h-4" /> Cek Stok Obat di Gudang
            </Button>
          </Link>
        </Card>
      )}

      {/* Perawatan Pendukung */}
      {protocol.perawatan_pendukung?.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-base mb-3">🩹 Perawatan Pendukung</h2>
          <ul className="space-y-1.5">
            {protocol.perawatan_pendukung.map((p, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span> {p}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Catatan Penting */}
      {protocol.catatan_penting && (
        <Card className="p-5 border-orange-200 bg-orange-50/50">
          <h2 className="font-semibold text-base mb-2 text-orange-800">⚠️ Catatan Penting</h2>
          <p className="text-sm text-orange-900">{protocol.catatan_penting}</p>
        </Card>
      )}

      {/* Kapan ke Drh */}
      {protocol.kapan_ke_drh && (
        <Card className="p-5 border-red-200 bg-red-50/50">
          <h2 className="font-semibold text-base mb-2 text-red-800">🏥 Kapan ke Dokter Hewan</h2>
          <p className="text-sm text-red-900">{protocol.kapan_ke_drh}</p>
        </Card>
      )}

      {showForm && (
        <DiagnosisProtocolForm
          open={showForm}
          editData={protocol}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["diagnosis-protocol", id] });
            qc.invalidateQueries({ queryKey: ["diagnosis-protocols-catalog"] });
          }}
        />
      )}
    </div>
  );
}