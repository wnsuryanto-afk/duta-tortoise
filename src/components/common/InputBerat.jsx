import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { SATUAN_BERAT, keGram, dariGram, satuanUntuk, bacaanGram } from "@/lib/satuanBerat";
import { beratMencurigakan } from "@/lib/beratMasukAkal";

/**
 * InputBerat — satu-satunya kotak isian berat di aplikasi ini.
 *
 * Tiga lapis, dari yang paling ampuh ke yang paling akhir:
 *   1. Satuan ditanyakan, tidak diasumsikan. Timbangan gantung menunjukkan kg;
 *      penimbang tinggal menekan "kg" dan mengetik apa yang dibacanya.
 *   2. Bacaan balik di bawah kotak: "22.800 g (22,8 kg)". Angka yang benar-benar
 *      akan tersimpan terlihat sebelum tombol simpan ditekan.
 *   3. Pemeriksaan kewajaran terhadap panjang tempurung, bila panjangnya diisi.
 *      Ini jaring terakhir, bukan yang pertama.
 *
 * Nilai yang dikirim ke induk SELALU gram (bilangan bulat), atau "" bila kosong.
 * Bawaan satuannya selalu gram — sama seperti perilaku lama, supaya tidak ada
 * kejutan ke arah sebaliknya (mengetik "180" untuk bayi lalu tersimpan 180 kg).
 */
export default function InputBerat({
  gram,
  onChange,
  panjangCm,
  label = "Berat",
  required = false,
  autoFocus = false,
  disabled = false,
  className = "",
}) {
  const [satuan, setSatuan] = useState(() => satuanUntuk(gram));
  const [teks, setTeks] = useState(() => dariGram(gram, satuanUntuk(gram)));
  const terakhirDikirim = useRef(gram === "" || gram == null ? "" : Number(gram));

  // Induk mengubah nilai dari luar (reset form, buka data lain) → ikuti.
  useEffect(() => {
    const dariLuar = gram === "" || gram == null ? "" : Number(gram);
    if (dariLuar === terakhirDikirim.current) return;
    terakhirDikirim.current = dariLuar;
    const s = dariLuar === "" ? "g" : satuanUntuk(dariLuar);
    setSatuan(s);
    setTeks(dariLuar === "" ? "" : dariGram(dariLuar, s));
  }, [gram]);

  const kirim = (teksBaru, satuanBaru) => {
    const g = keGram(teksBaru, satuanBaru);
    const nilai = g == null ? "" : g;
    terakhirDikirim.current = nilai;
    onChange?.(nilai);
  };

  const gantiTeks = (v) => {
    setTeks(v);
    kirim(v, satuan);
  };

  const gantiSatuan = (kode) => {
    setSatuan(kode);
    // Angka yang sudah diketik TIDAK dikonversi — penimbang menekan "kg" karena
    // yang dibacanya memang kilogram, bukan karena ingin mengubah angkanya.
    kirim(teks, kode);
  };

  const gramSekarang = keGram(teks, satuan);
  const curiga = gramSekarang ? beratMencurigakan(gramSekarang, panjangCm) : null;

  return (
    <div className={className}>
      <Label className="text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="mt-1 flex gap-1.5">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={teks}
          onChange={(e) => gantiTeks(e.target.value)}
          placeholder="0"
          autoFocus={autoFocus}
          disabled={disabled}
          className="h-9 text-sm flex-1"
        />
        <div className="flex rounded-md border border-input overflow-hidden shrink-0">
          {SATUAN_BERAT.map((s) => (
            <button
              key={s.kode}
              type="button"
              disabled={disabled}
              onClick={() => gantiSatuan(s.kode)}
              aria-pressed={satuan === s.kode}
              className={`px-3 h-9 text-xs font-medium transition-colors ${
                satuan === s.kode
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {gramSekarang ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Tersimpan sebagai <span className="font-semibold tabular-nums">{bacaanGram(gramSekarang)}</span>
        </p>
      ) : null}

      {curiga && (
        <div className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2">
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-900">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>{curiga.pesan}</span>
          </p>
          {curiga.saran && (
            <button
              type="button"
              onClick={() => {
                const s = curiga.saran >= 1000 ? "kg" : "g";
                setSatuan(s);
                const t = dariGram(curiga.saran, s);
                setTeks(t);
                kirim(t, s);
              }}
              className="mt-1.5 w-full rounded-md bg-amber-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700"
            >
              Ya, ubah jadi {bacaanGram(curiga.saran)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
