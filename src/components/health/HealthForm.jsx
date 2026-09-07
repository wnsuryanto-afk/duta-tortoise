import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { perubahanSembuh, perubahanSakit } from "@/lib/statusKura";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, X, Upload, Pencil, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import DiagnosisPanel, { DIAGNOSIS_CATEGORIES } from "./DiagnosisPanel";
import DiagnosisProtocolPanel from "./DiagnosisProtocolPanel";
import CareTaskSuggestionPanel from "./CareTaskSuggestionPanel";
import DosisKalkulator from "./DosisKalkulator";
import TreatmentItemsPicker from "./TreatmentItemsPicker";
import TortoiseSearchSelect from "./TortoiseSearchSelect";
import { useTestMode } from "@/lib/useTestMode";
import { terapkanPemakaianObat, menjadiPengeluaran } from "@/lib/pemakaianObat";
import { toast } from "sonner";

const SEVERITY_OPTIONS = [
  { value: "ringan",  label: "🟢 Ringan" },
  { value: "sedang",  label: "🟡 Sedang" },
  { value: "berat",   label: "🔴 Berat" },
  { value: "kritis",  label: "⚫ Kritis" },
];

export default function HealthForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const { testModeTag } = useTestMode();
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-active"],
    queryFn: () => base44.entities.Tortoise.filter({ status: "aktif" }, "-created_date", 500),
  });

  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-items", "-name", 500],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 500),
  });

  const { data: feedStocks = [] } = useQuery({
    queryKey: ["feedstocks", "-name", 300],
    queryFn: () => base44.entities.FeedStock.list("-name", 300),
  });

  const { data: diagnosisProtocols = [] } = useQuery({
    queryKey: ["diagnosis-protocols"],
    queryFn: () => base44.entities.DiagnosisProtocol.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const [form, setForm] = useState(editData || {
    tortoise_name: "", tortoise_id: "",
    date: new Date().toISOString().split("T")[0],
    type: "checkup",
    diagnoses: [],
    severity: "",
    description: "", treatment: "", vet_name: "",
    biaya_obat: 0,
    biaya_obat_manual: false,
    treatment_items: [],
    photo_urls: [],
  });
  const [editBiayaManual, setEditBiayaManual] = useState(editData?.biaya_obat_manual || false);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleTortoiseSelect = (id) => {
    const t = tortoises.find((t) => t.id === id);
    setForm((prev) => ({ ...prev, tortoise_id: id, tortoise_name: t?.name || "" }));
  };

  const toggleDiagnosis = (d) => {
    setForm(prev => {
      const current = prev.diagnoses || [];
      if (current.includes(d)) return { ...prev, diagnoses: current.filter(x => x !== d) };
      return { ...prev, diagnoses: [...current, d] };
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingPhotos(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(prev => ({ ...prev, photo_urls: [...(prev.photo_urls || []), ...urls] }));
    setUploadingPhotos(false);
  };

  const treatmentItems = form.treatment_items || [];
  const autoTotalBiaya = treatmentItems.reduce((s, it) => s + (it.subtotal || 0), 0);
  const hasOverStock = treatmentItems.some(it => it.quantity > (it._available_stock ?? 0));

  const handleTreatmentItemsChange = (newItems) => {
    setForm(prev => {
      const total = newItems.reduce((s, it) => s + (it.subtotal || 0), 0);
      return {
        ...prev,
        treatment_items: newItems,
        // jika tidak manual override, update biaya_obat otomatis
        biaya_obat: editBiayaManual ? prev.biaya_obat : total,
        biaya_obat_manual: editBiayaManual,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasOverStock) return;
    setSaving(true);
    // Bersihkan _available_stock sebelum simpan
    const cleanItems = (form.treatment_items || []).map(({ _available_stock, ...it }) => it);
    const data = {
      ...form,
      treatment_items: cleanItems,
      biaya_obat: Number(form.biaya_obat) || 0,
      biaya_obat_manual: editBiayaManual,
      last_edited_by: (await base44.auth.me().catch(() => null))?.email || "sistem",
    };
    let savedRecord;
    if (editData?.id) {
      savedRecord = await base44.entities.HealthRecord.update(editData.id, data);
    } else {
      savedRecord = await base44.entities.HealthRecord.create({ ...data, ...testModeTag });
    }

    // ── Obat yang diberikan mengurangi stok gudang ──
    //
    // Sebelum ini tidak ada satu pun jalur di aplikasi yang mengurangi stok
    // karena pengobatan, jadi angka stok obat hanya pernah naik. Itu yang
    // membuat gudang terbaca 505 ampul Vitamin B dan 22 ampul Oxytocin.
    //
    // Dihitung sebagai SELISIH terhadap catatan lama, supaya menyimpan ulang
    // catatan yang sudah ada tidak memotong stok untuk kedua kalinya.
    if (cleanItems.length > 0 || (editData?.treatment_items || []).length > 0) {
      const { gagal } = await terapkanPemakaianObat({
        record: { ...data, id: savedRecord?.id || editData?.id },
        itemsLama: editData?.treatment_items || [],
        itemsBaru: cleanItems,
        user: await base44.auth.me().catch(() => null),
        tandaUji: testModeTag,
      });
      // Stok yang meleset diam-diam adalah persis cacat yang sedang diperbaiki
      // di sini, jadi kegagalannya disebutkan.
      if (gagal.length > 0) {
        toast.error(`Stok ${gagal.length} obat gagal disesuaikan — ${gagal[0]}`);
      }
    }
    // ── Sambungkan catatan kesehatan ke status kura ──
    // Sebelumnya HealthRecord dibuat tanpa pernah menandai kuranya, sehingga
    // penghitung "Sakit" di Daftar Kura selalu 0 meski ada catatan sakit aktif.
    if (data.tortoise_id) {
      try {
        // Status sebelum sakit dibaca dari kuranya sendiri; menebak "aktif"
        // membuat kura baby kehilangan klasifikasinya setelah sembuh.
        const kura = tortoises.find((t) => t.id === data.tortoise_id);
        if (data.type === "sakit") {
          await base44.entities.Tortoise.update(data.tortoise_id, perubahanSakit(kura, data.date));
        } else if (data.type === "sembuh") {
          await base44.entities.Tortoise.update(data.tortoise_id, perubahanSembuh(kura, data.date));
        }
      } catch {
        // Gagal memperbarui status tidak boleh membatalkan catatan yang sudah tersimpan.
      }
    }

    // Catatan keuangan HANYA untuk obat yang dibeli dadakan di luar stok.
    //
    // Obat yang diambil dari gudang sudah dibiayakan saat DIBELI — dua puluh
    // pembelian yang ada semuanya sudah masuk laba rugi begitu barangnya
    // diterima. Mencatatnya lagi di sini menghitung rupiah yang sama dua kali.
    // Biayanya tetap tersimpan pada catatan kesehatan sebagai atribusi ke kura
    // yang bersangkutan, hanya tidak menjadi pengeluaran baru.
    if (menjadiPengeluaran(data)) {
      const diagDesc = (data.diagnoses || []).slice(0, 2).join(", ");
      const txDesc = `Obat: ${data.tortoise_name}${diagDesc ? " - " + diagDesc : ""}`;
      const existingTxId = editData?.finance_tx_id;
      if (existingTxId) {
        await base44.entities.FinanceTransaction.update(existingTxId, {
          amount: data.biaya_obat,
          date: data.date,
          description: txDesc,
        });
      } else {
        const tx = await base44.entities.FinanceTransaction.create({
          type: "pengeluaran",
          category: "obat_perawatan",
          amount: data.biaya_obat,
          date: data.date,
          description: txDesc,
          reference_id: savedRecord?.id || editData?.id || "",
          ...testModeTag,
        });
        if (tx?.id && savedRecord?.id) {
          await base44.entities.HealthRecord.update(savedRecord.id, { finance_tx_id: tx.id });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
    }
    queryClient.invalidateQueries({ queryKey: ["health"] });
    queryClient.invalidateQueries({ queryKey: ["health-records"] });
    queryClient.invalidateQueries({ queryKey: ["health-records-all"] });
    setSaving(false);
    onClose();
  };

  const typeLabels = {
    checkup: "Checkup", sakit: "Sakit", sembuh: "Sembuh", obat: "Obat",
    vaksin: "Vaksin", timbang: "Timbang", lainnya: "Lainnya",
  };

  const selectedDiagnoses = form.diagnoses || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editData?.id ? "Edit Catatan" : "Tambah Catatan Kesehatan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Row 1: Tortoise + Tanggal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tortoise *</Label>
              {tortoises.length > 0 ? (
                <TortoiseSearchSelect tortoises={tortoises} value={form.tortoise_id} onChange={handleTortoiseSelect} />
              ) : (
                <Input value={form.tortoise_name} onChange={(e) => handleChange("tortoise_name", e.target.value)} required />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal *</Label>
              <Input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
            </div>
          </div>

          {/* Row 2: Jenis + Dokter Hewan */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Jenis *</Label>
              <Select value={form.type} onValueChange={(v) => handleChange("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dokter Hewan</Label>
              <Input value={form.vet_name} onChange={(e) => handleChange("vet_name", e.target.value)} />
            </div>
          </div>

          {/* Diagnosis */}
          <div className="space-y-2">
            <Label>Diagnosis / Penyakit (pilih semua yang berlaku)</Label>
            <div className="border rounded-xl p-3 space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(DIAGNOSIS_CATEGORIES).map(([cat, diseases]) => (
                <div key={cat}>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {diseases.map(d => (
                      <button
                        key={d} type="button"
                        onClick={() => toggleDiagnosis(d)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                          selectedDiagnoses.includes(d)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-border"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {selectedDiagnoses.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {selectedDiagnoses.map(d => (
                    <Badge key={d} variant="secondary" className="gap-1 text-xs">
                      {d}
                      <button type="button" onClick={() => toggleDiagnosis(d)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                {(() => {
                  const links = selectedDiagnoses.map(d => {
                    const p = diagnosisProtocols.find(p => p.diagnosis_code === d || p.diagnosis_name === d);
                    return p ? { name: d, id: p.id } : null;
                  }).filter(Boolean);
                  if (links.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-2">
                      {links.map(l => (
                        <Link
                          key={l.id}
                          to={`/panduan-penyakit/${l.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <BookOpen className="w-3 h-3" /> Lihat Panduan Lengkap: {l.name}
                        </Link>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Panduan Penanganan otomatis berdasarkan diagnosis */}
          <DiagnosisProtocolPanel diagnoses={selectedDiagnoses} protocols={diagnosisProtocols} />

          {/* Saran tugas perawatan untuk keeper (semi-otomatis) */}
          <CareTaskSuggestionPanel
            diagnoses={selectedDiagnoses}
            severity={form.severity}
            type={form.type}
            tortoiseId={form.tortoise_id}
            tortoiseName={form.tortoise_name}
            tortoiseCode={tortoises.find((t) => t.id === form.tortoise_id)?.code}
            protocols={diagnosisProtocols}
          />

          {/* Tingkat Keparahan */}
          <div className="space-y-2">
            <Label>Tingkat Keparahan</Label>
            <div className="flex gap-2 flex-wrap">
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => handleChange("severity", form.severity === opt.value ? "" : opt.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    form.severity === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} placeholder="Kondisi umum, gejala yang terlihat..." />
          </div>

          {/* Penanganan */}
          <div className="space-y-1.5">
            <Label>Penanganan / Obat</Label>
            <Textarea value={form.treatment} onChange={(e) => handleChange("treatment", e.target.value)} rows={2} placeholder="Obat yang diberikan, dosis, frekuensi..." />
          </div>

          {/* Section Obat & Perlengkapan — hanya untuk type sakit/obat */}
          {(form.type === "sakit" || form.type === "obat") && (
            <div className="space-y-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-sm font-semibold text-orange-900">💊 Obat & Perlengkapan Dipakai</p>
              <TreatmentItemsPicker
                items={form.treatment_items || []}
                warehouseItems={warehouseItems}
                onChange={handleTreatmentItemsChange}
              />
              {hasOverStock && (
                <p className="text-xs text-red-600 font-medium">⛔ Jumlah melebihi stok tersedia. Kurangi qty terlebih dahulu.</p>
              )}

              {/* Biaya Obat */}
              <div className="space-y-1 pt-1 border-t border-orange-200">
                <div className="flex items-center justify-between">
                  <Label className="text-orange-800 text-sm">Total Biaya (Rp)</Label>
                  {treatmentItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditBiayaManual(!editBiayaManual)}
                      className="text-xs text-orange-600 underline flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      {editBiayaManual ? "Gunakan otomatis" : "Edit manual"}
                    </button>
                  )}
                </div>
                {!editBiayaManual && treatmentItems.length > 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-orange-200">
                    <span className="font-semibold text-orange-900">Rp {autoTotalBiaya.toLocaleString("id-ID")}</span>
                    <span className="text-xs text-muted-foreground">(otomatis dari item dipilih)</span>
                  </div>
                ) : (
                  <Input
                    type="number" min={0}
                    value={form.biaya_obat || ""}
                    onChange={(e) => handleChange("biaya_obat", e.target.value)}
                    placeholder="0"
                    className="bg-card"
                  />
                )}
                <p className="text-xs text-orange-700">💡 Biaya ini otomatis masuk laporan keuangan (Obat & Perawatan)</p>
              </div>
            </div>
          )}

          {/* Foto */}
          <div className="space-y-1.5">
            <Label>Foto Dokumentasi (opsional)</Label>
            <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted transition-colors text-sm text-muted-foreground">
              <Upload className="w-4 h-4" />
              {uploadingPhotos ? "Mengupload..." : "Pilih Foto (bisa multiple)"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhotos} />
            </label>
            {form.photo_urls?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {form.photo_urls.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, photo_urls: prev.photo_urls.filter((_, j) => j !== i) }))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kalkulator Dosis Otomatis */}
          <DosisKalkulator
            selectedDiagnoses={selectedDiagnoses}
            tortoiseId={form.tortoise_id}
            tortoises={tortoises}
            onSalinTreatment={(ringkasan) => handleChange("treatment", ringkasan)}
          />

          {/* Auto-panel panduan */}
          <DiagnosisPanel
            selectedDiagnoses={selectedDiagnoses}
            warehouseItems={warehouseItems}
            feedStocks={feedStocks}
            diagnosisProtocols={diagnosisProtocols}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving || uploadingPhotos || hasOverStock}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editData?.id ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}