import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import useCurrentUser from "@/lib/useCurrentUser";

const QUICK_REPLIES = [
  "Kura-kura belum ditimbang minggu ini?",
  "Stok apa yang hampir habis?",
  "Omzet bulan ini berapa?",
  "Pasangan breeding paling produktif?",
  "Absensi hari ini siapa saja?",
];

async function fetchContext(message) {
  const lower = message.toLowerCase();
  const parts = [];

  if (lower.includes("timbang") || lower.includes("berat")) {
    const tortoises = await base44.entities.Tortoise.list();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const stale = tortoises.filter(t => t.status === "aktif" && (!t.updated_date || new Date(t.updated_date) < cutoff));
    parts.push(`Kura-kura belum ditimbang >30 hari (${stale.length}): ${stale.slice(0,5).map(t => t.name).join(", ")}${stale.length > 5 ? "..." : ""}`);
  }
  if (lower.includes("stok") || lower.includes("gudang") || lower.includes("habis")) {
    const items = await base44.entities.WarehouseItem.list();
    // Ambang yang sama dengan layar (lib/stokMenipis). Versi lama memakai
    // ambangnya sendiri (120% dari minimum) dan tidak menyaring barang yang
    // dinonaktifkan, sehingga jawaban chat menyebut 46 barang sementara
    // beranda menyebut 20 — untuk pertanyaan yang sama.
    const low = items.filter((i) => dilacak(i) && (stokHabis(i) || stokMenipis(i)));
    parts.push(`Item stok rendah (${low.length}): ${low.slice(0,5).map(i => `${i.name} (${i.current_stock} ${i.unit})`).join(", ")}`);
  }
  if (lower.includes("absensi") || lower.includes("hadir")) {
    const today = new Date().toISOString().split("T")[0];
    const att = await base44.entities.Attendance.filter({ date: today });
    parts.push(`Absensi hari ini (${att.length} orang): ${att.map(a => a.employee_name).join(", ")}`);
  }
  if (lower.includes("omzet") || lower.includes("penjualan") || lower.includes("sale")) {
    const now = new Date();
    const sales = await base44.entities.Sale.list("-sale_date", 100);
    const thisMonth = sales.filter(s => {
      if (!s.sale_date) return false;
      const d = new Date(s.sale_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const total = thisMonth.reduce((s, t) => s + (t.price || 0), 0);
    parts.push(`Penjualan bulan ini: ${thisMonth.length} transaksi, total Rp ${total.toLocaleString("id-ID")}`);
  }
  if (lower.includes("breeding") || lower.includes("telur") || lower.includes("kawin")) {
    const br = await base44.entities.Breeding.filter({ status: "inkubasi" });
    parts.push(`Breeding aktif (inkubasi): ${br.length} pasangan. ${br.slice(0,3).map(b => `${b.male_name}×${b.female_name} (${b.egg_count || 0} telur)`).join(", ")}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

export default function AIChatbot() {
  const { role } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Halo! Saya asisten Duta Tortoise 🐢. Ada yang bisa saya bantu?" }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!["owner", "admin", "manajer"].includes(role)) return null;

  const handleSend = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    const context = await fetchContext(msg);
    const res = await base44.functions.invoke("claudeAI", {
      mode: "chat",
      payload: { message: msg, context },
    });
    setMessages(prev => [...prev, { role: "assistant", content: res.data.answer || "Maaf, terjadi kesalahan." }]);
    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-background border rounded-2xl shadow-2xl flex flex-col" style={{ height: "520px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold text-sm">Asisten Duta Tortoise 🐢</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-70"><X className="w-4 h-4" /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-primary" /></div>}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                {m.role === "user" && <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5"><User className="w-3.5 h-3.5" /></div>}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-primary" /></div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map(q => (
                <button key={q} onClick={() => handleSend(q)} className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1 hover:bg-primary/20 transition-colors text-left">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ketik pertanyaan..."
              className="text-sm"
              disabled={loading}
            />
            <Button size="icon" onClick={() => handleSend()} disabled={!input.trim() || loading} className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}