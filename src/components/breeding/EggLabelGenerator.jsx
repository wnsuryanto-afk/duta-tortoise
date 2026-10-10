import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Printer, Loader2, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { renderColorLabelHTML } from "@/components/breeding/colorEggLabel";
import { teksTray } from "@/lib/trayTelur";
import { UKURAN_LABEL_TELUR, UKURAN_TELUR_BAWAAN, cariUkuranTelur, rencanaLembarA4, susunLembarA4HTML, mmKePx, kunciClutch, kandidatLabel, centangAwal } from "@/lib/lembarLabel";

/**
 * ── Kenapa layar ini disederhanakan (5 Okt 2026) ───────────────────────────
 *
 * Pemilik: "untuk saat ini, saya hanya bisa pakai printer L385."
 *
 * Layar ini dulu menawarkan DUA jenis printer, dan yang jadi BAWAAN adalah
 * printer termal XP-420B — printer yang tidak bisa dipakai. Jadi setiap kali
 * layar ini dibuka, pilihan pertamanya salah dan harus diganti dulu.
 *
 * Pilihan jenis printer dicabut. Yang tersisa hanya Epson L385: cetak di kertas
 * A4 lalu potong. Penggambar termalnya TIDAK dihapus — paletnya masih ada di
 * labelRingkas.js dan masih diuji cek-label.mjs — supaya jalurnya tinggal
 * dipasang lagi kalau gulungan termalnya dipakai lagi nanti.
 *
 * Yang ditambahkan: PRATINJAU. Label ini dicetak lalu ditempel; begitu keluar
 * dari printer tidak ada yang bisa mengoreksinya. Dulu bentuknya baru terlihat
 * setelah menekan "Buat Label" dan mengunduh berkasnya. Sekarang desainnya
 * tergambar begitu layar dibuka, dan ikut berubah saat ukurannya diganti.
 */

export function candlingDate30(eggLayingDate) {
  if (!eggLayingDate) return null;
  const d = new Date(eggLayingDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 30);
  return d;
}
export function isCandlingLate(b) {
  const cd = candlingDate30(b?.egg_laying_date);
  if (!cd) return false;
  return cd < new Date() && !b.candling_day_30_done;
}

async function renderLabelHTML(breeding, sizeDef) {
  return renderColorLabelHTML(breeding, sizeDef);
}

async function htmlToPng(html, wPx, hPx, scale = 2) {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);
  const h2c = (await import("html2canvas")).default;
  const canvas = await h2c(container.firstElementChild, {
    scale, useCORS: true, backgroundColor: "#ffffff", logging: false, width: wPx, height: hPx,
  });
  document.body.removeChild(container);
  return canvas.toDataURL("image/png");
}

async function renderLabelPng(breeding, sizeDef) {
  const html = await renderLabelHTML(breeding, sizeDef);
  return htmlToPng(html, mmKePx(sizeDef.w), mmKePx(sizeDef.h));
}

/**
 * Lembar A4 berisi label yang DIPILIH — bukan semua clutch aktif.
 *
 * Fungsi ini dulu memaksa ukuran 100×50 mm, ditulis mati di dalamnya, jadi
 * pilihan ukuran di layar tidak pernah sampai ke sini. Susunan lembarnya
 * sekarang di lib/lembarLabel.js, supaya penjaga bisa menghitung sendiri
 * berapa label yang benar-benar mendarat di kertas.
 */
async function renderA4SheetPng(breedings, sizeDef) {
  const labelDef = sizeDef || cariUkuranTelur(UKURAN_TELUR_BAWAAN);
  const labelHtmls = [];
  for (const b of breedings) labelHtmls.push(await renderLabelHTML(b, labelDef));
  const { html, wA4, hA4 } = susunLembarA4HTML(labelHtmls, labelDef);
  // scale 1: lihat catatan di htmlToPng — lembar A4 sudah 300 DPI, dan
  // menggandakannya membuat kanvasnya melewati batas Safari di iPad.
  return htmlToPng(html, wA4, hA4, 1);
}

