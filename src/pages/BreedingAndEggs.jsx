import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Egg, Thermometer, Droplets, AlertTriangle, Edit, Calendar, MoreVertical, Printer } from "lucide-react";
import BreedingCardMenu from "@/components/breeding/BreedingCardMenu";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { id } from "date-fns/locale";
import BreedingForm from "@/components/breeding/BreedingForm";
import HatchDialog from "@/components/breeding/HatchDialog";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, getPerms } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import PageTooltip from "@/components/tutorial/PageTooltip";
import { calculateIncubatorEggs, getClutchesInIncubator, isIncubatorFull, isIncubatorNearFull } from "@/lib/breedingUtils";
import BreedingStatsSection from "@/components/breeding/BreedingStatsSection";
import EggGrid from "@/components/breeding/EggGrid";
import ClutchOffspringSection from "@/components/breeding/ClutchOffspringSection";

const statusColors = {
  kawin: "bg-accent/10 text-accent border-accent/20",
  bertelur: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  inkubasi: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  menetas: "bg-primary/10 text-primary border-primary/20",
  gagal: "bg-destructive/10 text-destructive border-destructive/20",
  selesai: "bg-green-100 text-green-800 border-green-400",
};

function IncubatorForm({ incubator, onClose, onSaved }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: incubator?.name || "",
    capacity_eggs: incubator?.capacity_eggs || "",
    temp_setting: incubator?.temp_setting || "",
    humidity_setting: incubator?.humidity_setting || "",
    brand: incubator?.brand || "",
    is_active: incubator?.is_active !== false,
    notes: incubator?.notes || "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // NOTE: current_eggs TIDAK ADA DI FORM - dihitung otomatis dari Breeding

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      capacity_eggs: form.capacity_eggs ? Number(form.capacity_eggs) : undefined,
      temp_setting: form.temp_setting ? Number(form.temp_setting) : undefined,
      humidity_setting: form.humidity_setting ? Number(form.humidity_setting) : undefined,
    };
    if (incubator?.id) {
      await base44.entities.Incubator.update(incubator.id, data);
    } else {
      await base44.entities.Incubator.create(data);
    }
    qc.invalidateQueries({ queryKey: ["incubators"] });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Nama Inkubator <span className="text-red-500">*</span></Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Inkubator 1" className="mt-0.5" required />
        </div>
        <div>
          <Label className="text-xs">Kapasitas Telur</Label>
          <Input type="number" min={0} value={form.capacity_eggs} onChange={e => set("capacity_eggs", e.target.value)} placeholder="50" className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Suhu Setting (°C)</Label>
          <Input type="number" step="0.1" value={form.temp_setting} onChange={e => set("temp_setting", e.target.value)} placeholder="30.5" className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Kelembapan Setting (%)</Label>
          <Input type="number" step="1" min={0} max={100} value={form.humidity_setting} onChange={e => set("humidity_setting", e.target.value)} placeholder="80" className="mt-0.5" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Merk Inkubator</Label>
          <Input value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="Merk inkubator..." className="mt-0.5" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Catatan</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className="mt-0.5 resize-none" />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
          <Label className="text-sm">Inkubator Aktif</Label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button type="submit" className="flex-1" disabled={saving || !form.name}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

// ── Label Telur helpers (module-level) ──────────────────────────
function generateKodeLabel(jCode, bCode, tgl) {
  if (!jCode || !bCode || !tgl) return "";
  const d = new Date(tgl);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = String(d.getFullYear()).slice(2);
  return `K-${dd}${mm}${yy}-${jCode}-${bCode}`;
}

function hatchEstimateLabel(tgl) {
  if (!tgl) return "-";
  const d = new Date(tgl);
  d.setDate(d.getDate() + 90);
  return format(d, "d MMMM yyyy", { locale: id });
}

