import { base44 } from "@/api/base44Client";
import { saldoTerkini } from "@/lib/kasKecil";
import { logActivity } from "@/lib/logActivity";

/**
 * cairkanKasKecil.js — pencairan request dana MASUK buku kas.
 *
 * ── Lubang yang ditutup berkas ini ──────────────────────────────────────────
 *
 * Menekan "Cairkan" dulu hanya mengubah satu kolom:
 *
 *     PettyCashRequest.update(id, { status: "dicairkan", ... })
 *
 * Uangnya benar-benar keluar dari rekening pemilik — ada bukti transfernya,
 * diunggah dan diberi nama penggunggahnya — tetapi PettyCashLedger tidak
 * pernah tahu. Saldo kas kecil terus berjalan seolah uang itu tidak pernah
 * datang. 29 Okt 2026 Rp 200.000, dan saldo tercatat sampai Rp −55.500 pada
 * 4 Nov, padahal yang sebenarnya ada Rp 144.500.
 *
 * Yang membuatnya tidak terlihat selama seminggu: otomasi
 * onPettyCashRequestUpdate mengirim notifikasi "Dana Rp 200.000 Sudah
 * Dicairkan" ke pemohon begitu statusnya berubah. Jadi satu-satunya kabar
 * yang diterima siapa pun adalah kabar bahwa uangnya sudah ada.
 *
 * ── Urutannya tidak sembarang ───────────────────────────────────────────────
 *
 * Buku kas DULU, status request kemudian. Kalau dibalik, kegagalan di tengah
 * meninggalkan keadaan yang persis seperti bug aslinya: request bilang
 * "dicairkan", pemohon sudah diberi notifikasi, buku kas kosong. Dengan
 * urutan ini, kegagalan di tengah meninggalkan uang yang SUDAH masuk buku kas
 * dengan status yang belum berubah — terlihat janggal, mudah diulang, dan
 * tidak ada yang dirugikan.
 *
 * ── Kenapa diulang tidak melipatgandakan uang ───────────────────────────────
 *
 * Sebelum menulis, baris top_up dengan `linked_request_id` yang sama dicari
 * lebih dulu. Satu request hanya bisa punya satu baris buku kas, berapa kali
 * pun tombolnya ditekan atau jaringannya putus di tengah.
 */

/**
 * Pastikan sebuah request punya baris top_up di buku kas.
 *
 * @param {object} request PettyCashRequest
 * @param {object} user    { full_name, email, role } yang menekan tombol
 * @param {string} tanggal tanggal pencairan (YYYY-MM-DD)
 * @returns {Promise<{id: string, dibuat: boolean}>} id baris buku kas, dan
 *          apakah baris itu baru dibuat sekarang (false = sudah ada)
 */
export async function pastikanMasukBukuKas({ request, user, tanggal }) {
  const sudah = await base44.entities.PettyCashLedger.filter({
    linked_request_id: request.id,
    entry_type: "top_up",
  });
  if (sudah?.length) return { id: sudah[0].id, dibuat: false };

  const nominal = Math.round(request.amount_requested || 0);
  const ledger = await base44.entities.PettyCashLedger.list("-entry_date", 500);
  const saldoSebelum = saldoTerkini(ledger);

  const baris = await base44.entities.PettyCashLedger.create({
    entry_type: "top_up",
    amount: nominal,
    balance_after: saldoSebelum + nominal,
    entry_date: tanggal,
    description: `Pencairan request dana ${request.requester_name || ""}`.trim() +
      (request.reason ? ` — ${request.reason}` : ""),
    proof_photo: request.disbursement_proof_url || undefined,
    recorded_by_name: user?.full_name || user?.email || "",
    recorded_by_email: user?.email || "",
    recorded_by_role: user?.role || "",
    linked_request_id: request.id,
  });

  /*
   * balance_after di atas hanya dugaan dari saldo yang terbaca sesaat sebelum
   * menulis. Bila tanggalnya mundur — pencairan lama yang baru dimasukkan —
   * baris ini duduk di TENGAH buku kas dan semua balance_after sesudahnya
   * harus bergeser. Hanya fungsi ini yang menghitung ulang seluruh rantainya.
   *
   * Gagal menghitung ulang TIDAK membatalkan barisnya: uangnya memang sudah
   * masuk, dan menghapus baris yang benar demi rantai yang rapi menukar
   * masalah kecil dengan masalah besar. Rekonsiliasi berikutnya merapikannya.
   */
  try {
    await base44.functions.invoke("recalculatePettyCashBalance", {});
  } catch { /* rantainya saja yang belum rapi */ }

  try {
    await logActivity({
      action: "create",
      entity_type: "PettyCashLedger",
      entity_id: baris.id,
      entity_name: `Top-up pencairan ${tanggal}`,
      changes_summary:
        `Pencairan request dana ${request.requester_name || "—"} ` +
        `Rp ${nominal.toLocaleString("id-ID")} (${tanggal}) masuk buku kas kas kecil`,
    });
  } catch { /* jejaknya saja yang hilang */ }

  return { id: baris.id, dibuat: true };
}