function fileStem(b) {
  const code = `${b.male_name || "?"}x${b.female_name || "?"}`.replace(/\s+/g, "");
  const d = b.egg_laying_date ? new Date(b.egg_laying_date) : null;
  const ds = d && !Number.isNaN(d.getTime())
    ? `${format(d, "d", { locale: idLocale })}${format(d, "MMM", { locale: idLocale })}${format(d, "yyyy")}`
    : "tanpatgl";
  return `label-${code}-${ds}`;
}

export default function EggLabelGenerator({ breedings = [], allActiveBreedings = [], open, onClose }) {
  const [sizeId, setSizeId] = useState(UKURAN_TELUR_BAWAAN);
  const [pratinjau, setPratinjau] = useState(null);
  const [pratinjauSibuk, setPratinjauSibuk] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [a4Generating, setA4Generating] = useState(false);
  const [a4Done, setA4Done] = useState(false);
  const [doneIdx, setDoneIdx] = useState(null);

  const sizeDef = cariUkuranTelur(sizeId);
  const lembarA4 = rencanaLembarA4(sizeDef);

  /**
   * ── Hanya label yang dipilih yang dicetak (10 Okt 2026) ──────────────────
   *
   * Tombol "Unduh Lembar A4" dulu memakai
   * `allActiveBreedings.length ? allActiveBreedings : breedings`. Halaman
   * clutch SELALU mengoper allActiveBreedings, jadi cabang pertamanya selalu
   * menang: mengetuk satu clutch lalu menekan tombolnya tetap mencetak
   * seluruh clutch aktif. Itu lembar A4 di foto pemiliknya — dua belas label
   * yang tidak ia minta.
   *
   * Sekarang yang dicetak adalah yang DICENTANG. Yang dioper pemanggil
   * menjadi centang awalnya: mengetuk satu clutch mencentang satu, menekan
   * "Unduh Label Aktif" mencentang semuanya. Sisanya tetap terdaftar supaya
   * bisa ditambahkan tanpa menutup layar ini.
   */
  const kunci = kunciClutch;

  const kandidat = useMemo(
    () => kandidatLabel(breedings, allActiveBreedings),
    [breedings, allActiveBreedings],
  );

  const [terpilih, setTerpilih] = useState(() => centangAwal(breedings));

  // Centang disetel ulang saat layar dibuka atau DAFTARNYA berganti — bukan
  // tiap kali induknya menggambar ulang.
  //
  // Bedanya penting karena BreedingDetailPage mengoper `breedings={[b]}`:
  // larik baru pada tiap render, walau isinya itu-itu juga. Menyandarkan ini
  // pada identitas lariknya berarti centang yang baru saja dicentang orang
  // terhapus begitu induknya menggambar ulang — misalnya saat satu kueri
  // menyegarkan diri — tanpa jejak dan tanpa cara menebak sebabnya. Yang
  // dibandingkan karena itu ISI daftarnya.
  const tandaAwal = breedings.map(kunciClutch).join("|");
  const tandaTerpakai = useRef(null);
  useEffect(() => {
    if (!open) { tandaTerpakai.current = null; return; }
    if (tandaTerpakai.current === tandaAwal) return;
    tandaTerpakai.current = tandaAwal;
    setTerpilih(centangAwal(breedings));
  }, [open, tandaAwal, breedings]);

  const dipilih = useMemo(
    () => kandidat.filter((b) => terpilih.has(kunci(b))),
    [kandidat, terpilih],
  );

  const contoh = dipilih[0] || kandidat[0] || null;

  // Pratinjau digambar begitu layar dibuka dan setiap kali ukurannya diganti.
  // `batal` menjaga agar hasil render yang sudah kedaluwarsa — ukurannya sudah
  // diganti lagi sebelum yang lama selesai — tidak menimpa yang baru.
  useEffect(() => {
    if (!open || !contoh) { setPratinjau(null); return; }
    let batal = false;
    setPratinjauSibuk(true);
    renderLabelPng(contoh, sizeDef)
      .then((url) => { if (!batal) setPratinjau(url); })
      .catch(() => { if (!batal) setPratinjau(null); })
      .finally(() => { if (!batal) setPratinjauSibuk(false); });
    return () => { batal = true; };
  }, [open, contoh, sizeDef]);

  const triggerDownload = useCallback((dataUrl, filename) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const out = [];
    for (const b of dipilih) {
      try {
        out.push({ breeding: b, dataUrl: await renderLabelPng(b, sizeDef) });
      } catch {
        out.push({ breeding: b, dataUrl: null });
      }
    }
    setPreviews(out);
    setGenerating(false);
  };

  const sizeTag = `${sizeDef.w}x${sizeDef.h}`;

  const handleDownload = (dataUrl, breeding, idx) => {
    if (!dataUrl) return;
    triggerDownload(dataUrl, `${fileStem(breeding)}-${sizeTag}.png`);
    setDoneIdx(idx);
    setTimeout(() => setDoneIdx(null), 2500);
  };

  const handleDownloadAll = () => {
    previews.forEach(({ dataUrl, breeding }) => {
      if (dataUrl) triggerDownload(dataUrl, `${fileStem(breeding)}-${sizeTag}.png`);
    });
    setDoneIdx("all");
    setTimeout(() => setDoneIdx(null), 2500);
  };

  const handleA4 = async () => {
    setA4Generating(true);
    setA4Done(false);
    try {
      const dataUrl = await renderA4SheetPng(dipilih, sizeDef);
      triggerDownload(dataUrl, `lembar-A4-label-telur-${sizeTag}-${format(new Date(), "ddMMyyyy")}.png`);
      setA4Done(true);
      setTimeout(() => setA4Done(false), 3500);
    } catch (e) {
      console.error("A4 sheet error:", e);
    }
    setA4Generating(false);
  };

  const kodeNama = (b) => `${b.male_name || "?"} × ${b.female_name || "?"}`;
  const jumlahA4 = dipilih.length;
  const tidakMuat = Math.max(0, dipilih.length - lembarA4.muat);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreviews([]); setA4Done(false); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Cetak Label Kotak Telur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pratinjau — digambar dari data clutch yang asli, bukan contoh */}
          <div>
            <p className="text-xs font-medium mb-1.5">
              Pratinjau {contoh ? <span className="text-muted-foreground font-normal">— {kodeNama(contoh)}</span> : null}
            </p>
            <div className="rounded-xl border-2 border-dashed border-green-700/25 bg-green-50/40 p-3 flex items-center justify-center min-h-[120px]">
              {pratinjauSibuk ? (
                <span className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Menggambar label...
                </span>
              ) : pratinjau ? (
                <img src={pratinjau} alt={`Pratinjau label ${sizeDef.label}`} className="max-w-full rounded shadow-sm" />
              ) : (
                <span className="text-xs text-muted-foreground">Belum ada clutch untuk digambar.</span>
              )}
            </div>
          </div>

          {/* Label mana yang dicetak. Disembunyikan kalau memang cuma satu —
              daftar centang berisi satu baris tidak menawarkan pilihan apa pun. */}
          {kandidat.length > 1 && (
            <div>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <p className="text-xs font-medium">
                  Label yang dicetak{" "}
                  <span className="text-muted-foreground font-normal">— {dipilih.length} dari {kandidat.length}</span>
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => setTerpilih(new Set(kandidat.map(kunci)))}
                    className="text-[11px] text-green-700 hover:underline">Semua</button>
                  <button type="button" onClick={() => setTerpilih(new Set())}
                    className="text-[11px] text-muted-foreground hover:underline">Kosongkan</button>
                </div>
              </div>
              <div className="rounded-xl border border-border divide-y max-h-52 overflow-y-auto">
                {kandidat.map((b) => {
                  const k = kunci(b);
                  const aktif = terpilih.has(k);
                  return (
                    <label key={k} className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer hover:bg-muted/40">
                      <input
                        type="checkbox"
                        checked={aktif}
                        onChange={() => setTerpilih((lama) => {
                          const baru = new Set(lama);
                          if (baru.has(k)) baru.delete(k); else baru.add(k);
                          return baru;
                        })}
                        className="w-4 h-4 accent-green-700 flex-shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium truncate">{kodeNama(b)}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {b.egg_count || 0} butir
                          {b.egg_laying_date ? ` · ${format(new Date(b.egg_laying_date), "d MMM", { locale: idLocale })}` : ""}
                          {teksTray(b) ? ` · ${teksTray(b).toLowerCase()}` : ""}
                        </span>
                      </span>
                      {isCandlingLate(b) && <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ukuran label — tombol, bukan dropdown: pilihannya cuma tiga dan
              perbedaannya perlu kelihatan sekaligus */}
          <div>
            <p className="text-xs font-medium mb-1.5">Ukuran Label</p>
            <div className="grid grid-cols-3 gap-2">
              {UKURAN_LABEL_TELUR.map((s) => {
                const aktifUkuran = s.id === sizeId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setSizeId(s.id); setPreviews([]); setA4Done(false); }}
                    aria-pressed={aktifUkuran}
                    className={`rounded-xl border p-2 text-left transition ${
                      aktifUkuran ? "border-green-700 bg-green-50 ring-1 ring-green-700" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="block text-xs font-semibold">{s.label}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      {rencanaLembarA4(s).muat} per lembar A4
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">{sizeDef.untuk}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Dicetak di <b>Epson L385</b>, kertas A4, lalu dipotong di garis putus-putus.
              Tinta inkjet luntur bila terkena air dan inkubator lembap — <b>laminasi</b> atau
              lapisi <b>isolasi bening</b> sebelum ditempel.
            </span>
          </div>

          <Button
            variant="outline"
            onClick={handleA4}
            disabled={a4Generating || jumlahA4 === 0}
            className="w-full h-11 gap-2"
          >
            {a4Generating ? <Loader2 className="w-4 h-4 animate-spin" /> : a4Done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4" />}
            {a4Generating
              ? "Menyusun lembar A4..."
              : a4Done
              ? "Lembar A4 terunduh"
              : `Unduh Lembar A4 — ${Math.min(jumlahA4, lembarA4.muat)} label`}
          </Button>
          {tidakMuat > 0 ? (
            /* Kelebihannya dipotong penggambar lembar. Dikatakan di sini,
               bukan dibiarkan jadi label yang hilang tanpa penjelasan. */
            <p className="text-[11px] text-center text-amber-700 -mt-2">
              {tidakMuat} label tidak muat di satu lembar {sizeDef.w}×{sizeDef.h} mm —
              kurangi centangnya, lalu cetak sisanya di lembar kedua.
            </p>
          ) : (
            <p className="text-[11px] text-center text-muted-foreground -mt-2">
              {lembarA4.kolom} kolom × {lembarA4.baris} baris · maks. {lembarA4.muat} label {sizeDef.w}×{sizeDef.h} mm per lembar
            </p>
          )}

          <Button onClick={handleGenerate} disabled={generating || dipilih.length === 0} variant="ghost" className="w-full h-9 text-xs">
            {generating
              ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Membuat...</>
              : `Atau unduh PNG satu per satu (${dipilih.length} label)`}
          </Button>
        </div>

        {previews.length > 0 && (
          <div className="space-y-3 mt-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">{previews.length} label siap diunduh</p>
              {previews.length > 1 && (
                <Button size="sm" variant="outline" onClick={handleDownloadAll}>
                  {doneIdx === "all" ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" /> Terunduh</> : <><Download className="w-3.5 h-3.5 mr-1" /> Unduh Semua</>}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {previews.map(({ breeding, dataUrl }, idx) => (
                <div key={breeding.id || idx} className="border rounded-lg p-3 flex items-center gap-3">
                  {dataUrl ? (
                    <div className="rounded border-2 border-green-700/30 bg-green-50/40 p-1 flex-shrink-0">
                      <img src={dataUrl} alt={kodeNama(breeding)} className="rounded" style={{ height: 88 }} />
                    </div>
                  ) : (
                    <div className="h-20 w-32 flex items-center justify-center text-xs text-red-600 bg-red-50 rounded">Gagal</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{kodeNama(breeding)}</p>
                    <p className="text-xs text-muted-foreground">{breeding.egg_count || 0} butir · {breeding.incubator_name || "—"}</p>
                    {isCandlingLate(breeding) && (
                      <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Candling terlambat
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" disabled={!dataUrl} onClick={() => handleDownload(dataUrl, breeding, idx)}>
                    {doneIdx === idx ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" /> Terunduh</> : <><Download className="w-3.5 h-3.5 mr-1" /> PNG</>}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
