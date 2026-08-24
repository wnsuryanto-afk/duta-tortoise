/**
 * PoinRiwayatPerubahan — Bagian E: riwayat perubahan nilai poin.
 * Membaca entity NilaiPoinHistory. Menampilkan catatan: tanggal, lama→baru, siapa.
 * Termasuk keterangan bahwa perubahan hanya berlaku ke depan.
 */
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function PoinRiwayatPerubahan({ history }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Perubahan nilai poin hanya berlaku ke DEPAN. Slip gaji yang sudah dibuat memakai nilai saat itu dan tidak akan berubah surut.</span>
      </div>
      {!history || history.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Belum ada riwayat perubahan nilai poin.</p>
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {fmt(h.old_value)} → <span className="text-primary font-bold">{fmt(h.new_value)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {h.changed_at ? format(new Date(h.changed_at), "d MMM yyyy HH:mm", { locale: idLocale }) : "—"} · oleh {h.changed_by_name || h.changed_by_email || "—"}
                </p>
              </div>
              {(h.old_target != null || h.new_target != null) ? (
                <span className="text-xs text-muted-foreground whitespace-nowrap">Target {h.old_target ?? 0} → {h.new_target ?? 0}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}