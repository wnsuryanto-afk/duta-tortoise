import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Printer, Plus, Wifi, Network, Usb, Star, Trash2, Edit2, Zap,
  CheckCircle2, XCircle, Loader2, Info, ChevronRight, ChevronLeft,
  AlertTriangle, Settings2, MapPin, RefreshCw
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import AccessDenied from "@/components/common/AccessDenied";

// ── Constants ──────────────────────────────────────────────────────────────
const CONN_TYPES = {
  usb_dialog: {
    label: "USB / Browser",
    icon: Usb,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    badge: "🔌 USB",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  lan: {
    label: "LAN / Kabel",
    icon: Network,
    color: "bg-green-100 text-green-700 border-green-200",
    badge: "🔗 LAN/Kabel",
    badgeClass: "bg-green-100 text-green-700",
  },
  wifi: {
    label: "WiFi",
    icon: Wifi,
    color: "bg-purple-100 text-purple-700 border-purple-200",
    badge: "📶 WiFi",
    badgeClass: "bg-purple-100 text-purple-700",
  },
};

const PAPER_SIZES = ["40x30mm", "50x30mm", "100x100mm", "100x150mm", "108x80mm"];

const EMPTY_FORM = {
  name: "", model: "XP-4208", connection_type: "usb_dialog",
  ip_address: "", port: 9100, paper_size: "100x150mm",
  print_density: 8, print_speed: 4, location: "", is_active: true,
  is_default: false, notes: "",
};

// ── Sub-components ─────────────────────────────────────────────────────────
function ConnTypeCard({ type, selected, onSelect }) {
  const cfg = CONN_TYPES[type];
  const Icon = cfg.icon;

  const descriptions = {
    usb_dialog: {
      desc: "Printer terhubung via USB ke komputer. Akan menggunakan dialog print browser.",
      pros: "Setup paling mudah, tinggal install driver.",
      cocok: "Printer yang hanya punya port USB"
    },
    lan: {
      desc: "Printer terhubung ke router via kabel LAN. Gunakan IP address printer.",
      pros: "Stabil, kecepatan tinggi.",
      cocok: "Printer dengan port RJ45 (kabel ethernet)"
    },
    wifi: {
      desc: "Printer terhubung ke WiFi rumah. Gunakan IP address dari router.",
      pros: "Fleksibel tanpa kabel.",
      cocok: "Printer dengan modul WiFi bawaan"
    },
  };
  const d = descriptions[type];

  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/40 hover:bg-muted/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{cfg.badge}</span>
            {selected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.desc}</p>
          <p className="text-[11px] text-primary/70 mt-1.5 font-medium">✓ {d.pros}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Cocok untuk: {d.cocok}</p>
        </div>
      </div>
    </button>
  );
}

