import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Loader2, Copy, RefreshCw, Check } from "lucide-react";

const PLATFORMS = ["Instagram", "TikTok", "Tokopedia", "Shopee", "WhatsApp"];
const PLATFORM_COLORS = {
  Instagram: "bg-pink-100 text-pink-800",
  TikTok: "bg-black text-white",
  Tokopedia: "bg-green-100 text-green-800",
  Shopee: "bg-orange-100 text-orange-800",
  WhatsApp: "bg-emerald-100 text-emerald-800",
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1">
      {copied ? <><Check className="w-3 h-3" /> Disalin</> : <><Copy className="w-3 h-3" /> Salin</>}
    </Button>
  );
}

export default function AISalesContent({ tortoise }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(["Instagram"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});

  const togglePlatform = (p) => setSelected(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleGenerate = async () => {
    if (!selected.length) return;
    setLoading(true);
    const res = await base44.functions.invoke("claudeAI", {
      mode: "sales_content",
      payload: { tortoise, platforms: selected },
    });
    setResults(res.data.results || {});
    setLoading(false);
  };

  const handleRegenerate = async (platform) => {
    setResults(prev => ({ ...prev, [platform]: null }));
    const res = await base44.functions.invoke("claudeAI", {
      mode: "sales_content",
      payload: { tortoise, platforms: [platform] },
    });
    setResults(prev => ({ ...prev, ...(res.data.results || {}) }));
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
        <Megaphone className="w-4 h-4" /> Buat Konten Jual 📣
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-600" /> Generator Konten Penjualan AI
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tortoise info summary */}
            <div className="p-3 bg-muted/40 rounded-xl text-sm">
              <span className="font-medium">{tortoise?.name}</span>
              {tortoise?.morph && <span className="ml-2 text-muted-foreground">· {tortoise.morph}</span>}
              {tortoise?.weight_grams && <span className="ml-2 text-muted-foreground">· {tortoise.weight_grams}g</span>}
              {tortoise?.shell_length_cm && <span className="ml-2 text-muted-foreground">· {tortoise.shell_length_cm}cm</span>}
            </div>

            {/* Platform selection */}
            <div>
              <p className="text-sm font-medium mb-2">Pilih Platform</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      selected.includes(p) ? "border-primary bg-primary text-primary-foreground" : "border-muted hover:border-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={!selected.length || loading} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membuat konten...</> : "🪄 Generate Konten"}
            </Button>

            {/* Results */}
            {Object.entries(results).map(([platform, content]) => (
              <div key={platform} className="border rounded-xl overflow-hidden">
                <div className={`flex items-center justify-between px-3 py-2 ${PLATFORM_COLORS[platform] || "bg-muted"}`}>
                  <span className="font-semibold text-sm">{platform}</span>
                  <div className="flex gap-1">
                    {content && <CopyButton text={content} />}
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleRegenerate(platform)}>
                      {!content ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RefreshCw className="w-3 h-3" /> Ulang</>}
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  {!content ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap font-sans">{content}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}