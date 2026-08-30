/**
 * CatatBiayaPage (D20) - mencatat satu pengeluaran dalam tiga ketukan.
 *
 * Kenapa halaman ini ada:
 *
 * Dari 5 Juli sampai 30 Agustus 2026, SELURUH pengeluaran yang tercatat di
 * aplikasi ini berjumlah Rp 701.000 - semuanya kas kecil kecil-kecil. Bukan
 * karena peternakan berhenti membeli apa pun, melainkan karena mencatat lewat
 * halaman Keuangan berarti mengisi formulir bertingkat: pilih tipe, pilih
 * kategori, isi qty, harga satuan, keterangan, tanggal. Formulir itu benar
 * untuk pembukuan, tapi terlalu berat untuk dipakai sambil berdiri di gudang
 * dengan satu tangan memegang karung.
 *
 * Yang tidak dicatat tidak terlihat salah di laporan mana pun: totalnya cuma
 * lebih kecil, dan laba terbaca lebih besar. Jadi masalahnya bukan ketelitian
 * pemilik - masalahnya jarak antara "uang keluar" dan "tercatat".
 *
 * Maka halaman ini menukar kelengkapan dengan kecepatan, dengan sadar:
 *
 *   - Kategori jadi tombol besar, bukan daftar pilihan.
 *   - Nominal yang SERING DIPAKAI di kategori itu muncul sebagai tombol,
 *     diambil dari riwayat asli - bukan daftar yang perlu diatur lebih dulu.
 *     Belanja rutin memang berulang di angka yang sama.
 *   - Keterangan boleh kosong; diisi nama kategori bila dibiarkan. Mewajibkan
 *     keterangan adalah cara paling halus membuat orang menunda mencatat.
 *   - Tanggal default hari ini, bisa dimundurkan untuk yang telanjur lewat.
 *
 * Catatan yang butuh qty, harga satuan, atau foto nota tetap dibuat di halaman
 * Keuangan. Halaman ini tidak menggantikannya - ia menangkap yang selama ini
 * tidak tercatat sama sekali.
 *
 * Gaji sengaja TIDAK ada di sini. Sejak D18, slip gaji yang ditandai dibayar
 * membuat catatan biayanya sendiri; menyediakan tombol gaji di sini akan
 * membuat gaji yang sama masuk dua kali.
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Leaf, Pill, Zap, Droplets, Fuel, Wrench, Wallet, MoreHorizontal,
  Check, ArrowLeft, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { logActivity } from "@/lib/logActivity";

const rupiah = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

// Kategori yang benar-benar berulang di peternakan ini. Urutannya mengikuti
// seberapa sering dipakai, bukan abjad - yang paling sering ada di jempol.
const KATEGORI = [
  { value: "pakan", label: "Pakan", icon: Leaf },
  { value: "kas_kecil", label: "Kas Kecil", icon: Wallet },
  { value: "obat_perawatan", label: "Obat & Perawatan", icon: Pill },
  { value: "solar_bbm", label: "Solar / BBM", icon: Fuel },
  { value: "listrik", label: "Listrik", icon: Zap },
  { value: "air", label: "Air", icon: Droplets },
  { value: "perawatan_kandang", label: "Perawatan Kandang", icon: Wrench },
  { value: "lainnya", label: "Lainnya", icon: MoreHorizontal },
];

export default function CatatBiayaPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const hariIni = format(new Date(), "yyyy-MM-dd");

  const [kategori, setKategori] = useState(null);
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [menyimpan, setMenyimpan] = useState(false);

  const { data: riwayat = [] } = useQuery({
    queryKey: ["catat-biaya-riwayat"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 200),
    staleTime: 60 * 1000,
  });

  // Nominal yang paling sering dipakai di kategori terpilih, diurutkan menurut
  // frekuensi. Diambil dari riwayat asli supaya tidak ada yang perlu disetel.
  const nominalSering = useMemo(() => {
    if (!kategori) return [];
    const hitung = new Map();
    for (const t of riwayat) {
      if (t.category !== kategori || t.type !== "pengeluaran") continue;
      const n = Number(t.amount) || 0;
      if (n <= 0) continue;
      hitung.set(n, (hitung.get(n) || 0) + 1);
    }
    return [...hitung.entries()]
      .sort((a, b) => b[1] - a[1] || b[0] - a[0])
      .slice(0, 4)
      .map(([n]) => n);
  }, [riwayat, kategori]);

  const terakhirDicatat = useMemo(
    () =>
      riwayat
        .filter((t) => t.type === "pengeluaran")
        .slice(0, 5),
    [riwayat],
  );

  if (!canAccess(role, "finance")) return <AccessDenied />;

  const nominalAngka = Number(String(nominal).replace(/[^\d]/g, "")) || 0;
  const kategoriTerpilih = KATEGORI.find((k) => k.value === kategori);

  const simpan = async () => {
    if (!kategori || nominalAngka <= 0 || menyimpan) return;
    setMenyimpan(true);
    try {
      const isi = {
        type: "pengeluaran",
        category: kategori,
        amount: nominalAngka,
        date: tanggal,
        description: keterangan.trim() || kategoriTerpilih?.label || "Pengeluaran",
        created_by_name: user?.full_name || user?.email || "",
      };
      const dibuat = await base44.entities.FinanceTransaction.create(isi);
      await logActivity({
        action: "create",
        entity_type: "FinanceTransaction",
        entity_id: dibuat.id,
        entity_name: isi.description,
        changes_summary: `Catat cepat: ${isi.description} sebesar ${rupiah(isi.amount)}`,
      });
      qc.invalidateQueries({ queryKey: ["catat-biaya-riwayat"] });
      qc.invalidateQueries({ queryKey: ["finance-transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-transactions-ops"] });
      toast.success(`${rupiah(nominalAngka)} tercatat sebagai ${kategoriTerpilih?.label}`);
      // Kembali ke pilihan kategori supaya beberapa catatan berturut-turut
      // tidak perlu menekan apa pun untuk memulai ulang.
      setKategori(null);
      setNominal("");
      setKeterangan("");
      setTanggal(hariIni);
    } catch {
      toast.error("Gagal menyimpan. Coba lagi.");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Catat Pengeluaran</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tiga ketukan: pilih jenis, isi nominal, simpan.
        </p>
      </div>

      {!kategori ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {KATEGORI.map((k) => {
              const Icon = k.icon;
              return (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKategori(k.value)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-5 text-center transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Icon className="w-6 h-6 text-primary" />
                  <span className="text-sm font-medium text-foreground leading-tight">{k.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Gaji karyawan tidak dicatat di sini &mdash; tandai slip gaji sebagai{" "}
            <Link to="/salary-slip" className="text-primary underline underline-offset-2">dibayar</Link>{" "}
            dan catatannya dibuat sendiri. Butuh qty, harga satuan, atau foto nota?{" "}
            <Link to="/finance" className="text-primary underline underline-offset-2">Halaman Keuangan</Link>.
          </p>

          {terakhirDicatat.length > 0 && (
            <Card className="p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Terakhir dicatat</p>
              <ul className="divide-y divide-border">
                {terakhirDicatat.map((t) => (
                  <li key={t.id} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="text-sm text-foreground truncate">{t.description || t.category}</span>
                    <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                      {rupiah(t.amount)}
                      <span className="ml-2 text-xs">
                        {t.date ? format(new Date(t.date + "T00:00:00"), "d MMM", { locale: localeId }) : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-4 space-y-4">
          <button
            type="button"
            onClick={() => setKategori(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Ganti jenis
          </button>

          <div className="flex items-center gap-2">
            {kategoriTerpilih && <kategoriTerpilih.icon className="w-5 h-5 text-primary" />}
            <span className="font-semibold text-foreground">{kategoriTerpilih?.label}</span>
          </div>

          <div>
            <Label className="text-xs">Nominal</Label>
            <Input
              type="text"
              inputMode="numeric"
              autoFocus
              value={nominal}
              onChange={(e) => setNominal(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="0"
              className="mt-1 text-2xl font-bold tabular-nums h-14"
            />
            {nominalAngka > 0 && (
              <p className="text-sm text-primary font-medium mt-1 tabular-nums">{rupiah(nominalAngka)}</p>
            )}
            {nominalSering.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {nominalSering.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNominal(String(n))}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted tabular-nums"
                  >
                    {rupiah(n)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tanggal</Label>
              <Input
                type="date"
                value={tanggal}
                max={hariIni}
                onChange={(e) => setTanggal(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Keterangan <span className="text-muted-foreground">(boleh kosong)</span></Label>
              <Input
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder={kategoriTerpilih?.label || ""}
                className="mt-1"
              />
            </div>
          </div>

          <Button
            onClick={simpan}
            disabled={nominalAngka <= 0 || menyimpan}
            className="w-full h-12 text-base gap-2"
          >
            {menyimpan ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {menyimpan ? "Menyimpan..." : `Simpan ${nominalAngka > 0 ? rupiah(nominalAngka) : ""}`}
          </Button>
        </Card>
      )}
    </div>
  );
}
