import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Loader2, Plus, Search, UserCheck, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import MultiImagePicker from "@/components/ai/MultiImagePicker";
import TombolWhatsApp from "@/components/common/TombolWhatsApp";
import { normalizePhone } from "@/lib/normalizePhone";
import { useCurrentUser } from "@/lib/useCurrentUser";

/**
 * LeadsSupplierTab — calon pemasok yang dikumpulkan dari tangkapan layar
 * grup Facebook.
 *
 * ── Yang layar ini SENGAJA tidak lakukan ──
 *
 * Hasil pembacaan AI TIDAK langsung disimpan. Semuanya ditampilkan dulu untuk
 * dikoreksi, karena yang paling sering salah baca justru bagian yang paling
 * mahal kalau salah: NOMOR. Nomor yang keliru satu digit tetap terlihat wajar
 * di layar, tombolnya tetap bisa ditekan, dan yang menerima pesan adalah orang
 * lain — baru ketahuan saat balasannya tak kunjung datang.
 *
 * Karena itu tiap baris hasil bacaan menyatakan keadaan nomornya secara
 * terbuka: terbaca dan sah, terbaca tapi tidak sah, atau memang tidak ada.
 * Lead tanpa nomor tetap boleh disimpan — namanya masih berguna — tapi tidak
 * pernah menyamar sebagai lead yang bisa dihubungi.
 */

const KATEGORI = [
  { nilai: "sayur_pakan", label: "Sayur & pakan segar" },
  { nilai: "obat_vitamin", label: "Obat & vitamin" },
  { nilai: "alat_kandang", label: "Alat & kandang" },
  { nilai: "kura_telur", label: "Kura & telur" },
  { nilai: "lainnya", label: "Lainnya" },
];

const STATUS = [
  { nilai: "baru", label: "Baru", warna: "bg-blue-100 text-blue-700 border-blue-200" },
  { nilai: "dihubungi", label: "Sudah dihubungi", warna: "bg-amber-100 text-amber-700 border-amber-200" },
  { nilai: "cocok", label: "Cocok", warna: "bg-green-100 text-green-700 border-green-200" },
  { nilai: "jadi_supplier", label: "Jadi supplier", warna: "bg-primary/15 text-primary border-primary/25" },
  { nilai: "tidak_cocok", label: "Tidak cocok", warna: "bg-muted text-muted-foreground border-border" },
];

const labelKategori = (v) => KATEGORI.find((k) => k.nilai === v)?.label || v || "—";
const gayaStatus = (v) => STATUS.find((s) => s.nilai === v) || STATUS[0];

const PESAN_PEMBUKA = (lead) =>
  `Halo${lead.nama ? " " + lead.nama : ""}, saya dari peternakan kura Duta Tortoise. ` +
  `Saya lihat postingan Anda${lead.yang_dijual ? ` soal ${lead.yang_dijual}` : ""}. ` +
  `Apakah masih tersedia? Kami mencari pemasok rutin.`;

const kosong = () => ({
  nama: "", hp_whatsapp: "", kota: "", kategori: "sayur_pakan",
  yang_dijual: "", harga_disebut: "", sumber: "", catatan: "", status: "baru",
});

