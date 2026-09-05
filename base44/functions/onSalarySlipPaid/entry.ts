import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { waitUntil } from "base44:runtime";
import {
  sendWhatsAppNotification,
  getEmployeePhone,
} from "../../shared/whatsapp.ts";
import { notifSekali, emailPerRole } from "../../shared/otomatis.ts";
import { masukLaporan } from "../../shared/laporan.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";

// Dipanggil via entity automation saat SalarySlip dibuat atau status berubah
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: slip, old_data, event } = body;

    if (!slip || !slip.employee_email) return Response.json({ skipped: true });

    const now = new Date().toISOString();
    const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
    const fmtD = (d) => {
      const dt = d instanceof Date && !isNaN(d.getTime()) ? d : null;
      return dt ? dt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
    };
    let bulan;
    if (slip.period_type === "weekly") {
      const ws = slip.week_start ? new Date(slip.week_start) : (slip.period ? new Date(slip.period) : null);
      if (!ws || isNaN(ws.getTime())) {
        bulan = slip.week_start || slip.period || "periode mingguan";
      } else {
        const we = slip.week_end ? new Date(slip.week_end) : new Date(ws.getTime() + 6 * 86400000);
        bulan = `${fmtD(ws)} – ${fmtD(we)}`;
      }
    } else if (slip.period && /^\d{4}-\d{2}$/.test(slip.period)) {
      bulan = new Date(slip.period + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    } else {
      bulan = slip.period || "periode ini";
    }

    // ── CREATE: slip baru dibuat (draft) ──
    if (event?.type === "create") {
      const existing = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: slip.employee_email,
        related_entity_id: slip.id,
        category: "keuangan",
      }, null, BATAS_AMBIL);
      if (existing.some(n => !n.is_dismissed)) return Response.json({ skipped: "duplicate" });

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: slip.employee_email,
        title: `Slip Gaji ${bulan} Sudah Dibuat`,
        message: `Total gaji kamu periode ${bulan}: ${fmtRp(slip.net_total)}.`,
        type: "success",
        priority: "sedang",
        category: "keuangan",
        action_label: "Lihat Slip Gaji",
        action_url: "/salary-slip",
        related_entity_id: slip.id,
        related_entity_type: "SalarySlip",
        is_read: false,
        is_dismissed: false,
        created_at: now,
      });
    }

    // ── UPDATE: status berubah menjadi "paid" → notifikasi "gaji ditransfer" ──
    if (event?.type === "update") {
      const wasPaid = old_data?.status === "paid";
      const isPaid = slip.status === "paid";

      if (isPaid && !wasPaid) {
        const hasProof = !!slip.payment_proof_url;

        // ── Proses potongan kasbon saat slip ditandai dibayar ──
        // Tulis deduction_log & update total_paid HANYA saat slip → paid (bukan saat draft).
        // Untuk slip baru, pakai kasbon_plan (jumlah hasil konfirmasi owner). Untuk slip
        // lama tanpa kasbon_plan, fallback ke weekly_deduction (kompatibilitas).
        const plan = Array.isArray(slip.kasbon_plan) ? slip.kasbon_plan : null;
        const ids = Array.isArray(slip.kasbon_ids) ? slip.kasbon_ids : [];
        const periodKey = slip.period_type === "weekly"
          ? (slip.week_start || slip.period)
          : slip.period;

        if (plan && plan.length > 0) {
          for (const entry of plan) {
            try {
              const kasbon = await base44.asServiceRole.entities.Kasbon.get(entry.kasbon_id);
              if (!kasbon) continue;
              const alreadyLogged = (kasbon.deduction_log || []).some(
                d => d.salary_slip_id === slip.id
              );
              if (alreadyLogged) continue;
              const sisaK = (kasbon.amount || 0) - (kasbon.total_paid || 0);
              if (sisaK <= 0) continue;
              const ded = Math.min(Math.max(0, Number(entry.amount) || 0), sisaK);
              if (ded <= 0) continue;
              const newPaid = (kasbon.total_paid || 0) + ded;
              const newStatus = newPaid >= (kasbon.amount || 0) ? "lunas" : kasbon.status;
              const newLog = [...(kasbon.deduction_log || []), {
                amount: ded,
                date: new Date().toISOString().split('T')[0],
                method: "salary_slip",
                salary_period: periodKey,
                salary_slip_id: slip.id,
                recorded_by: "system (auto on paid)",
                notes: "Dipotong saat slip ditandai dibayar",
              }];
              await base44.asServiceRole.entities.Kasbon.update(entry.kasbon_id, {
                total_paid: newPaid,
                status: newStatus,
                deduction_log: newLog,
              });
            } catch {
              // Lanjut ke kasbon berikutnya jika satu gagal
            }
          }
        } else if (ids.length > 0) {
          for (const kasbonId of ids) {
            try {
              const kasbon = await base44.asServiceRole.entities.Kasbon.get(kasbonId);
              if (!kasbon) continue;
              const alreadyLogged = (kasbon.deduction_log || []).some(
                d => d.salary_slip_id === slip.id
              );
              if (alreadyLogged) continue;
              const sisaK = (kasbon.amount || 0) - (kasbon.total_paid || 0);
              if (sisaK <= 0) continue;
              const ded = Math.min(kasbon.weekly_deduction || 100000, sisaK);
              const newPaid = (kasbon.total_paid || 0) + ded;
              const newStatus = newPaid >= (kasbon.amount || 0) ? "lunas" : kasbon.status;
              const newLog = [...(kasbon.deduction_log || []), {
                amount: ded,
                date: new Date().toISOString().split('T')[0],
                method: "salary_slip",
                salary_period: periodKey,
                salary_slip_id: slip.id,
                recorded_by: "system (auto on paid)",
                notes: "Auto-deducted saat slip ditandai dibayar",
              }];
              await base44.asServiceRole.entities.Kasbon.update(kasbonId, {
                total_paid: newPaid,
                status: newStatus,
                deduction_log: newLog,
              });
            } catch {
              // Lanjut ke kasbon berikutnya jika satu gagal
            }
          }
        }

        // ── D18: slip yang dibayar MEMBUAT catatan biayanya sendiri ──
        //
        // Sebelumnya tidak ada yang membuatnya. Gaji hanya masuk laporan bila
        // pemilik mengetiknya manual di halaman keuangan, dan ketika ia berhenti
        // mengetik, laporan biaya berhenti menyebut gaji tanpa satu pun tanda:
        // dari 5 Juli sampai 30 Agustus 2026 seluruh pengeluaran yang tercatat
        // berjumlah Rp 701.000, semuanya kas kecil, sementara tim tetap dibayar.
        //
        // Sekarang slip adalah SATU-SATUNYA sumber. Karena catatan ini yang
        // dihitung laporan, penjumlahan SalarySlip terpisah sudah dihapus dari
        // labaRugiData, laporanBiayaBulanan, dan calculateCostPerTortoise -
        // membiarkan keduanya berarti setiap gaji terhitung dua kali.
        //
        // reference_id diisi nomor slip dan diperiksa lebih dulu, jadi menandai
        // ulang slip yang sama tidak pernah membuat catatan kedua. Blok ini
        // sengaja diletakkan SEBELUM pemeriksaan duplikat notifikasi di bawah,
        // yang berhenti lebih awal (return) dan akan ikut melewatkan pencatatan
        // biaya bila ditaruh sesudahnya.
        try {
          const nominal = Number(slip.net_total ?? slip.gross_total ?? 0);
          if (nominal > 0) {
            const sudahAda = await base44.asServiceRole.entities.FinanceTransaction.filter({
              reference_id: slip.id,
            }, null, BATAS_AMBIL);
            // Periode ini mungkin SUDAH punya catatan gaji yang dibuat manual
            // atau lewat pencatatan susulan. Kalau ada, biayanya tidak dicatat
            // ulang - tetapi juga tidak didiamkan: pemilik diberi tahu supaya ia
            // yang memutuskan mana yang benar.
            //
            // Diam-diam mencatat dua kali dan diam-diam melewatkan sama-sama
            // buruk; bedanya hanya arah kesalahannya. Yang membuat keduanya
            // berbahaya adalah DIAM-DIAM-nya. Jadi di sini pilihannya: jangan
            // catat, lalu katakan.
            const awalPeriode = slip.week_start || `${(slip.period || "").slice(0, 7)}-01`;
            const akhirPeriode = slip.week_end || `${(slip.period || "").slice(0, 7)}-31`;
            const semuaTx = await base44.asServiceRole.entities.FinanceTransaction.list("-date", 500);
            const bentrok = (semuaTx || []).filter((t: any) =>
              t.type === "pengeluaran" &&
              ["gaji", "gaji_karyawan"].includes(t.category) &&
              String(t.date || "") >= awalPeriode &&
              String(t.date || "") <= akhirPeriode &&
              t.reference_id !== slip.id &&
              masukLaporan(t)
            );
            if (bentrok.length > 0) {
              const totalBentrok = bentrok.reduce((n: number, t: any) => n + Number(t.amount || 0), 0);
              // Ke pemilik, bukan ke yang menandai dibayar: ini keputusan
              // pembukuan, dan slip.paid_by sering kosong.
              const pemilik = await emailPerRole(base44, ["owner", "manajer", "admin"]);
              await notifSekali(base44, {
                recipient_email: pemilik[0] || slip.paid_by || slip.created_by || "",
                related_entity_id: `bentrok_gaji_${slip.id}`,
                title: "Catatan gaji ganda dicegah - perlu diperiksa",
                message:
                  `Slip ${slip.employee_name || slip.employee_email} periode ${slip.period || bulan} ditandai dibayar, ` +
                  `tetapi periode itu sudah punya ${bentrok.length} catatan gaji senilai ${fmtRp(totalBentrok)} yang dibuat di luar slip. ` +
                  `Biaya dari slip ini TIDAK dicatat supaya tidak dobel. Periksa mana yang benar, lalu hapus atau perbaiki salah satunya.`,
                type: "warning",
                priority: "tinggi",
                category: "keuangan",
                action_label: "Buka Keuangan",
                action_url: "/finance",
              });
            } else if (!sudahAda || sudahAda.length === 0) {
              const tanggal =
                slip.paid_date ||
                slip.payment_date ||
                new Date().toISOString().slice(0, 10);
              await base44.asServiceRole.entities.FinanceTransaction.create({
                type: "pengeluaran",
                category: "gaji_karyawan",
                amount: nominal,
                date: tanggal,
                description:
                  `Gaji ${slip.employee_name || slip.employee_email || "karyawan"} ` +
                  `periode ${slip.week_start ? `${slip.week_start} s/d ${slip.week_end || ""}`.trim() : (slip.period || bulan)}`,
                reference_id: slip.id,
                created_by_name: "Otomatis dari slip gaji",
              });
            }
          }
        } catch {
          // Gagal mencatat biaya tidak boleh membatalkan penandaan "dibayar" -
          // gajinya memang sudah ditransfer. Pemeriksaan mingguan di higieneData
          // akan menyebut bulan tanpa catatan gaji, jadi kegagalan ini tidak
          // hilang diam-diam.
        }

        // Dedup: cek apakah notifikasi "ditransfer" sudah pernah dibuat untuk slip ini
        const existing = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: slip.employee_email,
          related_entity_id: slip.id,
          category: "keuangan",
        }, null, BATAS_AMBIL);
        if (existing.some(n => (n.title || "").includes("ditransfer") && !n.is_dismissed)) {
          return Response.json({ skipped: "duplicate_paid" });
        }

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: slip.employee_email,
          title: `💸 Gaji periode ${bulan} sudah ditransfer`,
          message: `Gaji kamu periode ${bulan} sebesar ${fmtRp(slip.net_total)} sudah ditransfer${hasProof ? ". Bukti transfer tersedia, klik untuk melihat." : "."}`,
          type: "success",
          priority: "tinggi",
          category: "keuangan",
          action_label: hasProof ? "Lihat Bukti Transfer" : "Lihat Slip Gaji",
          action_url: "/salary-slip",
          related_entity_id: slip.id,
          related_entity_type: "SalarySlip",
          is_read: false,
          is_dismissed: false,
          created_at: now,
        });

        // ── WhatsApp notification ke karyawan ──
        waitUntil(
          (async () => {
            const phone = await getEmployeePhone(base44, slip.employee_email);
            if (!phone) return;
            const waMessage =
              `💸 *Gaji Ditransfer*\n\n` +
              `Periode: ${bulan}\n` +
              `Jumlah: ${fmtRp(slip.net_total)}\n` +
              (slip.payment_proof_url ? `Bukti transfer tersedia di aplikasi.\n` : '') +
              `\nBuka aplikasi → menu *Slip Gaji* untuk detail.`;
            await sendWhatsAppNotification(base44, {
              targets: [phone],
              message: waMessage,
              notificationType: 'salary_paid',
              relatedEntityId: slip.id,
            });
          })()
        );
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});