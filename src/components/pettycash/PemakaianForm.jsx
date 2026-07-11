import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, AlertTriangle, Camera, X, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/useImageCompression";
import { PETTYCASH_CATS as PEMAKAIAN_CATS } from "@/lib/financeCategories";
import { usePettyCashCategories } from "@/hooks/useEntityCategories";
import { logActivity } from "@/lib/logActivity";

export default function PemakaianForm({ currentSaldo, user, role, onClose, onSaved }) {
  const [qty, setQty] = useState("");
  const [hargaSatuan, setHargaSatuan] = useState("");
  const [amountManual, setAmountManual] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [proofPhoto, setProofPhoto] = useState("");
  const [noNota, setNoNota] = useState(false);
  const [noNotaReason, setNoNotaReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOver, setConfirmOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanWarning, setScanWarning] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [scanDateInfo, setScanDateInfo] = useState(false);
  const [scanDateWarning, setScanDateWarning] = useState(false);
  const { cats: pettyCats } = usePettyCashCategories();

  // Kalau qty & harga_satuan keduanya diisi → auto total; kalau tidak, pakai manual
  const qtyNum = Number(qty) || 0;
  const hargaNum = Number(hargaSatuan) || 0;
  const autoTotal = qtyNum > 0 && hargaNum > 0 ? Math.round(qtyNum * hargaNum) : null;
  const amt = autoTotal !== null ? autoTotal : (Number(amountManual) || 0);
  const isOver = amt > currentSaldo;

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) { toast.error("Format harus JPG/PNG/WEBP"); return; }
    setUploading(true);
    try {
      let f = file;
      if (file.size > 500 * 1024) {
        const res = await compressImage(file, { maxWidthOrHeight: 1280, quality: 0.8 });
        f = res.file;
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setProofPhoto(file_url);
    } catch { toast.error("Gagal upload foto"); }
    setUploading(false);
  };

  const handleScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) { toast.error("Format harus JPG/PNG/WEBP"); return; }
    setScanning(true);
    setScanWarning(false);
    setScanError(false);
    setScanDateInfo(false);
    setScanDateWarning(false);
    try {
      let f = file;
      if (file.size > 500 * 1024) {
        const res = await compressImage(file, { maxWidthOrHeight: 1280, quality: 0.8 });
        f = res.file;
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setProofPhoto(file_url);
      setNoNota(false);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: "Baca struk/nota belanja Indonesia ini. Ekstrak dalam JSON: total (angka rupiah), tanggal (YYYY-MM-DD, jika tidak ada pakai null), keterangan (ringkasan barang, maks 10 kata), kategori (pilih satu: obat/vitamin/pakan/peralatan_kandang/transportasi/solar_bbm/rokok/konsumsi/lainnya), qty (angka atau null), harga_satuan (angka atau null). Jika bukan nota atau tidak terbaca, kembalikan {\"error\": true}.",
        response_json_schema: {
          type: "object",
          properties: {
            total: { type: "number" },
            tanggal: { type: "string" },
            keterangan: { type: "string" },
            kategori: { type: "string" },
            qty: { type: "number" },
            harga_satuan: { type: "number" },
            error: { type: "boolean" }
          }
        },
        file_urls: [file_url],
      });

      if (result?.error) {
        setScanError(true);
      } else if (result) {
        if (result.qty && result.harga_satuan) {
          setQty(String(Math.round(result.qty)));
          setHargaSatuan(String(Math.round(result.harga_satuan)));
          setAmountManual("");
        } else if (result.total) {
          setAmountManual(String(Math.round(result.total)));
          setQty("");
          setHargaSatuan("");
        }
        if (result.keterangan) setDescription(result.keterangan);
        // Validate scanned date: null/invalid → today; suspicious year → today + warning
        const todayStr = new Date().toISOString().split("T")[0];
        const currentYear = new Date().getFullYear();
        const rawDate = result.tanggal;
        let parsedDate = null;
        if (rawDate && rawDate !== "null" && rawDate !== "undefined") {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) parsedDate = d;
        }
        if (!parsedDate) {
          setEntryDate(todayStr);
          setScanDateInfo(true);
          setScanDateWarning(false);
        } else {
          const yr = parsedDate.getFullYear();
          if (yr < 2025 || yr > currentYear) {
            setEntryDate(todayStr);
            setScanDateInfo(false);
            setScanDateWarning(true);
          } else {
            const y = parsedDate.getFullYear();
            const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
            const d = String(parsedDate.getDate()).padStart(2, "0");
            setEntryDate(`${y}-${m}-${d}`);
            setScanDateInfo(false);
            setScanDateWarning(false);
          }
        }
        const validCats = (pettyCats.length ? pettyCats : PEMAKAIAN_CATS).map(c => c.value);
        if (result.kategori && validCats.includes(result.kategori)) setCategory(result.kategori);
        setScanWarning(true);
      }
    } catch (err) {
      setScanError(true);
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!amt || amt <= 0) { toast.error("Nominal harus > 0"); return; }
    if (!category) { toast.error("Pilih kategori"); return; }
    if (!description.trim()) { toast.error("Keterangan wajib diisi"); return; }
    if (!proofPhoto && !noNota) { toast.error("Foto nota wajib. Atau centang 'Tidak ada nota' dengan alasan."); return; }
    if (noNota && !noNotaReason.trim()) { toast.error("Alasan 'tidak ada nota' wajib diisi"); return; }
    if (isOver && !confirmOver) { setConfirmOver(true); return; }
    setSaving(true);
    try {
      const balanceAfter = Math.round(currentSaldo - amt);
      const byName = user?.full_name || user?.email || "Admin";
      if (!byName) { toast.error("Data pengguna belum dimuat, coba refresh halaman."); setSaving(false); return; }
      const ledgerPayload = {
        entry_type: "pemakaian",
        amount: amt,
        balance_after: balanceAfter,
        category,
        description: description.trim(),
        entry_date: entryDate,
        proof_photo: noNota ? undefined : (proofPhoto || undefined),
        notes: noNota ? noNotaReason.trim() : undefined,
        recorded_by_name: byName,
        recorded_by_email: user?.email || "",
        recorded_by_role: role || "admin",
      };
      if (qtyNum > 0) ledgerPayload.qty = qtyNum;
      if (hargaNum > 0) ledgerPayload.harga_satuan = hargaNum;

      const ledger = await base44.entities.PettyCashLedger.create(ledgerPayload);

      // Bangun label deskripsi dengan qty × harga jika ada
      const txDesc = qtyNum > 0 && hargaNum > 0
        ? `${description.trim()} — ${qtyNum} × Rp ${hargaNum.toLocaleString("id-ID")} = Rp ${amt.toLocaleString("id-ID")}`
        : description.trim();

      const txPayload = {
        type: "pengeluaran",
        category: "kas_kecil",
        amount: amt,
        date: entryDate,
        description: txDesc,
        reference_id: ledger.id,
        created_by_name: byName,
      };
      if (qtyNum > 0) txPayload.qty = qtyNum;
      if (hargaNum > 0) txPayload.harga_satuan = hargaNum;

      const tx = await base44.entities.FinanceTransaction.create(txPayload);
      if (tx?.id) {
        await base44.entities.PettyCashLedger.update(ledger.id, { finance_tx_id: tx.id });
      }
      await logActivity({
        action: "create",
        entity_type: "PettyCashLedger",
        entity_id: ledger.id,
        entity_name: `Kas kecil — ${description.trim()}`,
        changes_summary: `Mencatat pemakaian kas kecil "${description.trim()}" sebesar Rp ${amt.toLocaleString("id-ID")} (${category})`,
      });
      // Recalculate all balance_after to ensure chain consistency (handles backdated entries)
      await base44.functions.invoke('recalculatePettyCashBalance', {});
      toast.success("Pemakaian dicatat & masuk Laba Rugi!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {/* Scan Nota Otomatis */}
      <label className="flex items-center justify-center gap-2 w-full p-3 bg-primary/10 border-2 border-dashed border-primary/40 rounded-lg cursor-pointer hover:bg-primary/15 text-primary font-semibold text-sm transition-colors">
        {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
        {scanning ? "Membaca nota..." : "📷 Scan Nota"}
        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" capture="environment" className="hidden" onChange={handleScan} disabled={scanning || saving} />
      </label>
      {scanWarning && (
        <div className="flex items-center gap-2 p-2.5 bg-yellow-50 border border-yellow-300 rounded-lg text-xs text-yellow-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Hasil scan otomatis — periksa nominal sebelum simpan.</span>
        </div>
      )}
      {scanError && (
        <div className="flex items-center gap-2 p-2.5 bg-orange-50 border border-orange-300 rounded-lg text-xs text-orange-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Nota tidak terbaca, silakan isi manual.</span>
        </div>
      )}

      {/* Qty & Harga Satuan */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Qty (opsional)</Label>
          <Input
            type="number" min={0} value={qty}
            onChange={e => { setQty(e.target.value); setConfirmOver(false); }}
            placeholder="cth: 5"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Harga Satuan (Rp)</Label>
          <Input
            type="number" min={0} value={hargaSatuan}
            onChange={e => { setHargaSatuan(e.target.value); setConfirmOver(false); }}
            placeholder="cth: 20000"
            className="mt-1"
          />
        </div>
      </div>

      {/* Total */}
      <div>
        {autoTotal !== null ? (
          <>
            <Label className="text-xs text-green-700 font-semibold">
              Total Otomatis: {qtyNum} × Rp {hargaNum.toLocaleString("id-ID")} =
            </Label>
            <div className="mt-1 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-lg font-bold text-green-700">
              Rp {autoTotal.toLocaleString("id-ID")}
            </div>
          </>
        ) : (
          <>
            <Label className="text-xs">Nominal Total (Rp) *</Label>
            <Input
              type="number" min={0} value={amountManual}
              onChange={e => { setAmountManual(e.target.value); setConfirmOver(false); }}
              placeholder="0"
              className="mt-1 text-lg font-semibold"
              autoFocus
            />
          </>
        )}
      </div>

      {isOver && (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Saldo tidak cukup (sisa Rp {Number(currentSaldo).toLocaleString("id-ID")}). {confirmOver ? "Akan dilanjutkan — saldo bisa minus." : "Lanjutkan?"}</span>
        </div>
      )}

      <div>
        <Label className="text-xs">Kategori *</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            {(pettyCats.length ? pettyCats : PEMAKAIAN_CATS).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Keterangan *</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="cth: Beli pakan rumput 5kg" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Tanggal *</Label>
        <Input type="date" value={entryDate} onChange={e => { setEntryDate(e.target.value); setScanDateWarning(false); setScanDateInfo(false); }} className={`mt-1 ${scanDateWarning ? "border-yellow-400 bg-yellow-50" : ""}`} />
        {scanDateInfo && (
          <p className="text-xs text-blue-600 mt-1">ℹ️ Tanggal tidak terbaca, dipakai hari ini.</p>
        )}
        {scanDateWarning && (
          <p className="text-xs text-yellow-700 mt-1">⚠️ Tahun tanggal tidak wajar — periksa tanggal.</p>
        )}
      </div>
      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" /> Foto Nota {noNota ? "" : "*"}
        </Label>
        {!noNota && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted text-xs text-muted-foreground bg-background">
              <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : "Pilih / Ambil Foto"}
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handlePhoto} disabled={uploading || saving} />
            </label>
            {proofPhoto && (
              <div className="relative">
                <img src={proofPhoto} alt="nota" className="w-14 h-14 rounded-lg object-cover border" />
                <button type="button" onClick={() => setProofPhoto("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={noNota} onChange={e => setNoNota(e.target.checked)} className="w-4 h-4 rounded border-border" />
          <span className="text-xs text-muted-foreground">Tidak ada nota</span>
        </label>
        {noNota && (
          <Input value={noNotaReason} onChange={e => setNoNotaReason(e.target.value)} placeholder="Alasan (cth: parkir, tanpa nota) *" className="text-xs" />
        )}
      </div>
      {confirmOver && (
        <p className="text-xs text-red-600 font-medium">⚠️ Konfirmasi: Saldo akan menjadi minus (Rp {(currentSaldo - amt).toLocaleString("id-ID")})</p>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || scanning || uploading || !amt || !category || !description.trim() || (!proofPhoto && !noNota) || (noNota && !noNotaReason.trim())}
          variant={isOver ? "destructive" : "default"}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          {isOver && !confirmOver ? "Lanjutkan?" : "Catat Pemakaian"}
        </Button>
      </div>
    </div>
  );
}