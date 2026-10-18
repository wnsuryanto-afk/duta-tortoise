import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, ShieldCheck, Info } from "lucide-react";
import { base44, BATAS_AMBIL } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import { hanyaDiPeternakan } from "@/lib/populasiKura";

/**
 * IsiAsalKuraPage — menentukan CB / WC / LTC untuk kura yang asalnya kosong.
 *
 * ── Kenapa layar ini ada ────────────────────────────────────────────────────
 *
 * 18 Okt 2026, `asal_genetik` ditambahkan dan 99 dari 135 kura aktif
 * terklasifikasi dari `source` (impor dan wc jadi WC; cb, f1, f2, dan hasil
 * sendiri jadi CB). Sisanya 36 ekor bersumber `beli_lokal` atau
 * `tidak_diketahui` — keduanya tidak menyebut asal-usul sama sekali, jadi
 * tidak ada yang bisa disimpulkan tanpa pemiliknya memutuskan.
 *
 * Yang membuat layar ini bukan sekadar kerapian: karena "belum diketahui"
 * adalah kelompok harga tersendiri (memang harus — kosong bukan CB), ke-36
 * ekor itu membentuk 24 baris harga sendiri, dan DELAPAN di antaranya
 * kembar dengan baris yang isinya sama persis kecuali asalnya. Yang mengisi
 * harga harus memberi angka dua kali untuk hal yang sama. Begitu asalnya
 * ditentukan, 45 baris harga turun jadi 37.
 *
 * ── Kenapa dikelompokkan per sumber ─────────────────────────────────────────
 *
 * Kura biasanya datang berombongan, dan satu rombongan umumnya seragam
 * asalnya. Mengelompokkannya membuat satu keputusan menutup belasan ekor
 * sekaligus — dan tetap bisa diubah per ekor bila ternyata campur.
 */

const LABEL_SUMBER = {
  beli_lokal: "Beli lokal",
  tidak_diketahui: "Sumber tidak dicatat",
  cb: "CB", wc: "WC", f1: "F1", f2: "F2", ltc: "LTC",
  hasil_sendiri: "Hasil sendiri", import: "Impor",
};
const PILIHAN = [
  { nilai: "cb", label: "CB — captive bred" },
  { nilai: "wc", label: "WC — wild caught" },
  { nilai: "ltc", label: "LTC — long term captive" },
];

export default function IsiAsalKuraPage() {
  const qc = useQueryClient();
  const [draf, setDraf] = useState({});
  const [menyimpan, setMenyimpan] = useState(false);

  const { data: kura = [], isLoading } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", BATAS_AMBIL),
  });

  const hidup = useMemo(() => hanyaDiPeternakan(kura), [kura]);
  const kosong = useMemo(
    () => hidup.filter((k) => !String(k?.asal_genetik || "").trim()),
    [hidup],
  );

  const perSumber = useMemo(() => {
    const peta = new Map();
    for (const k of kosong) {
      const s = k.source || "tidak_diketahui";
      if (!peta.has(s)) peta.set(s, []);
      peta.get(s).push(k);
    }
    return [...peta.entries()]
      .map(([sumber, isi]) => ({
        sumber,
        isi: isi.sort((a, b) => String(a.code || a.name).localeCompare(String(b.code || b.name))),
      }))
      .sort((a, b) => b.isi.length - a.isi.length);
  }, [kosong]);

  const terisi = useMemo(() => kosong.filter((k) => draf[k.id]), [kosong, draf]);

  const setSerombongan = (isi, nilai) =>
    setDraf((p) => {
      const baru = { ...p };
      for (const k of isi) baru[k.id] = nilai;
      return baru;
    });

  const simpan = async () => {
    if (terisi.length === 0) return;
    setMenyimpan(true);
    let berhasil = 0;
    try {
      for (const k of terisi) {
        await base44.entities.Tortoise.update(k.id, { asal_genetik: draf[k.id] });
        berhasil += 1;
      }
      toast.success(`${berhasil} kura ditentukan asalnya`);
      setDraf({});
      qc.invalidateQueries({ queryKey: ["tortoises"] });
    } catch (e) {
      const pesan = e?.message || "kesalahan tidak diketahui";
      /* Sebagian sudah tersimpan — disebutkan, supaya yang mengisi tahu
         harus mengulang dari mana, bukan mengulang semuanya. */
      toast.error(berhasil > 0 ? `${berhasil} tersimpan, lalu gagal: ${pesan}` : `Gagal menyimpan: ${pesan}`);
      qc.invalidateQueries({ queryKey: ["tortoises"] });
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Asal Kura (CB / WC)"
        subtitle="Captive bred atau wild caught — menentukan harga indukan"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground px-1">Memuat…</p>
      ) : kosong.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Semua kura sudah ditentukan asalnya</p>
          <p className="text-xs mt-1">{hidup.length} ekor di peternakan, tidak ada yang tertinggal.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <b className="text-foreground tabular-nums">{kosong.length} dari {hidup.length}</b> kura belum ditentukan
              captive bred atau wild caught. Yang lain sudah terbaca sendiri dari sumbernya — impor dan WC jadi
              WC, hasil tetasan sendiri jadi CB.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Ini memperkecil pekerjaan berikutnya: selama asalnya kosong, kura-kura ini membentuk baris
                harga sendiri yang kembar dengan baris lain. Begitu ditentukan, daftar Harga Estimasi Kura
                menyusut dari 45 baris jadi 37.
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
            <p className="text-xs text-muted-foreground">
              {terisi.length === 0 ? "Belum ada yang dipilih." : `${terisi.length} kura dipilih, belum disimpan.`}
            </p>
            <Button size="sm" className="gap-1.5" disabled={terisi.length === 0 || menyimpan} onClick={simpan}>
              <Save className="w-4 h-4" /> {menyimpan ? "Menyimpan…" : `Simpan ${terisi.length || ""}`}
            </Button>
          </div>

          {perSumber.map((g) => (
            <div key={g.sumber}>
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {LABEL_SUMBER[g.sumber] || g.sumber} · {g.isi.length} ekor
                </p>
                {/* Satu rombongan biasanya seragam asalnya; satu ketukan
                    menutup belasan ekor, dan tetap bisa diubah per ekor. */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">semua:</span>
                  {PILIHAN.map((p) => (
                    <Button key={p.nilai} size="sm" variant="outline" className="h-7 px-2 text-[11px]"
                      onClick={() => setSerombongan(g.isi, p.nilai)}>
                      {p.nilai.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {g.isi.map((k) => (
                  <div key={k.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{k.code || k.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {k.shell_length_cm ? `${k.shell_length_cm} cm` : "ukuran belum ada"}
                        {k.gender && k.gender !== "belum_diketahui" && ` · ${k.gender}`}
                        {k.is_proven && " · proven"}
                      </p>
                    </div>
                    <Select value={draf[k.id] || ""} onValueChange={(v) => setDraf((p) => ({ ...p, [k.id]: v }))}>
                      <SelectTrigger className="h-9 w-36 flex-shrink-0"><SelectValue placeholder="belum dipilih" /></SelectTrigger>
                      <SelectContent>
                        {PILIHAN.map((p) => <SelectItem key={p.nilai} value={p.nilai}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