export default function LeadsSupplierTab({ onJadiSupplier }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();

  const [cari, setCari] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [katFilter, setKatFilter] = useState("semua");

  const [bukaScan, setBukaScan] = useState(false);
  const [images, setImages] = useState([]);
  const [membaca, setMembaca] = useState(false);
  const [galat, setGalat] = useState("");
  const [hasil, setHasil] = useState(null);

  const [bukaForm, setBukaForm] = useState(false);
  const [form, setForm] = useState(kosong());
  const [menyimpan, setMenyimpan] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["supplier-leads"],
    queryFn: () => base44.entities.SupplierLead.list("-created_date"),
  });

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return leads.filter((l) => {
      const cocokCari = !q ||
        (l.nama || "").toLowerCase().includes(q) ||
        (l.yang_dijual || "").toLowerCase().includes(q) ||
        (l.kota || "").toLowerCase().includes(q) ||
        (l.hp_whatsapp || "").includes(q);
      const cocokStatus = statusFilter === "semua" || l.status === statusFilter;
      const cocokKat = katFilter === "semua" || l.kategori === katFilter;
      return cocokCari && cocokStatus && cocokKat;
    });
  }, [leads, cari, statusFilter, katFilter]);

  // Pilihan penyaring diturunkan dari data, bukan daftar tetap — supaya tidak
  // ada lead yang tak bisa ditemukan hanya karena kategorinya belum didaftar.
  const katAda = useMemo(() => {
    const ada = new Set(leads.map((l) => l.kategori).filter(Boolean));
    return KATEGORI.filter((k) => ada.has(k.nilai));
  }, [leads]);
  const statusAda = useMemo(() => {
    const ada = new Set(leads.map((l) => l.status || "baru"));
    return STATUS.filter((s) => ada.has(s.nilai));
  }, [leads]);

  const bacaScreenshot = async () => {
    setMembaca(true); setGalat("");
    try {
      const urls = [];
      for (const img of images) {
        const berkas = img.file || img.blob;
        if (!berkas) continue;
        const r = await base44.integrations.Core.UploadFile({ file: berkas });
        if (r?.file_url) urls.push(r.file_url);
      }
      if (urls.length === 0) throw new Error("Gambarnya gagal diunggah.");

      const res = await base44.functions.invoke("bacaLeadSupplier", { file_urls: urls });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      if (!data?.leads?.length) throw new Error("Tidak ada calon pemasok yang terbaca di gambar itu.");

      setHasil({
        urls,
        baris: data.leads.map((l, i) => ({ ...l, kunci: `l${i}`, ikut: !l.sudah_ada })),
      });
    } catch (e) {
      setGalat(e?.message || "Gagal membaca tangkapan layar.");
    } finally {
      setMembaca(false);
    }
  };

  const ubahBaris = (kunci, patch) =>
    setHasil((h) => ({ ...h, baris: h.baris.map((b) => (b.kunci === kunci ? { ...b, ...patch } : b)) }));

  const simpanHasil = async () => {
    const dipilih = hasil.baris.filter((b) => b.ikut);
    if (dipilih.length === 0) return;
    setMenyimpan(true);
    try {
      for (const b of dipilih) {
        // Nomor dinormalkan LAGI di sini, bukan dipercaya dari hasil bacaan:
        // orangnya mungkin baru saja mengoreksinya di layar ini.
        const { normalized, isValid } = normalizePhone(b.hp_whatsapp || b.hp_mentah);
        await base44.entities.SupplierLead.create({
          nama: b.nama,
          hp_whatsapp: isValid ? normalized : "",
          kota: b.kota,
          kategori: b.kategori || "sayur_pakan",
          yang_dijual: b.yang_dijual,
          harga_disebut: b.harga_disebut,
          sumber: b.sumber,
          tanggal_postingan: b.tanggal_postingan || undefined,
          screenshot_urls: hasil.urls,
          status: "baru",
          catatan: b.catatan,
          dicatat_oleh: user?.email || "",
        });
      }
      toast.success(`${dipilih.length} lead tersimpan`);
      qc.invalidateQueries({ queryKey: ["supplier-leads"] });
      setBukaScan(false); setImages([]); setHasil(null);
    } catch (e) {
      toast.error(e?.message || "Gagal menyimpan lead");
    } finally {
      setMenyimpan(false);
    }
  };

  const simpanManual = async () => {
    if (!form.nama.trim()) return;
    setMenyimpan(true);
    try {
      const { normalized, isValid } = normalizePhone(form.hp_whatsapp);
      await base44.entities.SupplierLead.create({
        ...form,
        hp_whatsapp: isValid ? normalized : "",
        dicatat_oleh: user?.email || "",
      });
      toast.success("Lead tersimpan");
      qc.invalidateQueries({ queryKey: ["supplier-leads"] });
      setBukaForm(false); setForm(kosong());
    } catch (e) {
      toast.error(e?.message || "Gagal menyimpan");
    } finally {
      setMenyimpan(false);
    }
  };

  const ubahStatus = async (lead, status) => {
    const patch = { status };
    if (status === "dihubungi" && !lead.tanggal_dihubungi) {
      patch.tanggal_dihubungi = new Date().toISOString().split("T")[0];
    }
    await base44.entities.SupplierLead.update(lead.id, patch);
    qc.invalidateQueries({ queryKey: ["supplier-leads"] });
  };

  const jadikanSupplier = async (lead) => {
    if (!lead.hp_whatsapp) {
      toast.error("Lead ini belum punya nomor WhatsApp yang sah — lengkapi dulu.");
      return;
    }
    try {
      const baru = await base44.entities.Supplier.create({
        name: lead.nama,
        hp_whatsapp: lead.hp_whatsapp,
        city: lead.kota || "",
        specialty: labelKategori(lead.kategori),
        notes: [lead.yang_dijual, lead.harga_disebut, lead.catatan].filter(Boolean).join(" · "),
        is_preferred: false,
        rating: 5,
      });
      await base44.entities.SupplierLead.update(lead.id, {
        status: "jadi_supplier",
        supplier_id: baru?.id || "",
      });
      toast.success(`${lead.nama} masuk daftar supplier`);
      qc.invalidateQueries({ queryKey: ["supplier-leads"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      onJadiSupplier?.();
    } catch (e) {
      toast.error(e?.message || "Gagal memindahkan ke supplier");
    }
  };

  const hapus = async (lead) => {
    if (!confirm(`Hapus lead ${lead.nama}?`)) return;
    await base44.entities.SupplierLead.delete(lead.id);
    qc.invalidateQueries({ queryKey: ["supplier-leads"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama, barang, kota, atau nomor…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua status</SelectItem>
              {statusAda.map((s) => <SelectItem key={s.nilai} value={s.nilai}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={katFilter} onValueChange={setKatFilter}>
            <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua kategori</SelectItem>
              {katAda.map((k) => <SelectItem key={k.nilai} value={k.nilai}>{k.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setForm(kosong()); setBukaForm(true); }}>
            <Plus className="w-4 h-4" /> Manual
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setBukaScan(true)}>
            <Camera className="w-4 h-4" /> Dari Screenshot
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {tersaring.length} dari {leads.length} lead
        {leads.filter((l) => !l.hp_whatsapp).length > 0 && (
          <span className="text-amber-700"> · {leads.filter((l) => !l.hp_whatsapp).length} belum punya nomor sah</span>
        )}
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Memuat…</p>
      ) : tersaring.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl">
          <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Belum ada lead</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tangkap layar postingan grup Facebook, lalu tekan “Dari Screenshot”.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {tersaring.map((l) => {
            const st = gayaStatus(l.status);
            return (
              <div key={l.id} className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-tight break-words">{l.nama || "(tanpa nama)"}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {[labelKategori(l.kategori), l.kota].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${st.warna}`}>{st.label}</Badge>
                </div>

                {l.yang_dijual && <p className="text-xs text-foreground/90">{l.yang_dijual}</p>}
                {l.harga_disebut && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Harga disebut: </span>
                    <span className="font-medium">{l.harga_disebut}</span>
                  </p>
                )}

                {l.penawaran?.length > 0 && (
                  <div className="rounded-lg bg-muted/40 p-2 space-y-1">
                    {l.penawaran.map((p, i) => (
                      <div key={i} className="flex items-baseline justify-between text-[11px]">
                        <span className="truncate">{p.nama_barang}</span>
                        <span className="tabular font-medium flex-shrink-0 ml-2">
                          Rp {Number(p.harga || 0).toLocaleString("id-ID")}
                          {p.satuan ? `/${p.satuan}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {l.sumber && (
                  <p className="text-[10px] text-muted-foreground truncate">Sumber: {l.sumber}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <TombolWhatsApp nomor={l.hp_whatsapp} pesan={PESAN_PEMBUKA(l)} label="Chat" />
                  <Select value={l.status || "baru"} onValueChange={(v) => ubahStatus(l, v)}>
                    <SelectTrigger className="h-8 w-36 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS.map((s) => <SelectItem key={s.nilai} value={s.nilai}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {l.status !== "jadi_supplier" && (
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-[11px]" onClick={() => jadikanSupplier(l)}>
                      <UserCheck className="w-3.5 h-3.5" /> Jadikan Supplier
                    </Button>
                  )}
                  {l.screenshot_urls?.[0] && (
                    <a
                      href={l.screenshot_urls[0]} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Screenshot
                    </a>
                  )}
                  <button onClick={() => hapus(l)} className="ml-auto text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Baca dari screenshot ── */}
      <Dialog open={bukaScan} onOpenChange={(o) => { setBukaScan(o); if (!o) { setImages([]); setHasil(null); setGalat(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lead dari Screenshot Facebook</DialogTitle></DialogHeader>

          {!hasil ? (
            <div className="space-y-3">
              <MultiImagePicker
                images={images}
                onChange={setImages}
                hint="Tangkap layar postingan grup jual-beli. Satu gambar boleh memuat beberapa postingan — tiap postingan jadi satu lead. Maksimal 5 sekali baca."
              />
              {galat && <p className="text-xs text-red-600">{galat}</p>}
              <Button className="w-full" disabled={images.length === 0 || membaca} onClick={bacaScreenshot}>
                {membaca
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membaca…</>
                  : `Baca ${images.length} screenshot`}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Periksa dulu sebelum disimpan — terutama nomornya. Nomor yang salah satu digit tetap
                terlihat wajar, dan pesannya akan sampai ke orang lain.
              </p>
              {hasil.baris.map((b) => {
                const { isValid, display } = normalizePhone(b.hp_whatsapp || b.hp_mentah);
                return (
                  <div key={b.kunci} className={`rounded-lg border p-3 space-y-2 ${b.ikut ? "border-border" : "border-dashed opacity-50"}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox" checked={b.ikut}
                        onChange={(e) => ubahBaris(b.kunci, { ikut: e.target.checked })}
                        className="w-4 h-4 accent-primary mt-1"
                      />
                      <Input
                        value={b.nama}
                        onChange={(e) => ubahBaris(b.kunci, { nama: e.target.value })}
                        placeholder="Nama"
                        className="h-8 text-sm flex-1"
                      />
                      {b.sudah_ada && (
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 flex-shrink-0">
                          sudah ada
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          value={b.hp_whatsapp || b.hp_mentah || ""}
                          onChange={(e) => ubahBaris(b.kunci, { hp_whatsapp: e.target.value })}
                          placeholder="Nomor WhatsApp"
                          className="h-8 text-sm"
                        />
                        <p className={`text-[10px] mt-0.5 ${isValid ? "text-green-700" : "text-amber-700"}`}>
                          {isValid ? `✓ ${display}`
                            : b.nomor_terbaca ? "terbaca tapi belum sah — perbaiki"
                              : "tidak ada nomor di gambar"}
                        </p>
                      </div>
                      <Input
                        value={b.kota || ""}
                        onChange={(e) => ubahBaris(b.kunci, { kota: e.target.value })}
                        placeholder="Kota" className="h-8 text-sm"
                      />
                      <Input
                        value={b.yang_dijual || ""}
                        onChange={(e) => ubahBaris(b.kunci, { yang_dijual: e.target.value })}
                        placeholder="Yang dijual" className="h-8 text-sm"
                      />
                      <Input
                        value={b.harga_disebut || ""}
                        onChange={(e) => ubahBaris(b.kunci, { harga_disebut: e.target.value })}
                        placeholder="Harga disebut" className="h-8 text-sm"
                      />
                    </div>
                    <Select value={b.kategori || "sayur_pakan"} onValueChange={(v) => ubahBaris(b.kunci, { kategori: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KATEGORI.map((k) => <SelectItem key={k.nilai} value={k.nilai}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setHasil(null); setImages([]); }}>
                  Ulangi
                </Button>
                <Button
                  className="flex-1"
                  disabled={menyimpan || hasil.baris.every((b) => !b.ikut)}
                  onClick={simpanHasil}
                >
                  {menyimpan ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan…</>
                    : `Simpan ${hasil.baris.filter((b) => b.ikut).length} lead`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Tambah manual ── */}
      <Dialog open={bukaForm} onOpenChange={setBukaForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Lead Manual</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nama *</Label>
              <Input value={form.nama} onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Nomor WhatsApp</Label>
              <Input
                value={form.hp_whatsapp}
                onChange={(e) => setForm((p) => ({ ...p, hp_whatsapp: e.target.value }))}
                placeholder="0812…" className="mt-1"
              />
              {form.hp_whatsapp && !normalizePhone(form.hp_whatsapp).isValid && (
                <p className="text-[10px] text-amber-700 mt-0.5">Nomor belum sah — tombol WhatsApp tidak akan aktif.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Kota</Label>
                <Input value={form.kota} onChange={(e) => setForm((p) => ({ ...p, kota: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Kategori</Label>
                <Select value={form.kategori} onValueChange={(v) => setForm((p) => ({ ...p, kategori: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KATEGORI.map((k) => <SelectItem key={k.nilai} value={k.nilai}>{k.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Yang dijual</Label>
              <Input value={form.yang_dijual} onChange={(e) => setForm((p) => ({ ...p, yang_dijual: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Harga disebut</Label>
              <Input
                value={form.harga_disebut}
                onChange={(e) => setForm((p) => ({ ...p, harga_disebut: e.target.value }))}
                placeholder="mis. 15rb/ikat atau nego" className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Catatan</Label>
              <Textarea
                value={form.catatan}
                onChange={(e) => setForm((p) => ({ ...p, catatan: e.target.value }))}
                className="mt-1 resize-none h-16"
              />
            </div>
            <Button className="w-full" disabled={!form.nama.trim() || menyimpan} onClick={simpanManual}>
              {menyimpan ? "Menyimpan…" : "Simpan Lead"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
