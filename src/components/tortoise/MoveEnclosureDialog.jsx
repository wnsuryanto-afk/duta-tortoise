import { useState, useMemo } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { logActivity } from "@/lib/logActivity";
import { base44 } from "@/api/base44Client";
import { kandangDariNama, tulisKandang } from "@/lib/kandang";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Search, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { hitungIsiKandang } from "@/lib/kandang";

const ENCLOSURE_GROUPS = [
  { label: "🏠 Kandang Barat", prefix: "W" },
  { label: "🏠 Kandang Utara", prefix: "N" },
  { label: "🏠 Kandang Timur", prefix: "E" },
  { label: "🏥 Karantina", prefix: "L1" },
  { label: "🏠 Lainnya", prefix: "L2" },
  { label: "🐣 Kandang Baby", prefix: "Baby" },
];

function groupEnclosures(enclosures) {
  const groups = [];
  const used = new Set();

  for (const group of ENCLOSURE_GROUPS) {
    const members = enclosures.filter(e => {
      if (group.prefix === "L1") return e.name === "L1";
      if (group.prefix === "L2") return e.name === "L2";
      return e.name?.startsWith(group.prefix) && e.name !== "L1" && e.name !== "L2";
    });
    if (members.length > 0) {
      groups.push({ label: group.label, items: members });
      members.forEach(m => used.add(m.id));
    }
  }

  // Sisa yang tidak masuk grup manapun
  const others = enclosures.filter(e => !used.has(e.id));
  if (others.length > 0) {
    groups.push({ label: "📦 Lainnya", items: others });
  }

  return groups;
}

