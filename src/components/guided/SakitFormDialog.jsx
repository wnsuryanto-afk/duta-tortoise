/**
 * SakitFormDialog — Form lapor kura sakit (darurat).
 * Dipakai oleh bottom-nav "Lapor Sakit" dan FAB "+" (aksi cepat).
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { X, Loader2 } from "lucide-react";

const GEJALA_LIST = [
  { id: "tidak_makan",  label: "Tidak mau makan",  icon: "🍃" },
  { id: "kaki_bengkak", label: "Kaki bengkak",      icon: "🦶" },
  { id: "ada_luka",     label: "Ada luka",           icon: "🩹" },
  { id: "kurang_gerak", label: "Kurang gerak",       icon: "💤" },
  { id: "mata",         label: "Mata bermasalah",    icon: "👁️" },
  { id: "lainnya",      label: "Lainnya",            icon: "❓" },
];

export default function SakitFormDialog({ open, onClose, user }) {
  const qc = useQueryClient();
  const [kura, setKura] = useState("");
  const [gejala, setGejala] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoise-names-sakit-dialog"],
    queryFn: () => base44.entities.Tortoise.list("-name", 200),
    enabled: open,
  });

  if (!open) return null;

  const handleClose = () => {
    setKura("");
    setGejala(new Set());
    setDone(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!kura || gejala.size === 0) return;
    setSubmitting(true);
    const t = tortoises.find(x => x.id === kura);
    await base44.entities.HealthRecord.create({
      tortoise_id: kura,
      tortoise_name: t?.name || kura,
      date: today,
      type: "sakit",
      description: `Dilaporkan oleh ${user?.full_name || user?.email}. Gejala: ${[...gejala].join(", ")}`,
      diagnosis_notes: [...gejala].join(", "),
    });
    qc.invalidateQueries({ queryKey: ["health-records"] });
    setSubmitting(false);
    setDone(true);
    setTimeout(handleClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-red-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤒</span>
            <span className="font-bold">Lapor Kura Sakit</span>
          </div>
          <button onClick={handleClose}><X className="w-5 h-5" /></button>
        </div>
        {done ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-bold text-green-700">Laporan tercatat!</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <select
              value={kura}
              onChange={e => setKura(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">-- Pilih kura --</option>
              {tortoises.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.enclosure || "?"})</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              {GEJALA_LIST.map(g => {
                const sel = gejala.has(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => setGejala(p => { const n = new Set(p); sel ? n.delete(g.id) : n.add(g.id); return n; })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${sel ? "bg-red-100 border-red-400" : "bg-gray-50 border-gray-200"}`}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-center leading-tight">{g.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !kura || gejala.size === 0}
              className="w-full bg-red-600 text-white font-bold py-4 rounded-xl disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : "📋 Laporkan Sekarang"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}