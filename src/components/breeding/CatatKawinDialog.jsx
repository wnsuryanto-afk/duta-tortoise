/**
 * CatatKawinDialog — kiper mencatat sepasang kura yang terlihat kawin.
 *
 * Sebelum ini tidak ada tempat untuk itu. `BreedingForm` mewajibkan tanggal
 * bertelur, jumlah telur dan nama inkubator, jadi sebuah catatan hanya bisa
 * dibuat SESUDAH telurnya ada — sementara yang dilihat kiper pagi ini adalah
 * kawinnya, dua minggu sebelum telur pertama muncul. Saat telurnya akhirnya
 * ada, tidak ada yang ingat pasangan mana yang menurunkannya.
 *
 * Formulir ini sengaja pendek. Yang mengisinya sedang berdiri di kandang,
 * memegang ponsel dengan satu tangan: jantan, betina, tanggal. Sisanya
 * opsional.
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { periksaPasangan, sudahTercatat } from "@/lib/perkawinan";

export default function CatatKawinDialog({ open, onClose }) {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const hariIni = format(new Date(), "yyyy-MM-dd");

  const [jantanId, setJantanId] = useState("");
  const [betinaId, setBetinaId] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: kura = [], isLoading } = useQuery({
    queryKey: ["kura-untuk-kawin"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 1000),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { data: perkawinan = [] } = useQuery({
    queryKey: ["perkawinan"],
    queryFn: () => base44.entities.Perkawinan.list("-mating_date", 500),
    enabled: open,
    staleTime: 60 * 1000,
  });

  const hidup = useMemo(
    () => kura.filter((k) => !k.is_archived && k.status === "aktif"),
    [kura],
  );
  const jantan = useMemo(() => hidup.filter((k) => k.gender === "jantan"), [hidup]);
  const betina = useMemo(() => hidup.filter((k) => k.gender === "betina"), [hidup]);

  const kJantan = kura.find((k) => k.id === jantanId);
  const kBetina = kura.find((k) => k.id === betinaId);
  const periksa = periksaPasangan(kJantan, kBetina);
  const kembar = jantanId && betinaId && sudahTercatat(perkawinan, jantanId, betinaId, tanggal);

  const tutup = () => {
    setJantanId("");
    setBetinaId("");
    setTanggal(hariIni);
    setCatatan("");
    onClose();
  };

  const simpan = async () => {
    if (!periksa.boleh || kembar) return;
    setSaving(true);
    try {
      await base44.entities.Perkawinan.create({
        male_id: kJantan.id,
        male_name: kJantan.name || kJantan.code || "",
        female_id: kBetina.id,
        female_name: kBetina.name || kBetina.code || "",
        mating_date: tanggal,
        // Kandang diambil dari betinanya: telurnya akan dicari di sana.
        enclosure: kBetina.enclosure || kJantan.enclosure || "",
        notes: catatan.trim(),
        recorded_by: user?.email || "",
        recorded_by_name: user?.full_name || "",
      });
      toast.success(`Tercatat: ${kJantan.name} × ${kBetina.name}`);
      qc.invalidateQueries({ queryKey: ["perkawinan"] });
      tutup();
    } catch (e) {
      toast.error("Gagal menyimpan: " + (e?.message || "coba lagi"));
    }
    setSaving(false);
  };

  const pilihan = (daftar) =>
    daftar.map((k) => (
      <SelectItem key={k.id} value={k.id}>
        {k.name || k.code}
        {k.enclosure ? ` · ${k.enclosure}` : ""}
      </SelectItem>
    ));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) tutup(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" /> Catat Kura Kawin
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat daftar kura…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Jantan</Label>
              <Select value={jantanId} onValueChange={setJantanId}>
                <SelectTrigger><SelectValue placeholder="Pilih jantan" /></SelectTrigger>
                <SelectContent>{pilihan(jantan)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Betina</Label>
              <Select value={betinaId} onValueChange={setBetinaId}>
                <SelectTrigger><SelectValue placeholder="Pilih betina" /></SelectTrigger>
                <SelectContent>{pilihan(betina)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tanggal terlihat</Label>
              <Input type="date" value={tanggal} max={hariIni}
                onChange={(e) => setTanggal(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Catatan (opsional)</Label>
              <Input value={catatan} onChange={(e) => setCatatan(e.target.value)}
                placeholder="mis. terlihat pagi, dua kali" />
            </div>

            {jantanId && betinaId && !periksa.boleh && (
              <p className="text-xs text-amber-700 dark:text-amber-500 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {periksa.sebab}
              </p>
            )}
            {kembar && (
              <p className="text-xs text-amber-700 dark:text-amber-500 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Pasangan ini sudah tercatat untuk tanggal yang sama.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={tutup}>Batal</Button>
          <Button onClick={simpan} disabled={saving || !periksa.boleh || kembar}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