function QRCodeBox({ value, size=90 }) {
  const [svg, setSvg] = useState("");
  useEffect(()=>{
    if (!value) return;
    setSvg("");
    import("qrcode").then(QRCode=>{
      QRCode.toString(value,{type:"svg",width:size,margin:1,color:{dark:"#166534",light:"#ffffff"}},
        (err,str)=>{ if (!err) setSvg(str); }
      );
    });
  },[value,size]);
  if (!svg) return <div style={{width:size,height:size,background:"#f0fdf4",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#aaa"}}>QR...</div>;
  return <div dangerouslySetInnerHTML={{__html:svg}} style={{width:size,height:size}} />;
}

function LabelPreviewCard({ jantan, betina, tglBertelur, jumlahTelur, inkubatorLabel, kode }) {
  const tglStr = tglBertelur ? format(new Date(tglBertelur), "dd MMM yyyy", { locale: id }) : "-";
  const hatch = hatchEstimateLabel(tglBertelur);
  return (
    <div id="label-print-area" style={{width:"400px",fontFamily:"'Segoe UI',Arial,sans-serif",background:"linear-gradient(135deg,#f0fdf4 0%,#fefce8 100%)",borderRadius:"16px",border:"2.5px solid #16a34a",overflow:"hidden",boxShadow:"0 4px 20px rgba(22,163,74,0.15)"}}>
      <div style={{background:"linear-gradient(90deg,#15803d,#16a34a,#22c55e)",padding:"10px 14px",display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{fontSize:"28px",lineHeight:1}}>🐢</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:"800",fontSize:"15px",color:"#fff",letterSpacing:"0.5px"}}>DUTA TORTOISE</div>
          <div style={{fontSize:"9px",color:"#bbf7d0",marginTop:"1px"}}>Sulcata Breeding Farm · Probolinggo</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:"20px",padding:"2px 10px",fontSize:"8px",color:"#fff",fontWeight:"bold"}}>📦 {inkubatorLabel||"—"}</div>
          <div style={{fontSize:"8px",color:"#d1fae5",marginTop:"3px"}}>{tglStr}</div>
        </div>
      </div>
      <div style={{background:"#fef08a",borderBottom:"1.5px dashed #ca8a04",padding:"5px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:"8px",color:"#78350f",fontWeight:"600"}}>🔖 KODE KOPLING</div>
        <div style={{fontWeight:"800",fontSize:"11px",color:"#78350f",letterSpacing:"0.5px"}}>{kode||"—"}</div>
      </div>
      <div style={{display:"flex",padding:"10px 14px",gap:"10px",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
            <div style={{flex:1,background:"linear-gradient(135deg,#dbeafe,#eff6ff)",borderRadius:"10px",padding:"6px 8px",border:"1.5px solid #93c5fd",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-4,right:-4,fontSize:"28px",opacity:0.08}}>♂</div>
              <div style={{fontSize:"7px",color:"#1d4ed8",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>♂ Jantan</div>
              <div style={{fontSize:"20px",fontWeight:"900",color:"#1e3a8a",lineHeight:1.1,marginTop:"1px"}}>{jantan?.code||"—"}</div>
              <div style={{fontSize:"7px",color:"#3b82f6",marginTop:"1px"}}>📍 {jantan?.enclosure||"—"}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",fontSize:"14px"}}>💕</div>
            <div style={{flex:1,background:"linear-gradient(135deg,#fce7f3,#fff1f2)",borderRadius:"10px",padding:"6px 8px",border:"1.5px solid #f9a8d4",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-4,right:-4,fontSize:"28px",opacity:0.08}}>♀</div>
              <div style={{fontSize:"7px",color:"#be123c",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>♀ Betina</div>
              <div style={{fontSize:"20px",fontWeight:"900",color:"#881337",lineHeight:1.1,marginTop:"1px"}}>{betina?.code||"—"}</div>
              <div style={{fontSize:"7px",color:"#f43f5e",marginTop:"1px"}}>📍 {betina?.enclosure||"—"}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
            {[["🥚","Jumlah Telur",jumlahTelur?`${jumlahTelur} butir`:"—","#fef9c3","#713f12"],["📅","Tgl Bertelur",tglStr,"#f0fdf4","#14532d"],["🐣","Est. Menetas",hatch,"#fff7ed","#7c2d12"],["🌡","Status","Inkubasi 🔄","#f0f9ff","#0c4a6e"]].map(([icon,lbl,val,bg,col])=>(
              <div key={lbl} style={{background:bg,borderRadius:"7px",padding:"4px 6px",border:`1px solid ${col}22`}}>
                <div style={{fontSize:"7px",color:"#94a3b8",fontWeight:"500"}}>{icon} {lbl}</div>
                <div style={{fontSize:"8.5px",fontWeight:"700",color:col,marginTop:"1px"}}>{val}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"5px",flexShrink:0}}>
          <div style={{background:"#fff",borderRadius:"10px",padding:"5px",border:"2px solid #16a34a",boxShadow:"0 2px 8px rgba(22,163,74,0.15)"}}>
            <QRCodeBox value={kode||"DUTATORTO"} size={78}/>
          </div>
          <div style={{background:"#15803d",color:"#fff",borderRadius:"20px",padding:"2px 8px",fontSize:"7px",fontWeight:"700"}}>F2 · Captive-bred</div>
          <div style={{fontSize:"6px",color:"#6b7280",textAlign:"center",lineHeight:1.3}}>Scan untuk<br/>info kura</div>
        </div>
      </div>
      <div style={{background:"linear-gradient(90deg,#15803d,#16a34a)",padding:"4px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:"7px",color:"#bbf7d0"}}>🌿 Sulcata geochelone sulcata</div>
        <div style={{fontSize:"7px",color:"#bbf7d0"}}>dutatortoises.com</div>
      </div>
    </div>
  );
}

function handlePrintLabelFn(kode) {
  const el = document.getElementById("label-print-area");
  if (!el) return;
  const w = window.open("","_blank","width=520,height=420");
  w.document.write(`<!DOCTYPE html><html><head><title>Label-${kode}</title><style>body{margin:6mm;background:white;}@media print{body{margin:2mm;}@page{size:110mm 70mm;margin:0;}}</style></head><body>${el.outerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(()=>w.print(),500);
}

function LabelDialogContent({ jantanList, betinaList, incubators }) {
  const [jantanId, setJantanId] = useState("");
  const [betinaId, setBetinaId] = useState("");
  const [tglBertelur, setTglBertelur] = useState(new Date().toISOString().split("T")[0]);
  const [jumlahTelur, setJumlahTelur] = useState("");
  const [inkubatorLabel, setInkubatorLabel] = useState("");

  const jantan = jantanList.find(t => t.id === jantanId);
  const betina = betinaList.find(t => t.id === betinaId);
  const kode = generateKodeLabel(jantan?.code, betina?.code, tglBertelur);
  const ready = jantanId && betinaId && tglBertelur;

  const inkOpts = incubators.length > 0
    ? incubators.map(i => i.name)
    : ["Inkubator 1","Inkubator 2","Inkubator 3","Inkubator 4"];

  return (
    <div className="flex gap-4 flex-wrap">
      {/* Form kiri */}
      <div className="flex-none w-56 space-y-3">
        <div>
          <Label className="text-xs text-blue-700 font-semibold">♂ Pilih Jantan</Label>
          <select value={jantanId} onChange={e=>setJantanId(e.target.value)}
            className="w-full mt-1 text-sm border rounded-md px-2 py-1.5 bg-white">
            <option value="">-- Pilih Jantan --</option>
            {jantanList.map(t=><option key={t.id} value={t.id}>{t.code} ({t.enclosure})</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-rose-700 font-semibold">♀ Pilih Betina</Label>
          <select value={betinaId} onChange={e=>setBetinaId(e.target.value)}
            className="w-full mt-1 text-sm border rounded-md px-2 py-1.5 bg-white">
            <option value="">-- Pilih Betina --</option>
            {betinaList.map(t=><option key={t.id} value={t.id}>{t.code} ({t.enclosure})</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">📅 Tanggal Bertelur</Label>
          <Input type="date" value={tglBertelur} onChange={e=>setTglBertelur(e.target.value)} className="mt-1 text-sm" />
        </div>
        <div>
          <Label className="text-xs">🥚 Jumlah Telur</Label>
          <Input type="number" min={1} max={30} placeholder="Contoh: 8" value={jumlahTelur}
            onChange={e=>setJumlahTelur(e.target.value)} className="mt-1 text-sm" />
        </div>
        <div>
          <Label className="text-xs">📦 Inkubator</Label>
          <select value={inkubatorLabel} onChange={e=>setInkubatorLabel(e.target.value)}
            className="w-full mt-1 text-sm border rounded-md px-2 py-1.5 bg-white">
            <option value="">-- Pilih --</option>
            {inkOpts.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {kode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="text-xs text-gray-500">Kode Kopling:</div>
            <div className="font-bold text-green-800 text-sm">{kode}</div>
            <div className="text-xs text-gray-400 mt-0.5">Est. menetas: {hatchEstimateLabel(tglBertelur)}</div>
          </div>
        )}
        <Button onClick={()=>handlePrintLabelFn(kode)}
          disabled={!ready} className="w-full bg-green-800 hover:bg-green-700">
          <Printer className="w-4 h-4 mr-2" /> Print Label
        </Button>
      </div>
      {/* Preview kanan */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="text-xs font-semibold text-green-800 mb-2">👁️ Preview Label</div>
        <LabelPreviewCard jantan={jantan} betina={betina} tglBertelur={tglBertelur}
          jumlahTelur={jumlahTelur} inkubatorLabel={inkubatorLabel} kode={kode} />
        {!ready && <p className="text-xs text-gray-400 mt-2">← Pilih jantan & betina dulu.</p>}
      </div>
    </div>
  );
}

export default function BreedingAndEggs() {
  const queryClient = useQueryClient();
  const { role } = useCurrentUser();
  const perms = getPerms(role, "breeding");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [hatchBreeding, setHatchBreeding] = useState(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [editIncubator, setEditIncubator] = useState(null);
  const [showIncubatorForm, setShowIncubatorForm] = useState(false);
  const [activeTab, setActiveTab] = useState("pembiakan");


  const { data: breedings = [], isLoading: breedingLoading } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 200),
  });

  const { data: incubators = [], isLoading: incubatorLoading } = useQuery({
    queryKey: ["incubators"],
    queryFn: () => base44.entities.Incubator.list("-created_date", 200),
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-breeding-label"],
    queryFn: () => base44.entities.Tortoise.list("code", 500),
  });

  if (!canAccess(role, "breeding")) return <AccessDenied />;

  const handleDelete = async (breeding) => {
    if (confirm("Hapus data pembiakan ini?")) {
      await base44.entities.Breeding.delete(breeding.id);
      queryClient.invalidateQueries({ queryKey: ["breedings"] });
    }
  };

  const today = new Date();

  // KALKULASI TELUR INKUBATOR MENGGUNAKAN HELPER (SUMBER KEBENARAN TUNGGAL)
  // Fungsi calculateIncubatorEggs dan getClutchesInIncubator sekarang di-import dari breedingUtils

  // Fungsi hitung fase inkubasi
  const getIncubationPhase = (b) => {
    if (b.status === "menetas" || b.status === "gagal" || b.status === "selesai") return { fase: b.status, color: b.status === "menetas" ? "green" : b.status === "selesai" ? "green" : "gray" };
    if (!b.egg_laying_date) return null;
    const daysSince = differenceInDays(today, parseISO(b.egg_laying_date));
    const hatchStart = b.estimated_hatch_start ? parseISO(b.estimated_hatch_start) : null;
    const hatchEnd   = b.estimated_hatch_end   ? parseISO(b.estimated_hatch_end)   : null;
    const daysToStart = hatchStart ? differenceInDays(hatchStart, today) : null;
    const daysToEnd   = hatchEnd   ? differenceInDays(hatchEnd,   today) : null;

    if (daysToEnd !== null && daysToEnd < 0)  return { fase: "terlewat",    color: "gray",   daysSince, daysToStart, daysToEnd, hatchStart, hatchEnd };
    if (daysToStart !== null && daysToStart <= 0) return { fase: "aktif",   color: "red",    daysSince, daysToStart, daysToEnd, hatchStart, hatchEnd };
    if (daysToStart !== null && daysToStart <= 7) return { fase: "mendekati", color: "orange", daysSince, daysToStart, daysToEnd, hatchStart, hatchEnd };
    if (daysSince >= 60)  return { fase: "pertengahan", color: "yellow",  daysSince, daysToStart, daysToEnd, hatchStart, hatchEnd };
    return { fase: "awal", color: "green", daysSince, daysToStart, daysToEnd, hatchStart, hatchEnd };
  };

  const PHASE_STYLE = {
    awal:        { badge: "bg-green-100 text-green-800 border-green-300",   label: "🥚 Awal Inkubasi" },
    pertengahan: { badge: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "🥚 Pertengahan" },
    mendekati:   { badge: "bg-orange-100 text-orange-800 border-orange-300", label: "🥚 Mendekati Menetas" },
    aktif:       { badge: "bg-red-100 text-red-800 border-red-300",          label: "🚨 Masa Penetasan!" },
    terlewat:    { badge: "bg-gray-200 text-gray-700 border-gray-400",       label: "⚠️ Lewat Estimasi" },
    menetas:     { badge: "bg-primary/10 text-primary border-primary/30",    label: "✅ Sudah Menetas" },
    gagal:       { badge: "bg-gray-100 text-gray-600 border-gray-300",       label: "❌ Gagal" },
    selesai:     { badge: "bg-green-100 text-green-800 border-green-400",    label: "✅ Selesai" },
  };

  // Sort breedings: aktif & mendekati duluan
  const phaseOrder = { aktif: 0, mendekati: 1, terlewat: 2, pertengahan: 3, awal: 4, menetas: 5, gagal: 6, selesai: 7 };
  const sortedBreedings = [...breedings].sort((a, b) => {
    const pa = getIncubationPhase(a)?.fase || "awal";
    const pb = getIncubationPhase(b)?.fase || "awal";
    return (phaseOrder[pa] ?? 9) - (phaseOrder[pb] ?? 9);
  });
  const pembiakanBreedings = sortedBreedings.filter(b => b.status !== "selesai");

  // Telur & Inkubasi: bertelur, inkubasi, menetas, selesai
  const activeBreedings = breedings.filter(b => b.status !== "gagal" && b.status !== "selesai");
  // Riwayat: hanya yang sudah selesai difinalisasi
  const historyBreedings = breedings.filter(b => b.status === "selesai");

  // ── Label Telur helpers ──────────────────────────────────────
  const jantanList = (tortoises || []).filter(t => t.gender === "jantan");
  const betinaList = (tortoises || []).filter(t => t.gender === "betina");

  // (helpers moved to module level)

  function _removed() {
    const tglStr = tglBertelur ? format(new Date(tglBertelur), "dd MMM yyyy", { locale: id }) : "-";
    const tglLong = tglBertelur ? format(new Date(tglBertelur), "dd MMMM yyyy", { locale: id }) : "-";
    const hatch = hatchEstimateLabel(tglBertelur);
    // Warna tema pastel hijau-kuning
    const bgGrad = "linear-gradient(135deg, #f0fdf4 0%, #fefce8 100%)";
    return (
      <div id="label-print-area" style={{
        width:"400px", fontFamily:"'Segoe UI',Arial,sans-serif",
        background:bgGrad, borderRadius:"16px",
        border:"2.5px solid #16a34a", overflow:"hidden",
        boxShadow:"0 4px 20px rgba(22,163,74,0.15)"
      }}>
        {/* Header strip */}
        <div style={{
          background:"linear-gradient(90deg,#15803d,#16a34a,#22c55e)",
          padding:"10px 14px", display:"flex", alignItems:"center", gap:"10px"
        }}>
          <div style={{fontSize:"28px",lineHeight:1}}>🐢</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:"800",fontSize:"15px",color:"#fff",letterSpacing:"0.5px",textShadow:"0 1px 2px rgba(0,0,0,0.2)"}}>DUTA TORTOISE</div>
            <div style={{fontSize:"9px",color:"#bbf7d0",marginTop:"1px"}}>Sulcata Breeding Farm · Probolinggo</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:"20px",padding:"2px 10px",fontSize:"8px",color:"#fff",fontWeight:"bold",letterSpacing:"0.3px"}}>📦 {inkubatorLabel||"—"}</div>
            <div style={{fontSize:"8px",color:"#d1fae5",marginTop:"3px"}}>{tglStr}</div>
          </div>
        </div>

        {/* Kode kopling banner */}
        <div style={{background:"#fef08a",borderBottom:"1.5px dashed #ca8a04",padding:"5px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:"8px",color:"#78350f",fontWeight:"600"}}>🔖 KODE KOPLING</div>
          <div style={{fontWeight:"800",fontSize:"11px",color:"#78350f",letterSpacing:"0.5px"}}>{kode||"—"}</div>
        </div>

        {/* Body */}
        <div style={{display:"flex",padding:"10px 14px",gap:"10px",alignItems:"flex-start"}}>
          {/* Left: pasangan + info */}
          <div style={{flex:1}}>
            {/* Pasangan */}
            <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
              <div style={{flex:1,background:"linear-gradient(135deg,#dbeafe,#eff6ff)",borderRadius:"10px",padding:"6px 8px",border:"1.5px solid #93c5fd",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-4,right:-4,fontSize:"28px",opacity:0.08}}>♂</div>
                <div style={{fontSize:"7px",color:"#1d4ed8",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>♂ Jantan</div>
                <div style={{fontSize:"20px",fontWeight:"900",color:"#1e3a8a",lineHeight:1.1,marginTop:"1px"}}>{jantan?.code||"—"}</div>
                <div style={{fontSize:"7px",color:"#3b82f6",marginTop:"1px"}}>📍 {jantan?.enclosure||"—"}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",fontSize:"14px"}}>💕</div>
              <div style={{flex:1,background:"linear-gradient(135deg,#fce7f3,#fff1f2)",borderRadius:"10px",padding:"6px 8px",border:"1.5px solid #f9a8d4",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-4,right:-4,fontSize:"28px",opacity:0.08}}>♀</div>
                <div style={{fontSize:"7px",color:"#be123c",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>♀ Betina</div>
                <div style={{fontSize:"20px",fontWeight:"900",color:"#881337",lineHeight:1.1,marginTop:"1px"}}>{betina?.code||"—"}</div>
                <div style={{fontSize:"7px",color:"#f43f5e",marginTop:"1px"}}>📍 {betina?.enclosure||"—"}</div>
              </div>
            </div>

            {/* Info grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
              {[
                ["🥚","Jumlah Telur", jumlahTelur?`${jumlahTelur} butir`:"—","#fef9c3","#713f12"],
                ["📅","Tgl Bertelur", tglStr,"#f0fdf4","#14532d"],
                ["🐣","Est. Menetas", hatch,"#fff7ed","#7c2d12"],
                ["🌡","Status","Inkubasi 🔄","#f0f9ff","#0c4a6e"],
              ].map(([icon,lbl,val,bg,col])=>(
                <div key={lbl} style={{background:bg,borderRadius:"7px",padding:"4px 6px",border:`1px solid ${col}22`}}>
                  <div style={{fontSize:"7px",color:"#94a3b8",fontWeight:"500"}}>{icon} {lbl}</div>
                  <div style={{fontSize:"8.5px",fontWeight:"700",color:col,marginTop:"1px"}}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: QR */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"5px",flexShrink:0}}>
            <div style={{background:"#fff",borderRadius:"10px",padding:"5px",border:"2px solid #16a34a",boxShadow:"0 2px 8px rgba(22,163,74,0.15)"}}>
              <QRCodeBox value={kode||"DUTATORTO"} size={78}/>
            </div>
            <div style={{background:"#15803d",color:"#fff",borderRadius:"20px",padding:"2px 8px",fontSize:"7px",fontWeight:"700",letterSpacing:"0.3px"}}>F2 · Captive-bred</div>
            <div style={{fontSize:"6px",color:"#6b7280",textAlign:"center",lineHeight:1.3}}>Scan untuk<br/>info kura</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{background:"linear-gradient(90deg,#15803d,#16a34a)",padding:"4px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:"7px",color:"#bbf7d0"}}>🌿 Sulcata geochelone sulcata</div>
          <div style={{fontSize:"7px",color:"#bbf7d0"}}>dutatortoises.com</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-heading font-bold">Breeding & Telur</h1>
            <PageTooltip page="breeding" />
          </div>
          <p className="text-muted-foreground mt-1">Kelola pembiakan, inkubasi telur, dan penetasan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLabelDialog(true)}>
            <Printer className="w-4 h-4 mr-2" />
            Label Telur
          </Button>
          {perms.canCreate && (
            <Button onClick={() => { setEditData(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Data
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pembiakan">Pembiakan</TabsTrigger>
          <TabsTrigger value="telur">Telur & Inkubasi</TabsTrigger>
          <TabsTrigger value="inkubator">Inkubator</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
          <TabsTrigger value="statistik">Statistik</TabsTrigger>
        </TabsList>

        {/* TAB 1: PEMBIAKAN */}
        <TabsContent value="pembiakan" className="space-y-4">
          {breedingLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : breedings.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Egg className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Belum ada data pembiakan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pembiakanBreedings.map((b) => {
                const active = b.status !== "menetas" && b.status !== "gagal" && b.status !== "selesai";
                const phase = getIncubationPhase(b);
                const phaseStyle = phase ? (PHASE_STYLE[phase.fase] || PHASE_STYLE.awal) : null;
                const incubationDay = phase?.daysSince ?? 0;
                const incubationProgress = Math.min(100, Math.max(0, (incubationDay / 105) * 100));
                const showPulse = phase?.fase === "aktif" || phase?.fase === "mendekati";

                return (
                  <Card key={b.id} className={`p-5 hover:shadow-md transition-shadow ${
                    phase?.fase === "aktif" ? "border-red-500" :
                    phase?.fase === "mendekati" ? "border-orange-400" :
                    "border-border"
                  }`}>
                    {/* Baris 1: Foto | Nama pasangan | Badge status | ⋮ */}
                    <div className="flex items-start gap-3">
                      {b.photos?.length > 0 && (
                        <img src={b.photos[0].url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm">{b.male_name} × {b.female_name}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <Badge variant="outline" className={`text-[11px] capitalize ${statusColors[b.status] || ""}`}>
                                {b.status}
                              </Badge>
                              {phaseStyle && active && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${phaseStyle.badge} ${showPulse ? "animate-pulse" : ""}`}>
                                  {phaseStyle.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <BreedingCardMenu
                            canEdit={perms.canEdit}
                            canDelete={perms.canDelete}
                            onEdit={() => { setEditData(b); setShowForm(true); }}
                            onDelete={() => handleDelete(b)}
                            onHatch={() => setHatchBreeding(b)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alert pulsing untuk aktif/mendekati */}
                    {active && showPulse && (
                      <div className={`mt-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${
                        phase?.fase === "aktif" ? "bg-red-100 text-red-800 border border-red-300" : "bg-orange-100 text-orange-800 border border-orange-300"
                      } animate-pulse`}>
                        ⚠️ Pantau telur — mendekati waktu menetas
                      </div>
                    )}

                    {/* Info */}
                    <div className="mt-3 text-xs space-y-1.5">
                      {b.egg_laying_date && (
                        <p className="text-muted-foreground">H+{incubationDay} dari {format(new Date(b.egg_laying_date), "d MMM yyyy", { locale: id })}</p>
                      )}
                      {phase?.hatchStart && phase?.hatchEnd && (
                        <p className="text-muted-foreground">Estimasi menetas: {format(phase.hatchStart, "d MMM", { locale: id })} s/d {format(phase.hatchEnd, "d MMM yyyy", { locale: id })}</p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {b.egg_count > 0 && <span>{b.egg_count} butir telur</span>}
                        {b.incubator_name && <span>📦 {b.incubator_name}</span>}
                        {b.incubation_temp > 0 && <span>🌡 {b.incubation_temp}°C</span>}
                        {b.status === "menetas" && b.hatched_count > 0 && <span className="text-primary font-medium">{b.hatched_count} ekor 🐢</span>}
                        {b.hatch_date && b.status === "menetas" && <span>{format(new Date(b.hatch_date), "d MMM yyyy", { locale: id })}</span>}
                      </div>
                    </div>

                    {/* Progress Bar Inkubasi */}
                    {active && b.egg_laying_date && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress inkubasi</span>
                          <span className="font-semibold">{Math.round(incubationProgress)}%</span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${incubationProgress}%`,
                              background: incubationDay < 60
                                ? 'linear-gradient(90deg, #22c55e, #84cc16)'
                                : incubationDay < 80
                                ? 'linear-gradient(90deg, #eab308, #f59e0b)'
                                : 'linear-gradient(90deg, #ef4444, #dc2626)'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {b.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{b.notes}</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: TELUR & INKUBASI */}
        <TabsContent value="telur" className="space-y-4">
          {breedingLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : [...activeBreedings, ...breedings.filter(b => b.status === "selesai")].length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Egg className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Tidak ada telur aktif dalam inkubasi</p>
            </div>
          ) : (
            <div className="space-y-6">
              {[...activeBreedings, ...breedings.filter(b => b.status === "selesai")].map((b) => {
                const startDate = b.estimated_hatch_date_start ? parseISO(b.estimated_hatch_date_start) : null;
                const endDate = b.estimated_hatch_date_end ? parseISO(b.estimated_hatch_date_end) : null;
                const hatchDate = b.estimated_hatch_date ? new Date(b.estimated_hatch_date) : null;
                const daysToStart = startDate ? differenceInDays(startDate, today) : (hatchDate ? differenceInDays(hatchDate, today) : null);
                const daysToEnd = endDate ? differenceInDays(endDate, today) : null;
                const inHatchRange = daysToStart !== null && daysToEnd !== null && daysToStart <= 0 && daysToEnd >= 0;
                const incubationDay = b.egg_laying_date ? differenceInDays(today, new Date(b.egg_laying_date)) : 0;
                const incubationProgress = Math.min(100, Math.max(0, (incubationDay / 105) * 100));

                const countdownDays = daysToStart;
                const countdownColor = countdownDays === null ? "text-muted-foreground" :
                  (daysToEnd !== null && daysToEnd < 0) || inHatchRange ? "text-red-600" :
                  countdownDays <= 7 ? "text-red-600" :
                  countdownDays <= 30 ? "text-orange-500" : "text-green-600";

                return (
                  <Card key={b.id} className={`overflow-hidden ${
                    daysToEnd !== null && daysToEnd < 0 ? "border-red-400" :
                    inHatchRange ? "border-red-500 animate-pulse" : ""
                  }`}>
                    {/* Header */}
                    <div className={`p-4 flex items-center justify-between gap-3 ${inHatchRange ? "bg-red-600 text-white" : "bg-muted/40"}`}>
                      <div>
                        <h3 className="font-bold text-sm">{b.male_name} × {b.female_name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                          <Badge variant="outline" className={`text-[11px] capitalize ${inHatchRange ? "border-white text-white" : statusColors[b.status] || ""}`}>
                            {b.status}
                          </Badge>
                          {b.incubator_name && <span className={inHatchRange ? "text-red-100" : "text-muted-foreground"}>📦 {b.incubator_name}</span>}
                          {b.egg_laying_date && <span className={inHatchRange ? "text-red-100" : "text-muted-foreground"}>🗓 {format(new Date(b.egg_laying_date), "d MMM yyyy", { locale: id })}</span>}
                        </div>
                      </div>
                      {/* COUNTDOWN / SELESAI BADGE */}
                      <div className="flex-shrink-0 text-center min-w-[72px]">
                        {b.status === "selesai" ? (
                          <div className="text-green-700 text-center">
                            <div className="text-xl">✅</div>
                            <div className="text-[10px] font-semibold leading-tight">Selesai</div>
                            {b.completed_date && (
                              <div className="text-[9px] text-muted-foreground">{format(new Date(b.completed_date), "d MMM", { locale: id })}</div>
                            )}
                          </div>
                        ) : inHatchRange ? (
                          <div className="text-white text-center">
                            <div className="text-2xl">🚨</div>
                            <div className="text-xs font-bold">Menetas!</div>
                          </div>
                        ) : daysToEnd !== null && daysToEnd < 0 ? (
                          <div className="text-red-600 font-black text-center">
                            <div className="text-xs">⚠️ Segera</div>
                            <div className="text-2xl">Cek!</div>
                          </div>
                        ) : countdownDays !== null ? (
                          <div className="text-center">
                            <div className={`font-black leading-none ${countdownColor}`} style={{ fontSize: "2rem" }}>{countdownDays}</div>
                            <div className="text-[10px] text-muted-foreground font-medium leading-tight">hari lagi</div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Progress Inkubasi */}
                    {b.egg_laying_date && (
                      <div className="px-4 pt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Hari ke-{incubationDay} / 105</span>
                          <span className="font-semibold">{Math.round(incubationProgress)}%</span>
                        </div>
                        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${incubationProgress}%`,
                              background: incubationDay < 80 ? 'linear-gradient(90deg, #22c55e, #84cc16)' : incubationDay < 95 ? 'linear-gradient(90deg, #eab308, #f59e0b)' : 'linear-gradient(90deg, #ef4444, #dc2626)'
                            }}
                          />
                          <div className="absolute top-0 right-[19%] h-full w-0.5 bg-red-600 opacity-40" />
                        </div>
                      </div>
                    )}

                    {/* Egg Grid */}
                    <div className="p-4 pt-3">
                      {b.egg_count > 0 ? (
                        <EggGrid breeding={b} />
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Jumlah telur belum diisi
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: INKUBATOR */}
        <TabsContent value="inkubator" className="space-y-4">
          {incubatorLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : incubators.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
              <Egg className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Belum ada inkubator terdaftar</p>
              <p className="text-sm mt-1">Tambahkan inkubator untuk mulai memantau</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {incubators.map(inc => {
                // KALKULASI REAL-TIME DARI BREEDING
                // MENGGUNAKAN HELPER FUNCTIONS DARI breedingUtils
                const calculatedEggs = calculateIncubatorEggs(inc.name, breedings);
                const clutches = getClutchesInIncubator(inc.name, breedings);
                const isFull = isIncubatorFull(inc.name, inc.capacity_eggs, breedings);
                const isNearFull = isIncubatorNearFull(inc.name, inc.capacity_eggs, breedings);
                const pct = inc.capacity_eggs && inc.capacity_eggs > 0 
                  ? Math.min(100, Math.round((calculatedEggs / inc.capacity_eggs) * 100)) 
                  : 0;

                return (
                  <Card key={inc.id} className={`border-2 ${isFull ? "border-red-300 bg-red-50/30" : isNearFull ? "border-amber-300 bg-amber-50/30" : "border-border"}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Egg className="w-5 h-5 text-amber-600" />
                            {inc.name}
                          </CardTitle>
                          {inc.brand && <p className="text-xs text-muted-foreground mt-0.5">{inc.brand}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={inc.is_active !== false ? "default" : "secondary"} className={inc.is_active !== false ? "bg-green-100 text-green-800 border-green-200" : ""}>
                            {inc.is_active !== false ? "Aktif" : "Tidak Aktif"}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditIncubator(inc); setShowIncubatorForm(true); }}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        {inc.temp_setting && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-100">
                            <Thermometer className="w-4 h-4 text-orange-500" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Suhu Setting</p>
                              <p className="text-sm font-bold text-orange-700">{inc.temp_setting}°C</p>
                            </div>
                          </div>
                        )}
                        {inc.humidity_setting && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                            <Droplets className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Kelembapan</p>
                              <p className="text-sm font-bold text-blue-700">{inc.humidity_setting}%</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Kapasitas - READ ONLY dari kalkulasi Breeding */}
                      {inc.capacity_eggs > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Kapasitas Telur</span>
                            <span className={`font-bold ${isFull ? "text-red-600" : isNearFull ? "text-amber-600" : "text-foreground"}`}>
                              {calculatedEggs} / {inc.capacity_eggs}
                            </span>
                          </div>
                          <Progress value={pct} className={`h-2.5 ${isFull ? "[&>div]:bg-red-500" : isNearFull ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-600"}`} />
                          {isFull && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              🔴 Inkubator penuh! Tidak bisa tambah telur.
                            </div>
                          )}
                          {isNearFull && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              ⚠️ Inkubator hampir penuh ({pct}%)
                            </div>
                          )}
                        </div>
                      )}

                      {/* Clutch list */}
                      {clutches.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Clutch aktif ({clutches.length}):</p>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {clutches.map(c => (
                              <div key={c.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50 text-xs">
                                <span className="font-medium">{c.male_name} × {c.female_name}</span>
                                <span className="text-muted-foreground">{c.egg_count} butir</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">Tidak ada clutch aktif</p>
                      )}

                      {inc.notes && (
                        <p className="text-xs text-muted-foreground border-t pt-2">{inc.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: RIWAYAT PENETASAN */}
        <TabsContent value="riwayat" className="space-y-4">
          {breedingLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : historyBreedings.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Egg className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Belum ada riwayat penetasan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {historyBreedings.map((b) => (
                <Card key={b.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{b.male_name} × {b.female_name}</h3>
                      <Badge variant="outline" className={`text-[11px] capitalize mt-2 ${statusColors[b.status] || ""}`}>
                        {b.status}
                      </Badge>
                    </div>
                    {b.hatch_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(b.hatch_date), "d MMM yyyy", { locale: id })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
                    {b.egg_laying_date && (
                      <div>
                        <p className="text-muted-foreground">Bertelur</p>
                        <p className="font-medium">{format(new Date(b.egg_laying_date), "d MMM yyyy", { locale: id })}</p>
                      </div>
                    )}
                    {b.egg_count > 0 && (
                      <div>
                        <p className="text-muted-foreground">Total Telur</p>
                        <p className="font-medium">{b.egg_count} butir</p>
                      </div>
                    )}
                    {b.hatched_count > 0 && (
                      <div>
                        <p className="text-muted-foreground">Menetas</p>
                        <p className="font-medium text-primary">{b.hatched_count} ekor 🐢</p>
                      </div>
                    )}
                    {b.failed_count > 0 && (
                      <div>
                        <p className="text-muted-foreground">Gagal</p>
                        <p className="font-medium text-destructive">{b.failed_count} butir ❌</p>
                      </div>
                    )}
                    {b.completed_date && (
                      <div>
                        <p className="text-muted-foreground">Selesai</p>
                        <p className="font-medium">{format(new Date(b.completed_date), "d MMM yyyy", { locale: id })}</p>
                      </div>
                    )}
                    {b.hatch_rate > 0 && (
                      <div>
                        <p className="text-muted-foreground">Hatch Rate</p>
                        <p className="font-medium">{b.hatch_rate}%</p>
                      </div>
                    )}
                  </div>
                  {b.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{b.notes}</p>}
                  {b.status === "selesai" && b.hatch_rate > 0 && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div><span className="text-muted-foreground">Menetas:</span> <strong className="text-green-700">{b.hatched_count || 0} ekor</strong></div>
                        <div><span className="text-muted-foreground">Hatch Rate:</span> <strong className="text-green-700">{b.hatch_rate}%</strong></div>
                        {b.fertile_count > 0 && <div><span className="text-muted-foreground">Fertile:</span> <strong>{b.fertile_count}</strong></div>}
                        {b.infertile_count > 0 && <div><span className="text-muted-foreground">Infertil:</span> <strong>{b.infertile_count}</strong></div>}
                        {b.failed_count > 0 && <div><span className="text-muted-foreground">Gagal:</span> <strong>{b.failed_count}</strong></div>}
                      </div>
                    </div>
                  )}
                  {b.status === "selesai" && b.egg_count > 0 && (
                    <div className="mt-3">
                      <EggGrid breeding={b} />
                    </div>
                  )}
                  <ClutchOffspringSection breeding={b} />
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 5: STATISTIK */}
        <TabsContent value="statistik" className="space-y-4">
          <BreedingStatsSection breedings={breedings} />
        </TabsContent>
      </Tabs>

      {showForm && (
        <BreedingForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />
      )}

      <HatchDialog
        open={!!hatchBreeding}
        onClose={() => setHatchBreeding(null)}
        breeding={hatchBreeding}
      />

      {/* ── DIALOG LABEL TELUR ── */}
      <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🖨️ Cetak Label Kotak Telur</DialogTitle>
          </DialogHeader>
          <LabelDialogContent
            jantanList={jantanList}
            betinaList={betinaList}
            incubators={incubators}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showIncubatorForm} onOpenChange={() => setShowIncubatorForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editIncubator?.id ? "Edit Inkubator" : "Tambah Inkubator"}</DialogTitle>
          </DialogHeader>
          <IncubatorForm
            incubator={editIncubator}
            onClose={() => setShowIncubatorForm(false)}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["incubators"] })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}