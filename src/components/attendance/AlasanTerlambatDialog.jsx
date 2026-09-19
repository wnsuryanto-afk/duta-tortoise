import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Clock, Check, X } from "lucide-react";
import {
  ALASAN_TERLAMBAT,
  cariAlasan,
  periksaIsianAlasan,
  tulisDurasi,
} from "@/lib/keterlambatan";

/**
 * AlasanTerlambatDialog — menanyakan kenapa jam masuknya lain dari biasanya.
 *
 * Muncul hanya ketika jam masuk melewati satu jam setelah shift dimulai. Di
 * data yang ada itu mengenai 21 dari 117 hari; sisanya tidak akan pernah
 * melihat layar ini.
 *
 * Nadanya sengaja tidak menuduh. Separuh dari keterlambatan yang tercatat
 * ternyata berupa rutinitas yang rapat di jam delapan — sangat mungkin itu
 * orang yang mengambil rumput dulu sebelum ke kandang. Pertanyaannya "sedang
 * apa tadi", bukan "kenapa kamu telat".
 *
 * Tidak ada rupiah yang berubah di sini. Mencari rumput tidak menambah upah,
 * dan terlambat tidak memotongnya — gaji harian tetap dihitung per hari hadir.
 * Yang dikerjakan layar ini hanya membuat jam 08:07 itu bisa dibaca.
 */
export default function AlasanTerlambatDialog({
  open,
  onClose,
  onSimpan,
  jamMasuk,
  menitTelat,
  namaKaryawan,
}) {
  const [alasan, setAlasan] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [mengunggah, setMengunggah] = useState(false);
  const [galatFoto, setGalatFoto] = useState("");

  const terpilih = cariAlasan(alasan);
  const { sah, kurang } = periksaIsianAlasan({ alasan, catatan, fotoUrl });

  const pilih = (nilai) => {
    setAlasan(nilai);
    setGalatFoto("");
    // Foto hanya berlaku untuk alasan yang memintanya. Membawa foto rumput ke
    // alasan "ban bocor" hanya akan menyimpan bukti untuk hal yang salah.
    if (!cariAlasan(nilai)?.butuhFoto) setFotoUrl("");
  };

  const ambilFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMengunggah(true);
    setGalatFoto("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFotoUrl(file_url);
    } catch (err) {
      // Kegagalan unggah dikatakan apa adanya. Menelannya berarti orangnya
      // menekan simpan berulang kali sambil mengira fotonya sudah masuk.
      setGalatFoto(err?.message || "Foto gagal diunggah. Coba lagi.");
    }
    setMengunggah(false);
  };

  const simpan = () => {
    if (!sah) return;
    onSimpan({
      alasan,
      catatan: String(catatan || "").trim(),
      fotoUrl: fotoUrl || "",
    });
    setAlasan(null);
    setCatatan("");
    setFotoUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5 text-amber-600" />
            Sedang apa tadi pagi?
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm">
          {namaKaryawan ? <span className="font-semibold">{namaKaryawan} </span> : null}
          masuk <span className="font-semibold tabular-nums">{jamMasuk}</span>
          {menitTelat > 0 && (
            <span className="text-muted-foreground"> · {tulisDurasi(menitTelat)} setelah jam shift</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {ALASAN_TERLAMBAT.map((a) => {
            const aktif = alasan === a.nilai;
            return (
              <button
                key={a.nilai}
                type="button"
                onClick={() => pilih(a.nilai)}
                className={`text-left rounded-xl border px-3.5 py-3 transition-colors ${
                  aktif
                    ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      aktif ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {aktif && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={4} />}
                  </span>
                  <span className="font-semibold text-sm">{a.label}</span>
                  {a.butuhFoto && (
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500">
                      Foto wajib
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 pl-6">{a.keterangan}</p>
              </button>
            );
          })}
        </div>

        {terpilih?.butuhFoto && (
          <div className="rounded-xl border border-border p-3">
            {fotoUrl ? (
              <div className="flex items-start gap-3">
                <img
                  src={fotoUrl}
                  alt="Bukti rumput"
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-600" /> Foto tersimpan
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => setFotoUrl("")}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Ganti foto
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 py-4 cursor-pointer text-center">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={ambilFoto}
                  disabled={mengunggah}
                />
                {mengunggah ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <Camera className="w-6 h-6 text-primary" />
                )}
                <span className="text-sm font-medium">
                  {mengunggah ? "Mengunggah…" : "Foto hasil rumput / sayur"}
                </span>
                <span className="text-xs text-muted-foreground">Wajib, supaya tidak perlu ditanya lagi nanti</span>
              </label>
            )}
            {galatFoto && <p className="text-xs text-destructive mt-2">{galatFoto}</p>}
          </div>
        )}

        {terpilih?.butuhCatatan && (
          <Textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={
              terpilih.nilai === "tugas_luar"
                ? "Tugas apa? Mis. beli obat ke Mojokerto"
                : "Apa sebabnya? Mis. hujan deras, ban bocor"
            }
            rows={2}
            className="resize-none"
          />
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground flex-1">
            {sah ? "Absen akan dicatat dengan keterangan ini." : kurang}
          </p>
          <Button onClick={simpan} disabled={!sah || mengunggah}>
            Simpan &amp; Check In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
