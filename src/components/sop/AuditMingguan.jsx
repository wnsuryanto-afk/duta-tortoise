import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Check, PenLine, Loader2 } from "lucide-react";
import { format, parseISO, startOfWeek } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { labelSebab } from "@/lib/persetujuanPoin";

/**
 * AuditMingguan — pemilik memeriksa contoh acak persetujuan yang dilakukan
 * ORANG LAIN.
 *
 * Alasannya: begitu kepala_feeder dan manajer boleh menyetujui poin, pemilik
 * berhenti melihat setiap keputusan. Memeriksa semuanya lagi sama saja dengan
 * tidak mendelegasikan; tidak memeriksa sama sekali berarti menyerahkan
 * penilaian upah tanpa sepasang mata kedua. Tiga contoh per orang per minggu
 * adalah jalan tengahnya.
 *
 * Yang diperiksa hanya persetujuan oleh orang lain — persetujuan pemilik
 * sendiri tidak perlu diaudit oleh pemilik.
 *
 * Pengacakannya BERSARANG PADA MINGGU, bukan pada jam: kunci acaknya dibuat
 * dari tanggal awal minggu dan id checklist, sehingga contoh yang sama tetap
 * muncul sepanjang minggu itu. Acak yang berubah tiap muat ulang membuat
 * pemilik tidak pernah bisa menyelesaikan pemeriksaannya.
 */

/** Angka acak yang tetap sama untuk kunci yang sama. */
function acakTetap(kunci) {
  let h = 2166136261;
  for (let i = 0; i < kunci.length; i++) {
    h ^= kunci.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export default function AuditMingguan({ perOrang = 3 }) {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [sibuk, setSibuk] = useState({});
  const [koreksi, setKoreksi] = useState({});

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["audit-mingguan-checklists"],
    queryFn: () => base44.entities.DailyChecklist.filter({ status: "approved" }, "-date", 300),
    enabled: role === "owner",
  });

  const awalMinggu = format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");

  const contoh = useMemo(() => {
    const emailSaya = (user?.email || "").toLowerCase();
    const layak = (checklists || [])
      .filter((c) => !c.excluded_from_reports && !c.is_test_data)
      .filter((c) => c.date >= awalMinggu)
      // Hanya yang disetujui ORANG LAIN. Checklist lama tidak menyimpan
      // `approved_by_email`; itu dianggap bukan milik audit ini, karena tanpa
      // email kita tidak bisa memastikan siapa yang menyetujuinya.
      .filter((c) => c.approved_by_email && c.approved_by_email.toLowerCase() !== emailSaya)
      .filter((c) => !c.audit_owner_status);

    const perKeeper = {};
    for (const c of layak) {
      const k = c.employee_email || "—";
      (perKeeper[k] = perKeeper[k] || []).push(c);
    }
    return Object.values(perKeeper).flatMap((daftar) =>
      daftar
        .slice()
        .sort((a, b) => acakTetap(awalMinggu + a.id) - acakTetap(awalMinggu + b.id))
        .slice(0, perOrang),
    );
  }, [checklists, awalMinggu, perOrang, user]);

  if (role !== "owner") return null;

  const putuskan = async (c, status) => {
    setSibuk((p) => ({ ...p, [c.id]: true }));
    try {
      await base44.entities.DailyChecklist.update(c.id, {
        audit_owner_status: status,
        audit_owner_at: new Date().toISOString(),
        ...(status === "dikoreksi" ? { audit_owner_note: (koreksi[c.id] || "").trim() } : {}),
      });
      toast.success(status === "sesuai" ? "Ditandai sesuai" : "Koreksi tercatat");
      qc.invalidateQueries({ queryKey: ["audit-mingguan-checklists"] });
    } catch (e) {
      toast.error("Gagal: " + (e?.message || e));
    }
    setSibuk((p) => ({ ...p, [c.id]: false }));
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan contoh audit…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border surface-leaf p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Audit Mingguan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Contoh acak dari persetujuan yang dilakukan orang lain minggu ini — maksimal{" "}
              {perOrang} per keeper. Contohnya tetap sama sepanjang minggu, jadi bisa
              dikerjakan bertahap.
            </p>
          </div>
        </div>
      </div>

      {contoh.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm font-medium">Tidak ada yang perlu diaudit minggu ini</p>
          <p className="text-xs text-muted-foreground mt-1">
            Audit hanya memeriksa persetujuan oleh orang lain. Selama Anda sendiri yang
            menyetujui, bagian ini memang kosong.
          </p>
        </div>
      ) : (
        contoh.map((c) => {
          const diklaim = Number(c.total_points_claimed || 0);
          const disetujui = Number(c.approved_points || 0);
          const dipotong = disetujui < diklaim;
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="font-semibold text-sm">{c.employee_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.date ? format(parseISO(c.date), "EEEE, d MMM", { locale: idLocale }) : "—"}
                </p>
              </div>

              <p className="text-sm">
                <span className="tabular-nums font-semibold">{disetujui}</span> dari{" "}
                <span className="tabular-nums">{diklaim}</span> poin
                {dipotong && (
                  <span className="text-amber-700 dark:text-amber-500">
                    {" "}· {diklaim - disetujui} hangus
                  </span>
                )}
              </p>

              {dipotong && (
                <p className="text-xs text-muted-foreground">
                  {c.rejection_reason_kode ? `${labelSebab(c.rejection_reason_kode)} — ` : ""}
                  {c.rejection_reason || "tanpa alasan tercatat"}
                </p>
              )}

              <p className="text-xs text-muted-foreground">Disetujui oleh {c.approved_by}</p>

              <Input
                value={koreksi[c.id] || ""}
                onChange={(e) => setKoreksi((p) => ({ ...p, [c.id]: e.target.value }))}
                placeholder="Catatan koreksi (isi bila tidak sesuai)"
                className="h-9 text-sm"
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  disabled={sibuk[c.id]}
                  onClick={() => putuskan(c, "sesuai")}
                >
                  <Check className="w-3.5 h-3.5" /> Sesuai
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  disabled={sibuk[c.id] || !(koreksi[c.id] || "").trim()}
                  onClick={() => putuskan(c, "dikoreksi")}
                >
                  <PenLine className="w-3.5 h-3.5" /> Koreksi
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