export default function MoveEnclosureDialog({ tortoise, open, onClose, onMoved }) {
  const { user } = useCurrentUser();
  const [newEnclosure, setNewEnclosure] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmFull, setConfirmFull] = useState(false);

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures-all"],
    queryFn: () => base44.entities.Enclosure.list(),
    enabled: open,
  });

  // Isi kandang dihitung langsung dari data kura. Angka tersimpan
  // `current_count` hanya bisa naik — kura mati dan kura terjual tidak pernah
  // menguranginya — sehingga kandang bisa dinyatakan penuh padahal separuh
  // penghuninya sudah tidak ada.
  const { data: semuaKura = [] } = useQuery({
    queryKey: ["tortoises-untuk-kapasitas"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 1000),
    enabled: open,
  });

  const isiKandang = (enc) => hitungIsiKandang(enc, semuaKura, enclosures, tortoise?.id);

  const filteredEnclosures = useMemo(() => {
    const q = search.toLowerCase();
    return enclosures.filter(e =>
      e.name !== tortoise?.enclosure &&
      (!q || e.name?.toLowerCase().includes(q))
    );
  }, [enclosures, tortoise?.enclosure, search]);

  const grouped = useMemo(() => groupEnclosures(filteredEnclosures), [filteredEnclosures]);

  const selectedEnc = enclosures.find(e => e.name === newEnclosure);
  const isiTerpilih = selectedEnc ? isiKandang(selectedEnc) : 0;
  const isFull = selectedEnc?.max_capacity > 0 && isiTerpilih >= selectedEnc.max_capacity;
  const isNearFull = selectedEnc?.max_capacity > 0 && isiTerpilih >= selectedEnc.max_capacity * 0.8;

  const getCapacityLabel = (enc) => {
    if (!enc.max_capacity || enc.max_capacity === 0) return enc.name;
    const isi = isiKandang(enc);
    const pct = Math.round((isi / enc.max_capacity) * 100);
    if (pct >= 100) return `${enc.name} (${isi}/${enc.max_capacity}) 🔴`;
    if (pct >= 80) return `${enc.name} (${isi}/${enc.max_capacity}) 🟡`;
    return `${enc.name} (${isi}/${enc.max_capacity}) ✅`;
  };

  const handleSave = async () => {
    if (!newEnclosure.trim()) return;
    if (isFull && !confirmFull) {
      setConfirmFull(true);
      return;
    }
    setSaving(true);
    const target = newEnclosure.trim();
    const oldEnclosure = tortoise.enclosure || "";

    // Nomor kandang ikut ditulis supaya tautannya bertahan saat kandang
    // diganti nama; namanya tetap disimpan sebagai keterangan.
    const kandangTujuan = kandangDariNama(target, enclosures);
    await base44.entities.Tortoise.update(tortoise.id, {
      ...(kandangTujuan ? tulisKandang(kandangTujuan) : { enclosure: target }),
    });

    await logActivity({
      action: "transfer",
      entity_type: "Tortoise",
      entity_id: tortoise.id,
      entity_name: tortoise.name,
      changes_detail: [
        { field: "enclosure", label: "Kandang", old_value: oldEnclosure || "-", new_value: target },
      ],
      changes_summary: `Pindah kandang: ${oldEnclosure || "-"} → ${target}`,
    });

    await base44.entities.EnclosureHistory.create({
      tortoise_id: tortoise.id,
      tortoise_name: tortoise.name,
      from_enclosure: oldEnclosure,
      to_enclosure: target,
      moved_date: format(new Date(), "yyyy-MM-dd"),
      reason: reason.trim() || "-",
      moved_by: user?.full_name || user?.email || "-",
    });

    // Angka kandang disegarkan lewat satu pustaka (lib/enclosureCount), yang
    // kini memakai hitungan yang sama dengan yang ditampilkan di layar Kandang.
    // Sebelumnya blok ini menghitung sendiri di sini — benar, tetapi hanya di
    // layar ini; jalur lain memanggil pustaka yang aturannya lebih longgar dan
    // menimpanya kembali.
    await recalcEnclosureCountsAman(
      [oldEnclosure, target].filter(Boolean),
    );

    onMoved();
    onClose();
    setSaving(false);
    setConfirmFull(false);
    setNewEnclosure("");
    setSearch("");
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setConfirmFull(false); setNewEnclosure(""); setSearch(""); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pindah Kandang</DialogTitle>
        </DialogHeader>

        {/* Confirm penuh */}
        {confirmFull ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="font-semibold text-red-700">Kandang {newEnclosure} Penuh!</p>
              <p className="text-sm text-red-600">
                Kapasitas kandang sudah tercapai. Yakin tetap memindahkan kura-kura ke sini?
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmFull(false)}>Batal</Button>
              <Button variant="destructive" onClick={handleSave} disabled={saving}>
                {saving ? "Memindahkan..." : "Ya, Pindahkan"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* From → To preview */}
            <div className="flex items-center gap-3 text-sm">
              <div className="px-3 py-1.5 rounded bg-muted font-medium">{tortoise?.enclosure || "-"}</div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-3 py-1.5 rounded bg-primary/10 text-primary font-medium min-w-12 text-center">
                {newEnclosure || "?"}
              </div>
            </div>

            {/* Kapasitas info */}
            {selectedEnc && (
              <div className={`text-xs px-3 py-2 rounded-lg border ${
                isFull ? "bg-red-50 border-red-200 text-red-700" :
                isNearFull ? "bg-amber-50 border-amber-200 text-amber-700" :
                "bg-green-50 border-green-200 text-green-700"
              }`}>
                {isFull ? `🔴 Kandang penuh! (${isiTerpilih}/${selectedEnc.max_capacity})` :
                 isNearFull ? `🟡 Hampir penuh: ${isiTerpilih}/${selectedEnc.max_capacity}` :
                 `✅ Tersedia: ${isiTerpilih}/${selectedEnc.max_capacity || "∞"}`}
              </div>
            )}

            {/* Search */}
            <div>
              <Label className="mb-1.5 block text-xs">Kandang Tujuan</Label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari nama kandang..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>

              {/* Grouped buttons */}
              <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
                {grouped.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1.5">{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map(enc => {
                        const isi = isiKandang(enc);
                        const full = enc.max_capacity > 0 && isi >= enc.max_capacity;
                        const near = enc.max_capacity > 0 && isi >= enc.max_capacity * 0.8;
                        return (
                          <button
                            key={enc.id}
                            onClick={() => setNewEnclosure(enc.name)}
                            title={getCapacityLabel(enc)}
                            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                              newEnclosure === enc.name
                                ? "bg-primary text-primary-foreground border-primary"
                                : full
                                ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                : near
                                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                                : "bg-muted/50 border-border hover:bg-muted"
                            }`}
                          >
                            {enc.name}
                            {enc.max_capacity > 0 && (
                              <span className="ml-1 opacity-70">
                                {full ? "🔴" : near ? "🟡" : "✅"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {grouped.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">Tidak ada kandang ditemukan</p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Alasan (opsional)</Label>
              <Textarea
                placeholder="cth: Pemisahan breeding, kandang penuh..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-sm resize-none h-16"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={handleSave} disabled={!newEnclosure.trim() || saving}>
                {saving ? "Memindahkan..." : "Pindahkan"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}