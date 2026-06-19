import { useState } from "react";
import { Home, Star, User, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import GuidedHariIni from "./GuidedHariIni";
import GuidedPoinSaya from "./GuidedPoinSaya";
import GuidedProfil from "./GuidedProfil";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const TABS = [
  { id: "hari-ini", label: "Hari Ini", icon: Home },
  { id: "poin",     label: "Poin Saya", icon: Star },
  { id: "profil",   label: "Profil",   icon: User },
];

const GEJALA_LIST = [
  { id: "tidak_makan",  label: "Tidak mau makan",  icon: "🍃" },
  { id: "kaki_bengkak", label: "Kaki bengkak",      icon: "🦶" },
  { id: "ada_luka",     label: "Ada luka",           icon: "🩹" },
  { id: "kurang_gerak", label: "Kurang gerak",       icon: "💤" },
  { id: "mata",         label: "Mata bermasalah",    icon: "👁️" },
  { id: "lainnya",      label: "Lainnya",            icon: "❓" },
];

function FAB({ user }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // "sakit" | "stok"
  const [sakitKura, setSakitKura] = useState("");
  const [sakitGejala, setSakitGejala] = useState(new Set());
  const [stokSku, setStokSku] = useState("");
  const [stokQty, setStokQty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoise-names"],
    queryFn: () => base44.entities.Tortoise.list("-name", 200),
    enabled: open && mode === "sakit",
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
    enabled: open,
  });

  const handleClose = () => {
    setOpen(false);
    setMode(null);
    setSakitKura("");
    setSakitGejala(new Set());
    setStokSku("");
    setStokQty("");
    setDone(false);
  };

  const handleLaporSakit = async () => {
    if (!sakitKura || sakitGejala.size === 0) return;
    setSubmitting(true);
    const kura = tortoises.find(t => t.id === sakitKura);
    await base44.entities.HealthRecord.create({
      tortoise_id: sakitKura,
      tortoise_name: kura?.name || sakitKura,
      date: today,
      type: "sakit",
      description: `[DARURAT] Dilaporkan oleh ${user?.full_name || user?.email}. Gejala: ${[...sakitGejala].join(", ")}`,
      diagnosis_notes: [...sakitGejala].join(", "),
    });
    setSubmitting(false);
    setDone(true);
    setTimeout(handleClose, 2000);
  };

  const handleAmbilStok = async () => {
    if (!stokSku || !stokQty) return;
    setSubmitting(true);
    // cari item berdasarkan SKU
    const warehouseItems = await base44.entities.WarehouseItem.list();
    const feedItems = await base44.entities.FeedStock.list();
    const wItem = warehouseItems.find(i => i.sku?.toLowerCase() === stokSku.toLowerCase() || i.name?.toLowerCase() === stokSku.toLowerCase());
    const fItem = feedItems.find(i => i.sku?.toLowerCase() === stokSku.toLowerCase() || i.name?.toLowerCase() === stokSku.toLowerCase());
    const item = wItem || fItem;
    if (!item) {
      alert("Barang tidak ditemukan. Coba masukkan nama lengkap.");
      setSubmitting(false);
      return;
    }
    const qty = Number(stokQty);
    if (wItem) {
      await base44.entities.WarehouseItem.update(item.id, { current_stock: Math.max(0, (item.current_stock || 0) - qty) });
      await base44.entities.StockMovement.create({
        item_id: item.id, item_name: item.name, item_type: "warehouse",
        type: "keluar", quantity: qty, unit: item.unit,
        by_email: user?.email, by_name: user?.full_name || user?.email,
        date: today, notes: "Ambil stok darurat via FAB",
        status: "selesai",
      });
    } else if (fItem) {
      await base44.entities.FeedStock.update(item.id, { current_stock: Math.max(0, (item.current_stock || 0) - qty) });
      await base44.entities.StockMovement.create({
        item_id: item.id, item_name: item.name, item_type: "feedstock",
        type: "keluar", quantity: qty, unit: item.unit,
        by_email: user?.email, by_name: user?.full_name || user?.email,
        date: today, notes: "Ambil stok darurat via FAB",
        status: "selesai",
      });
    }
    setSubmitting(false);
    setDone(true);
    setTimeout(handleClose, 2000);
  };

  const ownerPhone = settings?.company_phone?.replace(/\D/g, "");
  const waPhone = ownerPhone ? `https://wa.me/${ownerPhone.startsWith("0") ? "62" + ownerPhone.slice(1) : ownerPhone}` : null;

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 z-50 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform"
        title="Tombol Darurat"
      >
        <AlertTriangle className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-red-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold text-lg">Tombol Darurat</span>
              </div>
              <button onClick={handleClose}><X className="w-5 h-5" /></button>
            </div>

            {done ? (
              <div className="p-8 text-center">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-bold text-green-700 text-lg">Berhasil dicatat!</p>
              </div>
            ) : mode === null ? (
              <div className="p-5 space-y-3">
                <button
                  onClick={() => setMode("sakit")}
                  className="w-full flex items-center gap-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl active:scale-95 transition-all hover:bg-red-100"
                >
                  <span className="text-2xl">🐢</span>
                  <div className="text-left">
                    <p className="font-bold text-red-800">Lapor Kura Sakit</p>
                    <p className="text-xs text-red-600">Catat kondisi darurat kura</p>
                  </div>
                </button>
                <button
                  onClick={() => setMode("stok")}
                  className="w-full flex items-center gap-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl active:scale-95 transition-all hover:bg-orange-100"
                >
                  <span className="text-2xl">📦</span>
                  <div className="text-left">
                    <p className="font-bold text-orange-800">Ambil Stok Darurat</p>
                    <p className="text-xs text-orange-600">Catat pengambilan stok mendesak</p>
                  </div>
                </button>
                {waPhone ? (
                  <a
                    href={waPhone}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-2xl active:scale-95 transition-all hover:bg-green-100"
                  >
                    <span className="text-2xl">📱</span>
                    <div className="text-left">
                      <p className="font-bold text-green-800">Hubungi Owner / Manager</p>
                      <p className="text-xs text-green-600">Buka WhatsApp sekarang</p>
                    </div>
                  </a>
                ) : (
                  <div className="w-full flex items-center gap-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl opacity-50">
                    <span className="text-2xl">📱</span>
                    <div className="text-left">
                      <p className="font-bold text-gray-700">Hubungi Owner</p>
                      <p className="text-xs text-gray-500">Nomor belum diset di pengaturan</p>
                    </div>
                  </div>
                )}
              </div>
            ) : mode === "sakit" ? (
              <div className="p-5 space-y-4">
                <button onClick={() => setMode(null)} className="text-xs text-gray-400 hover:text-gray-600">← Kembali</button>
                <p className="font-semibold text-gray-800">Lapor Kura Sakit</p>
                <select
                  value={sakitKura}
                  onChange={e => setSakitKura(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">-- Pilih kura --</option>
                  {tortoises.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.enclosure || "?"})</option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  {GEJALA_LIST.map(g => {
                    const sel = sakitGejala.has(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSakitGejala(p => {
                          const n = new Set(p);
                          sel ? n.delete(g.id) : n.add(g.id);
                          return n;
                        })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                          sel ? "bg-red-100 border-red-400" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <span className="text-xl">{g.icon}</span>
                        <span className="text-center leading-tight">{g.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleLaporSakit}
                  disabled={submitting || !sakitKura || sakitGejala.size === 0}
                  className="w-full bg-red-600 text-white font-bold py-4 rounded-xl disabled:opacity-40 active:scale-95"
                >
                  {submitting ? "Menyimpan..." : "📋 Laporkan Sekarang"}
                </button>
              </div>
            ) : mode === "stok" ? (
              <div className="p-5 space-y-4">
                <button onClick={() => setMode(null)} className="text-xs text-gray-400 hover:text-gray-600">← Kembali</button>
                <p className="font-semibold text-gray-800">Ambil Stok Darurat</p>
                <input
                  type="text"
                  value={stokSku}
                  onChange={e => setStokSku(e.target.value)}
                  placeholder="Nama atau kode SKU barang..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="number"
                  value={stokQty}
                  onChange={e => setStokQty(e.target.value)}
                  placeholder="Jumlah yang diambil..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  min="1"
                />
                <button
                  onClick={handleAmbilStok}
                  disabled={submitting || !stokSku || !stokQty}
                  className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl disabled:opacity-40 active:scale-95"
                >
                  {submitting ? "Menyimpan..." : "📦 Catat Pengambilan"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

export default function GuidedLayout({ user, onSwitchToNormal }) {
  const [activeTab, setActiveTab] = useState("hari-ini");

  // Null guard — jangan crash jika user belum ada
  if (!user?.email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto relative">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === "hari-ini" && <GuidedHariIni user={user} />}
        {activeTab === "poin"     && <GuidedPoinSaya user={user} />}
        {activeTab === "profil"   && <GuidedProfil user={user} onSwitchToNormal={onSwitchToNormal} />}
      </div>

      {/* FAB Darurat */}
      <FAB user={user} />

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 z-50 shadow-[0_-2px_16px_rgba(0,0,0,0.08)]">
        <div className="flex">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
                  isActive ? "text-green-700" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "fill-green-100 stroke-green-700")} />
                <span className={cn("text-[11px] font-semibold", isActive ? "text-green-700" : "text-gray-400")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}