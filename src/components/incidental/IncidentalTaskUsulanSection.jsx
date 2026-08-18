/**
 * IncidentalTaskUsulanSection — bagian di halaman Tugas Insidentil.
 *
 * - Owner/manajer/admin: "Usulan Menunggu Persetujuan" — daftar usulan + tombol Tinjau
 *   (buka IncidentalTaskUsulanReview). Sertakan riwayat usulan ditolak.
 * - Keeper/kepala_feeder: "Usulan Saya" — usulan sendiri yang menunggu + yang ditolak
 *   beserta alasan (supaya belajar).
 *
 * Tugas "usulan" sengaja dipisah dari daftar tugas resmi agar tidak tertukar &
 * poinnya (yang belum berlaku) tidak ikut statistik.
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import IncidentalTaskUsulanReview from "./IncidentalTaskUsulanReview";
import { isManagerLevel } from "@/lib/permissions";

export default function IncidentalTaskUsulanSection({ usulanTasks, rejectedUsulan, user, role }) {
  const [reviewTask, setReviewTask] = useState(null);

  const isMgr = isManagerLevel(role);

  // Untuk keeper/kepala_feeder: hanya usulan miliknya
  const myUsulan = usulanTasks.filter((t) => t.created_by_email === user?.email);
  const myRejected = rejectedUsulan.filter((t) => t.created_by_email === user?.email);

  if (isMgr && usulanTasks.length === 0 && rejectedUsulan.length === 0) return null;
  if (!isMgr && myUsulan.length === 0 && myRejected.length === 0) return null;

  return (
    <div className="space-y-4">
      {isMgr ? (
        <>
          {/* Bagian tinjau owner/manajer/admin */}
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-heading font-semibold">Usulan Menunggu Persetujuan</h2>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              {usulanTasks.length}
            </Badge>
          </div>

          {usulanTasks.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm border-dashed">
              Tidak ada usulan menunggu persetujuan.
            </Card>
          ) : (
            <div className="space-y-3">
              {usulanTasks.map((t) => (
                <Card key={t.id} className="p-4 border-yellow-200 bg-yellow-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">✍️</span>
                        <p className="font-semibold text-sm">{t.title}</p>
                        <Badge variant="outline" className="text-[11px] bg-yellow-100 text-yellow-700 border-yellow-200">
                          Menunggu Persetujuan
                        </Badge>
                        <Badge variant="outline" className="text-[11px] text-amber-600">
                          +{t.points} poin
                        </Badge>
                        {t.bobot && (
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {t.bobot}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                        <span>
                          Diusulkan: <strong className="text-foreground">{t.created_by_name || t.created_by_email}</strong>
                        </span>
                        {t.created_date && (
                          <span>· {format(new Date(t.created_date), "d MMM yyyy", { locale: id })}</span>
                        )}
                      </div>
                      {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
                      {t.photo_url && (
                        <img src={t.photo_url} alt="Kondisi" className="mt-1.5 h-16 w-24 object-cover rounded border" />
                      )}
                    </div>
                    <Button size="sm" onClick={() => setReviewTask(t)} className="flex-shrink-0 gap-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5" /> Tinjau
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Riwayat usulan ditolak */}
          {rejectedUsulan.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Riwayat Usulan Ditolak
              </p>
              {rejectedUsulan.slice(0, 10).map((t) => (
                <Card key={t.id} className="p-3 opacity-75">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Ditolak oleh {t.reviewed_by_name || "manajemen"}
                        {t.rejection_reason ? `: ${t.rejection_reason}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Diusulkan oleh {t.created_by_name || t.created_by_email}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Bagian "Usulan Saya" untuk keeper/kepala_feeder */}
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-heading font-semibold">Usulan Saya</h2>
          </div>

          {myUsulan.length === 0 && myRejected.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm border-dashed">
              Belum ada usulan. Klik “Usulkan Tugas” untuk mengajukan pekerjaan.
            </Card>
          ) : (
            <div className="space-y-3">
              {myUsulan.map((t) => (
                <Card key={t.id} className="p-3.5 border-yellow-200 bg-yellow-50/40">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{t.title}</p>
                        <Badge variant="outline" className="text-[11px] bg-yellow-100 text-yellow-700 border-yellow-200">
                          Menunggu Persetujuan
                        </Badge>
                        <Badge variant="outline" className="text-[11px] text-amber-600">
                          +{t.points} poin
                        </Badge>
                      </div>
                      {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Poin belum berlaku sampai disetujui owner/manajer.
                      </p>
                    </div>
                  </div>
                </Card>
              ))}

              {myRejected.map((t) => (
                <Card key={t.id} className="p-3.5 border-red-200 bg-red-50/40">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{t.title}</p>
                        <Badge variant="outline" className="text-[11px] bg-red-100 text-red-700 border-red-200">
                          Ditolak
                        </Badge>
                      </div>
                      <p className="text-xs text-red-600 mt-0.5">
                        Ditolak oleh {t.reviewed_by_name || "manajemen"}
                        {t.rejection_reason ? `: ${t.rejection_reason}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Pelajari alasan ini untuk usulan berikutnya.
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <IncidentalTaskUsulanReview
        task={reviewTask}
        open={!!reviewTask}
        onClose={() => setReviewTask(null)}
      />
    </div>
  );
}