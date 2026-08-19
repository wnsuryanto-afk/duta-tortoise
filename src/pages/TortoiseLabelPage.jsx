/**
 * Cetak Label QR Kura — massal, per kandang.
 *
 * QR dibuat lokal dari ID kura (tidak disimpan ke database), jadi label selalu
 * akurat dan bisa dicetak ulang kapan saja tanpa menyentuh data.
 *
 * Ukuran label 50×30 mm, cocok untuk printer termal XP-420B.
 */
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, QrCode, Loader2, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

export default function TortoiseLabelPage() {
  const [selected, setSelected] = useState(() => new Set());
  const [kandang, setKandang] = useState("semua");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: tortoises = [], isLoading } = useQuery({
    queryKey: ["tortoises-label"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 500),
  });

  const active = useMemo(
    () => tortoises.filter((t) => t.status !== "mati" && t.status !== "terjual"),
    [tortoises]
  );

  const kandangList = useMemo(
    () => [...new Set(active.map((t) => t.enclosure).filter(Boolean))].sort(),
    [active]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active.filter(
      (t) =>
        (kandang === "semua" || t.enclosure === kandang) &&
        (!q || (t.name || "").toLowerCase().includes(q))
    );
  }, [active, kandang, search]);

  // Bersihkan pilihan yang tidak lagi tampil agar tombol cetak tidak menipu
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(filtered.map((t) => t.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  const toggle = (id) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((t) => t.id)));

  const handlePrint = async () => {
    const list = filtered.filter((t) => selected.has(t.id));
    if (list.length === 0) return;
    setBusy(true);
    try {
      const origin = window.location.origin;
      const labels = await Promise.all(
        list.map(async (t) => ({
          name: t.name || "-",
          enclosure: t.enclosure || "",
          qr: await QRCode.toDataURL(`${origin}/passport?id=${t.id}`, {
            width: 300,
            margin: 1,
            errorCorrectionLevel: "M",
          }),
        }))
      );

      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Pop-up diblokir browser. Izinkan pop-up untuk mencetak.");
        return;
      }
      win.document.write(`
        <html><head><title>Label QR Kura (${labels.length})</title>
        <style>
          @page { size: 50mm 30mm; margin: 0; }
          body { margin: 0; font-family: Arial, sans-serif; }
          .label { width: 50mm; height: 30mm; display: flex; align-items: center; gap: 2mm;
                   padding: 2mm; box-sizing: border-box; page-break-after: always; }
          .label:last-child { page-break-after: auto; }
          .qr { width: 24mm; height: 24mm; }
          .info { flex: 1; min-width: 0; }
          .nm { font-size: 11pt; font-weight: bold; margin: 0; line-height: 1.1;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .sub { font-size: 6pt; color: #444; margin: 1mm 0 0; line-height: 1.2; }
        </style></head><body>
        ${labels
          .map(
            (l) => `<div class="label">
              <img class="qr" src="${l.qr}" />
              <div class="info">
                <p class="nm">${l.name}</p>
                ${l.enclosure ? `<p class="sub">Kandang: ${l.enclosure}</p>` : ""}
                <p class="sub">Duta Tortoise Farm</p>
              </div>
            </div>`
          )
          .join("")}
        <script>window.onload=()=>{setTimeout(()=>window.print(),300);}<\/script>
        </body></html>
      `);
      win.document.close();
    } catch {
      toast.error("Gagal membuat label. Coba kurangi jumlah yang dipilih.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-xl font-bold font-heading flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" /> Cetak Label QR Kura
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Label 50×30 mm untuk printer termal. Dipindai membuka paspor kura.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={kandang}
          onChange={(e) => setKandang(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm"
        >
          <option value="semua">Semua kandang ({active.length})</option>
          {kandangList.map((k) => (
            <option key={k} value={k}>
              {k} ({active.filter((t) => t.enclosure === k).length})
            </option>
          ))}
        </select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama/kode kura…"
          className="h-9 w-full sm:w-56"
        />
        <Button variant="outline" size="sm" onClick={toggleAll} disabled={filtered.length === 0}>
          {allSelected ? <CheckSquare className="w-4 h-4 mr-1.5" /> : <Square className="w-4 h-4 mr-1.5" />}
          {allSelected ? "Batal pilih semua" : `Pilih semua (${filtered.length})`}
        </Button>
        <Button onClick={handlePrint} disabled={selected.size === 0 || busy} className="ml-auto">
          {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Printer className="w-4 h-4 mr-1.5" />}
          Cetak {selected.size > 0 ? `${selected.size} label` : "label"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Tidak ada kura yang cocok.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map((t) => {
            const on = selected.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${
                  on ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                {on ? (
                  <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{t.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{t.enclosure || "—"}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
