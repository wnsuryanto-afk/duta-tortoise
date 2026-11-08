import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { retak as telurRetak } from "@/lib/telurRetak";

/**
 * KendaliRetak — tombol tandai/lepas "cangkang retak" pada satu telur,
 * beserta catatan perlakuannya.
 *
 * ── Kenapa terpisah dari daftar status ──────────────────────────────────────
 *
 * Di layar telur, status dipilih dari satu daftar: belum dicek, fertile,
 * infertil, menetas, gagal. Menambahkan "retak" sebagai pilihan keenam di
 * daftar itu adalah hal yang paling wajar dilakukan — dan salah. Memilih
 * "retak" akan MENGGANTIKAN status fertilitasnya, padahal telur retak tetap
 * punya perjalanan hidupnya sendiri dan tetap bisa menetas.
 *
 * Jadi kendalinya berdiri sendiri, di bawah daftar status, dengan bentuk yang
 * berbeda (sakelar, bukan pilihan) supaya tidak terbaca sebagai status keenam.
 * Lihat lib/telurRetak.js untuk apa yang rusak kalau ia jadi status.
 *
 * ── Kenapa komponen tersendiri ──────────────────────────────────────────────
 *
 * EggGrid punya DUA popup telur — satu untuk layar lebar, satu lembar-bawah
 * untuk ponsel. Menulis kendalinya dua kali berarti dua tempat yang bisa
 * berbeda, dan yang di ponsel adalah yang dipakai kiper di kandang. Satu
 * komponen, dipanggil keduanya, dan penjaga lebar bisa mengukurnya.
 */
export default function KendaliRetak({ egg, readonly = false, saving = false, onSimpan }) {
  const sudahRetak = telurRetak(egg);
  const [buka, setBuka] = useState(false);
  const [catatan, setCatatan] = useState(egg?.retak_catatan || "");

  if (readonly && !sudahRetak) return null;

  return (
    <div className={`rounded-xl border p-3 ${sudahRetak ? "border-orange-300 bg-orange-50 dark:bg-orange-950/30" : "border-border bg-muted/30"}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${sudahRetak ? "text-orange-900 dark:text-orange-300" : "text-foreground"}`}>
            🧩 Cangkang retak
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            {sudahRetak
              ? "Ditandai untuk perlakuan khusus. Statusnya tetap berjalan seperti telur lain."
              : "Tandai kalau cangkangnya retak — bukan status, telur retak masih bisa menetas."}
          </p>
        </div>
        {!readonly && (
          <Button
            size="sm"
            variant={sudahRetak ? "outline" : "default"}
            className="h-7 text-xs flex-shrink-0"
            disabled={saving}
            onClick={() => (sudahRetak ? onSimpan(false) : setBuka(true))}
          >
            {sudahRetak ? "Lepas tanda" : "Tandai retak"}
          </Button>
        )}
      </div>

      {sudahRetak && egg?.retak_date && (
        <p className="text-[11px] text-orange-800 dark:text-orange-400 mt-1.5">
          Dicatat {egg.retak_date}
        </p>
      )}

      {sudahRetak && egg?.retak_catatan && !buka && (
        <p className="text-[11px] text-foreground mt-1.5 break-words">
          <span className="text-muted-foreground">Perlakuan:</span> {egg.retak_catatan}
        </p>
      )}

      {!readonly && sudahRetak && !buka && (
        <button
          type="button"
          className="text-[11px] text-primary hover:underline mt-1.5"
          onClick={() => setBuka(true)}
        >
          {egg?.retak_catatan ? "Ubah catatan perlakuan" : "Tambah catatan perlakuan"}
        </button>
      )}

      {!readonly && buka && (
        <div className="mt-2 space-y-2">
          <Input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="cth: ditutup lilin lebah, dipisah ke tray 7"
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              disabled={saving}
              onClick={() => { setCatatan(egg?.retak_catatan || ""); setBuka(false); }}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              disabled={saving}
              onClick={async () => { await onSimpan(true, catatan); setBuka(false); }}
            >
              Simpan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