function PrinterCard({ printer, onEdit, onDelete, onSetDefault, onTestPrint }) {
  const cfg = CONN_TYPES[printer.connection_type] || CONN_TYPES.usb_dialog;
  const Icon = cfg.icon;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{printer.name}</h3>
              {printer.is_default && (
                <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3" /> Default
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{printer.model || "XP-4208"}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.badgeClass}`}>
                {cfg.badge}
              </span>
              {printer.paper_size && (
                <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {printer.paper_size}
                </span>
              )}
              {printer.location && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{printer.location}
                </span>
              )}
            </div>
            {(printer.connection_type === "lan" || printer.connection_type === "wifi") && printer.ip_address && (
              <p className="text-[11px] text-muted-foreground mt-1">
                IP: <span className="font-mono">{printer.ip_address}:{printer.port || 9100}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => onTestPrint(printer)}>
          <Zap className="w-3 h-3" /> Tes Print
        </Button>
        {!printer.is_default && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => onSetDefault(printer)}>
            <Star className="w-3 h-3" /> Set Default
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => onEdit(printer)}>
          <Edit2 className="w-3 h-3" /> Edit
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => onDelete(printer)}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Add/Edit Dialog ──────────────────────────────────────────────────────────
function PrinterFormDialog({ open, onClose, editPrinter }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(editPrinter ? 2 : 1);
  const [form, setForm] = useState(editPrinter ? { ...editPrinter } : { ...EMPTY_FORM });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'fail'

  const isEdit = !!editPrinter;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.PrinterConfig.update(editPrinter.id, data)
      : base44.entities.PrinterConfig.create(data),
    onSuccess: () => {
      qc.invalidateQueries(["printers"]);
      toast.success(isEdit ? "Printer diperbarui" : "Printer berhasil ditambahkan");
      onClose();
    },
  });

  const handleTestConnection = async () => {
    if (form.connection_type === "usb_dialog") {
      setTestResult("ok");
      return;
    }
    if (!form.ip_address) {
      toast.error("Masukkan IP address terlebih dahulu");
      return;
    }
    setTesting(true);
    setTestResult(null);
    // For LAN/WiFi, we can only do a basic fetch check since direct TCP is blocked by browser
    try {
      await fetch(`http://${form.ip_address}:${form.port || 9100}`, {
        method: "GET", mode: "no-cors", signal: AbortSignal.timeout(3000),
      });
      setTestResult("ok");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => saveMutation.mutate(form);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            {isEdit ? "Edit Printer" : `Tambah Printer — Langkah ${step}/2`}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose connection type */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pilih cara menghubungkan printer XP-4208:</p>
            {Object.keys(CONN_TYPES).map(type => (
              <ConnTypeCard
                key={type}
                type={type}
                selected={form.connection_type === type}
                onSelect={v => set("connection_type", v)}
              />
            ))}
            <DialogFooter>
              <Button onClick={() => setStep(2)} className="w-full gap-2">
                Lanjut <ChevronRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Connection type reminder */}
            <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium ${CONN_TYPES[form.connection_type].color}`}>
              {(() => { const I = CONN_TYPES[form.connection_type].icon; return <I className="w-4 h-4 flex-shrink-0" />; })()}
              Mode: {CONN_TYPES[form.connection_type].badge}
              {!isEdit && (
                <button type="button" onClick={() => setStep(1)} className="ml-auto underline text-[11px] opacity-70">ubah</button>
              )}
            </div>

            {/* Common fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Nama Printer <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Contoh: XPrinter Gudang"
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Model</Label>
                <Input value={form.model} onChange={e => set("model", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lokasi</Label>
                <Input placeholder="Contoh: Gudang Depan" value={form.location} onChange={e => set("location", e.target.value)} />
              </div>
            </div>

            {/* Ukuran kertas */}
            <div className="space-y-1.5">
              <Label className="text-xs">Ukuran Kertas Default</Label>
              <Select value={form.paper_size} onValueChange={v => set("paper_size", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_SIZES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LAN/WiFi only */}
            {(form.connection_type === "lan" || form.connection_type === "wifi") && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">IP Address <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Contoh: 192.168.1.100"
                    value={form.ip_address}
                    onChange={e => set("ip_address", e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Port</Label>
                  <Input
                    type="number"
                    value={form.port}
                    onChange={e => set("port", Number(e.target.value))}
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            {/* Advanced */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Densitas Cetak (1–15)</Label>
                <Input type="number" min={1} max={15} value={form.print_density} onChange={e => set("print_density", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kecepatan (1–6)</Label>
                <Input type="number" min={1} max={6} value={form.print_speed} onChange={e => set("print_speed", Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Catatan</Label>
              <Input placeholder="Catatan opsional..." value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>

            {/* Test connection */}
            {(form.connection_type === "lan" || form.connection_type === "wifi") && (
              <div className="space-y-2">
                <Label className="text-xs">Tes Koneksi</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleTestConnection} disabled={testing}>
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Tes Sekarang
                  </Button>
                  {testResult === "ok" && (
                    <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Printer terjangkau
                    </span>
                  )}
                  {testResult === "fail" && (
                    <span className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3">
                      <XCircle className="w-3.5 h-3.5" /> Tidak terjangkau
                    </span>
                  )}
                </div>
                {testResult === "fail" && (
                  <p className="text-[11px] text-muted-foreground">Cek IP address, pastikan printer menyala, kabel terhubung, dan print bridge aktif.</p>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 flex-row">
              {!isEdit && (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Kembali
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!form.name || saveMutation.isPending}
                className="flex-1 gap-2"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {isEdit ? "Simpan Perubahan" : "Tambah Printer"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Test Print Modal ──────────────────────────────────────────────────────────
function TestPrintModal({ printer, onClose }) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    if (printer.connection_type === "usb_dialog") {
      const w = window.open("", "_blank", "width=400,height=500");
      w.document.write(`
        <html><head><title>Test Print — ${printer.name}</title>
        <style>
          @page { size: ${printer.paper_size || "100x150mm"}; margin: 4mm; }
          body { font-family: sans-serif; text-align: center; padding: 8px; }
          .big { font-size: 24px; font-weight: bold; margin: 8px 0; }
          .small { font-size: 11px; color: #666; }
          .border { border: 2px dashed #333; padding: 8px; border-radius: 4px; margin-top: 8px; }
        </style></head>
        <body>
          <p class="small">DUTA TORTOISE 🐢</p>
          <p class="big">TES CETAK</p>
          <div class="border">
            <p class="small">Printer: ${printer.name}</p>
            <p class="small">Model: ${printer.model || "XP-4208"}</p>
            <p class="small">Kertas: ${printer.paper_size || "100x150mm"}</p>
            <p class="small">Tanggal: ${new Date().toLocaleDateString("id-ID")}</p>
          </div>
          <p class="small" style="margin-top:8px">✅ Jika teks ini tercetak, printer berfungsi normal.</p>
          <script>window.onload=()=>{window.print();window.close();}<\/script>
        </body></html>
      `);
      w.document.close();
    } else {
      toast.info("Mode LAN/WiFi: kirim job ke print bridge. Pastikan bridge aktif di komputer server.");
    }
    onClose();
  };

  return (
    <Dialog open={!!printer} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Tes Print
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Akan mencetak halaman tes ke <strong>{printer?.name}</strong> ({CONN_TYPES[printer?.connection_type]?.badge}).
          </p>
          {printer?.connection_type === "usb_dialog" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              Dialog print browser akan terbuka. Pilih printer XP-4208 lalu klik Print.
            </div>
          )}
          {(printer?.connection_type === "lan" || printer?.connection_type === "wifi") && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
              Job akan dikirim ke IP <span className="font-mono">{printer?.ip_address}:{printer?.port}</span> via print bridge.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Cetak Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PrinterConfigPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editPrinter, setEditPrinter] = useState(null);
  const [testPrinter, setTestPrinter] = useState(null);

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ["printers"],
    queryFn: () => base44.entities.PrinterConfig.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PrinterConfig.delete(id),
    onSuccess: () => { qc.invalidateQueries(["printers"]); toast.success("Printer dihapus"); },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (printer) => {
      // Clear all defaults first
      await Promise.all(
        printers.filter(p => p.is_default && p.id !== printer.id)
          .map(p => base44.entities.PrinterConfig.update(p.id, { is_default: false }))
      );
      return base44.entities.PrinterConfig.update(printer.id, { is_default: true });
    },
    onSuccess: () => { qc.invalidateQueries(["printers"]); toast.success("Printer default diperbarui"); },
  });

  if (!["owner", "admin"].includes(role)) {
    return <AccessDenied message="Halaman ini hanya bisa diakses oleh Owner dan Admin." />;
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary" /> Konfigurasi Printer
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola printer label XP-4208 untuk semua keperluan cetak</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Printer
        </Button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">ℹ️ Info Penting Tentang Printing</p>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
              XP-4208 secara default datang dengan USB. Versi LAN/WiFi tersedia sebagai opsi (perlu cek spesifikasi printer Anda).
            </p>
            <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">
              <strong>Web browser tidak bisa langsung kirim print ke printer jaringan.</strong> Solusi:
            </p>
            <ul className="text-xs text-blue-700 mt-1 space-y-0.5 ml-3 list-disc">
              <li><strong>Mode USB:</strong> paling mudah, langsung pakai dialog browser</li>
              <li><strong>Mode LAN/WiFi:</strong> butuh "Print Bridge" di komputer yang selalu nyala</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2 font-medium">
              💡 Rekomendasi peternakan kecil: Pakai Mode USB dari satu komputer admin pusat.
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(CONN_TYPES).map(([k, v]) => (
          <span key={k} className={`text-xs px-3 py-1 rounded-full font-medium border ${v.badgeClass} border-current/20`}>
            {v.badge}
          </span>
        ))}
      </div>

      {/* Printer list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-muted/50 rounded-xl animate-pulse" />)}
        </div>
      ) : printers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Printer className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">Belum ada printer dikonfigurasi</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Tambah printer XP-4208 untuk mulai mencetak label</p>
          <Button onClick={() => setShowAddDialog(true)} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Tambah Printer Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {printers.map(p => (
            <PrinterCard
              key={p.id}
              printer={p}
              onEdit={setEditPrinter}
              onDelete={() => { if (confirm(`Hapus printer "${p.name}"?`)) deleteMutation.mutate(p.id); }}
              onSetDefault={() => setDefaultMutation.mutate(p)}
              onTestPrint={setTestPrinter}
            />
          ))}
        </div>
      )}

      {/* Template Labels Section */}
      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" /> Template Label Tersedia
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: "🐢 Label QR Kura-kura", size: "100×150mm", desc: "QR profil, nama, morph, gender, berat, kandang", color: "bg-green-50 border-green-200" },
            { title: "📦 Label Barcode Gudang", size: "50×30mm", desc: "Barcode Code128, nama item, stok, expired", color: "bg-blue-50 border-blue-200" },
            { title: "📮 Label Pengiriman", size: "100×150mm", desc: "Nama pembeli, alamat, QR tracking, order ID", color: "bg-amber-50 border-amber-200" },
            { title: "🏠 Label Identitas Kandang", size: "100×100mm", desc: "Nama kandang, kapasitas, QR list kura-kura", color: "bg-purple-50 border-purple-200" },
          ].map((t, i) => (
            <div key={i} className={`p-3.5 rounded-xl border ${t.color}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
                <span className="text-[10px] bg-white/70 border border-current/20 rounded-full px-2 py-0.5 font-mono flex-shrink-0 ml-2">
                  {t.size}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Template dapat diakses dari halaman Kura-kura, Gudang, dan Penjualan via tombol "Print Label".</p>
      </div>

      {/* Dialogs */}
      {(showAddDialog || editPrinter) && (
        <PrinterFormDialog
          open={showAddDialog || !!editPrinter}
          onClose={() => { setShowAddDialog(false); setEditPrinter(null); }}
          editPrinter={editPrinter}
        />
      )}
      {testPrinter && (
        <TestPrintModal printer={testPrinter} onClose={() => setTestPrinter(null)} />
      )}
    </div>
  );
}