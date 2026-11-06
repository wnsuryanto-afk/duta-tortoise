import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Loader2 } from "lucide-react";
import { rupiah } from "@/lib/rupiah";

/**
 * PanelBelumMasuk — pencairan yang uangnya tidak ada di buku kas.
 *
 * ── Apa yang dilaporkannya ──────────────────────────────────────────────────
 *
 * Request dana yang sudah ditandai "dicairkan" — uangnya keluar dari rekening,
 * buktinya diunggah, pemohonnya diberi notifikasi — tetapi tidak pernah
 * ditambahkan ke PettyCashLedger. Sampai 6 Nov 2026 tidak ada satu pun layar
 * yang bisa menunjukkan keadaan ini, dan saldo kas kecil berjalan sampai
 * Rp −55.500 pada 4 Nov sementara uang yang sebenarnya ada Rp 144.500.
 *
 * ── Kenapa komponen tersendiri, bukan markup di dalam halaman ───────────────
 *
 * Selama markup-nya tinggal di PettyCashPage, satu-satunya cara penjaga lebar
 * menggambarnya adalah lewat halaman utuh — dan halaman itu hanya bisa
 * digambar dalam keadaan tanpa data, yang berarti daftarnya KOSONG dan
 * panelnya tidak dirender sama sekali. Jadi justru bentuk yang paling mungkin
 * meluap — "Rp 1.200.000", tanggal, nama pemohon panjang, dan tombol
 * "Masukkan ke buku kas" pada satu baris — tidak pernah terukur pada lebar
 * mana pun.
 *
 * Sebagai komponen tersendiri ia bisa diberi baris sungguhan di harness, dan
 * cek-lebar/cek-lipat mengukurnya di 280–768px seperti layar lain.
 */
export default function PanelBelumMasuk({ belumMasuk = [], total = 0, bolehPerbaiki = false, sedang = null, onMasukkan }) {
  if (!belumMasuk.length) return null;

  return (
    <Card className="p-4 border-red-300 bg-red-50">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-red-900 break-words">
            {belumMasuk.length} pencairan belum masuk buku kas — {rupiah(total)}
          </p>
          <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
            Dana ini sudah ditandai <strong>dicairkan</strong>, tetapi tidak pernah ditambahkan
            ke saldo kas kecil. Jadi saldo di atas lebih rendah {rupiah(total)} daripada uang
            yang sebenarnya ada.
          </p>
          <div className="mt-3 space-y-2">
            {belumMasuk.map((req) => (
              <div key={req.id} className="flex items-start justify-between gap-2 flex-wrap bg-white/70 rounded-lg p-2.5 border border-red-200">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground tabular-nums break-words">{rupiah(req.amount_requested)}</p>
                  <p className="text-[11px] text-muted-foreground break-words">
                    {req.disbursement_date || req.request_date} · {req.requester_name}
                    {req.disbursement_method === "tunai" ? " · tunai" : " · transfer"}
                  </p>
                </div>
                {bolehPerbaiki && (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5 flex-shrink-0"
                    disabled={sedang === req.id}
                    onClick={() => onMasukkan?.(req)}
                  >
                    {sedang === req.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Masukkan ke buku kas
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
